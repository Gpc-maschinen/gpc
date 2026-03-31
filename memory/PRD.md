# Maschinen Store - PRD

## Original Problem Statement
"Baue mir einen Online-Store für Maschinen" - E-Commerce für G.P.C. Maschinen-Vertriebs-GmbH.

## User Choices
- Produktkatalog mit Kategorien und Filtern
- Warenkorb & Checkout
- Zahlung nur per Rechnung/Überweisung
- Admin-Panel (gesichert mit JWT Auth)
- Statische Seiten (Impressum, AGB, Datenschutz, Widerrufsrecht, Kontakt)
- Bild-Upload für Produkte via Emergent Object Storage
- Nur Deutsch
- Deployment auf eigenen Ubuntu 22.04 VPS via Docker

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with Shadcn/UI components
- **Design**: Swiss Brutalist / High-Contrast aesthetic
- **Fonts**: Chivo (headings), IBM Plex Sans (body)
- **Primary Color**: Signal Red (#FF3B30)
- **Deployment**: Docker Compose + Nginx + Let's Encrypt SSL

## What's Been Implemented

### Backend API Endpoints
- `POST /api/auth/login` - Admin Login
- `GET /api/auth/me` - Auth Status
- `POST /api/upload` - Bild-Upload (Emergent Object Storage)
- `GET/POST/PUT/DELETE /api/products` - Produkt-CRUD
- `GET /api/products/categories` - Kategorien
- `POST /api/orders` - Bestellung aufgeben
- `GET /api/orders/{order_number}` - Bestelldetails
- `POST /api/quotes` - Angebotsanfrage
- `POST /api/contact` - Kontaktformular
- `GET/POST/PUT/DELETE /api/admin/*` - Admin-Endpunkte

### Frontend Pages
- Homepage mit Hero, Featured Products
- Produktseite mit Kategorie- & Preisfilter
- Produktdetailseite
- Warenkorb-Sidebar (Custom, kein Shadcn Sheet)
- Checkout mit Kundenformular
- Bestellbestätigung
- Angebotsanfrage
- Kontaktseite
- Impressum, AGB, Datenschutz, Widerrufsrecht
- Admin Panel (Login, Produkt-, Kategorien-, Bestell-Verwaltung)

### Deployment
- Docker Compose (MongoDB + Backend + Frontend)
- Nginx Reverse Proxy Konfiguration
- Let's Encrypt SSL
- deploy.sh Script & DEPLOYMENT.md Anleitung
- GitHub Repo: https://github.com/Gpc-maschinen/gpc

## Completed Tasks - All ✅
- P0: Produktkatalog, Warenkorb, Checkout, Angebotsanfragen, Kontakt
- P0: Admin Panel mit JWT Auth und Bild-Upload
- P0: Rechtliche Seiten mit echten Firmendaten
- P0: VPS Deployment-Anleitung mit GitHub-URL fertiggestellt

## Backlog

### P1 - Nächste Schritte
- E-Mail-Benachrichtigungen für Bestellungen/Anfragen
- Produktsuche
- Weitere Produktkategorien und -artikel

### P2 - Nice to Have
- Multi-Language (DE/EN)
- Produktvergleich
- PDF Angebote/Rechnungen
- Lagerverwaltung
- Versand-Integration
