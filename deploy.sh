#!/bin/bash

# GPC Maschinen Store - Deployment Script
# Run this on your Ubuntu 22.04 server

set -e

echo "=========================================="
echo "GPC Maschinen Store - Installation"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Bitte als root ausführen: sudo bash deploy.sh"
    exit 1
fi

# Get domain from user
read -p "Deine Domain (z.B. gpc-maschinen.de): " DOMAIN
read -p "Admin E-Mail: " ADMIN_EMAIL
read -p "Admin Passwort: " ADMIN_PASSWORD

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo ">>> System Updates..."
apt update && apt upgrade -y

echo ""
echo ">>> Docker Installation..."
apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx

# Start Docker
systemctl start docker
systemctl enable docker

echo ""
echo ">>> Repository klonen..."
cd /opt
if [ -d "gpc-store" ]; then
    cd gpc-store
    git pull
else
    git clone https://github.com/DEIN-USERNAME/gpc-store.git
    cd gpc-store
fi

echo ""
echo ">>> Environment Datei erstellen..."
cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EMERGENT_LLM_KEY=
DOMAIN=${DOMAIN}
EOF

echo ""
echo ">>> Frontend Build mit Domain..."
export REACT_APP_BACKEND_URL=https://${DOMAIN}

echo ""
echo ">>> Docker Container starten..."
docker-compose down 2>/dev/null || true
docker-compose build --build-arg REACT_APP_BACKEND_URL=https://${DOMAIN}
docker-compose up -d

echo ""
echo ">>> Nginx Konfiguration..."
cat > /etc/nginx/sites-available/gpc-store << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Frontend
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

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/gpc-store /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

echo ""
echo ">>> SSL Zertifikat (Let's Encrypt)..."
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${ADMIN_EMAIL}

echo ""
echo "=========================================="
echo "INSTALLATION ABGESCHLOSSEN!"
echo "=========================================="
echo ""
echo "Deine Website: https://${DOMAIN}"
echo "Admin Panel:   https://${DOMAIN}/admin/login"
echo ""
echo "Admin Login:"
echo "  E-Mail:    ${ADMIN_EMAIL}"
echo "  Passwort:  ${ADMIN_PASSWORD}"
echo ""
echo "=========================================="
