from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, File, UploadFile
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

# Storage Config
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "gpc-maschinen"
storage_key = None

# Telegram Config
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

def send_telegram_order(order_doc):
    """Send order details to Telegram group - runs in background"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logging.warning("Telegram not configured, skipping notification")
        return
    try:
        customer = order_doc["customer"]
        items_text = ""
        for item in order_doc["items"]:
            items_text += f"  - {item['name']} x{item['quantity']} = {item['price'] * item['quantity']:.2f} EUR\n"
        
        message = (
            f"NEUE BESTELLUNG\n\n"
            f"Bestellnummer: {order_doc['order_number']}\n"
            f"Datum: {order_doc['created_at']}\n\n"
            f"Kunde:\n"
            f"  Name: {customer['name']}\n"
            f"  E-Mail: {customer['email']}\n"
            f"  Telefon: {customer['phone']}\n"
        )
        if customer.get('company'):
            message += f"  Firma: {customer['company']}\n"
        message += (
            f"  Adresse: {customer['street']}, {customer['postal_code']} {customer['city']}\n\n"
            f"Artikel:\n{items_text}\n"
            f"Gesamtbetrag: {order_doc['total']:.2f} EUR\n"
            f"Zahlung: {order_doc['payment_method']}\n"
        )
        if order_doc.get('notes'):
            message += f"Anmerkungen: {order_doc['notes']}\n"
        
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message}, timeout=10)
    except Exception as e:
        logging.error(f"Telegram notification failed: {e}")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf"
}

def init_storage():
    """Initialize storage - call once at startup"""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logging.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage nicht verfügbar")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage nicht verfügbar")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Ungültiger Token-Typ")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiger Token")

# Create the main app
app = FastAPI()

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth")
admin_router = APIRouter(prefix="/api/admin")

# ==================== MODELS ====================

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    sale_price: Optional[float] = None
    rating: float = 0
    category: str
    image_url: str
    images: List[str] = []
    specifications: dict = {}
    stock: int = 10
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    sale_price: Optional[float] = None
    rating: float = 0
    category: str
    image_url: str
    images: List[str] = []
    specifications: dict = {}
    stock: int = 10

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    rating: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    specifications: Optional[dict] = None
    stock: Optional[int] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    image_url: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    image_url: str = ""

class CartItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    image_url: str

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    items: List[CartItem] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerInfo(BaseModel):
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    street: str
    city: str
    postal_code: str
    country: str = "Deutschland"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    customer: CustomerInfo
    items: List[CartItem]
    total: float
    payment_method: str = "Rechnung / Überweisung"
    status: str = "Ausstehend"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    session_id: str
    customer: CustomerInfo
    notes: Optional[str] = None

class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str = Field(default_factory=lambda: f"ANF-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    product_id: str
    product_name: str
    customer: CustomerInfo
    quantity: int
    message: Optional[str] = None
    status: str = "Neu"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteRequestCreate(BaseModel):
    product_id: str
    customer: CustomerInfo
    quantity: int
    message: Optional[str] = None

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ==================== SEED DATA ====================

SAMPLE_PRODUCTS = [
    {
        "id": "prod-001",
        "name": "Schwerlast-Bagger X-200",
        "description": "Leistungsstarker Hydraulikbagger für anspruchsvolle Erdarbeiten. Ideal für Baustellen und schwere Aushubarbeiten.",
        "price": 185000.00,
        "category": "Baumaschinen",
        "image_url": "https://images.unsplash.com/photo-1691052657402-90b45c0f6dca?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxleGNhdmF0b3IlMjBtYWNoaW5lfGVufDB8fHx8MTc3NDk4NjU1OHww&ixlib=rb-4.1.0&q=85",
        "images": [],
        "specifications": {
            "Motorleistung": "320 PS",
            "Betriebsgewicht": "22.500 kg",
            "Grabtiefe": "6,8 m",
            "Reichweite": "10,2 m"
        },
        "stock": 3
    },
    {
        "id": "prod-002",
        "name": "Präzisions-CNC-Fräsmaschine",
        "description": "5-Achsen CNC-Bearbeitungszentrum für hochpräzise Metallbearbeitung. Perfekt für Prototypen und Serienproduktion.",
        "price": 245000.00,
        "category": "CNC-Maschinen",
        "image_url": "https://images.pexels.com/photos/33748032/pexels-photo-33748032.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "images": [],
        "specifications": {
            "Verfahrwege X/Y/Z": "800/600/500 mm",
            "Spindeldrehzahl": "15.000 U/min",
            "Positioniergenauigkeit": "±0,005 mm",
            "Werkzeugplätze": "24"
        },
        "stock": 5
    },
    {
        "id": "prod-003",
        "name": "Industrielle Drehmaschine PRO",
        "description": "CNC-gesteuerte Drehmaschine für präzise Dreharbeiten. Geeignet für Einzel- und Serienfertigung.",
        "price": 89000.00,
        "category": "CNC-Maschinen",
        "image_url": "https://images.unsplash.com/photo-1764114441097-6a475eca993d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHxpbmR1c3RyaWFsJTIwZmFjdG9yeSUyMG1hY2hpbmVyeXxlbnwwfHx8fDE3NzQ5ODY1NTF8MA&ixlib=rb-4.1.0&q=85",
        "images": [],
        "specifications": {
            "Max. Drehdurchmesser": "450 mm",
            "Max. Drehlänge": "1000 mm",
            "Spindeldrehzahl": "3.500 U/min",
            "Hauptantrieb": "22 kW"
        },
        "stock": 8
    },
    {
        "id": "prod-004",
        "name": "Automatisierter Roboterarm R-50",
        "description": "6-Achsen Industrieroboter für Montage, Schweißen und Materialhandling. Programmierbar und hocheffizient.",
        "price": 125000.00,
        "category": "Robotik",
        "image_url": "https://images.pexels.com/photos/34207359/pexels-photo-34207359.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "images": [],
        "specifications": {
            "Tragkraft": "50 kg",
            "Reichweite": "2.100 mm",
            "Wiederholgenauigkeit": "±0,05 mm",
            "Achsen": "6"
        },
        "stock": 4
    },
    {
        "id": "prod-005",
        "name": "Hydraulische Abkantpresse 200T",
        "description": "Hochleistungs-Abkantpresse für präzise Biegearbeiten an Blechen bis 6mm Stärke.",
        "price": 78000.00,
        "category": "Blechbearbeitung",
        "image_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
        "images": [],
        "specifications": {
            "Presskraft": "200 Tonnen",
            "Arbeitslänge": "3100 mm",
            "Hubweg": "200 mm",
            "Hinteranschlag": "CNC-gesteuert"
        },
        "stock": 6
    },
    {
        "id": "prod-006",
        "name": "Laser-Schneidanlage LS-3000",
        "description": "Faserlaser-Schneidsystem für hochpräzise Schnitte in Stahl, Edelstahl und Aluminium.",
        "price": 320000.00,
        "category": "Lasertechnik",
        "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800",
        "images": [],
        "specifications": {
            "Laserleistung": "6 kW",
            "Arbeitsbereich": "3000 x 1500 mm",
            "Max. Schnittdicke Stahl": "25 mm",
            "Positioniergeschwindigkeit": "140 m/min"
        },
        "stock": 2
    }
]

SAMPLE_CATEGORIES = [
    {"id": "cat-001", "name": "Baumaschinen", "description": "Bagger, Kräne und schwere Baugeräte", "image_url": ""},
    {"id": "cat-002", "name": "CNC-Maschinen", "description": "Fräs- und Drehmaschinen mit CNC-Steuerung", "image_url": ""},
    {"id": "cat-003", "name": "Robotik", "description": "Industrieroboter und Automatisierungslösungen", "image_url": ""},
    {"id": "cat-004", "name": "Blechbearbeitung", "description": "Pressen, Stanzen und Biegemaschinen", "image_url": ""},
    {"id": "cat-005", "name": "Lasertechnik", "description": "Laserschneid- und Schweißanlagen", "image_url": ""},
]

# ==================== AUTH ROUTES ====================

@auth_router.post("/login")
async def login(request: LoginRequest, response: Response):
    email = request.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user")
    }

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Erfolgreich abgemeldet"}

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ==================== ADMIN ROUTES ====================

# File Upload
@admin_router.post("/upload")
async def admin_upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload an image file and return the URL"""
    # Validate file type
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        raise HTTPException(status_code=400, detail="Nur Bildformate erlaubt (jpg, png, gif, webp)")
    
    # Read file
    data = await file.read()
    
    # Max 10MB
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 10MB)")
    
    # Generate unique path
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/products/{file_id}.{ext}"
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    
    try:
        result = put_object(path, data, content_type)
        
        # Store reference in DB
        file_doc = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(data)),
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_doc)
        
        # Return the download URL
        return {
            "url": f"/api/files/{result['path']}",
            "path": result["path"],
            "filename": file.filename
        }
    except Exception as e:
        logging.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload fehlgeschlagen")

