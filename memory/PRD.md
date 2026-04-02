# Maschinen Store - PRD

## Original Problem Statement
"Baue mir einen Online-Store für Maschinen" - E-Commerce für G.P.C. Maschinen-Vertriebs-GmbH.

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with Shadcn/UI components
- **Deployment**: Docker Compose + Nginx + Let's Encrypt SSL
- **Notifications**: Telegram Bot API
- **Storage**: Emergent Object Storage (Bild-Upload)

## What's Been Implemented
- Produktkatalog, Warenkorb, Checkout (Rechnung/Überweisung)
- Admin Panel mit JWT Auth, Bild-Upload, gruppierte Spezifikationen, Bulk-Paste
- Sterne-Bewertung (0-5, 0.1 Schritte) pro Produkt
- Angebotspreis (durchgestrichen + Rabatt-Badge)
- Bulk-Upload für weitere Produktbilder
- Firmenlogo integriert
- Telegram-Benachrichtigungen bei Bestellungen
- Rechtliche Seiten mit Firmendaten
- VPS Deployment mit HTTPS
- "Made with Emergent" Badge entfernt

## Backlog
### P1
- E-Mail-Benachrichtigungen
- Produktsuche
### P2
- Multi-Language (DE/EN)
- PDF Angebote/Rechnungen
- Lagerverwaltung
