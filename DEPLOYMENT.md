# Deployment Guide: Josten Haus & Garten
# Proxy-Server + Main-Server Setup mit Ubuntu

---

## Übersicht

```
Internet → josten-garten.de → [PROXY-SERVER] → [MAIN-SERVER]
                                 (Nginx + SSL)     (Docker: React + FastAPI + MongoDB)
```

- **Proxy-Server**: Nimmt alle Anfragen entgegen, SSL-Terminierung, leitet an Main-Server weiter
- **Main-Server**: Läuft die App (Frontend + Backend + Datenbank)

---

## TEIL 1: MAIN-SERVER einrichten

### 1.1 Grundlegende Server-Vorbereitung

```bash
# Als root einloggen
ssh root@MAIN-SERVER-IP

# System updaten
apt update && apt upgrade -y

# Firewall einrichten - NUR den Proxy-Server erlauben
ufw allow OpenSSH
ufw allow from PROXY-SERVER-IP to any port 3000
ufw allow from PROXY-SERVER-IP to any port 8001
ufw enable
```

### 1.2 Docker & Docker Compose installieren

```bash
# Docker installieren
curl -fsSL https://get.docker.com | sh

# Docker Compose v2 installieren
apt install docker-compose-plugin -y

# Prüfen
docker --version
docker compose version
```

### 1.3 App-Dateien auf den Server bringen

**Option A: Via GitHub (empfohlen)**
```bash
apt install git -y
cd /opt
git clone https://github.com/DEIN-REPO/josten-shop.git
cd josten-shop
```

**Option B: Via SCP vom lokalen Rechner**
```bash
# Auf deinem lokalen Rechner ausführen:
scp -r /pfad/zum/projekt root@MAIN-SERVER-IP:/opt/josten-shop
```

### 1.4 Environment-Dateien erstellen

```bash
cd /opt/josten-shop

# Backend .env
cat > backend/.env << 'EOF'
MONGO_URL=mongodb://mongo:27017
DB_NAME=josten_shop
ADMIN_EMAIL=admin@josten-garten.de
ADMIN_PASSWORD=DEIN_SICHERES_PASSWORT
JWT_SECRET=HIER_EINEN_LANGEN_ZUFALLS_STRING_EINGEBEN
TELEGRAM_BOT_TOKEN=DEIN_BOT_TOKEN
TELEGRAM_CHAT_ID=DEIN_CHAT_ID
EMERGENT_LLM_KEY=DEIN_KEY
EOF

# Frontend .env
cat > frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=https://josten-garten.de
EOF
```

> **Wichtig:** JWT_SECRET generieren mit: `openssl rand -hex 32`

### 1.5 Docker Compose Datei erstellen

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongo:
    image: mongo:7
    restart: always
    volumes:
      - mongo_data:/data/db
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8001:8001"
    env_file:
      - ./backend/.env
    depends_on:
      - mongo
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  mongo_data:

networks:
  app-network:
    driver: bridge
EOF
```

### 1.6 Backend Dockerfile prüfen/erstellen

```bash
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
EOF
```

### 1.7 Frontend Dockerfile prüfen/erstellen

```bash
cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

COPY . .
RUN yarn build

FROM node:20-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=build /app/build ./build
CMD ["serve", "-s", "build", "-l", "3000"]
EOF
```

### 1.8 App starten

```bash
cd /opt/josten-shop

# Bauen und starten
docker compose up -d --build

# Status prüfen
docker compose ps

# Logs anschauen
docker compose logs -f
```

### 1.9 Testen ob die App auf dem Main-Server läuft

```bash
# Frontend testen
curl -s http://localhost:3000 | head -5

# Backend testen
curl -s http://localhost:8001/api/products | head -20
```

---

## TEIL 2: PROXY-SERVER einrichten

### 2.1 Grundlegende Server-Vorbereitung

```bash
# Als root einloggen
ssh root@PROXY-SERVER-IP

# System updaten
apt update && apt upgrade -y

# Firewall einrichten
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### 2.2 Nginx installieren