# File Download (for displaying images)
@api_router.get("/files/{path:path}")
async def get_file(path: str):
    """Serve uploaded files"""
    try:
        record = await db.files.find_one({"storage_path": path, "is_deleted": False})
        if not record:
            raise HTTPException(status_code=404, detail="Datei nicht gefunden")
        
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail="Download fehlgeschlagen")

# Categories
@admin_router.get("/categories")
async def admin_get_categories(user: dict = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@admin_router.post("/categories")
async def admin_create_category(category: CategoryCreate, user: dict = Depends(get_current_user)):
    cat = Category(**category.model_dump())
    cat_doc = cat.model_dump()
    cat_doc['created_at'] = cat_doc['created_at'].isoformat()
    result = await db.categories.insert_one(cat_doc)
    # Return the document without the MongoDB _id field
    cat_doc.pop('_id', None)
    return cat_doc

@admin_router.put("/categories/{category_id}")
async def admin_update_category(category_id: str, category: CategoryCreate, user: dict = Depends(get_current_user)):
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": category.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": "Kategorie aktualisiert"}

@admin_router.delete("/categories/{category_id}")
async def admin_delete_category(category_id: str, user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": "Kategorie gelöscht"}

# Products
@admin_router.get("/products")
async def admin_get_products(user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@admin_router.post("/products")
async def admin_create_product(product: ProductCreate, user: dict = Depends(get_current_user)):
    prod = Product(**product.model_dump())
    prod_doc = prod.model_dump()
    prod_doc['created_at'] = prod_doc['created_at'].isoformat()
    result = await db.products.insert_one(prod_doc)
    # Return the document without the MongoDB _id field
    prod_doc.pop('_id', None)
    return prod_doc

@admin_router.put("/products/{product_id}")
async def admin_update_product(product_id: str, product: ProductUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    return {"message": "Produkt aktualisiert"}

@admin_router.delete("/products/{product_id}")
async def admin_delete_product(product_id: str, user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    return {"message": "Produkt gelöscht"}

# Orders
@admin_router.get("/orders")
async def admin_get_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@admin_router.put("/orders/{order_number}/status")
async def admin_update_order_status(order_number: str, status: str, user: dict = Depends(get_current_user)):
    result = await db.orders.update_one(
        {"order_number": order_number},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return {"message": "Status aktualisiert"}

# Quotes
@admin_router.get("/quotes")
async def admin_get_quotes(user: dict = Depends(get_current_user)):
    quotes = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes

@admin_router.put("/quotes/{quote_id}/status")
async def admin_update_quote_status(quote_id: str, status: str, user: dict = Depends(get_current_user)):
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    return {"message": "Status aktualisiert"}

# Dashboard Stats
@admin_router.get("/stats")
async def admin_get_stats(user: dict = Depends(get_current_user)):
    products_count = await db.products.count_documents({})
    categories_count = await db.categories.count_documents({})
    orders_count = await db.orders.count_documents({})
    quotes_count = await db.quotes.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "Ausstehend"})
    new_quotes = await db.quotes.count_documents({"status": "Neu"})
    
    return {
        "products": products_count,
        "categories": categories_count,
        "orders": orders_count,
        "quotes": quotes_count,
        "pending_orders": pending_orders,
        "new_quotes": new_quotes
    }

# ==================== PUBLIC ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Willkommen zum G.P.C. Maschinen API"}

# Products Routes
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None, min_price: Optional[float] = None, max_price: Optional[float] = None):
    query = {}
    if category:
        query["category"] = category
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
        if not query["price"]:
            del query["price"]
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    
    return products

@api_router.get("/products/categories")
async def get_categories():
    # First check if categories collection has data
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    if not categories:
        # Seed categories
        for cat in SAMPLE_CATEGORIES:
            cat_doc = {**cat}
            cat_doc['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.categories.insert_one(cat_doc)
        categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    
    return [cat["name"] for cat in categories]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    return product

# Cart Routes
@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str):
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    if not cart:
        return {"session_id": session_id, "items": [], "total": 0}
    
    total = sum(item["price"] * item["quantity"] for item in cart.get("items", []))
    return {**cart, "total": total}

@api_router.post("/cart/{session_id}/add")
async def add_to_cart(session_id: str, item: CartItemAdd):
    product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    
    cart = await db.carts.find_one({"session_id": session_id})
    
    cart_item = {
        "product_id": product["id"],
        "name": product["name"],
        "price": product["price"],
        "quantity": item.quantity,
        "image_url": product["image_url"]
    }
    
    if cart:
        existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        if existing_item:
            await db.carts.update_one(
                {"session_id": session_id, "items.product_id": item.product_id},
                {"$inc": {"items.$.quantity": item.quantity}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.carts.update_one(
                {"session_id": session_id},
                {"$push": {"items": cart_item}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    else:
        new_cart = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "items": [cart_item],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(new_cart)
    
    return {"message": "Produkt zum Warenkorb hinzugefügt"}

@api_router.put("/cart/{session_id}/update")
async def update_cart_item(session_id: str, item: CartItemAdd):
    if item.quantity <= 0:
        await db.carts.update_one(
            {"session_id": session_id},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"session_id": session_id, "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    return {"message": "Warenkorb aktualisiert"}

@api_router.delete("/cart/{session_id}/remove/{product_id}")
async def remove_from_cart(session_id: str, product_id: str):
    await db.carts.update_one(
        {"session_id": session_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Produkt aus dem Warenkorb entfernt"}

@api_router.delete("/cart/{session_id}/clear")
async def clear_cart(session_id: str):
    await db.carts.delete_one({"session_id": session_id})
    return {"message": "Warenkorb geleert"}

# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    cart = await db.carts.find_one({"session_id": order_data.session_id}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Warenkorb ist leer")
    
    total = sum(item["price"] * item["quantity"] for item in cart["items"])
    
    order = Order(
        customer=order_data.customer,
        items=cart["items"],
        total=total,
        notes=order_data.notes
    )
    
    order_doc = order.model_dump()
    order_doc['created_at'] = order_doc['created_at'].isoformat()
    
    await db.orders.insert_one(order_doc)
    await db.carts.delete_one({"session_id": order_data.session_id})
    
    # Telegram Benachrichtigung senden
    send_telegram_order(order_doc)
    
    return order

@api_router.get("/orders/{order_number}")
async def get_order(order_number: str):
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return order

# Quote Request Routes
@api_router.post("/quotes", response_model=QuoteRequest)
async def create_quote_request(quote_data: QuoteRequestCreate):
    product = await db.products.find_one({"id": quote_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    
    quote = QuoteRequest(
        product_id=quote_data.product_id,
        product_name=product["name"],
        customer=quote_data.customer,
        quantity=quote_data.quantity,
        message=quote_data.message
    )
    
    quote_doc = quote.model_dump()
    quote_doc['created_at'] = quote_doc['created_at'].isoformat()
    
    await db.quotes.insert_one(quote_doc)
    return quote

# Contact Routes
@api_router.post("/contact", response_model=ContactMessage)
async def create_contact_message(contact_data: ContactMessageCreate):
    contact = ContactMessage(**contact_data.model_dump())
    
    contact_doc = contact.model_dump()
    contact_doc['created_at'] = contact_doc['created_at'].isoformat()
    
    await db.contact_messages.insert_one(contact_doc)
    return contact

# Include routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gpc-maschinen.de")
    admin_password = os.environ.get("ADMIN_PASSWORD", "GPC2026Admin!")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Create indexes
    await db.users.create_index("email", unique=True)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
