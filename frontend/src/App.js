import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { ShoppingCart, Menu, X, Phone, Mail, MapPin, ChevronRight, Plus, Minus, Trash2, Send, Package, ArrowLeft, LogOut, Settings, BarChart3, FolderOpen, Box, FileText, MessageSquare, Edit, Eye, Save, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Cart Context
const CartContext = createContext();

const useCart = () => useContext(CartContext);

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('sessionId');
    if (stored) return stored;
    const newId = 'sess-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', newId);
    return newId;
  });

  const fetchCart = async () => {
    try {
      const res = await axios.get(`${API}/cart/${sessionId}`);
      setCart(res.data);
    } catch (e) {
      console.error("Error fetching cart:", e);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      await axios.post(`${API}/cart/${sessionId}/add`, { product_id: productId, quantity });
      await fetchCart();
      toast.success("Produkt zum Warenkorb hinzugefügt");
    } catch (e) {
      toast.error("Fehler beim Hinzufügen zum Warenkorb");
    }
  };

  const updateCartItem = async (productId, quantity) => {
    try {
      await axios.put(`${API}/cart/${sessionId}/update`, { product_id: productId, quantity });
      await fetchCart();
    } catch (e) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await axios.delete(`${API}/cart/${sessionId}/remove/${productId}`);
      await fetchCart();
      toast.success("Produkt entfernt");
    } catch (e) {
      toast.error("Fehler beim Entfernen");
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete(`${API}/cart/${sessionId}/clear`);
      setCart({ items: [], total: 0 });
    } catch (e) {
      console.error("Error clearing cart:", e);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <CartContext.Provider value={{ cart, sessionId, addToCart, updateCartItem, removeFromCart, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

// Navbar Component
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-2 border-black" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Package className="w-8 h-8 text-[#FF3B30]" />
            <span className="font-bold text-xl tracking-tight">G.P.C</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="nav-link font-medium" data-testid="nav-home">Startseite</Link>
            <Link to="/produkte" className="nav-link font-medium" data-testid="nav-products">Produkte</Link>
            <Link to="/kontakt" className="nav-link font-medium" data-testid="nav-contact">Kontakt</Link>
          </div>

          <div className="flex items-center gap-4">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <button className="relative p-2" data-testid="cart-button">
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-xs w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="font-bold text-2xl">Warenkorb</SheetTitle>
                </SheetHeader>
                <CartSidebar onClose={() => setCartOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)} data-testid="mobile-menu-button">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <Link to="/" className="block py-2 font-medium" onClick={() => setIsOpen(false)}>Startseite</Link>
            <Link to="/produkte" className="block py-2 font-medium" onClick={() => setIsOpen(false)}>Produkte</Link>
            <Link to="/kontakt" className="block py-2 font-medium" onClick={() => setIsOpen(false)}>Kontakt</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

// Cart Sidebar
const CartSidebar = ({ onClose }) => {
  const { cart, updateCartItem, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (onClose) onClose();
    navigate("/kasse");
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-[#71717A]">Ihr Warenkorb ist leer</p>
        <button 
          onClick={() => { if (onClose) onClose(); navigate("/produkte"); }}
          className="mt-4 btn-primary" 
          data-testid="continue-shopping"
        >
          Produkte ansehen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-4">
        {cart.items.map((item) => (
          <div key={item.product_id} className="cart-item" data-testid={`cart-item-${item.product_id}`}>
            <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{item.name}</h4>
              <p className="text-[#FF3B30] font-bold">{item.price.toLocaleString('de-DE')} €</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  className="quantity-btn"
                  onClick={() => updateCartItem(item.product_id, item.quantity - 1)}
                  data-testid={`decrease-${item.product_id}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  className="quantity-btn"
                  onClick={() => updateCartItem(item.product_id, item.quantity + 1)}
                  data-testid={`increase-${item.product_id}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              className="p-2 text-[#71717A] hover:text-[#FF3B30]"
              onClick={() => removeFromCart(item.product_id)}
              data-testid={`remove-${item.product_id}`}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-[#E4E4E7] pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">Gesamt:</span>
          <span className="text-2xl font-bold">{cart.total.toLocaleString('de-DE')} €</span>
        </div>
        <button 
          onClick={handleCheckout}
          className="btn-primary w-full" 
          data-testid="checkout-button"
        >
          Zur Kasse
        </button>
      </div>
    </div>
  );
};

// Hero Section
const HeroSection = () => {
  return (
    <section
      className="hero-section"
      style={{ backgroundImage: `url(https://images.unsplash.com/photo-1761519609252-3b868e540398?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwZmFjdG9yeSUyMG1hY2hpbmVyeXxlbnwwfHx8fDE3NzQ5ODY1NTF8MA&ixlib=rb-4.1.0&q=85)` }}
      data-testid="hero-section"
    >
      <div className="hero-overlay" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <p className="label-brutal text-white mb-4">Industriemaschinen & Mehr</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Qualität. Präzision. Leistung.
          </h1>
          <p className="text-lg text-gray-200 mb-8">
            Entdecken Sie unser umfangreiches Sortiment an hochwertigen Industriemaschinen für jeden Einsatzbereich.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/produkte" className="btn-primary flex items-center justify-center gap-2" data-testid="hero-cta">
              Maschinen ansehen
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/kontakt" className="btn-secondary flex items-center justify-center gap-2" data-testid="hero-contact">
              Angebot anfragen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// Home Page
const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API}/products`);
        setProducts(res.data.slice(0, 6));
      } catch (e) {
        console.error("Error fetching products:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div data-testid="home-page">
      <HeroSection />
      
      {/* Featured Products */}
      <section className="py-16 bg-[#F4F4F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="label-brutal mb-2">Unser Sortiment</p>
              <h2 className="text-3xl md:text-4xl font-bold">Ausgewählte Maschinen</h2>
            </div>
            <Link to="/produkte" className="hidden md:flex items-center gap-2 text-[#FF3B30] font-semibold hover:underline" data-testid="view-all-products">
              Alle anzeigen
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner" />
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product, index) => (
                <ProductCard key={`${product.id}-${index}`} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link to="/produkte" className="btn-primary inline-flex items-center gap-2">
              Alle Produkte anzeigen
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white border-t border-b border-[#E4E4E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F4F4F5] flex items-center justify-center">
                <Package className="w-8 h-8 text-[#FF3B30]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Schnelle Lieferung</h3>
              <p className="text-[#71717A]">Deutschlandweite Lieferung und professionelle Installation</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F4F4F5] flex items-center justify-center">
                <Phone className="w-8 h-8 text-[#FF3B30]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Expertenberatung</h3>
              <p className="text-[#71717A]">Unsere Fachberater helfen Ihnen bei der Auswahl</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F4F4F5] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#FF3B30]" />
              </div>
              <h3 className="text-xl font-bold mb-2">24h Angebote</h3>
              <p className="text-[#71717A]">Erhalten Sie innerhalb von 24h ein individuelles Angebot</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Product Card
const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="product-card" data-testid={`product-card-${product.id}`}>
      <Link to={`/produkt/${product.id}`}>
        <img src={product.image_url} alt={product.name} className="w-full h-52 object-cover" />
      </Link>
      <div className="p-4">
        <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">{product.category}</p>
        <Link to={`/produkt/${product.id}`}>
          <h3 className="font-bold text-lg mb-2 hover:text-[#FF3B30] transition-colors">{product.name}</h3>
        </Link>
        <p className="text-[#71717A] text-sm mb-4 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold">{product.price.toLocaleString('de-DE')} €</span>
          <button
            className="btn-primary py-2 px-4 text-sm"
            onClick={() => onAddToCart(product.id)}
            data-testid={`add-to-cart-${product.id}`}
          >
            In den Warenkorb
          </button>
        </div>
      </div>
    </div>
  );
};

// Products Page
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/products`),
          axios.get(`${API}/products/categories`)
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== "all" && product.category !== selectedCategory) return false;
    if (priceRange.min && product.price < parseFloat(priceRange.min)) return false;
    if (priceRange.max && product.price > parseFloat(priceRange.max)) return false;
    return true;
  });

  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="products-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Produktkatalog</p>
          <h1 className="text-4xl md:text-5xl font-bold">Unsere Maschinen</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="filter-sidebar sticky top-24">
              <h3 className="font-bold text-lg mb-4">Filter</h3>
              
              <div className="mb-6">
                <Label className="label-brutal">Kategorie</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="rounded-none border-2" data-testid="category-filter">
                    <SelectValue placeholder="Alle Kategorien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="category-all">Alle Kategorien</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} data-testid={`category-${cat}`}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-6">
                <Label className="label-brutal">Preis (€)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="rounded-none border-2"
                    data-testid="price-min"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="rounded-none border-2"
                    data-testid="price-max"
                  />
                </div>
              </div>

              <button
                className="btn-secondary w-full text-sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setPriceRange({ min: "", max: "" });
                }}
                data-testid="reset-filters"
              >
                Filter zurücksetzen
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="spinner" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E4E4E7]">
                <p className="text-[#71717A]">Keine Produkte gefunden</p>
              </div>
            ) : (
              <>
                <p className="text-[#71717A] mb-4">{filteredProducts.length} Produkte gefunden</p>
                <div className="product-grid">
                  {filteredProducts.map((product, index) => (
                    <ProductCard key={`${product.id}-${index}`} product={product} onAddToCart={addToCart} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Product Detail Page
const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`${API}/products/${id}`);
        setProduct(res.data);
      } catch (e) {
        console.error("Error fetching product:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-[#71717A] mb-4">Produkt nicht gefunden</p>
        <Link to="/produkte" className="btn-primary">Zurück zu Produkte</Link>
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean);

  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#71717A] hover:text-[#09090B] mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <div className="bg-white border border-[#E4E4E7]">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Product Image */}
            <div className="border-b lg:border-b-0 lg:border-r border-[#E4E4E7]">
              <img
                src={allImages[selectedImage] || product.image_url}
                alt={product.name}
                className="w-full h-96 lg:h-[500px] object-cover"
              />
              {allImages.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-20 h-20 flex-shrink-0 border-2 ${selectedImage === idx ? 'border-[#FF3B30]' : 'border-[#E4E4E7]'}`}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-8">
              <p className="label-brutal mb-2">{product.category}</p>
              <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="product-name">{product.name}</h1>
              <p className="text-[#71717A] mb-6">{product.description}</p>
              
              <div className="text-3xl font-bold text-[#FF3B30] mb-6" data-testid="product-price">
                {product.price.toLocaleString('de-DE')} €
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <Label className="label-brutal">Menge</Label>
                <div className="flex items-center gap-2">
                  <button
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="decrease-quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="increase-quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  onClick={() => addToCart(product.id, quantity)}
                  data-testid="add-to-cart-button"
                >
                  <ShoppingCart className="w-5 h-5" />
                  In den Warenkorb
                </button>
                <Link
                  to={`/angebot/${product.id}`}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  data-testid="quote-request-button"
                >
                  <Send className="w-5 h-5" />
                  Angebot anfragen
                </Link>
              </div>

              {/* Specifications */}
              {Object.keys(product.specifications || {}).length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 border-b border-[#E4E4E7] pb-2">Technische Daten</h3>
                  <table className="specs-table">
                    <tbody>
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Page
const CheckoutPage = () => {
  const { cart, sessionId, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    street: "",
    city: "",
    postal_code: "",
    country: "Deutschland",
    notes: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        session_id: sessionId,
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company || null,
          street: formData.street,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country
        },
        notes: formData.notes || null
      };

      const res = await axios.post(`${API}/orders`, orderData);
      await clearCart();
      toast.success("Bestellung erfolgreich aufgegeben!");
      navigate(`/bestellung/${res.data.order_number}`);
    } catch (e) {
      toast.error("Fehler bei der Bestellung. Bitte versuchen Sie es erneut.");
      console.error("Order error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F4F5]">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-xl text-[#71717A] mb-4">Ihr Warenkorb ist leer</p>
        <Link to="/produkte" className="btn-primary" data-testid="continue-shopping-checkout">
          Produkte ansehen
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="checkout-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Kasse</p>
          <h1 className="text-4xl md:text-5xl font-bold">Bestellung abschließen</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-[#E4E4E7] p-6">
              <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Kontaktdaten</h2>
              
              <div className="form-grid mb-8">
                <div>
                  <Label className="label-brutal">Name *</Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required className="input-brutal" data-testid="checkout-name" />
                </div>
                <div>
                  <Label className="label-brutal">E-Mail *</Label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-brutal" data-testid="checkout-email" />
                </div>
                <div>
                  <Label className="label-brutal">Telefon *</Label>
                  <Input name="phone" value={formData.phone} onChange={handleChange} required className="input-brutal" data-testid="checkout-phone" />
                </div>
                <div>
                  <Label className="label-brutal">Firma (optional)</Label>
                  <Input name="company" value={formData.company} onChange={handleChange} className="input-brutal" data-testid="checkout-company" />
                </div>
              </div>

              <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Lieferadresse</h2>
              
              <div className="form-grid mb-8">
                <div className="full-width">
                  <Label className="label-brutal">Straße & Hausnummer *</Label>
                  <Input name="street" value={formData.street} onChange={handleChange} required className="input-brutal" data-testid="checkout-street" />
                </div>
                <div>
                  <Label className="label-brutal">PLZ *</Label>
                  <Input name="postal_code" value={formData.postal_code} onChange={handleChange} required className="input-brutal" data-testid="checkout-postal" />
                </div>
                <div>
                  <Label className="label-brutal">Stadt *</Label>
                  <Input name="city" value={formData.city} onChange={handleChange} required className="input-brutal" data-testid="checkout-city" />
                </div>
                <div className="full-width">
                  <Label className="label-brutal">Land</Label>
                  <Input name="country" value={formData.country} onChange={handleChange} className="input-brutal" data-testid="checkout-country" />
                </div>
              </div>

              <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Zahlungsart</h2>
              
              <div className="bg-[#F4F4F5] p-4 mb-6 border-l-4 border-[#FF3B30]">
                <p className="font-semibold">Rechnung / Überweisung</p>
                <p className="text-sm text-[#71717A] mt-1">
                  Sie erhalten eine Rechnung per E-Mail nach Bestelleingang. Die Zahlung erfolgt per Überweisung.
                </p>
              </div>

              <div className="mb-8">
                <Label className="label-brutal">Anmerkungen (optional)</Label>
                <Textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="input-brutal" placeholder="Besondere Wünsche oder Anmerkungen zur Lieferung..." data-testid="checkout-notes" />
              </div>

              <Button type="submit" className="btn-primary w-full" disabled={loading} data-testid="submit-order-button">
                {loading ? "Wird verarbeitet..." : "Bestellung aufgeben"}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white border border-[#E4E4E7] p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Zusammenfassung</h2>
              
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-4" data-testid={`summary-item-${item.product_id}`}>
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-[#71717A] text-sm">Menge: {item.quantity}</p>
                    </div>
                    <p className="font-bold">{(item.price * item.quantity).toLocaleString('de-DE')} €</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#E4E4E7] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Gesamt:</span>
                  <span className="text-2xl font-bold">{cart.total.toLocaleString('de-DE')} €</span>
                </div>
                <p className="text-xs text-[#71717A] mt-2">inkl. MwSt., zzgl. Versand</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Order Confirmation Page
const OrderConfirmationPage = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`${API}/orders/${orderNumber}`);
        setOrder(res.data);
      } catch (e) {
        console.error("Error fetching order:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F4F5]">
        <p className="text-xl text-[#71717A] mb-4">Bestellung nicht gefunden</p>
        <Link to="/" className="btn-primary">Zur Startseite</Link>
      </div>
    );
  }

  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="order-confirmation-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E4E4E7] p-8 text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-[#DCFCE7] flex items-center justify-center">
            <Package className="w-8 h-8 text-[#16A34A]" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Vielen Dank für Ihre Bestellung!</h1>
          <p className="text-[#71717A] mb-4">Ihre Bestellnummer lautet:</p>
          <p className="text-2xl font-bold text-[#FF3B30]" data-testid="order-number">{order.order_number}</p>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-4">Bestelldetails</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="label-brutal">Kunde</p>
              <p className="font-semibold">{order.customer.name}</p>
              {order.customer.company && <p>{order.customer.company}</p>}
              <p>{order.customer.email}</p>
              <p>{order.customer.phone}</p>
            </div>
            <div>
              <p className="label-brutal">Lieferadresse</p>
              <p>{order.customer.street}</p>
              <p>{order.customer.postal_code} {order.customer.city}</p>
              <p>{order.customer.country}</p>
            </div>
          </div>

          <div className="border-t border-[#E4E4E7] pt-6">
            <p className="label-brutal mb-4">Artikel</p>
            {order.items.map((item) => (
              <div key={item.product_id} className="flex justify-between items-center py-2 border-b border-[#E4E4E7] last:border-b-0">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-[#71717A]">Menge: {item.quantity}</p>
                </div>
                <p className="font-bold">{(item.price * item.quantity).toLocaleString('de-DE')} €</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[#E4E4E7] pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Gesamtbetrag:</span>
              <span className="text-2xl font-bold">{order.total.toLocaleString('de-DE')} €</span>
            </div>
          </div>
        </div>

        <div className="bg-[#FEF3C7] border border-[#D97706] p-4">
          <p className="font-semibold text-[#D97706]">Zahlungshinweis</p>
          <p className="text-sm mt-1">
            Sie erhalten in Kürze eine Rechnung per E-Mail. Bitte überweisen Sie den Gesamtbetrag auf das in der Rechnung angegebene Konto.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/produkte" className="btn-primary">Weiter einkaufen</Link>
        </div>
      </div>
    </div>
  );
};

// Quote Request Page
const QuoteRequestPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    quantity: 1,
    name: "",
    email: "",
    phone: "",
    company: "",
    street: "",
    city: "",
    postal_code: "",
    country: "Deutschland",
    message: ""
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`${API}/products/${productId}`);
        setProduct(res.data);
      } catch (e) {
        console.error("Error fetching product:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const quoteData = {
        product_id: productId,
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company || null,
          street: formData.street,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country
        },
        quantity: parseInt(formData.quantity),
        message: formData.message || null
      };

      const res = await axios.post(`${API}/quotes`, quoteData);
      setQuoteNumber(res.data.quote_number);
      setSubmitted(true);
      toast.success("Angebotsanfrage erfolgreich gesendet!");
    } catch (e) {
      toast.error("Fehler beim Senden. Bitte versuchen Sie es erneut.");
      console.error("Quote error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F4F5]">
        <p className="text-xl text-[#71717A] mb-4">Produkt nicht gefunden</p>
        <Link to="/produkte" className="btn-primary">Zurück zu Produkte</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="quote-success">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#E4E4E7] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#DCFCE7] flex items-center justify-center">
              <Send className="w-8 h-8 text-[#16A34A]" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Anfrage gesendet!</h1>
            <p className="text-[#71717A] mb-4">Ihre Anfragenummer lautet:</p>
            <p className="text-2xl font-bold text-[#FF3B30] mb-6" data-testid="quote-number">{quoteNumber}</p>
            <p className="text-[#71717A] mb-8">
              Wir werden uns innerhalb von 24 Stunden mit einem individuellen Angebot bei Ihnen melden.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/produkte" className="btn-primary">Weitere Produkte ansehen</Link>
              <Link to="/" className="btn-secondary">Zur Startseite</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="quote-request-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#71717A] hover:text-[#09090B] mb-6">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <div className="mb-8">
          <p className="label-brutal mb-2">Angebotsanfrage</p>
          <h1 className="text-4xl md:text-5xl font-bold">Individuelles Angebot anfordern</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-[#E4E4E7] p-6">
              <div className="mb-6">
                <Label className="label-brutal">Gewünschte Menge *</Label>
                <Input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required className="input-brutal max-w-32" data-testid="quote-quantity" />
              </div>

              <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Ihre Kontaktdaten</h2>
              
              <div className="form-grid mb-8">
                <div>
                  <Label className="label-brutal">Name *</Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required className="input-brutal" data-testid="quote-name" />
                </div>
                <div>
                  <Label className="label-brutal">E-Mail *</Label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-brutal" data-testid="quote-email" />
                </div>
                <div>
                  <Label className="label-brutal">Telefon *</Label>
                  <Input name="phone" value={formData.phone} onChange={handleChange} required className="input-brutal" data-testid="quote-phone" />
                </div>
                <div>
                  <Label className="label-brutal">Firma (optional)</Label>
                  <Input name="company" value={formData.company} onChange={handleChange} className="input-brutal" data-testid="quote-company" />
                </div>
                <div className="full-width">
                  <Label className="label-brutal">Straße & Hausnummer *</Label>
                  <Input name="street" value={formData.street} onChange={handleChange} required className="input-brutal" data-testid="quote-street" />
                </div>
                <div>
                  <Label className="label-brutal">PLZ *</Label>
                  <Input name="postal_code" value={formData.postal_code} onChange={handleChange} required className="input-brutal" data-testid="quote-postal" />
                </div>
                <div>
                  <Label className="label-brutal">Stadt *</Label>
                  <Input name="city" value={formData.city} onChange={handleChange} required className="input-brutal" data-testid="quote-city" />
                </div>
              </div>

              <div className="mb-8">
                <Label className="label-brutal">Ihre Nachricht (optional)</Label>
                <Textarea name="message" value={formData.message} onChange={handleChange} rows={4} className="input-brutal" placeholder="Besondere Anforderungen, Fragen oder Anmerkungen..." data-testid="quote-message" />
              </div>

              <Button type="submit" className="btn-primary w-full" disabled={submitting} data-testid="submit-quote-button">
                {submitting ? "Wird gesendet..." : "Angebot anfragen"}
              </Button>
            </form>
          </div>

          <div>
            <div className="bg-white border border-[#E4E4E7] p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4 border-b border-[#E4E4E7] pb-4">Produkt</h2>
              <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover mb-4" />
              <p className="text-xs text-[#71717A] uppercase tracking-wider">{product.category}</p>
              <h3 className="font-bold text-lg mb-2">{product.name}</h3>
              <p className="text-xl font-bold text-[#FF3B30]">{product.price.toLocaleString('de-DE')} €</p>
              <p className="text-xs text-[#71717A] mt-1">Listenpreis (netto)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Page
const ContactPage = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(`${API}/contact`, formData);
      setSubmitted(true);
      toast.success("Nachricht erfolgreich gesendet!");
    } catch (e) {
      toast.error("Fehler beim Senden. Bitte versuchen Sie es erneut.");
      console.error("Contact error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-16 bg-[#F4F4F5] min-h-screen" data-testid="contact-success">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#E4E4E7] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#DCFCE7] flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#16A34A]" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Nachricht gesendet!</h1>
            <p className="text-[#71717A] mb-8">
              Vielen Dank für Ihre Nachricht. Wir werden uns schnellstmöglich bei Ihnen melden.
            </p>
            <Link to="/" className="btn-primary">Zur Startseite</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="contact-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Kontakt</p>
          <h1 className="text-4xl md:text-5xl font-bold">Wir sind für Sie da</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-[#E4E4E7] p-6">
              <div className="form-grid mb-6">
                <div>
                  <Label className="label-brutal">Name *</Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required className="input-brutal" data-testid="contact-name" />
                </div>
                <div>
                  <Label className="label-brutal">E-Mail *</Label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-brutal" data-testid="contact-email" />
                </div>
                <div>
                  <Label className="label-brutal">Telefon (optional)</Label>
                  <Input name="phone" value={formData.phone} onChange={handleChange} className="input-brutal" data-testid="contact-phone" />
                </div>
                <div>
                  <Label className="label-brutal">Betreff *</Label>
                  <Input name="subject" value={formData.subject} onChange={handleChange} required className="input-brutal" data-testid="contact-subject" />
                </div>
                <div className="full-width">
                  <Label className="label-brutal">Ihre Nachricht *</Label>
                  <Textarea name="message" value={formData.message} onChange={handleChange} required rows={6} className="input-brutal" data-testid="contact-message" />
                </div>
              </div>

              <Button type="submit" className="btn-primary" disabled={submitting} data-testid="submit-contact-button">
                {submitting ? "Wird gesendet..." : "Nachricht senden"}
              </Button>
            </form>
          </div>

          <div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <h2 className="text-lg font-bold mb-6 border-b border-[#E4E4E7] pb-4">Kontaktdaten</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#FF3B30]" />
                  </div>
                  <div>
                    <p className="label-brutal">E-Mail</p>
                    <p className="font-semibold">info@gpc-maschinen.de</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#FF3B30]" />
                  </div>
                  <div>
                    <p className="label-brutal">Adresse</p>
                    <p className="font-semibold">G.P.C. Maschinen-Vertriebs-GmbH</p>
                    <p className="text-[#71717A]">Hauptstr. 180</p>
                    <p className="text-[#71717A]">D-51503 Rösrath</p>
                    <p className="text-[#71717A]">Deutschland</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Login Page
const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/admin");
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || JSON.stringify(d)).join(" "));
      } else {
        setError("Anmeldung fehlgeschlagen");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-4" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#E4E4E7] p-8">
          <div className="flex items-center gap-2 justify-center mb-8">
            <Settings className="w-8 h-8 text-[#FF3B30]" />
            <span className="font-bold text-2xl">Admin Panel</span>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <Label className="label-brutal">E-Mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-brutal"
                data-testid="admin-email"
              />
            </div>

            <div className="mb-6">
              <Label className="label-brutal">Passwort</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-brutal"
                data-testid="admin-password"
              />
            </div>

            <Button type="submit" className="btn-primary w-full" disabled={loading} data-testid="admin-login-button">
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-[#71717A] hover:text-[#09090B] text-sm">
              ← Zurück zum Shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/admin/stats`, { withCredentials: true });
        setStats(res.data);
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]" data-testid="admin-dashboard">
      {/* Admin Header */}
      <header className="bg-white border-b border-[#E4E4E7] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#FF3B30]" />
              <span className="font-bold text-xl">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#71717A]">{user?.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 text-[#71717A] hover:text-[#FF3B30]">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <Box className="w-5 h-5 text-[#FF3B30]" />
                <span className="text-sm text-[#71717A]">Produkte</span>
              </div>
              <p className="text-3xl font-bold">{stats.products}</p>
            </div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <FolderOpen className="w-5 h-5 text-[#FF3B30]" />
                <span className="text-sm text-[#71717A]">Kategorien</span>
              </div>
              <p className="text-3xl font-bold">{stats.categories}</p>
            </div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-[#FF3B30]" />
                <span className="text-sm text-[#71717A]">Bestellungen</span>
              </div>
              <p className="text-3xl font-bold">{stats.orders}</p>
              {stats.pending_orders > 0 && (
                <p className="text-sm text-[#D97706]">{stats.pending_orders} ausstehend</p>
              )}
            </div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-[#FF3B30]" />
                <span className="text-sm text-[#71717A]">Anfragen</span>
              </div>
              <p className="text-3xl font-bold">{stats.quotes}</p>
              {stats.new_quotes > 0 && (
                <p className="text-sm text-[#16A34A]">{stats.new_quotes} neu</p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6 bg-white border border-[#E4E4E7] p-1 rounded-none">
            <TabsTrigger value="products" className="rounded-none data-[state=active]:bg-[#FF3B30] data-[state=active]:text-white">Produkte</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-none data-[state=active]:bg-[#FF3B30] data-[state=active]:text-white">Kategorien</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-none data-[state=active]:bg-[#FF3B30] data-[state=active]:text-white">Bestellungen</TabsTrigger>
            <TabsTrigger value="quotes" className="rounded-none data-[state=active]:bg-[#FF3B30] data-[state=active]:text-white">Anfragen</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="categories">
            <AdminCategories />
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>

          <TabsContent value="quotes">
            <AdminQuotes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Admin Products
const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/admin/products`, { withCredentials: true }),
        axios.get(`${API}/admin/categories`, { withCredentials: true })
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (productId) => {
    if (!window.confirm("Produkt wirklich löschen?")) return;
    try {
      await axios.delete(`${API}/admin/products/${productId}`, { withCredentials: true });
      toast.success("Produkt gelöscht");
      fetchData();
    } catch (e) {
      toast.error("Fehler beim Löschen");
    }
  };

  return (
    <div className="bg-white border border-[#E4E4E7]">
      <div className="p-4 border-b border-[#E4E4E7] flex justify-between items-center">
        <h2 className="font-bold text-lg">Produkte verwalten</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setEditingProduct(null)}>
              <Plus className="w-4 h-4" /> Neues Produkt
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Produkt bearbeiten" : "Neues Produkt"}</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              categories={categories}
              onSave={() => {
                setIsDialogOpen(false);
                fetchData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F5]">
              <tr>
                <th className="text-left p-4 text-sm font-semibold">Bild</th>
                <th className="text-left p-4 text-sm font-semibold">Name</th>
                <th className="text-left p-4 text-sm font-semibold">Kategorie</th>
                <th className="text-left p-4 text-sm font-semibold">Preis</th>
                <th className="text-left p-4 text-sm font-semibold">Lager</th>
                <th className="text-left p-4 text-sm font-semibold">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-[#E4E4E7]">
                  <td className="p-4">
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover" />
                  </td>
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4 text-[#71717A]">{product.category}</td>
                  <td className="p-4 font-bold">{product.price.toLocaleString('de-DE')} €</td>
                  <td className="p-4">{product.stock}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        className="p-2 hover:bg-[#F4F4F5]"
                        onClick={() => {
                          setEditingProduct(product);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 text-red-600"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Product Form
const ProductForm = ({ product, categories, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    category: product?.category || "",
    image_url: product?.image_url || "",
    images: product?.images || [],
    stock: product?.stock || 10,
    specifications: product?.specifications || {}
  });
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e, isMain = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Nur Bildformate erlaubt (JPG, PNG, GIF, WebP)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 10MB)");
      return;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await axios.post(`${API}/admin/upload`, uploadFormData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const imageUrl = `${BACKEND_URL}${res.data.url}`;
      
      if (isMain) {
        setFormData({ ...formData, image_url: imageUrl });
      } else {
        setFormData({ ...formData, images: [...formData.images, imageUrl] });
      }
      toast.success("Bild hochgeladen");
    } catch (e) {
      console.error("Upload error:", e);
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const addSpec = () => {
    if (specKey.trim() && specValue.trim()) {
      setFormData({
        ...formData,
        specifications: { ...formData.specifications, [specKey.trim()]: specValue.trim() }
      });
      setSpecKey("");
      setSpecValue("");
    }
  };

  const removeSpec = (key) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    setFormData({ ...formData, specifications: newSpecs });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock)
      };

      if (product) {
        await axios.put(`${API}/admin/products/${product.id}`, data, { withCredentials: true });
        toast.success("Produkt aktualisiert");
      } else {
        await axios.post(`${API}/admin/products`, data, { withCredentials: true });
        toast.success("Produkt erstellt");
      }
      onSave();
    } catch (e) {
      toast.error("Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="label-brutal">Name *</Label>
          <Input name="name" value={formData.name} onChange={handleChange} required className="input-brutal" />
        </div>
        <div className="col-span-2">
          <Label className="label-brutal">Beschreibung *</Label>
          <Textarea name="description" value={formData.description} onChange={handleChange} required rows={3} className="input-brutal" />
        </div>
        <div>
          <Label className="label-brutal">Preis (€) *</Label>
          <Input type="number" name="price" value={formData.price} onChange={handleChange} required step="0.01" className="input-brutal" />
        </div>
        <div>
          <Label className="label-brutal">Lagerbestand</Label>
          <Input type="number" name="stock" value={formData.stock} onChange={handleChange} className="input-brutal" />
        </div>
        <div className="col-span-2">
          <Label className="label-brutal">Kategorie *</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="rounded-none border-2">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Image */}
      <div>
        <Label className="label-brutal">Hauptbild *</Label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, true)}
              className="hidden"
              id="main-image-upload"
              disabled={uploading}
            />
            <label
              htmlFor="main-image-upload"
              className={`btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}
            >
              <Image className="w-4 h-4" />
              {uploading ? "Wird hochgeladen..." : "Bild hochladen"}
            </label>
          </div>
        </div>
        {formData.image_url && (
          <div className="mt-2 relative inline-block">
            <img src={formData.image_url} alt="Hauptbild" className="w-32 h-32 object-cover border" />
            <button
              type="button"
              onClick={() => setFormData({ ...formData, image_url: "" })}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Additional Images */}
      <div>
        <Label className="label-brutal">Weitere Bilder</Label>
        <div className="mb-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, false)}
            className="hidden"
            id="additional-image-upload"
            disabled={uploading}
          />
          <label
            htmlFor="additional-image-upload"
            className={`btn-secondary inline-flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {uploading ? "Wird hochgeladen..." : "Bild hinzufügen"}
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {formData.images.map((img, idx) => (
            <div key={idx} className="relative">
              <img src={img} alt={`Bild ${idx + 1}`} className="w-20 h-20 object-cover border" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Specifications */}
      <div>
        <Label className="label-brutal">Technische Daten</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={specKey}
            onChange={(e) => setSpecKey(e.target.value)}
            className="input-brutal"
            placeholder="Eigenschaft"
          />
          <Input
            value={specValue}
            onChange={(e) => setSpecValue(e.target.value)}
            className="input-brutal"
            placeholder="Wert"
          />
          <button type="button" onClick={addSpec} className="btn-secondary px-4">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1">
          {Object.entries(formData.specifications).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center bg-[#F4F4F5] p-2 text-sm">
              <span><strong>{key}:</strong> {value}</span>
              <button type="button" onClick={() => removeSpec(key)} className="text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="btn-primary w-full" disabled={loading || uploading}>
        {loading ? "Wird gespeichert..." : (product ? "Aktualisieren" : "Erstellen")}
      </Button>
    </form>
  );
};

// Admin Categories
const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", image_url: "" });

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/admin/categories`, { withCredentials: true });
      setCategories(res.data);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/admin/categories/${editingCategory.id}`, formData, { withCredentials: true });
        toast.success("Kategorie aktualisiert");
      } else {
        await axios.post(`${API}/admin/categories`, formData, { withCredentials: true });
        toast.success("Kategorie erstellt");
      }
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", image_url: "" });
      setEditingCategory(null);
      fetchCategories();
    } catch (e) {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm("Kategorie wirklich löschen?")) return;
    try {
      await axios.delete(`${API}/admin/categories/${categoryId}`, { withCredentials: true });
      toast.success("Kategorie gelöscht");
      fetchCategories();
    } catch (e) {
      toast.error("Fehler beim Löschen");
    }
  };

  return (
    <div className="bg-white border border-[#E4E4E7]">
      <div className="p-4 border-b border-[#E4E4E7] flex justify-between items-center">
        <h2 className="font-bold text-lg">Kategorien verwalten</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="btn-primary text-sm flex items-center gap-2"
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: "", description: "", image_url: "" });
              }}
            >
              <Plus className="w-4 h-4" /> Neue Kategorie
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="label-brutal">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-brutal"
                />
              </div>
              <div>
                <Label className="label-brutal">Beschreibung</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-brutal"
                />
              </div>
              <div>
                <Label className="label-brutal">Bild URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="input-brutal"
                />
              </div>
              <Button type="submit" className="btn-primary w-full">
                {editingCategory ? "Aktualisieren" : "Erstellen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="border border-[#E4E4E7] p-4">
              <h3 className="font-bold mb-1">{cat.name}</h3>
              <p className="text-sm text-[#71717A] mb-4">{cat.description || "Keine Beschreibung"}</p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm py-1 px-3"
                  onClick={() => {
                    setEditingCategory(cat);
                    setFormData({ name: cat.name, description: cat.description, image_url: cat.image_url });
                    setIsDialogOpen(true);
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  className="text-red-600 text-sm py-1 px-3 border border-red-200 hover:bg-red-50"
                  onClick={() => handleDelete(cat.id)}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Orders
const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/admin/orders`, { withCredentials: true });
        setOrders(res.data);
      } catch (e) {
        console.error("Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="bg-white border border-[#E4E4E7]">
      <div className="p-4 border-b border-[#E4E4E7]">
        <h2 className="font-bold text-lg">Bestellungen</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-[#71717A]">Keine Bestellungen vorhanden</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F5]">
              <tr>
                <th className="text-left p-4 text-sm font-semibold">Bestellnr.</th>
                <th className="text-left p-4 text-sm font-semibold">Kunde</th>
                <th className="text-left p-4 text-sm font-semibold">Gesamt</th>
                <th className="text-left p-4 text-sm font-semibold">Status</th>
                <th className="text-left p-4 text-sm font-semibold">Datum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[#E4E4E7]">
                  <td className="p-4 font-mono text-sm">{order.order_number}</td>
                  <td className="p-4">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-sm text-[#71717A]">{order.customer.email}</p>
                  </td>
                  <td className="p-4 font-bold">{order.total.toLocaleString('de-DE')} €</td>
                  <td className="p-4">
                    <span className={`badge ${order.status === 'Ausstehend' ? 'badge-pending' : 'badge-success'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[#71717A]">
                    {new Date(order.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Admin Quotes
const AdminQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await axios.get(`${API}/admin/quotes`, { withCredentials: true });
        setQuotes(res.data);
      } catch (e) {
        console.error("Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  return (
    <div className="bg-white border border-[#E4E4E7]">
      <div className="p-4 border-b border-[#E4E4E7]">
        <h2 className="font-bold text-lg">Angebotsanfragen</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="p-8 text-center text-[#71717A]">Keine Anfragen vorhanden</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F5]">
              <tr>
                <th className="text-left p-4 text-sm font-semibold">Anfragenr.</th>
                <th className="text-left p-4 text-sm font-semibold">Produkt</th>
                <th className="text-left p-4 text-sm font-semibold">Kunde</th>
                <th className="text-left p-4 text-sm font-semibold">Menge</th>
                <th className="text-left p-4 text-sm font-semibold">Status</th>
                <th className="text-left p-4 text-sm font-semibold">Datum</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b border-[#E4E4E7]">
                  <td className="p-4 font-mono text-sm">{quote.quote_number}</td>
                  <td className="p-4 font-medium">{quote.product_name}</td>
                  <td className="p-4">
                    <p className="font-medium">{quote.customer.name}</p>
                    <p className="text-sm text-[#71717A]">{quote.customer.email}</p>
                  </td>
                  <td className="p-4">{quote.quantity}</td>
                  <td className="p-4">
                    <span className={`badge ${quote.status === 'Neu' ? 'badge-success' : 'badge-pending'}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[#71717A]">
                    {new Date(quote.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// AGB Page
const AGBPage = () => {
  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="agb-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Rechtliches</p>
          <h1 className="text-4xl md:text-5xl font-bold">Allgemeine Geschäftsbedingungen</h1>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-8">
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">§ 1 Geltungsbereich</h2>
            <p className="text-[#71717A]">
              (1) Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen der 
              G.P.C. Maschinen-Vertriebs-GmbH, Hauptstr. 180, D-51503 Rösrath (nachfolgend "Verkäufer") und 
              dem Kunden (nachfolgend "Käufer") über den Kauf von Maschinen und Industrieanlagen.
            </p>
            <p className="text-[#71717A] mt-2">
              (2) Abweichende Bedingungen des Käufers werden nicht anerkannt, es sei denn, der Verkäufer 
              stimmt ihrer Geltung ausdrücklich schriftlich zu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">§ 2 Vertragsschluss</h2>
            <p className="text-[#71717A]">
              (1) Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, 
              sondern eine Aufforderung zur Bestellung dar.
            </p>
            <p className="text-[#71717A] mt-2">
              (2) Mit der Bestellung erklärt der Käufer verbindlich, die bestellte Ware erwerben zu wollen. 
              Der Vertrag kommt zustande, wenn der Verkäufer die Bestellung durch eine Auftragsbestätigung 
              per E-Mail annimmt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">§ 3 Preise und Zahlung</h2>
            <p className="text-[#71717A]">
              (1) Alle angegebenen Preise sind Nettopreise zuzüglich der gesetzlichen Mehrwertsteuer.
            </p>
            <p className="text-[#71717A] mt-2">
              (2) Die Zahlung erfolgt per Rechnung mit einem Zahlungsziel von 14 Tagen nach Rechnungserhalt 
              per Überweisung auf das in der Rechnung angegebene Konto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">§ 7 Schlussbestimmungen</h2>
            <p className="text-[#71717A]">
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
            </p>
            <p className="text-[#71717A] mt-2">
              (2) Gerichtsstand ist Köln.
            </p>
            <p className="text-[#71717A] mt-4 text-sm">
              Stand: Januar 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

// Widerrufsrecht Page
const WiderrufsrechtPage = () => {
  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="widerrufsrecht-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Rechtliches</p>
          <h1 className="text-4xl md:text-5xl font-bold">Widerrufsbelehrung</h1>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-8">
          <div className="bg-[#FEF3C7] border border-[#D97706] p-4 mb-8">
            <p className="font-semibold text-[#D97706]">Hinweis für Geschäftskunden</p>
            <p className="text-sm mt-1">
              Das Widerrufsrecht gilt nur für Verbraucher im Sinne des § 13 BGB. Geschäftskunden 
              (B2B) sind vom Widerrufsrecht ausgeschlossen.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Widerrufsrecht</h2>
            <p className="text-[#71717A]">
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
            </p>
            <div className="bg-[#F4F4F5] p-4 my-4">
              <p className="font-semibold">G.P.C. Maschinen-Vertriebs-GmbH</p>
              <p>Hauptstr. 180</p>
              <p>D-51503 Rösrath</p>
              <p>E-Mail: widerruf@gpc-maschinen.de</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// Datenschutz Page
const DatenschutzPage = () => {
  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="datenschutz-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Rechtliches</p>
          <h1 className="text-4xl md:text-5xl font-bold">Datenschutzerklärung</h1>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-8">
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">1. Datenschutz auf einen Blick</h2>
            <p className="text-[#71717A]">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen 
              Daten passiert, wenn Sie diese Website besuchen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">2. Verantwortliche Stelle</h2>
            <p>G.P.C. Maschinen-Vertriebs-GmbH</p>
            <p>Hauptstr. 180</p>
            <p>D-51503 Rösrath</p>
            <p className="mt-2">E-Mail: datenschutz@gpc-maschinen.de</p>
          </section>
        </div>
      </div>
    </div>
  );
};

// Impressum Page
const ImpressumPage = () => {
  return (
    <div className="py-8 bg-[#F4F4F5] min-h-screen" data-testid="impressum-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="label-brutal mb-2">Rechtliches</p>
          <h1 className="text-4xl md:text-5xl font-bold">Impressum</h1>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-8">
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Angaben gemäß § 5 TMG</h2>
            <p className="font-semibold">G.P.C. Maschinen-Vertriebs-GmbH</p>
            <p>Hauptstr. 180</p>
            <p>D-51503 Rösrath</p>
            <p>Deutschland</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Kontakt</h2>
            <table className="specs-table">
              <tbody>
                <tr>
                  <td>E-Mail:</td>
                  <td>info@gpc-maschinen.de</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Registereintrag</h2>
            <table className="specs-table">
              <tbody>
                <tr>
                  <td>Registergericht:</td>
                  <td>Amtsgericht Köln</td>
                </tr>
                <tr>
                  <td>Registernummer:</td>
                  <td>HRB 46673</td>
                </tr>
                <tr>
                  <td>LEI:</td>
                  <td>5299001SB2BT5RZXLR15</td>
                </tr>
                <tr>
                  <td>EUID:</td>
                  <td>DER3306.HRB46673</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Geschäftsführer</h2>
            <p>Marius Weitz</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Umsatzsteuer-ID</h2>
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:</p>
            <p className="font-semibold mt-2">DE154879120</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>Marius Weitz</p>
            <p>Hauptstr. 180</p>
            <p>D-51503 Rösrath</p>
          </section>
        </div>
      </div>
    </div>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="footer py-12" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-8 h-8 text-[#FF3B30]" />
              <span className="font-bold text-xl text-white">G.P.C</span>
            </div>
            <p className="text-[#E4E4E7] text-sm">
              G.P.C. Maschinen-Vertriebs-GmbH - Ihr Partner für hochwertige Industriemaschinen.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/">Startseite</Link></li>
              <li><Link to="/produkte">Produkte</Link></li>
              <li><Link to="/kontakt">Kontakt</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white mb-4">Kategorien</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/produkte">Baumaschinen</Link></li>
              <li><Link to="/produkte">CNC-Maschinen</Link></li>
              <li><Link to="/produkte">Robotik</Link></li>
              <li><Link to="/produkte">Lasertechnik</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/impressum">Impressum</Link></li>
              <li><Link to="/datenschutz">Datenschutz</Link></li>
              <li><Link to="/agb">AGB</Link></li>
              <li><Link to="/widerrufsrecht">Widerrufsrecht</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#3f3f46] mt-8 pt-8 text-center text-sm text-[#71717A]">
          <p>© 2026 G.P.C. Maschinen-Vertriebs-GmbH. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App
function App() {
  return (
    <div className="App min-h-screen flex flex-col">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-right" />
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              
              {/* Public Routes */}
              <Route path="/*" element={
                <>
                  <Navbar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/produkte" element={<ProductsPage />} />
                      <Route path="/produkt/:id" element={<ProductDetailPage />} />
                      <Route path="/kasse" element={<CheckoutPage />} />
                      <Route path="/bestellung/:orderNumber" element={<OrderConfirmationPage />} />
                      <Route path="/angebot/:productId" element={<QuoteRequestPage />} />
                      <Route path="/kontakt" element={<ContactPage />} />
                      <Route path="/impressum" element={<ImpressumPage />} />
                      <Route path="/datenschutz" element={<DatenschutzPage />} />
                      <Route path="/agb" element={<AGBPage />} />
                      <Route path="/widerrufsrecht" element={<WiderrufsrechtPage />} />
                    </Routes>
                  </main>
                  <Footer />
                </>
              } />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
