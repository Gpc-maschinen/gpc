# Maschinen Store - PRD

## Original Problem Statement
"Baue mir einen Online-Store für Maschinen" - Ein allgemeines E-Commerce Template für Maschinenverkauf.

## User Choices
- Allgemeine Template, nicht spezialisiert
- Produktkatalog mit Filteroptionen
- Warenkorb & Checkout
- Angebotsanfragen
- Zahlung nur per Rechnung/Überweisung (keine Online-Zahlung)
- Kein Admin-Panel
- Kein Kundenkonto
- Kein Produktvergleich
- Nur Deutsch

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with Shadcn/UI components
- **Design**: Swiss Brutalist / High-Contrast aesthetic
- **Fonts**: Chivo (headings), IBM Plex Sans (body)
- **Primary Color**: Signal Red (#FF3B30)

## What's Been Implemented (January 2025)

### Backend API Endpoints
- `GET /api/products` - List products with category/price filters
- `GET /api/products/categories` - Get all categories
- `GET /api/products/{id}` - Get product details
- `GET /api/cart/{session_id}` - Get cart
- `POST /api/cart/{session_id}/add` - Add to cart
- `PUT /api/cart/{session_id}/update` - Update cart item
- `DELETE /api/cart/{session_id}/remove/{product_id}` - Remove from cart
- `DELETE /api/cart/{session_id}/clear` - Clear cart
- `POST /api/orders` - Create order (Invoice/Bank Transfer)
- `GET /api/orders/{order_number}` - Get order details
- `POST /api/quotes` - Create quote request
- `POST /api/contact` - Submit contact form

### Frontend Pages
- Homepage with Hero, Featured Products, Trust Section
- Products page with Category & Price filters
- Product Detail page with specifications
- Cart sidebar with quantity controls
- Checkout page with customer form
- Order confirmation page
- Quote request page (per product)
- Contact page

### Sample Products (6 machines)
- Schwerlast-Bagger X-200 (Baumaschinen)
- Präzisions-CNC-Fräsmaschine (CNC-Maschinen)
- Industrielle Drehmaschine PRO (CNC-Maschinen)
- Automatisierter Roboterarm R-50 (Robotik)
- Hydraulische Abkantpresse 200T (Blechbearbeitung)
- Laser-Schneidanlage LS-3000 (Lasertechnik)

## Prioritized Backlog

### P0 - Complete ✅
- Product catalog with filters
- Shopping cart functionality
- Checkout with invoice/bank transfer
- Quote request system
- Contact form

### P1 - Future Enhancements
- Admin panel for product management
- Email notifications for orders/quotes
- Customer accounts with order history
- Product search functionality
- Pagination for large catalogs

### P2 - Nice to Have
- Multi-language support (DE/EN)
- Product comparison feature
- PDF quote/invoice generation
- Stock management
- Integration with shipping providers

## Next Action Items
1. Add email notifications for orders and quote requests
2. Implement product search functionality
3. Add more product categories and items
