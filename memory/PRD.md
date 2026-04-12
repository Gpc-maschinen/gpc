# Josten Haus & Garten - Online Store PRD

## Original Problem Statement
"Baue mir einen Online-Store" - E-Commerce für Josten Haus & Garten Handelsgesellschaft mbH.

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with Shadcn/UI components + Tailwind CSS + Leaflet
- **Deployment**: Docker Compose + Nginx + Let's Encrypt SSL (2-Server Setup)
- **Notifications**: Telegram Bot API
- **Storage**: Local Docker Volume (`/app/uploads`)
- **Geolocation**: ip-api.com (free, no API key)

## What's Been Implemented (Complete)
- Produktkatalog mit Kategorien, Bestseller-Flag, Lagerverwaltung
- Automatische/Manuelle Artikelnummern (z.B. GPC-0001)
- Warenkorb & Checkout (Rechnung/Überweisung) mit B2C-Preisen (inkl. MwSt.)
- Dynamische Versandkosten (Zonen, kostenloser Versand ab Schwellwert)
- Admin Panel mit JWT Auth, lokaler Bild/PDF-Upload, Spezifikationen
- Sterne-Bewertung mit rückdatierbarem Datum
- Angebotspreis + korrekter Sale-Preis im Warenkorb
- Telegram-Benachrichtigungen bei Bestellungen/Anfragen
- Rechtliche Seiten (AGB, Datenschutz, Widerruf, Impressum)
- Dynamisches Impressum – editierbar aus dem Admin Panel
- Rebrand zu "Josten Haus & Garten" (grünes Theme #2D7A3A)
- Lokale Dateispeicherung via Docker Volume
- Bilder-Fix: object-contain (vollständige Bildanzeige)
- Cookie secure=True für HTTPS VPS
- **Analytics-Dashboard** im Admin Panel:
  - Seitenaufrufe (heute/Woche/30 Tage), Umsatz, Bestellungen
  - Tages-Chart (letzte 7 Tage)
  - Meistbesuchte Produkte & häufigste Warenkorb-Produkte (Top 10)
  - **Besucher-Weltkarte** mit Leaflet (interaktiv, zoombar, klickbar)
  - **Besucher nach Land** Aufschlüsselung
  - IP-Geolocation via ip-api.com mit In-Memory Cache

## DB Schema
- `products`: {id, name, article_number, description, category, is_bestseller, stock, price, sale_price, rating, images, specifications, reviews, downloads}
- `orders`: {id, order_number, items, total, shipping_cost, customer_details, payment_method, status, created_at}
- `settings` (type: "shop"): {shipping_costs, free_shipping_threshold, shipping_note}
- `settings` (type: "impressum"): {company_name, street, ...}
- `analytics`: {type, page, product_id, product_name, timestamp, date, hour, ip, geo: {country, country_code, city, lat, lng}}

## Backlog
### P1
- **App.js Refactoring** (~4000+ Zeilen aufteilen)

### P2
- Multi-Language Support (DE/EN)
- PDF Angebote/Rechnungen
- E-Mail-Benachrichtigungen
- Produktsuche
