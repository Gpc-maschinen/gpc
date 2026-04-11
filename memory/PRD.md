# Josten Haus & Garten - Online Store PRD

## Original Problem Statement
"Baue mir einen Online-Store" - E-Commerce für Josten Haus & Garten Handelsgesellschaft mbH (ursprünglich Maschinen, jetzt Haus & Garten).

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with Shadcn/UI components + Tailwind CSS
- **Deployment**: Docker Compose + Nginx + Let's Encrypt SSL (2-Server Setup)
- **Notifications**: Telegram Bot API
- **Storage**: Local Docker Volume (`/app/uploads`)

## What's Been Implemented (Complete)
- Produktkatalog mit Kategorien, Bestseller-Flag, Lagerverwaltung
- Automatische/Manuelle Artikelnummern (z.B. GPC-0001)
- Warenkorb & Checkout (Rechnung/Überweisung) mit B2C-Preisen (inkl. MwSt.)
- Dynamische Versandkosten (Zonen, kostenloser Versand ab Schwellwert)
- Admin Panel mit JWT Auth, lokaler Bild/PDF-Upload, Spezifikationen
- Sterne-Bewertung mit rückdatierbarem Datum
- Angebotspreis (durchgestrichen + Rabatt-Badge)
- Telegram-Benachrichtigungen bei Bestellungen/Anfragen
- Rechtliche Seiten (AGB, Datenschutz, Widerruf) mit echten Firmendaten
- **Dynamisches Impressum** – editierbar aus dem Admin Panel (11. April 2026)
- Expandierbare Admin-Tabellen für Bestellungen und Anfragen
- Rebrand zu "Josten Haus & Garten" (grünes Theme #2D7A3A)
- 2-Server Deployment Tutorial (DEPLOYMENT_TUTORIAL.md)
- Lokale Dateispeicherung via Docker Volume (kein Cloud Storage)

## DB Schema
- `products`: {id, name, article_number, description, category, is_bestseller, stock, price, sale_price, rating, images, specifications, reviews, downloads}
- `orders`: {id, order_number, items, total, shipping_cost, customer_details, payment_method, status, created_at}
- `settings` (type: "shop"): {shipping_costs, free_shipping_threshold, shipping_note}
- `settings` (type: "impressum"): {company_name, street, postal_code, city, country, email, phone, register_court, register_number, euid, ust_id, managers, responsible_person, responsible_address}

## Key API Endpoints
- `POST /api/admin/upload` & `GET /api/files/{filename}`: Lokale Datei-Uploads
- `GET /api/settings/shipping` & `POST /api/settings`: Shop-Einstellungen
- `GET /api/impressum` & `PUT /api/admin/impressum`: Impressum (public/admin)
- `GET/POST /api/admin/products`: Produkte CRUD
- `POST /api/orders`: Bestellung aufgeben
- `POST /api/quotes`: Anfrage senden

## Backlog
### P1
- **App.js Refactoring** (~3844 Zeilen aufteilen in separate Komponenten)

### P2
- Multi-Language Support (DE/EN)
- PDF Angebote/Rechnungen
- E-Mail-Benachrichtigungen
- Produktsuche
