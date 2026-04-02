# Maschinen Store - PRD

## Original Problem Statement
"Baue mir einen Online-Store für Maschinen" - E-Commerce für G.P.C. Maschinen-Vertriebs-GmbH.

## User Choices
- Produktkatalog mit Kategorien und Filtern
- Warenkorb & Checkout (nur Rechnung/Überweisung)
- Admin-Panel (JWT Auth) mit Bild-Upload
- Gruppierte Produktspezifikationen mit Bulk-Paste
- Statische Seiten (Impressum, AGB, Datenschutz, Widerrufsrecht, Kontakt)
- Telegram-Benachrichtigungen bei Bestellungen
- Firmenlogo integriert
- Nur Deutsch
- Deployment auf Ubuntu 22.04 VPS via Docker

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with Shadcn/UI components
- **Deployment**: Docker Compose + Nginx + Let's Encrypt SSL
- **Notifications**: Telegram Bot API
- **Storage**: Emergent Object Storage (Bild-Upload)

## What's Been Implemented

### Backend API Endpoints
- `POST /api/auth/login` - Admin Login
- `GET /api/auth/me` - Auth Status
- `POST /api/upload` - Bild-Upload
- `GET/POST/PUT/DELETE /api/products` - Produkt-CRUD
- `GET /api/products/categories` - Kategorien
- `POST /api/orders` - Bestellung + Telegram-Benachrichtigung
- `POST /api/quotes` - Angebotsanfrage
- `POST /api/contact` - Kontaktformular
- `GET/POST/PUT/DELETE /api/admin/*` - Admin-Endpunkte

### Frontend
- Homepage, Produktseite, Produktdetails, Warenkorb, Checkout
- Admin Panel mit gruppierten Spezifikationen und Bulk-Paste
- Firmenlogo (gpc-logo.jpg) in Navbar und Footer
- Rechtliche Seiten mit Firmendaten

### Deployment
- Docker Compose + Nginx + SSL
- GitHub: https://github.com/Gpc-maschinen/gpc

## Completed Tasks - All Done
- Produktkatalog, Warenkorb, Checkout
- Admin Panel mit JWT Auth und Bild-Upload
- Rechtliche Seiten
- VPS Deployment mit HTTPS
- Telegram-Benachrichtigungen
- Firmenlogo integriert
- Gruppierte Spezifikationen mit Bulk-Paste
- "Made with Emergent" Badge entfernt
- Product deletion fix (kein Auto-Seeding mehr)

## Backlog

### P1
- E-Mail-Benachrichtigungen
- Produktsuche

### P2
- Multi-Language (DE/EN)
- PDF Angebote/Rechnungen
- Lagerverwaltung
