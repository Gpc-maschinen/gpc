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
- Admin-verwaltete Kundenbewertungen (Name, Text, Sterne, Datum)
- Produkt-Detail Tabs (Beschreibung, Technische Daten, Downloads)
- PDF/Manual Downloads Upload
- **Versandkosten-System (NEU 2026-04-02)**:
  - Admin Settings: Versandzonen mit Preisen, Schwellwert für kostenlosen Versand, Versandhinweis
  - Warenkorb zeigt Versandkosten-Info
  - Kasse: Versandzone wählen, Zwischensumme + Versand + Gesamt
  - Bestellbestätigung mit Versandkosten-Aufschlüsselung
  - Backend berechnet Versandkosten bei Bestellung
  - Telegram-Nachricht enthält Versandkosten
- **Kategorie-Kacheln auf Produktseite (NEU 2026-04-02)**

## DB Schema
- `products`: {id, name, description, category, price, sale_price, rating, images, specifications, reviews, downloads}
- `orders`: {id, order_number, customer, items, subtotal, shipping_cost, shipping_zone, total, payment_method, status, notes, created_at}
- `settings`: {type: "shop", shipping_costs: [{zone, cost}], free_shipping_threshold, shipping_note}

## Backlog
### P1
- App.js Refactoring (3300+ Zeilen aufteilen)
- E-Mail-Benachrichtigungen
- Produktsuche
### P2
- Multi-Language (DE/EN)
- PDF Angebote/Rechnungen
- Lagerverwaltung
