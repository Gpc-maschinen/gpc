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
- Bulk-Upload für weitere Produktbilder + PDF/Dokument-Uploads
- Firmenlogo integriert
- Telegram-Benachrichtigungen bei Bestellungen
- Rechtliche Seiten mit Firmendaten
- VPS Deployment mit HTTPS
- Admin-verwaltete Kundenbewertungen mit rückdatierbarem Datum
- Produkt-Detail Tabs (Beschreibung, Technische Daten, Downloads)
- Versandkosten-System (Zonen, kostenloser Versand ab Schwellwert)
- Kategorie-Kacheln auf Produktseite
- B2C-Preise (inkl. MwSt.)
- Versand & Lieferinformation als Modal/Popup mit vollständigem Versandtext inkl. Insel-Liefergebiete
- Lagerverwaltung: Bestandsanzeige (grün/orange/rot), Warenkorb-Sperre bei 0, automatische Reduktion bei Bestellung

## DB Schema
- `products`: {id, name, description, category, price, sale_price, rating, images, specifications, reviews (with backdatable date), downloads, stock}
- `orders`: {id, order_number, customer, items, subtotal, shipping_cost, shipping_zone, total, payment_method, status, notes, created_at}
- `settings`: {type: "shop", shipping_costs: [{zone, cost}], free_shipping_threshold, shipping_note}

## Backlog
### P1
- App.js Refactoring (3400+ Zeilen aufteilen)
- E-Mail-Benachrichtigungen
- Produktsuche
### P2
- Multi-Language (DE/EN)
- PDF Angebote/Rechnungen
