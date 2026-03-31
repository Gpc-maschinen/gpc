# GPC Maschinen Store

Online-Shop für Industriemaschinen.

## Deployment auf eigenem Server

### Voraussetzungen
- Ubuntu 22.04 LTS Server
- Domain die auf den Server zeigt
- SSH Zugang

### Installation

1. Mit Server verbinden:
```bash
ssh root@DEINE-SERVER-IP
```

2. Deployment Script herunterladen und ausführen:
```bash
curl -O https://raw.githubusercontent.com/DEIN-USERNAME/gpc-store/main/deploy.sh
chmod +x deploy.sh
sudo bash deploy.sh
```

3. Den Anweisungen folgen (Domain, Admin-Daten eingeben)

### Manuell aktualisieren
```bash
cd /opt/gpc-store
git pull
docker-compose build
docker-compose up -d
```

### Logs anzeigen
```bash
docker-compose logs -f
```

### Container Status
```bash
docker-compose ps
```

## Technologie
- Frontend: React
- Backend: FastAPI (Python)
- Datenbank: MongoDB
- Webserver: Nginx
- SSL: Let's Encrypt
