import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { ShoppingCart, Menu, X, Phone, Mail, MapPin, ChevronRight, Plus, Minus, Trash2, Send, Package, ArrowLeft, LogOut, Settings, BarChart3, FolderOpen, Box, FileText, MessageSquare, Edit, Eye, Save, Image, Download } from "lucide-react";
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
    <>
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-black" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <img src="/gpc-logo.jpg" alt="Josten Haus & Garten" className="h-12 w-auto" />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="nav-link font-medium" data-testid="nav-home">Startseite</Link>
              <Link to="/produkte" className="nav-link font-medium" data-testid="nav-products">Produkte</Link>
              <Link to="/kontakt" className="nav-link font-medium" data-testid="nav-contact">Kontakt</Link>
            </div>

            <div className="flex items-center gap-4">
              <button 
                className="relative p-2" 
                data-testid="cart-button"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#2D7A3A] text-white text-xs w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

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

      {/* Cart Sidebar Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-[100]" data-testid="cart-overlay">
          {/* Dark backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setCartOpen(false)}
          />
          {/* Cart panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[450px] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#E4E4E7]">
              <h2 className="font-bold text-2xl">Warenkorb</h2>
              <button 
                onClick={() => setCartOpen(false)}
                className="p-2 hover:bg-[#F4F4F5]"
                data-testid="close-cart"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartSidebar onClose={() => setCartOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Cart Sidebar
const CartSidebar = ({ onClose }) => {
  const { cart, updateCartItem, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [shippingInfo, setShippingInfo] = useState(null);

  useEffect(() => {
    axios.get(`${API}/settings/shipping`).then(res => setShippingInfo(res.data)).catch(() => {});
  }, []);

  const handleCheckout = () => {
    // Erst Sheet schließen, dann navigieren
    if (onClose) {
      onClose();
    }
    // Kurzes Delay damit das Sheet Zeit hat zu schließen
    setTimeout(() => {
      navigate("/kasse");
    }, 100);
  };

  const handleContinueShopping = () => {
    if (onClose) {
      onClose();
    }
    setTimeout(() => {
      navigate("/produkte");
    }, 100);
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-[#71717A]">Ihr Warenkorb ist leer</p>
        <button 
          onClick={handleContinueShopping}
          className="mt-4 btn-primary" 
          data-testid="continue-shopping"
        >
          Produkte ansehen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4">
      <div className="flex-1 overflow-auto py-4">
        {cart.items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-4 py-4 border-b border-[#E4E4E7]" data-testid={`cart-item-${item.product_id}`}>
            <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{item.name}</h4>
              <p className="text-[#2D7A3A] font-bold">{item.price.toLocaleString('de-DE')} €</p>
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
              className="p-2 text-[#71717A] hover:text-[#2D7A3A] flex-shrink-0"
              onClick={() => removeFromCart(item.product_id)}
              data-testid={`remove-${item.product_id}`}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-[#E4E4E7] py-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#71717A]">Zwischensumme:</span>
          <span className="font-semibold">{cart.total.toLocaleString('de-DE')} €</span>
        </div>
        {shippingInfo && shippingInfo.shipping_costs.length > 0 && (
          <div className="text-xs text-[#71717A] mb-2" data-testid="cart-shipping-info">
            {shippingInfo.free_shipping_threshold > 0 && cart.total >= shippingInfo.free_shipping_threshold ? (
              <span className="text-[#16A34A] font-semibold">Kostenloser Versand!</span>
            ) : (
              <span>zzgl. Versandkosten (ab {Math.min(...shippingInfo.shipping_costs.map(s => s.cost)).toLocaleString('de-DE')} €)</span>
            )}
          </div>
        )}
        {shippingInfo && shippingInfo.shipping_note && (
          <p className="text-xs text-[#71717A] mb-3">{shippingInfo.shipping_note}</p>
        )}
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
      style={{ backgroundImage: `url(https://images.unsplash.com/photo-1762326441132-4caeac42be3a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxnYXJkZW4lMjBjZW50ZXIlMjBvdXRkb29yJTIwZnVybml0dXJlJTIwbGF3biUyMG1vd2VyfGVufDB8fHx8MTc3NTc0OTMyMHww&ixlib=rb-4.1.0&q=85)` }}
      data-testid="hero-section"
    >
      <div className="hero-overlay" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <p className="label-brutal text-white mb-4">Haus & Garten Handel</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Ihr Zuhause. Ihr Garten. Unser Sortiment.
          </h1>
          <p className="text-lg text-gray-200 mb-8">
            Entdecken Sie unser vielfältiges Angebot an Produkten für Haus, Garten und Outdoor-Bereich.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/produkte" className="btn-primary flex items-center justify-center gap-2" data-testid="hero-cta">
              Onlineshop
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
        setProducts(res.data.filter(p => p.is_bestseller));
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
              <p className="label-brutal mb-2">Unsere Bestseller</p>
              <h2 className="text-3xl md:text-4xl font-bold">Unsere Bestseller</h2>
            </div>
            <Link to="/produkte" className="hidden md:flex items-center gap-2 text-[#2D7A3A] font-semibold hover:underline" data-testid="view-all-products">
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
                <Package className="w-8 h-8 text-[#2D7A3A]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Schnelle Lieferung</h3>
              <p className="text-[#71717A]">Deutschlandweite Lieferung und professionelle Installation</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F4F4F5] flex items-center justify-center">
                <Phone className="w-8 h-8 text-[#2D7A3A]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Expertenberatung</h3>
              <p className="text-[#71717A]">Unsere Fachberater helfen Ihnen bei der Auswahl</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F4F4F5] flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#2D7A3A]" />
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
        <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">{product.category}{product.article_number ? ` · ${product.article_number}` : ''}</p>
        <Link to={`/produkt/${product.id}`}>
          <h3 className="font-bold text-lg mb-2 hover:text-[#2D7A3A] transition-colors">{product.name}</h3>
        </Link>
        <p className="text-[#71717A] text-sm mb-2 line-clamp-2">{product.description}</p>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={`text-sm ${s <= Math.round(product.rating) ? 'text-yellow-500' : 'text-gray-300'}`}>&#9733;</span>
            ))}
            <span className="text-xs text-[#71717A] ml-1">({product.rating})</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            {product.sale_price ? (
              <>
                <span className="text-sm text-[#71717A] line-through mr-2">{product.price.toLocaleString('de-DE')} €</span>
                <span className="text-xl font-bold text-[#2D7A3A]">{product.sale_price.toLocaleString('de-DE')} €</span>
              </>
            ) : (
              <span className="text-xl font-bold">{product.price.toLocaleString('de-DE')} €</span>
            )}
          </div>
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
          <h1 className="text-4xl md:text-5xl font-bold">Unser Sortiment</h1>
        </div>

        {/* Kategorie-Kacheln */}
        {categories.length > 0 && (
          <div className="mb-8" data-testid="category-tiles">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2 ${
                  selectedCategory === "all"
                    ? 'bg-[#18181B] text-white border-[#18181B]'
                    : 'bg-white text-[#3F3F46] border-[#E4E4E7] hover:border-[#18181B]'
                }`}
                data-testid="category-tile-all"
              >
                Alle ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2 ${
                      selectedCategory === cat
                        ? 'bg-[#2D7A3A] text-white border-[#2D7A3A]'
                        : 'bg-white text-[#3F3F46] border-[#E4E4E7] hover:border-[#2D7A3A]'
                    }`}
                    data-testid={`category-tile-${cat}`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="filter-sidebar sticky top-24">
              <h3 className="font-bold text-lg mb-4">Filter</h3>

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
  const [activeTab, setActiveTab] = useState("beschreibung");
  const [showShippingInfo, setShowShippingInfo] = useState(false);
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
                      className={`w-20 h-20 flex-shrink-0 border-2 ${selectedImage === idx ? 'border-[#2D7A3A]' : 'border-[#E4E4E7]'}`}
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
              {product.article_number && <p className="text-sm text-[#71717A] mb-1" data-testid="article-number">Art.-Nr.: {product.article_number}</p>}
              <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="product-name">{product.name}</h1>
              
              {product.rating > 0 && (
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-xl ${s <= Math.round(product.rating) ? 'text-yellow-500' : 'text-gray-300'}`}>&#9733;</span>
                  ))}
                  <span className="text-sm text-[#71717A] ml-2">{product.rating} von 5</span>
                  {(product.reviews || []).length > 0 && (
                    <span className="text-sm text-[#71717A]">({product.reviews.length} Bewertungen)</span>
                  )}
                </div>
              )}
              
              <div className="mb-6" data-testid="product-price">
                {product.sale_price ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xl text-[#71717A] line-through">{product.price.toLocaleString('de-DE')} €</span>
                    <span className="text-3xl font-bold text-[#2D7A3A]">{product.sale_price.toLocaleString('de-DE')} €</span>
                    <span className="bg-[#2D7A3A] text-white text-sm font-bold px-2 py-1">
                      -{Math.round((1 - product.sale_price / product.price) * 100)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-[#2D7A3A]">{product.price.toLocaleString('de-DE')} €</span>
                )}
                <p className="text-xs text-[#71717A] mt-1">Alle Preise inkl. MwSt., zzgl. Versandkosten</p>
              </div>

              {/* Versand & Lieferinformation als Popup-Link */}
              <div className="mb-6" data-testid="shipping-info-box">
                <Dialog open={showShippingInfo} onOpenChange={setShowShippingInfo}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-[#71717A] hover:text-[#2D7A3A] underline transition-colors" data-testid="shipping-info-toggle">
                      Versand & Lieferinformation
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
                    <DialogHeader>
                      <DialogTitle>Versand & Lieferinformation</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-[#3F3F46] space-y-3 leading-relaxed" data-testid="shipping-info-content">
                      <p>Bei josten-hug.de bestellen Sie ohne Mindestbestellwert. Lieferungen sind aktuell nur innerhalb Deutschlands möglich. Innerhalb Deutschlands betragen die Versandkosten <strong>5,95 Euro inkl. MwSt.</strong> pro Bestellung. Ab einem Warenwert von <strong>50 Euro</strong> liefern wir versandkostenfrei.</p>
                      <p>Bei Speditionslieferungen auf Inseln ermitteln wir die Kosten auf Anfrage oder liefern frei Festland. Sofern Sie eine Lieferadresse auf einer Insel haben, bitten wir Sie sich bei uns zu melden und ein Angebot unter Angabe der Artikelnummer in der gewünschten Menge für die Lieferung auf eine Insel anzufordern.</p>
                      <div>
                        <p className="font-semibold text-[#09090B] mb-2">Welche Liefergebiete sind betroffen?</p>
                        <div className="pl-4 border-l-2 border-[#E4E4E7] space-y-2 text-xs">
                          <p><strong>Ostfriesische Inseln</strong> (Baltrum, Borkum, Juist, Langeoog, Norderney, Spiekeroog, Wangerooge) – PLZ: 26465, 26474, 26486, 26548, 26571, 26579, 26757</p>
                          <p><strong>Nordfriesische Inseln</strong> (Amrum, Föhr, Nordstrand, Pellworm, Sylt, die meisten Halligen) – PLZ: 25845, 25846-25847, 25849, 25859, 25863, 25869, 25929-25933, 25938-25942, 25946-25949, 25952-25955, 25961-25970, 25980, 25985-25986, 25988-25990, 25992-25994, 25996-25999</p>
                          <p><strong>Helgoland</strong> – PLZ: 27498</p>
                          <p><strong>Neuwerk</strong> – PLZ: 27499</p>
                          <p><strong>Hiddensee</strong> – PLZ: 18565</p>
                          <p><strong>Einzelne Adressen auf Inseln in Binnenseen</strong> (z.&nbsp;B. Chiemsee) – PLZ: 83256</p>
                        </div>
                      </div>
                      <p>In einigen Fällen besteht die Möglichkeit, die Lieferung an eine Filiale des Versanddienstleisters auf dem Festland zu senden. Von dort aus können Sie den Weitertransport selbst organisieren. Gerne beraten wir Sie zu möglichen Alternativen, um Ihre Transportkosten zu optimieren.</p>
                      <p>Die Lieferung von Waren erfolgt auf dem Versandweg an die vom Kunden angegebene Lieferanschrift, sofern nichts anderes vereinbart ist. Bei der Abwicklung der Transaktion ist die in der Bestellabwicklung des Verkäufers angegebene Lieferanschrift maßgeblich.</p>
                      <p>Bei Waren, die per Spedition geliefert werden, erfolgt die Lieferung „frei Bordsteinkante", also bis zu der der Lieferadresse nächst gelegenen öffentlichen Bordsteinkante, sofern sich aus den Versandinformationen im Online-Shop der Josten Haus & Garten Handelsgesellschaft mbH nichts anderes ergibt und sofern nichts anderes vereinbart ist.</p>
                      <p>Sendet das Transportunternehmen die versandte Ware an den Verkäufer zurück, da eine Zustellung beim Kunden nicht möglich war, trägt der Kunde die Kosten für den erfolglosen Versand. Dies gilt nicht, wenn der Kunde sein Widerrufsrecht wirksam ausübt, wenn er den Umstand, der zur Unmöglichkeit der Zustellung geführt hat, nicht zu vertreten hat oder wenn er vorübergehend an der Annahme der angebotenen Leistung verhindert war, es sei denn, dass der Verkäufer ihm die Leistung eine angemessene Zeit vorher angekündigt hatte.</p>
                      <p className="font-semibold text-[#2D7A3A]">Achtung: Selbstabholung ist aus logistischen Gründen nicht möglich.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Lagerstatus */}
              <div className="mb-6" data-testid="stock-status">
                {product.stock > 5 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    <span className="text-sm font-semibold text-[#16A34A]">Auf Lager</span>
                  </div>
                ) : product.stock > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    <span className="text-sm font-semibold text-[#D97706]">Nur noch {product.stock} verfügbar</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                    <span className="text-sm font-semibold text-[#DC2626]">Nicht verfügbar</span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <Label className="label-brutal">Menge</Label>
                <div className="flex items-center gap-2">
                  <button className="quantity-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="decrease-quantity" disabled={product.stock === 0}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <button className="quantity-btn" onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))} data-testid="increase-quantity" disabled={product.stock === 0}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 ${product.stock > 0 ? 'btn-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed px-6 py-3 font-bold'}`}
                  onClick={() => product.stock > 0 && addToCart(product.id, quantity)}
                  disabled={product.stock === 0}
                  data-testid="add-to-cart-button"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.stock > 0 ? 'In den Warenkorb' : 'Nicht verfügbar'}
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
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white border border-[#E4E4E7] mt-6">
          {/* Tab Headers */}
          <div className="flex border-b border-[#E4E4E7]" data-testid="product-tabs">
            {[
              { id: "beschreibung", label: "Beschreibung" },
              { id: "technische-daten", label: "Technische Daten" },
              { id: "downloads", label: "Downloads" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#2D7A3A] text-[#09090B]'
                    : 'text-[#71717A] hover:text-[#09090B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Beschreibung Tab */}
            {activeTab === "beschreibung" && (
              <div data-testid="tab-content-beschreibung">
                <div className="prose max-w-none">
                  {product.description.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-3 text-[#3F3F46] leading-relaxed">{line || '\u00A0'}</p>
                  ))}
                </div>

                {/* Kundenbewertungen */}
                {(product.reviews || []).length > 0 && (
                  <div className="mt-8 pt-8 border-t border-[#E4E4E7]">
                    <h3 className="font-bold text-lg mb-6">Kundenbewertungen ({product.reviews.length})</h3>
                    <div className="space-y-6">
                      {product.reviews.map((review, idx) => (
                        <div key={idx} className="border border-[#E4E4E7] p-4 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#18181B] text-white rounded-full flex items-center justify-center font-bold">
                                {review.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold">{review.name}</span>
                                <p className="text-xs text-[#71717A]">{review.date}</p>
                              </div>
                            </div>
                            <span className="text-yellow-500">
                              {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
                            </span>
                          </div>
                          <p className="text-sm text-[#3F3F46] leading-relaxed">{review.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Technische Daten Tab */}
            {activeTab === "technische-daten" && (
              <div data-testid="tab-content-technische-daten">
                {Object.keys(product.specifications || {}).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(product.specifications).map(([group, specs]) => {
                      if (typeof specs === 'object' && specs !== null) {
                        return (
                          <div key={group}>
                            <h4 className="font-bold text-sm uppercase tracking-wider text-[#71717A] mb-3">{group}</h4>
                            <table className="specs-table">
                              <tbody>
                                {Object.entries(specs).map(([key, value]) => (
                                  <tr key={key}>
                                    <td>{key}</td>
                                    <td>{value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      return (
                        <table key={group} className="specs-table">
                          <tbody>
                            <tr>
                              <td>{group}</td>
                              <td>{specs}</td>
                            </tr>
                          </tbody>
                        </table>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[#71717A]">Keine technischen Daten vorhanden.</p>
                )}
              </div>
            )}

            {/* Downloads Tab */}
            {activeTab === "downloads" && (
              <div data-testid="tab-content-downloads">
                {(product.downloads || []).length > 0 ? (
                  <div className="space-y-3">
                    {product.downloads.map((dl, idx) => (
                      <a
                        key={idx}
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 border border-[#E4E4E7] hover:border-[#2D7A3A] transition-colors group"
                        data-testid={`download-item-${idx}`}
                      >
                        <div className="w-12 h-12 bg-[#2D7A3A] text-white flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold group-hover:text-[#2D7A3A] transition-colors">{dl.name}</p>
                          <p className="text-sm text-[#71717A]">{dl.type || 'Dokument'}</p>
                        </div>
                        <Download className="w-5 h-5 text-[#71717A] group-hover:text-[#2D7A3A]" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#71717A]">Keine Downloads vorhanden.</p>
                )}
              </div>
            )}
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
  const [shippingInfo, setShippingInfo] = useState(null);
  const [selectedZone, setSelectedZone] = useState("");
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

  useEffect(() => {
    axios.get(`${API}/settings/shipping`).then(res => {
      setShippingInfo(res.data);
      if (res.data.shipping_costs?.length === 1) {
        setSelectedZone(res.data.shipping_costs[0].zone);
      }
    }).catch(() => {});
  }, []);

  const isFreeShipping = shippingInfo && shippingInfo.free_shipping_threshold > 0 && cart.total >= shippingInfo.free_shipping_threshold;
  const shippingCost = isFreeShipping ? 0 : (shippingInfo?.shipping_costs?.find(s => s.zone === selectedZone)?.cost || 0);
  const grandTotal = cart.total + shippingCost;

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
        shipping_zone: selectedZone || null,
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

              {/* Versandart */}
              {shippingInfo && shippingInfo.shipping_costs.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Versandart</h2>
                  <div className="mb-8">
                    {isFreeShipping ? (
                      <div className="bg-[#DCFCE7] p-4 border-l-4 border-[#16A34A]" data-testid="free-shipping-badge">
                        <p className="font-semibold text-[#16A34A]">Kostenloser Versand</p>
                        <p className="text-sm text-[#71717A] mt-1">Ab einem Bestellwert von {shippingInfo.free_shipping_threshold.toLocaleString('de-DE')} € entfallen die Versandkosten.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {shippingInfo.shipping_costs.map((sc) => (
                          <label key={sc.zone} className={`flex items-center justify-between p-4 border-2 cursor-pointer transition-all ${selectedZone === sc.zone ? 'border-[#2D7A3A] bg-[#FFF5F5]' : 'border-[#E4E4E7] hover:border-[#A1A1AA]'}`} data-testid={`shipping-zone-${sc.zone}`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="shipping_zone" value={sc.zone} checked={selectedZone === sc.zone} onChange={(e) => setSelectedZone(e.target.value)} className="accent-[#2D7A3A]" />
                              <span className="font-semibold">{sc.zone}</span>
                            </div>
                            <span className="font-bold">{sc.cost.toLocaleString('de-DE')} €</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {shippingInfo.shipping_note && (
                      <p className="text-xs text-[#71717A] mt-3">{shippingInfo.shipping_note}</p>
                    )}
                  </div>
                </>
              )}

              <h2 className="text-xl font-bold mb-6 border-b border-[#E4E4E7] pb-4">Zahlungsart</h2>
              
              <div className="bg-[#F4F4F5] p-4 mb-6 border-l-4 border-[#2D7A3A]">
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
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#71717A]">Zwischensumme:</span>
                  <span className="font-semibold">{cart.total.toLocaleString('de-DE')} €</span>
                </div>
                <div className="flex justify-between items-center mb-2" data-testid="checkout-shipping-cost">
                  <span className="text-sm text-[#71717A]">Versand:</span>
                  <span className="font-semibold">{shippingCost > 0 ? `${shippingCost.toLocaleString('de-DE')} €` : (isFreeShipping ? 'Kostenlos' : '—')}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#E4E4E7] pt-3 mt-3">
                  <span className="text-lg font-semibold">Gesamt:</span>
                  <span className="text-2xl font-bold" data-testid="checkout-grand-total">{grandTotal.toLocaleString('de-DE')} €</span>
                </div>
                <p className="text-xs text-[#71717A] mt-2">inkl. MwSt.</p>
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
          <p className="text-2xl font-bold text-[#2D7A3A]" data-testid="order-number">{order.order_number}</p>
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
            {order.shipping_cost > 0 && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-[#71717A]">Zwischensumme:</span>
                  <span className="font-semibold">{(order.subtotal || (order.total - order.shipping_cost)).toLocaleString('de-DE')} €</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#71717A]">Versand{order.shipping_zone ? ` (${order.shipping_zone})` : ''}:</span>
                  <span className="font-semibold">{order.shipping_cost.toLocaleString('de-DE')} €</span>
                </div>
              </>
            )}
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
            <p className="text-2xl font-bold text-[#2D7A3A] mb-6" data-testid="quote-number">{quoteNumber}</p>
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
              {product.sale_price ? (
                <>
                  <p className="text-sm text-[#71717A] line-through">{product.price.toLocaleString('de-DE')} €</p>
                  <p className="text-xl font-bold text-[#2D7A3A]">{product.sale_price.toLocaleString('de-DE')} €</p>
                </>
              ) : (
                <p className="text-xl font-bold text-[#2D7A3A]">{product.price.toLocaleString('de-DE')} €</p>
              )}
              <p className="text-xs text-[#71717A] mt-1">inkl. MwSt.</p>
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
                    <Mail className="w-5 h-5 text-[#2D7A3A]" />
                  </div>
                  <div>
                    <p className="label-brutal">E-Mail</p>
                    <p className="font-semibold">info@josten-hug.de</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#2D7A3A]" />
                  </div>
                  <div>
                    <p className="label-brutal">Adresse</p>
                    <p className="font-semibold">Josten Haus & Garten Handelsgesellschaft mbH</p>
                    <p className="text-[#71717A]">Hammer Landstr. 1 A</p>
                    <p className="text-[#71717A]">41460 Neuss</p>
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
            <Settings className="w-8 h-8 text-[#2D7A3A]" />
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
              <Settings className="w-6 h-6 text-[#2D7A3A]" />
              <span className="font-bold text-xl">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#71717A]">{user?.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 text-[#71717A] hover:text-[#2D7A3A]">
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
                <Box className="w-5 h-5 text-[#2D7A3A]" />
                <span className="text-sm text-[#71717A]">Produkte</span>
              </div>
              <p className="text-3xl font-bold">{stats.products}</p>
            </div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <FolderOpen className="w-5 h-5 text-[#2D7A3A]" />
                <span className="text-sm text-[#71717A]">Kategorien</span>
              </div>
              <p className="text-3xl font-bold">{stats.categories}</p>
            </div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-[#2D7A3A]" />
                <span className="text-sm text-[#71717A]">Bestellungen</span>
              </div>
              <p className="text-3xl font-bold">{stats.orders}</p>
              {stats.pending_orders > 0 && (
                <p className="text-sm text-[#D97706]">{stats.pending_orders} ausstehend</p>
              )}
            </div>
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-[#2D7A3A]" />
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
            <TabsTrigger value="products" className="rounded-none data-[state=active]:bg-[#2D7A3A] data-[state=active]:text-white">Produkte</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-none data-[state=active]:bg-[#2D7A3A] data-[state=active]:text-white">Kategorien</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-none data-[state=active]:bg-[#2D7A3A] data-[state=active]:text-white">Bestellungen</TabsTrigger>
            <TabsTrigger value="quotes" className="rounded-none data-[state=active]:bg-[#2D7A3A] data-[state=active]:text-white">Anfragen</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none data-[state=active]:bg-[#2D7A3A] data-[state=active]:text-white">Einstellungen</TabsTrigger>
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

          <TabsContent value="settings">
            <AdminSettings />
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
                <th className="text-left p-4 text-sm font-semibold">Art.-Nr.</th>
                <th className="text-left p-4 text-sm font-semibold">Name</th>
                <th className="text-left p-4 text-sm font-semibold">Kategorie</th>
                <th className="text-left p-4 text-sm font-semibold">Preis</th>
                <th className="text-left p-4 text-sm font-semibold">Bewertung</th>
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
                  <td className="p-4 text-sm font-mono text-[#71717A]">{product.article_number || '—'}</td>
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4 text-[#71717A]">{product.category}</td>
                  <td className="p-4 font-bold">
                    {product.sale_price ? (
                      <div>
                        <span className="text-sm text-[#71717A] line-through mr-1">{product.price.toLocaleString('de-DE')} €</span>
                        <br />
                        <span className="text-[#2D7A3A]">{product.sale_price.toLocaleString('de-DE')} €</span>
                      </div>
                    ) : (
                      <span>{product.price.toLocaleString('de-DE')} €</span>
                    )}
                  </td>
                  <td className="p-4">
                    {product.rating > 0 ? (
                      <span className="text-yellow-500">{'★'.repeat(Math.round(product.rating))} <span className="text-xs text-[#71717A]">{product.rating}</span></span>
                    ) : '-'}
                  </td>
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
    sale_price: product?.sale_price || "",
    rating: product?.rating || 0,
    reviews: product?.reviews || [],
    downloads: product?.downloads || [],
    category: product?.category || "",
    image_url: product?.image_url || "",
    images: product?.images || [],
    stock: product?.stock || 10,
    is_bestseller: product?.is_bestseller || false,
    article_number: product?.article_number || "",
    specifications: product?.specifications || {}
  });
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [specGroup, setSpecGroup] = useState("Allgemein");
  const [bulkText, setBulkText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);

  // Normalize old flat specs to grouped format
  const normalizeSpecs = (specs) => {
    if (!specs || Object.keys(specs).length === 0) return {};
    // Check if already grouped (value is an object)
    const firstValue = Object.values(specs)[0];
    if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
      return specs;
    }
    // Convert flat to grouped under "Allgemein"
    return { "Allgemein": specs };
  };

  useEffect(() => {
    if (product?.specifications) {
      setFormData(prev => ({
        ...prev,
        specifications: normalizeSpecs(product.specifications)
      }));
    }
  }, [product]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e, isMain = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Nur Bildformate erlaubt (JPG, PNG, GIF, WebP)");
      return;
    }

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
        setFormData(prev => ({ ...prev, image_url: imageUrl }));
      } else {
        setFormData(prev => ({ ...prev, images: [...prev.images, imageUrl] }));
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

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const validFiles = files.filter(f => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      toast.error(`${files.length - validFiles.length} Datei(en) übersprungen (falsches Format oder zu groß)`);
    }

    if (!validFiles.length) return;

    setUploading(true);
    let uploaded = 0;
    const newImages = [...formData.images];

    for (const file of validFiles) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        const res = await axios.post(`${API}/admin/upload`, uploadFormData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        });
        newImages.push(`${BACKEND_URL}${res.data.url}`);
        uploaded++;
      } catch (err) {
        console.error("Bulk upload error:", err);
      }
    }

    setFormData(prev => ({ ...prev, images: newImages }));
    setUploading(false);
    toast.success(`${uploaded} von ${validFiles.length} Bildern hochgeladen`);
    e.target.value = "";
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const addSpec = () => {
    if (specKey.trim() && specValue.trim()) {
      const group = specGroup.trim() || "Allgemein";
      const newSpecs = { ...formData.specifications };
      if (!newSpecs[group]) newSpecs[group] = {};
      newSpecs[group][specKey.trim()] = specValue.trim();
      setFormData({ ...formData, specifications: newSpecs });
      setSpecKey("");
      setSpecValue("");
    }
  };

  const removeSpec = (group, key) => {
    const newSpecs = { ...formData.specifications };
    if (newSpecs[group]) {
      delete newSpecs[group][key];
      if (Object.keys(newSpecs[group]).length === 0) {
        delete newSpecs[group];
      }
    }
    setFormData({ ...formData, specifications: newSpecs });
  };

  const removeGroup = (group) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[group];
    setFormData({ ...formData, specifications: newSpecs });
  };

  const parseBulkSpecs = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').filter(l => l.trim());
    const newSpecs = { ...formData.specifications };
    let currentGroup = specGroup.trim() || "Allgemein";

    for (const line of lines) {
      const trimmed = line.trim();
      // Line ending with ":" is a group header
      if (trimmed.endsWith(':') && !trimmed.includes('\t') && trimmed.split(':').length === 2 && trimmed.split(':')[1] === '') {
        currentGroup = trimmed.slice(0, -1).trim();
        if (!newSpecs[currentGroup]) newSpecs[currentGroup] = {};
        continue;
      }
      // Try to split by ":" or tab
      let key, value;
      if (trimmed.includes('\t')) {
        [key, ...value] = trimmed.split('\t');
        value = value.join('\t');
      } else if (trimmed.includes(':')) {
        [key, ...value] = trimmed.split(':');
        value = value.join(':');
      } else {
        continue;
      }
      if (key?.trim() && value?.trim()) {
        if (!newSpecs[currentGroup]) newSpecs[currentGroup] = {};
        newSpecs[currentGroup][key.trim()] = value.trim();
      }
    }
    setFormData({ ...formData, specifications: newSpecs });
    setBulkText("");
    setShowBulkPaste(false);
    toast.success("Spezifikationen importiert");
  };

  const addReview = () => {
    if (!reviewName.trim() || !reviewText.trim()) {
      toast.error("Name und Bewertungstext sind erforderlich");
      return;
    }
    const newReview = {
      name: reviewName.trim(),
      text: reviewText.trim(),
      rating: parseFloat(reviewRating),
      date: reviewDate
    };
    setFormData(prev => ({ ...prev, reviews: [...prev.reviews, newReview] }));
    setReviewName("");
    setReviewText("");
    setReviewRating(5);
    setReviewDate(new Date().toISOString().split('T')[0]);
    toast.success("Bewertung hinzugefügt");
  };

  const removeReview = (index) => {
    setFormData(prev => ({ ...prev, reviews: prev.reviews.filter((_, i) => i !== index) }));
  };

  const handleDownloadUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 20MB)");
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
      const fileUrl = `${BACKEND_URL}${res.data.url}`;
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const fileType = file.name.endsWith('.pdf') ? 'PDF' : file.name.split('.').pop().toUpperCase();
      setFormData(prev => ({
        ...prev,
        downloads: [...prev.downloads, { name: fileName, url: fileUrl, type: fileType }]
      }));
      toast.success("Download hinzugefügt");
    } catch (err) {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeDownload = (index) => {
    setFormData(prev => ({ ...prev, downloads: prev.downloads.filter((_, i) => i !== index) }));
  };

  const updateDownloadName = (index, name) => {
    setFormData(prev => ({
      ...prev,
      downloads: prev.downloads.map((dl, i) => i === index ? { ...dl, name } : dl)
    }));
  };

  const updateDownloadType = (index, type) => {
    setFormData(prev => ({
      ...prev,
      downloads: prev.downloads.map((dl, i) => i === index ? { ...dl, type } : dl)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        rating: parseFloat(formData.rating) || 0,
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
          <Label className="label-brutal">Artikelnummer</Label>
          <Input name="article_number" value={formData.article_number} onChange={handleChange} className="input-brutal" placeholder="z.B. GPC-0001 (wird automatisch gesetzt wenn leer)" data-testid="article-number-input" />
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
          <Label className="label-brutal">Angebotspreis (€)</Label>
          <Input type="number" name="sale_price" value={formData.sale_price} onChange={handleChange} step="0.01" className="input-brutal" placeholder="Leer = kein Angebot" />
        </div>
        <div>
          <Label className="label-brutal">Bewertung (0-5)</Label>
          <div className="flex items-center gap-2">
            <Input type="number" name="rating" value={formData.rating} onChange={handleChange} step="0.1" min="0" max="5" className="input-brutal" />
            <div className="flex items-center text-yellow-500 text-lg">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={s <= Math.round(formData.rating) ? 'text-yellow-500' : 'text-gray-300'}>&#9733;</span>
              ))}
              <span className="text-sm text-[#71717A] ml-1">({formData.rating})</span>
            </div>
          </div>
        </div>
        <div>
          <Label className="label-brutal">Lagerbestand</Label>
          <Input type="number" name="stock" value={formData.stock} onChange={handleChange} className="input-brutal" />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="is_bestseller"
            checked={formData.is_bestseller}
            onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
            className="w-5 h-5 accent-[#2D7A3A] cursor-pointer"
            data-testid="bestseller-checkbox"
          />
          <Label htmlFor="is_bestseller" className="cursor-pointer font-bold text-sm">Bestseller (auf Startseite anzeigen)</Label>
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
        <div className="mb-2 flex gap-2">
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
            Einzeln
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleBulkUpload}
            className="hidden"
            id="bulk-image-upload"
            disabled={uploading}
          />
          <label
            htmlFor="bulk-image-upload"
            className={`btn-primary inline-flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            <Image className="w-4 h-4" />
            {uploading ? "Wird hochgeladen..." : "Mehrere hochladen"}
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
        <div className="flex items-center justify-between mb-2">
          <Label className="label-brutal">Technische Daten</Label>
          <button
            type="button"
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showBulkPaste ? "Einzeln eingeben" : "Liste einfügen"}
          </button>
        </div>

        {showBulkPaste ? (
          <div className="space-y-2">
            <Input
              value={specGroup}
              onChange={(e) => setSpecGroup(e.target.value)}
              className="input-brutal"
              placeholder="Obergruppe (z.B. Motor, Hydraulik)"
            />
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full border-2 border-black p-3 text-sm font-mono min-h-[200px]"
              placeholder={"Spezifikationen einfügen, z.B.:\n\nMotor:\nLeistung: 150 kW\nDrehzahl: 2000 U/min\n\nHydraulik:\nDruck: 350 bar\nVolumen: 120 l\n\nOder einfach:\nGewicht: 5000 kg\nBreite: 2500 mm"}
            />
            <button type="button" onClick={parseBulkSpecs} className="btn-primary w-full">
              Spezifikationen importieren
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2 mb-2">
              <Input
                value={specGroup}
                onChange={(e) => setSpecGroup(e.target.value)}
                className="input-brutal w-1/3"
                placeholder="Gruppe"
              />
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
          </div>
        )}

        {/* Display grouped specs */}
        <div className="space-y-3 mt-3">
          {Object.entries(formData.specifications).map(([group, specs]) => (
            <div key={group} className="border border-[#E4E4E7] rounded">
              <div className="flex justify-between items-center bg-[#18181B] text-white px-3 py-1.5 text-sm font-bold">
                <span>{group}</span>
                <button type="button" onClick={() => removeGroup(group)} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-[#E4E4E7]">
                {typeof specs === 'object' && specs !== null && Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center px-3 py-1.5 text-sm">
                    <span><strong>{key}:</strong> {value}</span>
                    <button type="button" onClick={() => removeSpec(group, key)} className="text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Downloads / Dokumente */}
      <div>
        <Label className="label-brutal">Downloads (Handbuch, CE-Zertifizierung, etc.)</Label>
        <div className="mb-2">
          <input
            type="file"
            onChange={handleDownloadUpload}
            className="hidden"
            id="download-upload"
            disabled={uploading}
          />
          <label
            htmlFor="download-upload"
            className={`btn-secondary inline-flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            <FileText className="w-4 h-4" />
            {uploading ? "Wird hochgeladen..." : "Dokument hochladen"}
          </label>
        </div>
        <div className="space-y-2">
          {formData.downloads.map((dl, idx) => (
            <div key={idx} className="flex items-center gap-2 border border-[#E4E4E7] p-2">
              <FileText className="w-5 h-5 text-[#2D7A3A] flex-shrink-0" />
              <Input
                value={dl.name}
                onChange={(e) => updateDownloadName(idx, e.target.value)}
                className="input-brutal text-sm flex-1"
                placeholder="Dokumentname"
              />
              <select
                value={dl.type || 'PDF'}
                onChange={(e) => updateDownloadType(idx, e.target.value)}
                className="border-2 border-black px-2 py-1 text-sm"
              >
                <option value="Handbuch">Handbuch</option>
                <option value="CE-Zertifizierung">CE-Zertifizierung</option>
                <option value="Datenblatt">Datenblatt</option>
                <option value="Bedienungsanleitung">Bedienungsanleitung</option>
                <option value="PDF">PDF</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
              <button type="button" onClick={() => removeDownload(idx)} className="text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Kundenbewertungen */}
      <div>
        <Label className="label-brutal">Kundenbewertungen</Label>
        <div className="border border-[#E4E4E7] p-3 mb-2 space-y-2">
          <Input
            value={reviewName}
            onChange={(e) => setReviewName(e.target.value)}
            className="input-brutal"
            placeholder="Name des Kunden"
          />
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full border-2 border-black p-2 text-sm min-h-[60px]"
            placeholder="Bewertungstext"
          />
          <div className="flex items-center gap-2">
            <Label className="text-sm">Sterne:</Label>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  className={`text-xl ${s <= reviewRating ? 'text-yellow-500' : 'text-gray-300'} cursor-pointer hover:text-yellow-400`}
                >
                  &#9733;
                </button>
              ))}
              <span className="text-sm text-[#71717A] ml-1">({reviewRating})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Datum:</Label>
            <Input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="input-brutal w-44"
              data-testid="review-date-input"
            />
            <button type="button" onClick={addReview} className="btn-secondary px-3 py-1 text-sm ml-auto">
              Hinzufügen
            </button>
          </div>
        </div>

        {/* Liste der Bewertungen */}
        <div className="space-y-2">
          {formData.reviews.map((review, idx) => (
            <div key={idx} className="border border-[#E4E4E7] p-3 relative">
              <button
                type="button"
                onClick={() => removeReview(idx)}
                className="absolute top-2 right-2 text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">{review.name}</span>
                <span className="text-yellow-500 text-sm">
                  {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
                </span>
                <span className="text-xs text-[#71717A]">{review.date}</span>
              </div>
              <p className="text-sm text-[#71717A]">{review.text}</p>
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
  const [expandedOrder, setExpandedOrder] = useState(null);

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

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderNumber, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderNumber}/status`, { status: newStatus }, { withCredentials: true });
      toast.success(`Status geändert: ${newStatus}`);
      fetchOrders();
    } catch (e) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  return (
    <div className="bg-white border border-[#E4E4E7]">
      <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
        <h2 className="font-bold text-lg">Bestellungen ({orders.length})</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center text-[#71717A]">Keine Bestellungen vorhanden</div>
      ) : (
        <div className="divide-y divide-[#E4E4E7]">
          {orders.map((order) => (
            <div key={order.id} data-testid={`order-row-${order.order_number}`}>
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F4F4F5] transition-colors"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`} />
                  <div>
                    <p className="font-mono text-sm font-bold">{order.order_number}</p>
                    <p className="text-sm text-[#71717A]">{order.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-bold">{order.total?.toLocaleString('de-DE')} €</span>
                  <span className={`badge ${order.status === 'Ausstehend' ? 'badge-pending' : order.status === 'Storniert' ? 'bg-red-100 text-red-700 px-2 py-1 text-xs font-semibold' : 'badge-success'}`}>
                    {order.status}
                  </span>
                  <span className="text-sm text-[#71717A]">{new Date(order.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="px-4 pb-6 bg-[#FAFAFA] border-t border-[#E4E4E7]" data-testid={`order-details-${order.order_number}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {/* Kundendaten */}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-[#71717A] uppercase tracking-wider">Kundendaten</h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">{order.customer?.name}</p>
                        {order.customer?.company && <p>{order.customer.company}</p>}
                        <p>{order.customer?.street}</p>
                        <p>{order.customer?.postal_code} {order.customer?.city}</p>
                        <p>{order.customer?.country}</p>
                        <p className="mt-2">{order.customer?.email}</p>
                        {order.customer?.phone && <p>{order.customer.phone}</p>}
                      </div>
                    </div>

                    {/* Artikel */}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-[#71717A] uppercase tracking-wider">Artikel</h4>
                      <div className="space-y-2">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-semibold">{(item.price * item.quantity).toLocaleString('de-DE')} €</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Zusammenfassung */}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-[#71717A] uppercase tracking-wider">Zusammenfassung</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Zwischensumme:</span>
                          <span>{(order.subtotal || order.total).toLocaleString('de-DE')} €</span>
                        </div>
                        {order.shipping_cost > 0 && (
                          <div className="flex justify-between">
                            <span>Versand{order.shipping_zone ? ` (${order.shipping_zone})` : ''}:</span>
                            <span>{order.shipping_cost.toLocaleString('de-DE')} €</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-[#E4E4E7] pt-1 mt-1">
                          <span>Gesamt:</span>
                          <span>{order.total?.toLocaleString('de-DE')} €</span>
                        </div>
                        <p className="mt-2">Zahlung: {order.payment_method}</p>
                        {order.notes && <p className="mt-2 italic text-[#71717A]">Notiz: {order.notes}</p>}
                      </div>

                      <div className="mt-4">
                        <Label className="text-xs font-bold text-[#71717A] uppercase">Status ändern</Label>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.order_number, e.target.value)}
                          className="input-brutal mt-1 text-sm w-full"
                          data-testid={`order-status-select-${order.order_number}`}
                        >
                          <option value="Ausstehend">Ausstehend</option>
                          <option value="Bezahlt">Bezahlt</option>
                          <option value="Versendet">Versendet</option>
                          <option value="Abgeschlossen">Abgeschlossen</option>
                          <option value="Storniert">Storniert</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Quotes
const AdminQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuote, setExpandedQuote] = useState(null);

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

  useEffect(() => { fetchQuotes(); }, []);

  const updateStatus = async (quoteId, newStatus) => {
    try {
      await axios.put(`${API}/admin/quotes/${quoteId}/status`, { status: newStatus }, { withCredentials: true });
      toast.success(`Status geändert: ${newStatus}`);
      fetchQuotes();
    } catch (e) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  return (
    <div className="bg-white border border-[#E4E4E7]">
      <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
        <h2 className="font-bold text-lg">Angebotsanfragen ({quotes.length})</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : quotes.length === 0 ? (
        <div className="p-8 text-center text-[#71717A]">Keine Anfragen vorhanden</div>
      ) : (
        <div className="divide-y divide-[#E4E4E7]">
          {quotes.map((quote) => (
            <div key={quote.id} data-testid={`quote-row-${quote.quote_number}`}>
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F4F4F5] transition-colors"
                onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
              >
                <div className="flex items-center gap-4">
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedQuote === quote.id ? 'rotate-90' : ''}`} />
                  <div>
                    <p className="font-mono text-sm font-bold">{quote.quote_number}</p>
                    <p className="text-sm text-[#71717A]">{quote.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-semibold">{quote.product_name}</span>
                  <span className={`badge ${quote.status === 'Neu' ? 'badge-success' : quote.status === 'Abgelehnt' ? 'bg-red-100 text-red-700 px-2 py-1 text-xs font-semibold' : 'badge-pending'}`}>
                    {quote.status}
                  </span>
                  <span className="text-sm text-[#71717A]">{new Date(quote.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>

              {expandedQuote === quote.id && (
                <div className="px-4 pb-6 bg-[#FAFAFA] border-t border-[#E4E4E7]" data-testid={`quote-details-${quote.quote_number}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {/* Kundendaten */}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-[#71717A] uppercase tracking-wider">Kundendaten</h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">{quote.customer?.name}</p>
                        {quote.customer?.company && <p>{quote.customer.company}</p>}
                        <p>{quote.customer?.email}</p>
                        {quote.customer?.phone && <p>{quote.customer.phone}</p>}
                      </div>
                    </div>

                    {/* Produktdetails */}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-[#71717A] uppercase tracking-wider">Produktdetails</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-[#71717A]">Produkt:</span> <span className="font-semibold">{quote.product_name}</span></p>
                        <p><span className="text-[#71717A]">Menge:</span> <span className="font-semibold">{quote.quantity}</span></p>
                        {quote.message && (
                          <div className="mt-3">
                            <p className="text-[#71717A]">Nachricht:</p>
                            <p className="mt-1 p-2 bg-white border border-[#E4E4E7] italic">{quote.message}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-[#71717A] uppercase tracking-wider">Status verwalten</h4>
                      <select
                        value={quote.status}
                        onChange={(e) => updateStatus(quote.id, e.target.value)}
                        className="input-brutal text-sm w-full"
                        data-testid={`quote-status-select-${quote.quote_number}`}
                      >
                        <option value="Neu">Neu</option>
                        <option value="In Bearbeitung">In Bearbeitung</option>
                        <option value="Angebot gesendet">Angebot gesendet</option>
                        <option value="Abgeschlossen">Abgeschlossen</option>
                        <option value="Abgelehnt">Abgelehnt</option>
                      </select>
                      <p className="text-xs text-[#71717A] mt-2">Erstellt: {new Date(quote.created_at).toLocaleString('de-DE')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Settings (Versandkosten)
const AdminSettings = () => {
  const [settings, setSettings] = useState({
    shipping_costs: [],
    free_shipping_threshold: 0,
    shipping_note: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newZone, setNewZone] = useState("");
  const [newCost, setNewCost] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/admin/settings`, { withCredentials: true });
      setSettings({
        shipping_costs: res.data.shipping_costs || [],
        free_shipping_threshold: res.data.free_shipping_threshold || 0,
        shipping_note: res.data.shipping_note || ""
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addShippingZone = () => {
    if (!newZone.trim() || !newCost) return;
    setSettings(prev => ({
      ...prev,
      shipping_costs: [...prev.shipping_costs, { zone: newZone.trim(), cost: parseFloat(newCost) }]
    }));
    setNewZone("");
    setNewCost("");
  };

  const removeShippingZone = (index) => {
    setSettings(prev => ({
      ...prev,
      shipping_costs: prev.shipping_costs.filter((_, i) => i !== index)
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, settings, { withCredentials: true });
      toast.success("Einstellungen gespeichert");
    } catch (e) {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-settings">
      <h2 className="text-xl font-bold">Shop-Einstellungen</h2>

      {/* Versandkosten */}
      <div className="bg-white border border-[#E4E4E7] p-6">
        <h3 className="font-bold text-lg mb-4">Versandkosten</h3>
        
        <div className="flex gap-2 mb-4">
          <Input
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            className="input-brutal flex-1"
            placeholder="Zone/Beschreibung (z.B. Deutschland, EU, Spedition)"
            data-testid="shipping-zone-input"
          />
          <Input
            type="number"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            className="input-brutal w-32"
            placeholder="Preis (€)"
            step="0.01"
            data-testid="shipping-cost-input"
          />
          <button type="button" onClick={addShippingZone} className="btn-secondary px-4" data-testid="add-shipping-zone">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {settings.shipping_costs.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F4F4F5]">
                <th className="text-left p-3 text-sm font-semibold">Zone / Beschreibung</th>
                <th className="text-left p-3 text-sm font-semibold">Kosten</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {settings.shipping_costs.map((sc, idx) => (
                <tr key={idx} className="border-b border-[#E4E4E7]">
                  <td className="p-3">{sc.zone}</td>
                  <td className="p-3 font-bold">{sc.cost.toLocaleString('de-DE')} €</td>
                  <td className="p-3">
                    <button onClick={() => removeShippingZone(idx)} className="text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[#71717A] text-sm">Keine Versandkosten konfiguriert.</p>
        )}
      </div>

      {/* Kostenloser Versand ab */}
      <div className="bg-white border border-[#E4E4E7] p-6">
        <h3 className="font-bold text-lg mb-4">Kostenloser Versand</h3>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Kostenloser Versand ab Bestellwert (€):</Label>
          <Input
            type="number"
            value={settings.free_shipping_threshold}
            onChange={(e) => setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
            className="input-brutal w-40"
            step="0.01"
            data-testid="free-shipping-input"
          />
        </div>
        <p className="text-xs text-[#71717A] mt-1">0 = kein kostenloser Versand</p>
      </div>

      {/* Versandhinweis */}
      <div className="bg-white border border-[#E4E4E7] p-6">
        <h3 className="font-bold text-lg mb-4">Versandhinweis</h3>
        <textarea
          value={settings.shipping_note}
          onChange={(e) => setSettings({ ...settings, shipping_note: e.target.value })}
          className="w-full border-2 border-black p-3 text-sm min-h-[100px]"
          placeholder="z.B. Lieferung per Spedition. Lieferzeit 5-10 Werktage. Versand nur innerhalb der EU."
          data-testid="shipping-note-input"
        />
      </div>

      <button onClick={saveSettings} disabled={saving} className="btn-primary w-full" data-testid="save-settings">
        {saving ? "Wird gespeichert..." : "Einstellungen speichern"}
      </button>
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

        <div className="bg-white border border-[#E4E4E7] p-8 text-[#3F3F46] leading-relaxed">
          <h2 className="text-xl font-bold mb-4">Allgemeine Geschäftsbedingungen mit Kundeninformationen</h2>
          
          <div className="mb-6 p-4 bg-[#F4F4F5] border border-[#E4E4E7]">
            <p className="font-bold mb-2">Inhaltsverzeichnis</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Geltungsbereich</li>
              <li>Vertragsschluss</li>
              <li>Widerrufsrecht</li>
              <li>Preise und Zahlungsbedingungen</li>
              <li>Liefer- und Versandbedingungen</li>
              <li>Eigentumsvorbehalt</li>
              <li>Mängelhaftung (Gewährleistung)</li>
              <li>Haftung</li>
              <li>Anwendbares Recht</li>
              <li>Gerichtsstand</li>
              <li>Alternative Streitbeilegung</li>
            </ol>
          </div>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">1) Geltungsbereich</h3>
            <p className="mb-2">1.1 Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") der Josten Haus & Garten Handelsgesellschaft mbH (nachfolgend „Verkäufer"), gelten für alle Verträge zur Lieferung von Waren, die ein Verbraucher oder Unternehmer (nachfolgend „Kunde") mit dem Verkäufer hinsichtlich der vom Verkäufer in seinem Online-Shop dargestellten Waren abschließt. Hiermit wird der Einbeziehung von eigenen Bedingungen des Kunden widersprochen, es sei denn, es ist etwas anderes vereinbart.</p>
            <p className="mb-2">1.2 Verbraucher im Sinne dieser AGB ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können.</p>
            <p>1.3 Unternehmer im Sinne dieser AGB ist eine natürliche oder juristische Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit handelt.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">2) Vertragsschluss</h3>
            <p className="mb-2">2.1 Die im Online-Shop des Verkäufers enthaltenen Produktbeschreibungen stellen keine verbindlichen Angebote seitens des Verkäufers dar, sondern dienen zur Abgabe eines verbindlichen Angebots durch den Kunden.</p>
            <p className="mb-2">2.2 Der Kunde kann das Angebot über das in den Online-Shop des Verkäufers integrierte Online-Bestellformular abgeben. Dabei gibt der Kunde, nachdem er die ausgewählten Waren in den virtuellen Warenkorb gelegt und den elektronischen Bestellprozess durchlaufen hat, durch Klicken des den Bestellvorgang abschließenden Buttons ein rechtlich verbindliches Vertragsangebot in Bezug auf die im Warenkorb enthaltenen Waren ab. Ferner kann der Kunde das Angebot auch per E-Mail oder Whatsapp gegenüber dem Verkäufer abgeben.</p>
            <p className="mb-2">2.3 Der Verkäufer kann das Angebot des Kunden innerhalb von fünf Tagen annehmen,</p>
            <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
              <li>indem er dem Kunden eine Rechnung in Textform (Fax oder E-Mail) übermittelt, wobei insoweit der Zugang der Rechnung beim Kunden maßgeblich ist, oder</li>
              <li>indem er dem Kunden die bestellte Ware liefert, wobei insoweit der Zugang der Ware beim Kunden maßgeblich ist, oder</li>
              <li>indem er den Kunden nach Abgabe von dessen Bestellung zur Zahlung auffordert.</li>
            </ul>
            <p className="mb-2">Liegen mehrere der vorgenannten Alternativen vor, kommt der Vertrag in dem Zeitpunkt zustande, in dem eine der vorgenannten Alternativen zuerst eintritt. Die Frist zur Annahme des Angebots beginnt am Tag nach der Absendung des Angebots durch den Kunden zu laufen und endet mit dem Ablauf des fünften Tages, welcher auf die Absendung des Angebots folgt. Nimmt der Verkäufer das Angebot des Kunden innerhalb vorgenannter Frist nicht an, so gilt dies als Ablehnung des Angebots mit der Folge, dass der Kunde nicht mehr an seine Willenserklärung gebunden ist.</p>
            <p className="mb-2">2.5 Bei der Abgabe eines Angebots über das Online-Bestellformular des Verkäufers wird der Vertragstext nach dem Vertragsschluss vom Verkäufer gespeichert und dem Kunden nach Absendung von dessen Bestellung in Textform (z. B. E-Mail, Fax oder Brief) übermittelt. Eine darüber hinausgehende Zugänglichmachung des Vertragstextes durch den Verkäufer erfolgt nicht. Sofern der Kunde vor Absendung seiner Bestellung ein Nutzerkonto im Online-Shop des Verkäufers eingerichtet hat, werden die Bestelldaten auf der Website des Verkäufers archiviert und können vom Kunden über dessen passwortgeschütztes Nutzerkonto unter Angabe der entsprechenden Login-Daten kostenlos abgerufen werden.</p>
            <p className="mb-2">2.6 Vor verbindlicher Abgabe der Bestellung über das Online-Bestellformular des Verkäufers kann der Kunde mögliche Eingabefehler durch aufmerksames Lesen der auf dem Bildschirm dargestellten Informationen erkennen. Ein wirksames technisches Mittel zur besseren Erkennung von Eingabefehlern kann dabei die Vergrößerungsfunktion des Browsers sein, mit deren Hilfe die Darstellung auf dem Bildschirm vergrößert wird. Seine Eingaben kann der Kunde im Rahmen des elektronischen Bestellprozesses so lange über die üblichen Tastatur- und Mausfunktionen korrigieren, bis er den Button anklickt, welcher den Bestellvorgang abschließt.</p>
            <p className="mb-2">2.7 Für den Vertragsschluss steht die deutsche Sprache zur Verfügung.</p>
            <p>2.8 Die Bestellabwicklung und Kontaktaufnahme finden in der Regel per E-Mail und automatisierter Bestellabwicklung statt. Der Kunde hat sicherzustellen, dass die von ihm zur Bestellabwicklung angegebene E-Mail-Adresse zutreffend ist, so dass unter dieser Adresse die vom Verkäufer versandten E-Mails empfangen werden können. Insbesondere hat der Kunde bei dem Einsatz von SPAM-Filtern sicherzustellen, dass alle vom Verkäufer oder von diesem mit der Bestellabwicklung beauftragten Dritten versandten E-Mails zugestellt werden können.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">3) Widerrufsrecht</h3>
            <p className="mb-2">3.1 Verbrauchern steht grundsätzlich ein Widerrufsrecht zu.</p>
            <p>3.2 Nähere Informationen zum Widerrufsrecht ergeben sich aus der Widerrufsbelehrung des Verkäufers.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">4) Preise und Zahlungsbedingungen</h3>
            <p className="mb-2">4.1 Sofern sich aus der Produktbeschreibung des Verkäufers nichts anderes ergibt, handelt es sich bei den angegebenen Preisen um Gesamtpreise, die die gesetzliche Umsatzsteuer enthalten. Gegebenenfalls zusätzlich anfallende Liefer- und Versandkosten werden in der jeweiligen Produktbeschreibung gesondert angegeben.</p>
            <p className="mb-2">4.2 Die Zahlungsmöglichkeit/en wird/werden dem Kunden im Online-Shop des Verkäufers mitgeteilt.</p>
            <p>4.3 Ist Vorauskasse per Banküberweisung vereinbart, ist die Zahlung sofort nach Vertragsabschluss fällig, sofern die Parteien keinen späteren Fälligkeitstermin vereinbart haben.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">5) Liefer- und Versandbedingungen</h3>
            <p className="mb-2">5.1 Bietet der Verkäufer den Versand der Ware an, so erfolgt die Lieferung innerhalb des vom Verkäufer angegebenen Liefergebietes an die vom Kunden angegebene Lieferanschrift, sofern nichts anderes vereinbart ist. Bei der Abwicklung der Transaktion ist die in der Bestellabwicklung des Verkäufers angegebene Lieferanschrift maßgeblich.</p>
            <p className="mb-2">5.2 Scheitert die Zustellung der Ware aus Gründen, die der Kunde zu vertreten hat, trägt der Kunde die dem Verkäufer hierdurch entstehenden angemessenen Kosten. Dies gilt im Hinblick auf die Kosten für die Hinsendung nicht, wenn der Kunde sein Widerrufsrecht wirksam ausübt. Für die Rücksendekosten gilt bei wirksamer Ausübung des Widerrufsrechts durch den Kunden die in der Widerrufsbelehrung des Verkäufers hierzu getroffene Regelung.</p>
            <p className="mb-2">5.3 Handelt der Kunde als Unternehmer, geht die Gefahr des zufälligen Untergangs und der zufälligen Verschlechterung der verkauften Ware auf den Kunden über, sobald der Verkäufer die Sache dem Spediteur, dem Frachtführer oder der sonst zur Ausführung der Versendung bestimmten Person oder Anstalt ausgeliefert hat. Handelt der Kunde als Verbraucher, geht die Gefahr des zufälligen Untergangs und der zufälligen Verschlechterung der verkauften Ware grundsätzlich erst mit Übergabe der Ware an den Kunden oder eine empfangsberechtigte Person über. Abweichend hiervon geht die Gefahr des zufälligen Untergangs und der zufälligen Verschlechterung der verkauften Ware auch bei Verbrauchern bereits auf den Kunden über, sobald der Verkäufer die Sache dem Spediteur, dem Frachtführer oder der sonst zur Ausführung der Versendung bestimmten Person oder Anstalt ausgeliefert hat, wenn der Kunde den Spediteur, den Frachtführer oder die sonst zur Ausführung der Versendung bestimmte Person oder Anstalt mit der Ausführung beauftragt und der Verkäufer dem Kunden diese Person oder Anstalt zuvor nicht benannt hat.</p>
            <p className="mb-2">5.4 Der Verkäufer behält sich das Recht vor, im Falle nicht richtiger oder nicht ordnungsgemäßer Selbstbelieferung vom Vertrag zurückzutreten. Dies gilt nur für den Fall, dass die Nichtlieferung nicht vom Verkäufer zu vertreten ist und dieser mit der gebotenen Sorgfalt ein konkretes Deckungsgeschäft mit dem Zulieferer abgeschlossen hat. Der Verkäufer wird alle zumutbaren Anstrengungen unternehmen, um die Ware zu beschaffen. Im Falle der Nichtverfügbarkeit oder der nur teilweisen Verfügbarkeit der Ware wird der Kunde unverzüglich informiert und die Gegenleistung unverzüglich erstattet.</p>
            <p className="font-semibold">5.5 Selbstabholung ist aus logistischen Gründen nicht möglich.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">6) Eigentumsvorbehalt</h3>
            <p className="mb-2">6.1 Gegenüber Verbrauchern behält sich der Verkäufer bis zur vollständigen Bezahlung des geschuldeten Kaufpreises das Eigentum an der gelieferten Ware vor.</p>
            <p className="mb-2">6.2 Gegenüber Unternehmern behält sich der Verkäufer bis zur vollständigen Begleichung aller Forderungen aus einer laufenden Geschäftsbeziehung das Eigentum an der gelieferten Ware vor.</p>
            <p className="mb-2">6.3 Handelt der Kunde als Unternehmer, gilt weiterhin das Folgende:</p>
            <div className="ml-4 space-y-2">
              <p>Im Falle der Verarbeitung der gelieferten Ware gilt der Verkäufer als Hersteller und erwirbt Eigentum an der neu entstehenden Ware. Erfolgt die Verarbeitung zusammen mit anderen Materialien, erwirbt der Verkäufer Eigentum im Verhältnis der Rechnungswerte seiner Ware zu dem der anderen Materialien. Ist im Falle der Verbindung oder Vermischung der Ware des Verkäufers mit einer Sache des Kunden diese als Hauptsache anzusehen, geht das Miteigentum an der Sache in dem Verhältnis des Rechnungswertes der Ware des Verkäufers zum Rechnungs- oder mangels eines solchen zum Verkehrswert der Hauptsache - auf den Verkäufer über. Der Kunde gilt in diesen Fällen als Verwahrer.</p>
              <p>Gegenstände unter Eigentums- oder Rechtsvorbehalt darf der Kunde weder verpfänden noch sicherungsübereignen. Der Kunde ist nur zur Weiterveräußerung der Vorbehaltsware im ordnungsgemäßen Geschäftsbetrieb berechtigt. Sämtliche hieraus entstehenden Forderungen gegen Dritte tritt der Kunde in Höhe des jeweiligen Rechnungswertes (einschließlich Umsatzsteuer) im Voraus an den Verkäufer ab. Diese Abtretung gilt unabhängig davon, ob die Vorbehaltsware ohne oder nach Verarbeitung weiterverkauft worden ist. Der Kunde bleibt zur Einziehung der Forderungen auch nach der Abtretung ermächtigt. Die Befugnis des Verkäufers, die Forderungen selbst einzuziehen, bleibt davon unberührt. Der Verkäufer wird jedoch die Forderungen nicht einziehen, solange der Kunde seinen Zahlungsverpflichtungen dem Verkäufer gegenüber nachkommt, nicht in Zahlungsverzug gerät und kein Antrag auf Eröffnung eines Insolvenzverfahrens gestellt ist.</p>
              <p>Der Kunde hat Zugriff auf die im Eigentum oder Miteigentum des Verkäufers stehende Ware oder auf die abgetretenen Forderungen sofort mitzuteilen. Er hat an den Verkäufer abgetretene, von ihm eingezogene Beträge sofort an den Verkäufer abzuführen, soweit dessen Forderung fällig ist.</p>
              <p>Soweit der Wert der Sicherungsrechte des Verkäufers die Höhe der gesicherten Ansprüche um mehr als 10% übersteigt, wird der Verkäufer auf Wunsch des Kunden einen entsprechenden Anteil der Sicherungsrechte freigeben.</p>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">7) Mängelhaftung (Gewährleistung)</h3>
            <p className="mb-2">Soweit sich aus den nachfolgenden Regelungen nichts anderes ergibt, gelten die Vorschriften der gesetzlichen Mängelhaftung. Hiervon abweichend gilt bei Verträgen zur Lieferung von Waren:</p>
            <p className="mb-2">7.1 Handelt der Kunde als Unternehmer,</p>
            <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
              <li>hat der Verkäufer die Wahl der Art der Nacherfüllung;</li>
              <li>beträgt bei neuen Waren die Verjährungsfrist für Mängelrechte ein Jahr ab Ablieferung der Ware;</li>
              <li>sind bei gebrauchten Waren die Mängelrechte ausgeschlossen;</li>
              <li>beginnt die Verjährung nicht erneut, wenn im Rahmen der Mängelhaftung eine Ersatzlieferung erfolgt.</li>
            </ul>
            <p className="mb-2">7.2 Die vorstehend geregelten Haftungsbeschränkungen und Fristverkürzungen gelten nicht</p>
            <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
              <li>für Schadensersatz- und Aufwendungsersatzansprüche des Kunden,</li>
              <li>für den Fall, dass der Verkäufer den Mangel arglistig verschwiegen hat,</li>
              <li>für Waren, die entsprechend ihrer üblichen Verwendungsweise für ein Bauwerk verwendet worden sind und dessen Mangelhaftigkeit verursacht haben,</li>
              <li>für eine ggf. bestehende Verpflichtung des Verkäufers zur Bereitstellung von Aktualisierungen für digitale Produkte, bei Verträgen zur Lieferung von Waren mit digitalen Elementen.</li>
            </ul>
            <p className="mb-2">7.3 Darüber hinaus gilt für Unternehmer, dass die gesetzlichen Verjährungsfristen für einen ggf. bestehenden gesetzlichen Rückgriffsanspruch unberührt bleiben.</p>
            <p className="mb-2">7.4 Handelt der Kunde als Kaufmann i.S.d. § 1 HGB, trifft ihn die kaufmännische Untersuchungs- und Rügepflicht gemäß § 377 HGB. Unterlässt der Kunde die dort geregelten Anzeigepflichten, gilt die Ware als genehmigt.</p>
            <p>7.5 Handelt der Kunde als Verbraucher, so wird er gebeten, angelieferte Waren mit offensichtlichen Transportschäden bei dem Zusteller zu reklamieren und den Verkäufer hiervon in Kenntnis zu setzen. Kommt der Kunde dem nicht nach, hat dies keinerlei Auswirkungen auf seine gesetzlichen oder vertraglichen Mängelansprüche.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">8) Haftung</h3>
            <p className="mb-2">Der Verkäufer haftet dem Kunden aus allen vertraglichen, vertragsähnlichen und gesetzlichen, auch deliktischen Ansprüchen auf Schadens- und Aufwendungsersatz wie folgt:</p>
            <p className="mb-2">8.1 Der Verkäufer haftet aus jedem Rechtsgrund uneingeschränkt</p>
            <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
              <li>bei Vorsatz oder grober Fahrlässigkeit,</li>
              <li>bei vorsätzlicher oder fahrlässiger Verletzung des Lebens, des Körpers oder der Gesundheit,</li>
              <li>aufgrund eines Garantieversprechens, soweit diesbezüglich nichts anderes geregelt ist,</li>
              <li>aufgrund zwingender Haftung wie etwa nach dem Produkthaftungsgesetz.</li>
            </ul>
            <p className="mb-2">8.2 Verletzt der Verkäufer fahrlässig eine wesentliche Vertragspflicht, ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt, sofern nicht gemäß vorstehender Ziffer unbeschränkt gehaftet wird. Wesentliche Vertragspflichten sind Pflichten, die der Vertrag dem Verkäufer nach seinem Inhalt zur Erreichung des Vertragszwecks auferlegt, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf.</p>
            <p className="mb-2">8.3 Im Übrigen ist eine Haftung des Verkäufers ausgeschlossen.</p>
            <p>8.4 Vorstehende Haftungsregelungen gelten auch im Hinblick auf die Haftung des Verkäufers für seine Erfüllungsgehilfen und gesetzlichen Vertreter.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">9) Anwendbares Recht</h3>
            <p>Für sämtliche Rechtsbeziehungen der Parteien gilt das Recht der Bundesrepublik Deutschland unter Ausschluss der Gesetze über den internationalen Kauf beweglicher Waren. Bei Verbrauchern gilt diese Rechtswahl nur insoweit, als nicht der gewährte Schutz durch zwingende Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, entzogen wird.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">10) Gerichtsstand</h3>
            <p>Handelt der Kunde als Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen mit Sitz im Hoheitsgebiet der Bundesrepublik Deutschland, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Geschäftssitz des Verkäufers. Hat der Kunde seinen Sitz außerhalb des Hoheitsgebiets der Bundesrepublik Deutschland, so ist der Geschäftssitz des Verkäufers ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag, wenn der Vertrag oder Ansprüche aus dem Vertrag der beruflichen oder gewerblichen Tätigkeit des Kunden zugerechnet werden können. Der Verkäufer ist in den vorstehenden Fällen jedoch in jedem Fall berechtigt, das Gericht am Sitz des Kunden anzurufen.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3 border-b border-[#E4E4E7] pb-2">11) Alternative Streitbeilegung</h3>
            <p>Der Verkäufer ist zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.</p>
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
              <p className="font-semibold">Josten Haus & Garten Handelsgesellschaft mbH</p>
              <p>Hammer Landstr. 1 A</p>
              <p>41460 Neuss</p>
              <p>E-Mail: widerruf@josten-hug.de</p>
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

        <div className="bg-white border border-[#E4E4E7] p-8 text-[#3F3F46] leading-relaxed">

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3 border-b border-[#E4E4E7] pb-2">1. Datenschutz auf einen Blick</h2>
            <h3 className="font-bold mb-2">Allgemeine Hinweise</h3>
            <p className="mb-2">Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>
            <h3 className="font-bold mb-2 mt-4">Datenerfassung auf dieser Website</h3>
            <p className="mb-2"><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
            <p className="mb-2">Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>
            <p className="mb-2"><strong>Wie erfassen wir Ihre Daten?</strong></p>
            <p className="mb-2">Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.&nbsp;B. um Daten handeln, die Sie in ein Kontaktformular eingeben oder bei einer Bestellung angeben.</p>
            <p className="mb-2">Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.&nbsp;B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.</p>
            <p className="mb-2"><strong>Wofür nutzen wir Ihre Daten?</strong></p>
            <p className="mb-2">Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. Sofern über die Website Verträge geschlossen oder angebahnt werden können, werden die übermittelten Daten auch für Vertragsangebote, Bestellungen oder sonstige Auftragsanfragen verarbeitet.</p>
            <p className="mb-2"><strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong></p>
            <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3 border-b border-[#E4E4E7] pb-2">2. Hosting</h2>
            <p className="mb-2">Wir hosten die Inhalte unserer Website bei folgendem Anbieter:</p>
            <h3 className="font-bold mb-2">Externes Hosting</h3>
            <p className="mb-2">Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert. Hierbei kann es sich v.&nbsp;a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.</p>
            <p className="mb-2">Das externe Hosting erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren potenziellen und bestehenden Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO).</p>
            <p>Unser Hoster wird Ihre Daten nur insoweit verarbeiten, wie dies zur Erfüllung seiner Leistungspflichten erforderlich ist und unsere Weisungen in Bezug auf diese Daten befolgen.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3 border-b border-[#E4E4E7] pb-2">3. Allgemeine Hinweise und Pflichtinformationen</h2>
            <h3 className="font-bold mb-2">Datenschutz</h3>
            <p className="mb-2">Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
            <p className="mb-4">Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.</p>
            <h3 className="font-bold mb-2">Hinweis zur verantwortlichen Stelle</h3>
            <p className="mb-1">Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
            <div className="mb-4 pl-4 border-l-2 border-[#E4E4E7]">
              <p className="font-semibold">Josten Haus & Garten Handelsgesellschaft mbH</p>
              <p>Hammer Landstr. 1 A</p>
              <p>41460 Neuss</p>
              <p className="mt-1">E-Mail: info@josten-hug.de</p>
            </div>
            <p className="mb-4">Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z.&nbsp;B. Namen, E-Mail-Adressen o.&nbsp;Ä.) entscheidet.</p>
            <h3 className="font-bold mb-2">Speicherdauer</h3>
            <p className="mb-4">Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben (z.&nbsp;B. steuer- oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach Fortfall dieser Gründe.</p>
            <h3 className="font-bold mb-2">Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf dieser Website</h3>
            <p className="mb-4">Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO, sofern besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet werden. Sofern Ihre Einwilligung sich auch auf die Speicherung von Cookies oder den Zugriff auf Informationen in Ihr Endgerät bezieht, erfolgt die Datenverarbeitung zusätzlich auf Grundlage von § 25 Abs. 1 TDDDG. Die Einwilligung ist jederzeit widerrufbar. Sind Ihre Daten zur Vertragserfüllung oder zur Durchführung vorvertraglicher Maßnahmen erforderlich, verarbeiten wir Ihre Daten auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Des Weiteren verarbeiten wir Ihre Daten, sofern diese zur Erfüllung einer rechtlichen Verpflichtung erforderlich sind auf Grundlage von Art. 6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann ferner auf Grundlage unseres berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO erfolgen.</p>
            <h3 className="font-bold mb-2">Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
            <p className="mb-4">Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.</p>
            <h3 className="font-bold mb-2">Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen sowie gegen Direktwerbung (Art. 21 DSGVO)</h3>
            <p className="mb-4">WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F DSGVO ERFOLGT, HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS IHRER BESONDEREN SITUATION ERGEBEN, GEGEN DIE VERARBEITUNG IHRER PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN. DIE JEWEILIGE RECHTSGRUNDLAGE, AUF DENEN EINE VERARBEITUNG BERUHT, ENTNEHMEN SIE DIESER DATENSCHUTZERKLÄRUNG. WENN SIE WIDERSPRUCH EINLEGEN, WERDEN WIR IHRE BETROFFENEN PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN, WIR KÖNNEN ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG NACHWEISEN, DIE IHRE INTERESSEN, RECHTE UND FREIHEITEN ÜBERWIEGEN ODER DIE VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER VERTEIDIGUNG VON RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1 DSGVO).</p>
            <h3 className="font-bold mb-2">Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>
            <p className="mb-4">Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.</p>
            <h3 className="font-bold mb-2">Recht auf Datenübertragbarkeit</h3>
            <p className="mb-4">Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch machbar ist.</p>
            <h3 className="font-bold mb-2">Auskunft, Berichtigung und Löschung</h3>
            <p className="mb-4">Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit an uns wenden.</p>
            <h3 className="font-bold mb-2">Recht auf Einschränkung der Verarbeitung</h3>
            <p>Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Hierzu können Sie sich jederzeit an uns wenden. Das Recht auf Einschränkung der Verarbeitung besteht in folgenden Fällen: Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten personenbezogenen Daten bestreiten, benötigen wir in der Regel Zeit, um dies zu überprüfen. Für die Dauer der Prüfung haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Wenn die Verarbeitung Ihrer personenbezogenen Daten unrechtmäßig geschah/geschieht, können Sie statt der Löschung die Einschränkung der Datenverarbeitung verlangen. Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie sie jedoch zur Ausübung, Verteidigung oder Geltendmachung von Rechtsansprüchen benötigen, haben Sie das Recht, statt der Löschung die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt haben, muss eine Abwägung zwischen Ihren und unseren Interessen vorgenommen werden. Solange noch nicht feststeht, wessen Interessen überwiegen, haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3 border-b border-[#E4E4E7] pb-2">4. Datenerfassung auf dieser Website</h2>
            <h3 className="font-bold mb-2">Cookies</h3>
            <p className="mb-2">Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch gelöscht. Permanente Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese selbst löschen oder eine automatische Löschung durch Ihren Webbrowser erfolgt.</p>
            <p className="mb-2">Cookies können von uns (First-Party-Cookies) oder von Drittunternehmen stammen (sog. Third-Party-Cookies). Third-Party-Cookies ermöglichen die Einbindung bestimmter Dienstleistungen von Drittunternehmen innerhalb von Webseiten.</p>
            <p className="mb-4">Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs, zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen (z.&nbsp;B. für die Warenkorbfunktion) oder zur Optimierung der Website erforderlich sind, werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine andere Rechtsgrundlage angegeben wird. Der Websitebetreiber hat ein berechtigtes Interesse an der Speicherung von erforderlichen Cookies zur technisch fehlerfreien und optimierten Bereitstellung seiner Dienste. Sofern eine Einwilligung zur Speicherung von Cookies und vergleichbaren Wiedererkennungstechnologien abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage dieser Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG); die Einwilligung ist jederzeit widerrufbar.</p>
            <h3 className="font-bold mb-2">Server-Log-Dateien</h3>
            <p className="mb-2">Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:</p>
            <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
              <li>Browsertyp und Browserversion</li>
              <li>verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>
            <p className="mb-4">Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat ein berechtigtes Interesse an der technisch fehlerfreien Darstellung und der Optimierung seiner Website – hierzu müssen die Server-Log-Dateien erfasst werden.</p>
            <h3 className="font-bold mb-2">Anfrage per E-Mail oder Telefon</h3>
            <p>Wenn Sie uns per E-Mail oder Telefon kontaktieren, wird Ihre Anfrage inklusive aller daraus hervorgehenden personenbezogenen Daten (Name, Anfrage) zum Zwecke der Bearbeitung Ihres Anliegens bei uns gespeichert und verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sofern diese abgefragt wurde. Die von Ihnen an uns per Kontaktanfragen übersandten Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt. Zwingende gesetzliche Bestimmungen – insbesondere gesetzliche Aufbewahrungsfristen – bleiben unberührt.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3 border-b border-[#E4E4E7] pb-2">5. eCommerce und Zahlungsanbieter</h2>
            <h3 className="font-bold mb-2">Verarbeiten von Kunden- und Vertragsdaten</h3>
            <p className="mb-2">Wir erheben, verarbeiten und nutzen personenbezogene Kunden- und Vertragsdaten zur Begründung, inhaltlichen Ausgestaltung und Änderung unserer Vertragsbeziehungen. Personenbezogene Daten über die Inanspruchnahme dieser Website (Nutzungsdaten) erheben, verarbeiten und nutzen wir nur, soweit dies erforderlich ist, um dem Nutzer die Inanspruchnahme des Dienstes zu ermöglichen oder abzurechnen. Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. b DSGVO.</p>
            <p className="mb-4">Die erhobenen Kundendaten werden nach Abschluss des Auftrags oder Beendigung der Geschäftsbeziehung und Ablauf der ggf. bestehenden gesetzlichen Aufbewahrungsfristen gelöscht. Gesetzliche Aufbewahrungsfristen bleiben unberührt.</p>
            <h3 className="font-bold mb-2">Datenübermittlung bei Vertragsschluss für Online-Shops, Händler und Warenversand</h3>
            <p>Wenn Sie Waren bei uns bestellen, geben wir Ihre personenbezogenen Daten an das zur Lieferung betraute Transportunternehmen sowie an den mit der Zahlungsabwicklung beauftragten Zahlungsdienstleister weiter. Es werden nur solche Daten herausgegeben, die der jeweilige Dienstleister zur Erfüllung seiner Aufgabe benötigt. Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. b DSGVO, der die Verarbeitung von Daten zur Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen gestattet.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 border-b border-[#E4E4E7] pb-2">6. Aktualität und Änderung dieser Datenschutzerklärung</h2>
            <p>Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Januar 2026. Durch die Weiterentwicklung unserer Website und Angebote darüber oder aufgrund geänderter gesetzlicher beziehungsweise behördlicher Vorgaben kann es notwendig werden, diese Datenschutzerklärung zu ändern.</p>
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
            <p className="font-semibold">Josten Haus & Garten Handelsgesellschaft mbH</p>
            <p>Hammer Landstr. 1 A</p>
            <p>41460 Neuss</p>
            <p>Deutschland</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Kontakt</h2>
            <table className="specs-table">
              <tbody>
                <tr>
                  <td>E-Mail:</td>
                  <td>info@josten-hug.de</td>
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
                  <td>Amtsgericht Neuss</td>
                </tr>
                <tr>
                  <td>Registernummer:</td>
                  <td>HRB 9186</td>
                </tr>
                <tr>
                  <td>EUID:</td>
                  <td>DER1102.HRB9186</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Geschäftsführer</h2>
            <p>Robin Alexander Harz</p>
            <p>Marvin Julius Gerhardt</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-[#E4E4E7] pb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>Robin Alexander Harz</p>
            <p>Hammer Landstr. 1 A</p>
            <p>41460 Neuss</p>
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
              <img src="/gpc-logo.jpg" alt="Josten Haus & Garten" className="h-12 w-auto" />
            </div>
            <p className="text-[#E4E4E7] text-sm">
              Josten Haus & Garten Handelsgesellschaft mbH - Ihr Partner für Haus, Garten und Outdoor.
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
              <li><Link to="/produkte">Gartenmöbel</Link></li>
              <li><Link to="/produkte">Gartengeräte</Link></li>
              <li><Link to="/produkte">Haushalt</Link></li>
              <li><Link to="/produkte">Outdoor</Link></li>
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
          <p>© 2026 Josten Haus & Garten Handelsgesellschaft mbH. Alle Rechte vorbehalten.</p>
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