```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

### 2.3 Certbot (SSL) installieren

```bash
apt install certbot python3-certbot-nginx -y
```

### 2.4 DNS konfigurieren

Bei deinem Domain-Provider (wo josten-garten.de registriert ist):

```
Typ     Name    Wert                TTL
A       @       PROXY-SERVER-IP     300
A       www     PROXY-SERVER-IP     300
```

> **Warte 5-10 Minuten** bis die DNS-Einträge aktiv sind.

Prüfen:
```bash
dig josten-garten.de +short
# Sollte deine PROXY-SERVER-IP zeigen
```

### 2.5 Nginx Konfiguration erstellen

```bash
cat > /etc/nginx/sites-available/josten-garten.de << 'NGINX'
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name josten-garten.de www.josten-garten.de;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name josten-garten.de www.josten-garten.de;

    # SSL wird von Certbot eingefügt (siehe Schritt 2.6)
    # ssl_certificate ...
    # ssl_certificate_key ...

    # Sicherheits-Header
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Upload-Limit (für Bilder/PDFs)
    client_max_body_size 25M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # API-Anfragen → Backend auf Main-Server
    location /api/ {
        proxy_pass http://MAIN-SERVER-IP:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cookie $http_cookie;
    }

    # Alles andere → Frontend auf Main-Server
    location / {
        proxy_pass http://MAIN-SERVER-IP:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
```

> **WICHTIG:** Ersetze `MAIN-SERVER-IP` mit der echten IP deines Main-Servers!

### 2.6 Nginx aktivieren und testen

```bash
# Alte default-Seite entfernen
rm -f /etc/nginx/sites-enabled/default

# Neue Seite aktivieren
ln -s /etc/nginx/sites-available/josten-garten.de /etc/nginx/sites-enabled/

# Konfiguration testen
nginx -t

# Nginx neu laden
systemctl reload nginx
```

### 2.7 SSL-Zertifikat erstellen

```bash
# Zuerst: SSL-Zeilen in der Nginx-Config auskommentiert lassen
# Certbot fügt sie automatisch ein

certbot --nginx -d josten-garten.de -d www.josten-garten.de

# Folge den Anweisungen:
# - E-Mail eingeben
# - AGB akzeptieren
# - Redirect auf HTTPS: Ja (Option 2)
```

### 2.8 SSL Auto-Renewal testen

```bash
certbot renew --dry-run
```

### 2.9 Finale Tests

```bash
# Von deinem lokalen Rechner oder dem Proxy-Server:
curl -I https://josten-garten.de
# → Sollte HTTP/2 200 zeigen

curl https://josten-garten.de/api/products
# → Sollte JSON mit Produkten zeigen
```

---

## TEIL 3: WARTUNG & UPDATES

### 3.1 App updaten (nach Code-Änderungen)

```bash
# Auf dem MAIN-SERVER:
cd /opt/josten-shop
git pull origin main
docker compose up -d --build
```

### 3.2 Logs anschauen

```bash
# Main-Server: App-Logs
docker compose logs -f backend
docker compose logs -f frontend

# Proxy-Server: Nginx-Logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 3.3 Datenbank-Backup

```bash
# Auf dem MAIN-SERVER:
# Backup erstellen
docker compose exec mongo mongodump --out /data/backup/$(date +%Y%m%d)

# Backup vom Container auf den Host kopieren
docker compose cp mongo:/data/backup ./backups/

# Automatisches tägliches Backup (Cronjob)
crontab -e
# Folgende Zeile hinzufügen:
0 3 * * * cd /opt/josten-shop && docker compose exec -T mongo mongodump --out /data/backup/$(date +\%Y\%m\%d) 2>&1 >> /var/log/mongo-backup.log
```

### 3.4 App neustarten

```bash
# Alles neustarten
docker compose restart

# Nur Backend neustarten
docker compose restart backend

# Komplett stoppen und neu starten
docker compose down
docker compose up -d
```

### 3.5 SSL-Zertifikat manuell erneuern

```bash
# Auf dem PROXY-SERVER:
certbot renew
systemctl reload nginx
```

---

## TEIL 4: FEHLERBEHEBUNG

### Seite lädt nicht?

```bash
# 1. Proxy-Server: Nginx Status
systemctl status nginx
nginx -t

# 2. Main-Server: Container Status
docker compose ps
# Alle Container müssen "Up" sein

# 3. Verbindung testen (vom Proxy-Server aus)
curl http://MAIN-SERVER-IP:3000
curl http://MAIN-SERVER-IP:8001/api/products
```

### 502 Bad Gateway?

```bash
# Main-Server ist nicht erreichbar. Prüfe:

# 1. Firewall auf Main-Server
ufw status
# Port 3000 und 8001 müssen für Proxy-Server-IP offen sein

# 2. Container laufen?
docker compose ps
docker compose logs backend
```

### Bilder/Uploads funktionieren nicht?

```bash
# Proxy-Server: Upload-Limit prüfen
grep client_max_body_size /etc/nginx/sites-available/josten-garten.de
# Sollte 25M sein

# Backend: EMERGENT_LLM_KEY in .env prüfen
cat /opt/josten-shop/backend/.env | grep EMERGENT
```

### SSL-Probleme?

```bash
# Zertifikat-Status prüfen
certbot certificates

# Zertifikat erneuern
certbot renew --force-renewal
systemctl reload nginx
```

---

## SCHNELL-CHECKLISTE

- [ ] Main-Server: Docker + Docker Compose installiert
- [ ] Main-Server: App-Code vorhanden unter /opt/josten-shop
- [ ] Main-Server: .env Dateien erstellt (backend + frontend)
- [ ] Main-Server: `docker compose up -d --build` erfolgreich
- [ ] Main-Server: Firewall erlaubt Proxy-Server-IP auf Port 3000 + 8001
- [ ] Proxy-Server: Nginx installiert
- [ ] Proxy-Server: DNS A-Record zeigt auf Proxy-Server-IP
- [ ] Proxy-Server: Nginx-Config mit richtiger MAIN-SERVER-IP
- [ ] Proxy-Server: SSL-Zertifikat via Certbot erstellt
- [ ] Test: https://josten-garten.de lädt die Seite
- [ ] Test: https://josten-garten.de/api/products gibt JSON zurück
- [ ] Test: Admin-Login funktioniert unter /admin/login
