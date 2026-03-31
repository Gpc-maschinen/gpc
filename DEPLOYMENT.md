# GPC Maschinen Store — VPS Deployment Anleitung

## Voraussetzungen
- Ubuntu 22.04 VPS (1 vCPU, 1 GB RAM reicht)
- SSH-Zugang zum Server
- Domain zeigt auf die Server-IP (A-Record)

---

## Schritt 1: Per SSH auf den Server verbinden

```bash
ssh root@DEINE-SERVER-IP
```

---

## Schritt 2: Alles in einem Befehl installieren und starten

Kopiere den gesamten Block und füge ihn auf dem Server ein.
**Ersetze vorher die 3 Werte oben** (DOMAIN, ADMIN_EMAIL, ADMIN_PASSWORD):

```bash
# ============================================
# DIESE 3 WERTE ANPASSEN:
# ============================================
DOMAIN="gpc-maschinen.de"
ADMIN_EMAIL="admin@gpc-maschinen.de"
ADMIN_PASSWORD="GPC2026Admin!"
# ============================================

# System updaten
apt update && apt upgrade -y

# Docker, Git, Nginx, Certbot installieren
apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx

# Docker starten
systemctl start docker
systemctl enable docker

# Repository klonen
cd /opt
git clone https://github.com/Gpc-maschinen/gpc.git gpc-store
cd gpc-store

# JWT Secret generieren
JWT_SECRET=$(openssl rand -hex 32)

# .env Datei erstellen
cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EMERGENT_LLM_KEY=
DOMAIN=${DOMAIN}
EOF

# Docker Container bauen und starten
docker-compose build --build-arg REACT_APP_BACKEND_URL=https://${DOMAIN}
docker-compose up -d

# Nginx konfigurieren
cat > /etc/nginx/sites-available/gpc-store << 'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }
}
NGINX

# Domain in Nginx-Config einsetzen
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN} www.${DOMAIN}/" /etc/nginx/sites-available/gpc-store

# Nginx aktivieren
ln -sf /etc/nginx/sites-available/gpc-store /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx && systemctl enable nginx

# SSL Zertifikat holen (HTTPS)
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${ADMIN_EMAIL}

echo ""
echo "============================================"
echo "  FERTIG! Dein Shop ist online."
echo "============================================"
echo "  Website:     https://${DOMAIN}"
echo "  Admin Panel: https://${DOMAIN}/admin/login"
echo "  E-Mail:      ${ADMIN_EMAIL}"
echo "  Passwort:    ${ADMIN_PASSWORD}"
echo "============================================"
```

---

## Nach dem Deployment: Updates einspielen

Wenn Sie in Emergent Änderungen machen und zu GitHub pushen, können Sie den Shop so aktualisieren:

```bash
cd /opt/gpc-store
git pull
docker-compose build --build-arg REACT_APP_BACKEND_URL=https://DEINE-DOMAIN.de
docker-compose up -d
```

---

## Fehlerbehebung

### Container-Status prüfen
```bash
cd /opt/gpc-store
docker-compose ps
```

### Logs anschauen
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Alles neu starten
```bash
cd /opt/gpc-store
docker-compose down
docker-compose up -d
```

### SSL Zertifikat erneuern (automatisch, aber manuell falls nötig)
```bash
certbot renew
```
