from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    specifications: dict = {}
    stock: int = 10
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: str
    specifications: dict = {}
    stock: int = 10

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

# ==================== SEED DATA ====================

SAMPLE_PRODUCTS = [
    {
        "id": "prod-001",
        "name": "Schwerlast-Bagger X-200",
        "description": "Leistungsstarker Hydraulikbagger für anspruchsvolle Erdarbeiten. Ideal für Baustellen und schwere Aushubarbeiten.",
        "price": 185000.00,
        "category": "Baumaschinen",
        "image_url": "https://images.unsplash.com/photo-1691052657402-90b45c0f6dca?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxleGNhdmF0b3IlMjBtYWNoaW5lfGVufDB8fHx8MTc3NDk4NjU1OHww&ixlib=rb-4.1.0&q=85",
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
        "specifications": {
            "Laserleistung": "6 kW",
            "Arbeitsbereich": "3000 x 1500 mm",
            "Max. Schnittdicke Stahl": "25 mm",
            "Positioniergeschwindigkeit": "140 m/min"
        },
        "stock": 2
    }
]

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Willkommen zum Maschinen-Store API"}

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
    
    # If no products in DB, seed with sample data
    if not products:
        for product in SAMPLE_PRODUCTS:
            product_doc = {**product}
            product_doc['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.products.insert_one(product_doc)
        products = await db.products.find(query, {"_id": 0}).to_list(100)
    
    return products

@api_router.get("/products/categories")
async def get_categories():
    categories = await db.products.distinct("category")
    if not categories:
        categories = list(set(p["category"] for p in SAMPLE_PRODUCTS))
    return categories

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
        # Check if item already exists
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
