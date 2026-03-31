#!/bin/bash

# GPC Maschinen Store - Automatisches Deployment Script
# Für Ubuntu 22.04 VPS
# Nutzung: sudo bash deploy.sh

set -e

echo "=========================================="
echo "GPC Maschinen Store - Installation"
echo "=========================================="

# Root-Check
if [ "$EUID" -ne 0 ]; then 
    echo "Bitte als root ausfuehren: sudo bash deploy.sh"
    exit 1
fi

# Eingaben vom Benutzer
echo ""
read -p "Deine Domain (z.B. gpc-maschinen.de): " DOMAIN
read -p "Admin E-Mail: " ADMIN_EMAIL
read -sp "Admin Passwort: " ADMIN_PASSWORD
echo ""

# JWT Secret generieren
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo ">>> System wird aktualisiert..."
apt update && apt upgrade -y

echo ""
echo ">>> Docker, Git, Nginx und Certbot werden installiert..."
apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx

systemctl start docker
systemctl enable docker

echo ""
echo ">>> Repository wird geklont..."
cd /opt
if [ -d "gpc-store" ]; then
    echo "    Ordner existiert bereits, aktualisiere..."
    cd gpc-store
    git pull
else
    git clone https://github.com/Gpc-maschinen/gpc.git gpc-store
    cd gpc-store
fi

echo ""
echo ">>> Environment-Datei wird erstellt..."
cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EMERGENT_LLM_KEY=
DOMAIN=${DOMAIN}
EOF

echo ""
echo ">>> Docker Container werden gebaut und gestartet..."
docker-compose down 2>/dev/null || true
docker-compose build --build-arg REACT_APP_BACKEND_URL=https://${DOMAIN}
docker-compose up -d

echo ""
echo ">>> Nginx wird konfiguriert..."
cat > /etc/nginx/sites-available/gpc-store << NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 20M;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gpc-store /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

echo ""
echo ">>> SSL Zertifikat wird geholt (Let's Encrypt)..."
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${ADMIN_EMAIL}

echo ""
echo "=========================================="
echo "  INSTALLATION ABGESCHLOSSEN!"
echo "=========================================="
echo ""
echo "  Website:     https://${DOMAIN}"
echo "  Admin Panel: https://${DOMAIN}/admin/login"
echo ""
echo "  Admin Login:"
echo "    E-Mail:    ${ADMIN_EMAIL}"
echo "    Passwort:  ${ADMIN_PASSWORD}"
echo ""
echo "=========================================="
