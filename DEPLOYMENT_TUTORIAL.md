================================================================================
       KOMPLETTES DEPLOYMENT TUTORIAL - SCHRITT FÜR SCHRITT
       Josten Haus & Garten Handelsgesellschaft mbH
       josten-garten.de
================================================================================

INHALTSVERZEICHNIS
==================
1. Übersicht & Architektur
2. Voraussetzungen
3. MAIN-SERVER komplett einrichten
4. PROXY-SERVER komplett einrichten
5. Domain & DNS konfigurieren
6. SSL-Zertifikat (HTTPS) einrichten
7. Alles testen
8. Wartung & Updates
9. Backups
10. Fehlerbehebung
11. Sicherheits-Tipps

================================================================================
1. ÜBERSICHT & ARCHITEKTUR
================================================================================

So sieht das Setup aus:

    Kunde öffnet Browser
           |
           v
    josten-garten.de (DNS zeigt auf Proxy-Server)
           |
           v
    ┌─────────────────────────────┐
    │      PROXY-SERVER           │
    │                             │
    │  Ubuntu + Nginx + SSL       │
    │                             │
    │  - Nimmt ALLE Anfragen an   │
    │  - Verschlüsselt mit HTTPS  │
    │  - Leitet weiter an         │
    │    Main-Server              │
    └──────────┬──────────────────┘
               │ (interne Verbindung)
               v
    ┌─────────────────────────────┐
    │      MAIN-SERVER            │
    │                             │
    │  Ubuntu + Docker            │
    │                             │
    │  Container 1: Frontend      │
    │   (React, Port 3000)        │
    │                             │
    │  Container 2: Backend       │
    │   (FastAPI, Port 8001)      │
    │                             │
    │  Container 3: Datenbank     │
    │   (MongoDB, Port 27017)     │
    └─────────────────────────────┘

Warum zwei Server?
- Proxy-Server: Öffentlich erreichbar, macht SSL, schützt den Main-Server
- Main-Server: Nicht direkt aus dem Internet erreichbar (sicherer)

================================================================================
2. VORAUSSETZUNGEN
================================================================================

Was du brauchst:
  [x] 2 Ubuntu Server (22.04 oder 24.04) mit Root-Zugang
  [x] Domain: josten-garten.de (bei einem Domain-Anbieter registriert)
  [x] SSH-Zugang zu beiden Servern
  [x] Den App-Code (über GitHub oder als Download von Emergent)

Notiere dir:
  - PROXY-SERVER-IP:  ___.___.___.___ (die öffentliche IP des Proxy-Servers)
  - MAIN-SERVER-IP:   ___.___.___.___ (die öffentliche IP des Main-Servers)

WICHTIG: In diesem Tutorial musst du überall wo PROXY-SERVER-IP oder
MAIN-SERVER-IP steht, deine echten IPs einsetzen!

================================================================================
3. MAIN-SERVER KOMPLETT EINRICHTEN
================================================================================

Verbinde dich per SSH mit dem Main-Server:

    ssh root@MAIN-SERVER-IP

Du bist jetzt auf dem Main-Server eingeloggt.
Alle folgenden Befehle werden dort ausgeführt.

---------------------------------------------------------------------------
3.1 System aktualisieren
---------------------------------------------------------------------------

    apt update
    apt upgrade -y

Was passiert: Ubuntu lädt die neuesten Sicherheits-Updates herunter
und installiert sie. Das dauert 1-3 Minuten.

Falls gefragt wird "Do you want to continue? [Y/n]" → Einfach Enter drücken.

---------------------------------------------------------------------------
3.2 Wichtige Pakete installieren
---------------------------------------------------------------------------

    apt install -y curl git ufw

Was das ist:
  - curl: Zum Testen von Webseiten im Terminal
  - git: Zum Herunterladen des Codes von GitHub
  - ufw: Firewall (Uncomplicated Firewall)

---------------------------------------------------------------------------
3.3 Docker installieren
---------------------------------------------------------------------------

    curl -fsSL https://get.docker.com | sh

Was passiert: Docker wird automatisch heruntergeladen und installiert.
Das dauert ca. 1-2 Minuten.

Prüfe ob es geklappt hat:

    docker --version

Erwartete Ausgabe (Version kann abweichen):
    Docker version 27.x.x, build xxxxx

---------------------------------------------------------------------------
3.4 Docker Compose installieren
---------------------------------------------------------------------------

    apt install -y docker-compose-plugin

Prüfe ob es geklappt hat:

    docker compose version

Erwartete Ausgabe:
    Docker Compose version v2.x.x

---------------------------------------------------------------------------
3.5 Firewall einrichten
---------------------------------------------------------------------------

WICHTIG: Ersetze PROXY-SERVER-IP mit der echten IP deines Proxy-Servers!

    # SSH erlauben (damit du dich nicht aussperrst!)
    ufw allow OpenSSH

    # NUR dem Proxy-Server erlauben auf die App zuzugreifen
    ufw allow from PROXY-SERVER-IP to any port 3000
    ufw allow from PROXY-SERVER-IP to any port 8001

    # Firewall aktivieren
    ufw enable

Es kommt die Frage:
"Command may disrupt existing SSH connections. Proceed with operation (y|n)?"
→ Tippe: y und drücke Enter

Prüfe den Status:

    ufw status

Erwartete Ausgabe:
    Status: active

    To                         Action      From
    --                         ------      ----
    OpenSSH                    ALLOW       Anywhere
    3000                       ALLOW       PROXY-SERVER-IP
    8001                       ALLOW       PROXY-SERVER-IP

Was das bedeutet:
  - SSH (Port 22) ist von überall erreichbar → du kannst dich einloggen
  - Port 3000 und 8001 sind NUR vom Proxy-Server erreichbar
  - Niemand sonst kann direkt auf die App zugreifen → sicher!

---------------------------------------------------------------------------
3.6 App-Code auf den Server bringen
---------------------------------------------------------------------------

OPTION A: Über GitHub (empfohlen wenn du den Code gepusht hast)

    cd /opt
    git clone https://github.com/DEIN-BENUTZERNAME/DEIN-REPO.git josten-shop
    cd josten-shop

OPTION B: Über SCP (Datei-Upload von deinem Rechner)

    Auf DEINEM LOKALEN RECHNER ausführen (nicht auf dem Server!):

    scp -r /pfad/zum/projekt root@MAIN-SERVER-IP:/opt/josten-shop

    Dann wieder auf dem Server:

    cd /opt/josten-shop

OPTION C: Code von Emergent herunterladen

    1. Gehe in Emergent auf dein Projekt
    2. Klicke auf "Save to GitHub" oder lade die Dateien über VS Code herunter
    3. Dann nutze Option A oder B

Am Ende sollte der Ordner so aussehen:

    ls /opt/josten-shop/

    Erwartete Ausgabe:
    backend/  frontend/  docker-compose.yml  ...

---------------------------------------------------------------------------
3.7 Backend .env Datei erstellen
---------------------------------------------------------------------------

Zuerst einen sicheren JWT Secret Key generieren:

    openssl rand -hex 32

Kopiere die Ausgabe (z.B. a1b2c3d4e5f6...). Das ist dein JWT_SECRET.

Jetzt die .env Datei erstellen:

    nano /opt/josten-shop/backend/.env

Folgenden Inhalt einfügen (PASSE DIE WERTE AN!):

    MONGO_URL=mongodb://mongo:27017
    DB_NAME=josten_shop
    ADMIN_EMAIL=admin@josten-garten.de
    ADMIN_PASSWORD=HIER_EIN_SICHERES_PASSWORT
    JWT_SECRET=HIER_DEN_GENERIERTEN_KEY_EINFUEGEN
    TELEGRAM_BOT_TOKEN=DEIN_TELEGRAM_BOT_TOKEN
    TELEGRAM_CHAT_ID=DEIN_TELEGRAM_CHAT_ID
    EMERGENT_LLM_KEY=DEIN_EMERGENT_KEY

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG der Werte:
  - MONGO_URL: Verbindung zur Datenbank. "mongo" ist der Container-Name.
    NICHT ändern!
  - DB_NAME: Name der Datenbank. Kannst du frei wählen.
  - ADMIN_EMAIL: E-Mail für den Admin-Login
  - ADMIN_PASSWORD: Passwort für den Admin-Login. ÄNDERE DAS!
  - JWT_SECRET: Geheimer Schlüssel für die Login-Tokens. Den hast du gerade
    generiert.
  - TELEGRAM_BOT_TOKEN: Dein Telegram Bot Token (für Bestellbenachrichtigungen)
  - TELEGRAM_CHAT_ID: Deine Telegram Chat/Gruppen ID
  - EMERGENT_LLM_KEY: Für Bild-Uploads (bekommst du von Emergent)

---------------------------------------------------------------------------
3.8 Frontend .env Datei erstellen
---------------------------------------------------------------------------

    nano /opt/josten-shop/frontend/.env

Folgenden Inhalt einfügen:

    REACT_APP_BACKEND_URL=https://josten-garten.de

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG:
  Das Frontend muss wissen, unter welcher Adresse das Backend erreichbar ist.
  Da der Proxy-Server alles über josten-garten.de leitet, ist das die URL.

---------------------------------------------------------------------------
3.9 Backend Dockerfile erstellen/prüfen
---------------------------------------------------------------------------

    nano /opt/josten-shop/backend/Dockerfile

Inhalt (falls nicht vorhanden oder abweichend):

    FROM python:3.11-slim

    WORKDIR /app

    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt

    COPY . .

    CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG:
  - FROM python:3.11-slim: Nutzt Python 3.11 als Basis
  - WORKDIR /app: Arbeitsverzeichnis im Container
  - COPY requirements.txt + RUN pip install: Installiert alle Python-Pakete
  - COPY . .: Kopiert den gesamten Backend-Code in den Container
  - CMD: Startet den FastAPI-Server auf Port 8001

---------------------------------------------------------------------------
3.10 Frontend Dockerfile erstellen/prüfen
---------------------------------------------------------------------------

    nano /opt/josten-shop/frontend/Dockerfile

Inhalt (falls nicht vorhanden oder abweichend):

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

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG:
  - Erster Teil (AS build): Baut die React-App
  - Zweiter Teil: Nimmt nur die fertigen Build-Dateien und serviert sie
  - "serve" ist ein einfacher Webserver für statische Dateien
  - Die App läuft auf Port 3000

---------------------------------------------------------------------------
3.11 Docker Compose Datei erstellen/prüfen
---------------------------------------------------------------------------

    nano /opt/josten-shop/docker-compose.yml

Inhalt:

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

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG:
  - 3 Container: mongo (Datenbank), backend (API), frontend (Website)
  - restart: always → Container starten automatisch nach Server-Neustart
  - volumes: mongo_data → Datenbank bleibt erhalten auch wenn Container
    neu gebaut werden
  - depends_on → Backend startet erst wenn DB läuft, Frontend erst wenn
    Backend läuft
  - networks → Alle Container können sich gegenseitig erreichen

---------------------------------------------------------------------------
3.12 App bauen und starten
---------------------------------------------------------------------------

    cd /opt/josten-shop
    docker compose up -d --build

ERKLÄRUNG:
  - up: Container starten
  - -d: Im Hintergrund (detached) laufen lassen
  - --build: Container neu bauen (wichtig beim ersten Mal und nach Updates)

Das dauert beim ersten Mal 3-8 Minuten (je nach Server-Geschwindigkeit).

Fortschritt beobachten:

    docker compose logs -f

(Mit Strg+C beenden wenn "Application startup complete" erscheint)

---------------------------------------------------------------------------
3.13 Prüfen ob alles läuft
---------------------------------------------------------------------------

    docker compose ps

Erwartete Ausgabe (alle 3 müssen "Up" oder "running" zeigen):

    NAME                    STATUS
    josten-shop-mongo-1     Up
    josten-shop-backend-1   Up
    josten-shop-frontend-1  Up

Schnell-Test:

    # Frontend erreichbar?
    curl -s http://localhost:3000 | head -3

    # Backend erreichbar?
    curl -s http://localhost:8001/api/products

Wenn beides eine Ausgabe liefert → MAIN-SERVER IST FERTIG!

================================================================================
4. PROXY-SERVER KOMPLETT EINRICHTEN
================================================================================

NEUES Terminal öffnen und mit dem Proxy-Server verbinden:

    ssh root@PROXY-SERVER-IP

Du bist jetzt auf dem Proxy-Server eingeloggt.

---------------------------------------------------------------------------
4.1 System aktualisieren
---------------------------------------------------------------------------

    apt update
    apt upgrade -y

---------------------------------------------------------------------------
4.2 Nginx installieren
---------------------------------------------------------------------------

    apt install -y nginx

Prüfe ob Nginx läuft:

    systemctl status nginx

Du solltest "active (running)" sehen (grün).
Mit "q" beenden.

Schnelltest - öffne im Browser:

    http://PROXY-SERVER-IP

Du solltest die Nginx-Willkommensseite sehen ("Welcome to nginx!").

---------------------------------------------------------------------------
4.3 Firewall einrichten
---------------------------------------------------------------------------

    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw enable

Antwort: y

ERKLÄRUNG:
  - 'Nginx Full' erlaubt Port 80 (HTTP) und Port 443 (HTTPS)
  - Beides wird gebraucht: Port 80 für die SSL-Erstellung, Port 443 für HTTPS

---------------------------------------------------------------------------
4.4 Certbot installieren (für SSL-Zertifikat)
---------------------------------------------------------------------------

    apt install -y certbot python3-certbot-nginx

ERKLÄRUNG:
  Certbot erstellt kostenlose SSL-Zertifikate von Let's Encrypt.
  Das Plugin python3-certbot-nginx konfiguriert Nginx automatisch.

---------------------------------------------------------------------------
4.5 Nginx Konfiguration erstellen
---------------------------------------------------------------------------

WICHTIG: Ersetze MAIN-SERVER-IP mit der echten IP deines Main-Servers!

Zuerst die Standard-Seite deaktivieren:

    rm -f /etc/nginx/sites-enabled/default

Neue Konfiguration erstellen:

    nano /etc/nginx/sites-available/josten-garten.de

Folgenden Inhalt einfügen:

    # ====================================
    # HTTP → Leitet auf HTTPS um
    # ====================================
    server {
        listen 80;
        server_name josten-garten.de www.josten-garten.de;

        # Wird von Certbot für die SSL-Verifizierung gebraucht
        location /.well-known/acme-challenge/ {
            root /var/www/html;
        }

        # Alles andere → auf HTTPS umleiten
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # ====================================
    # HTTPS Server (Hauptkonfiguration)
    # ====================================
    server {
        listen 443 ssl http2;
        server_name josten-garten.de www.josten-garten.de;

        # SSL-Zertifikate (werden von Certbot automatisch eingetragen)
        # ssl_certificate /etc/letsencrypt/live/josten-garten.de/fullchain.pem;
        # ssl_certificate_key /etc/letsencrypt/live/josten-garten.de/privkey.pem;
        # include /etc/letsencrypt/options-ssl-nginx.conf;
        # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        # Sicherheits-Header
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Maximale Upload-Größe (für Bilder und PDFs)
        client_max_body_size 25M;

        # Timeouts für die Verbindung zum Main-Server
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # ------------------------------------------
        # API-Anfragen → Backend auf dem Main-Server
        # ------------------------------------------
        location /api/ {
            proxy_pass http://MAIN-SERVER-IP:8001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Cookie $http_cookie;
        }

        # ------------------------------------------
        # Alles andere → Frontend auf dem Main-Server
        # ------------------------------------------
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

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG was jede Zeile macht:

  listen 80/443:
    Nginx hört auf Port 80 (HTTP) und 443 (HTTPS)

  server_name:
    Nur Anfragen an josten-garten.de werden bearbeitet

  location /api/:
    Alle URLs die mit /api/ beginnen werden an das Backend weitergeleitet
    Beispiel: josten-garten.de/api/products → MAIN-SERVER:8001/api/products

  location /:
    Alles andere wird an das Frontend weitergeleitet
    Beispiel: josten-garten.de/produkte → MAIN-SERVER:3000/produkte

  proxy_set_header:
    Sendet wichtige Infos an den Main-Server mit:
    - Echte IP des Besuchers
    - Ob HTTPS verwendet wird
    - Cookies für den Admin-Login

  client_max_body_size 25M:
    Erlaubt Uploads bis 25 MB (für Bilder und PDFs)

---------------------------------------------------------------------------
4.6 Konfiguration aktivieren und testen
---------------------------------------------------------------------------

    # Symlink erstellen (aktiviert die Konfiguration)
    ln -s /etc/nginx/sites-available/josten-garten.de /etc/nginx/sites-enabled/

    # Konfiguration auf Fehler prüfen
    nginx -t

Erwartete Ausgabe:
    nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
    nginx: configuration file /etc/nginx/nginx.conf test is successful

Falls Fehler angezeigt werden:
  → Prüfe ob du MAIN-SERVER-IP ersetzt hast
  → Prüfe ob alle Klammern {} richtig geschlossen sind

    # Nginx neu laden (wendet die Konfiguration an)
    systemctl reload nginx

================================================================================
5. DOMAIN & DNS KONFIGURIEREN
================================================================================

Gehe zu deinem Domain-Anbieter (dort wo du josten-garten.de registriert hast).
Das kann sein: IONOS, Strato, Hetzner, Namecheap, GoDaddy, etc.

---------------------------------------------------------------------------
5.1 DNS-Einträge setzen
---------------------------------------------------------------------------

Suche die DNS-Verwaltung und erstelle/ändere folgende Einträge:

    Typ:    A
    Name:   @ (oder leer lassen)
    Wert:   PROXY-SERVER-IP
    TTL:    300 (oder 5 Minuten)

    Typ:    A
    Name:   www
    Wert:   PROXY-SERVER-IP
    TTL:    300

WICHTIG:
  - Der DNS-Eintrag zeigt auf den PROXY-SERVER, NICHT auf den Main-Server!
  - Lösche alte DNS-Einträge für @ und www falls vorhanden
  - TTL 300 = 5 Minuten → schnellere Änderungen

---------------------------------------------------------------------------
5.2 Warten und prüfen
---------------------------------------------------------------------------

DNS-Änderungen brauchen 5-30 Minuten (manchmal bis zu 24 Stunden).

Prüfe ob es funktioniert:

    # Auf dem Proxy-Server oder deinem Rechner:
    dig josten-garten.de +short

Erwartete Ausgabe:
    PROXY-SERVER-IP

Oder im Browser:

    http://josten-garten.de

Wenn du die Seite siehst (auch wenn noch ohne HTTPS) → DNS funktioniert!

================================================================================
6. SSL-ZERTIFIKAT (HTTPS) EINRICHTEN
================================================================================

VORAUSSETZUNG: DNS muss funktionieren (Schritt 5.2 muss klappen)!

Auf dem PROXY-SERVER ausführen:

---------------------------------------------------------------------------
6.1 Zertifikat erstellen
---------------------------------------------------------------------------

    certbot --nginx -d josten-garten.de -d www.josten-garten.de

Certbot stellt dir Fragen:

    1. "Enter email address": Deine E-Mail eingeben (für Ablauf-Warnungen)

    2. "Please read the Terms of Service": A (für Agree) eingeben

    3. "Would you be willing to share your email": N (für Nein) eingeben

Certbot macht dann automatisch:
  - Erstellt ein SSL-Zertifikat
  - Ändert die Nginx-Konfiguration (fügt SSL-Zeilen ein)
  - Lädt Nginx neu

Erwartete Ausgabe am Ende:
    Congratulations! You have successfully enabled
    https://josten-garten.de and https://www.josten-garten.de

---------------------------------------------------------------------------
6.2 Auto-Renewal testen
---------------------------------------------------------------------------

SSL-Zertifikate von Let's Encrypt sind 90 Tage gültig.
Certbot erneuert sie automatisch. Teste ob das funktioniert:

    certbot renew --dry-run

Erwartete Ausgabe:
    Congratulations, all simulated renewals succeeded

---------------------------------------------------------------------------
6.3 Nginx nochmal neu laden
---------------------------------------------------------------------------

    systemctl reload nginx

================================================================================
7. ALLES TESTEN
================================================================================

---------------------------------------------------------------------------
7.1 Website im Browser testen
---------------------------------------------------------------------------

Öffne im Browser:

    https://josten-garten.de

    → Seite sollte laden mit grünem Schloss-Symbol (HTTPS)
    → Hero-Bild mit "Ihr Zuhause. Ihr Garten. Unser Sortiment."

    https://josten-garten.de/produkte

    → Produktseite mit Kategorie-Kacheln

    https://josten-garten.de/impressum

    → Impressum mit Josten-Daten

---------------------------------------------------------------------------
7.2 API testen
---------------------------------------------------------------------------

    curl -s https://josten-garten.de/api/products | head -20

    → Sollte JSON mit Produkten zeigen

---------------------------------------------------------------------------
7.3 Admin-Login testen
---------------------------------------------------------------------------

Öffne im Browser:

    https://josten-garten.de/admin/login

    E-Mail:   (was du in ADMIN_EMAIL gesetzt hast)
    Passwort: (was du in ADMIN_PASSWORD gesetzt hast)

    → Nach Login solltest du das Admin-Panel sehen

---------------------------------------------------------------------------
7.4 Bild-Upload testen
---------------------------------------------------------------------------

Im Admin-Panel:
    1. Neues Produkt erstellen
    2. Bild hochladen
    3. Speichern

    → Bild sollte angezeigt werden

---------------------------------------------------------------------------
7.5 Bestellung testen
---------------------------------------------------------------------------

    1. Produkt in den Warenkorb legen
    2. Zur Kasse gehen
    3. Test-Daten eingeben
    4. Bestellen

    → Bestellbestätigung sollte erscheinen
    → Telegram-Nachricht sollte ankommen (falls konfiguriert)

================================================================================
8. WARTUNG & UPDATES
================================================================================

---------------------------------------------------------------------------
8.1 App updaten (nach Code-Änderungen)
---------------------------------------------------------------------------

Wenn du den Code auf GitHub geändert hast:

    # Auf dem MAIN-SERVER:
    ssh root@MAIN-SERVER-IP
    cd /opt/josten-shop
    git pull origin main
    docker compose up -d --build

    # Prüfen ob alles läuft:
    docker compose ps

ERKLÄRUNG:
  - git pull: Holt die neueste Version des Codes
  - docker compose up -d --build: Baut die Container neu und startet sie
  - Downtime: ca. 30-60 Sekunden während des Neubaus

---------------------------------------------------------------------------
8.2 Einzelne Container neustarten
---------------------------------------------------------------------------

    # Nur Backend neustarten (z.B. nach .env-Änderung):
    docker compose restart backend

    # Nur Frontend neustarten:
    docker compose restart frontend

    # Alles neustarten:
    docker compose restart

---------------------------------------------------------------------------
8.3 Logs anschauen
---------------------------------------------------------------------------

    # MAIN-SERVER: Backend-Logs (API-Fehler, Bestellungen, etc.)
    docker compose logs -f backend

    # MAIN-SERVER: Frontend-Logs
    docker compose logs -f frontend

    # MAIN-SERVER: Datenbank-Logs
    docker compose logs -f mongo

    # PROXY-SERVER: Wer greift auf die Seite zu?
    tail -f /var/log/nginx/access.log

    # PROXY-SERVER: Nginx-Fehler
    tail -f /var/log/nginx/error.log

    # Mit Strg+C beenden

---------------------------------------------------------------------------
8.4 Server-Updates installieren
---------------------------------------------------------------------------

Auf BEIDEN Servern regelmäßig (z.B. monatlich):

    apt update
    apt upgrade -y

Auf dem Proxy-Server danach:

    systemctl reload nginx

================================================================================
9. BACKUPS
================================================================================

---------------------------------------------------------------------------
9.1 Manuelles Datenbank-Backup
---------------------------------------------------------------------------

Auf dem MAIN-SERVER:

    # Backup erstellen
    mkdir -p /opt/backups
    docker compose exec mongo mongodump --archive=/data/backup.gz --gzip
    docker compose cp mongo:/data/backup.gz /opt/backups/backup_$(date +%Y%m%d_%H%M).gz

    # Backup auf deinen Rechner herunterladen:
    # (auf deinem Rechner ausführen)
    scp root@MAIN-SERVER-IP:/opt/backups/backup_*.gz ./

---------------------------------------------------------------------------
9.2 Automatisches tägliches Backup (Cronjob)
---------------------------------------------------------------------------

Auf dem MAIN-SERVER:

    # Cronjob-Editor öffnen
    crontab -e

    # Falls gefragt wird welcher Editor: 1 (nano) wählen

    # Folgende Zeile ganz unten einfügen:
    0 3 * * * cd /opt/josten-shop && docker compose exec -T mongo mongodump --archive=/data/backup.gz --gzip && docker compose cp mongo:/data/backup.gz /opt/backups/backup_$(date +\%Y\%m\%d).gz 2>&1 >> /var/log/mongo-backup.log

Speichern: Strg+O → Enter → Strg+X

ERKLÄRUNG:
  - 0 3 * * * = Jeden Tag um 3:00 Uhr nachts
  - Erstellt ein Backup und speichert es unter /opt/backups/
  - Log wird in /var/log/mongo-backup.log geschrieben

---------------------------------------------------------------------------
9.3 Datenbank-Backup wiederherstellen
---------------------------------------------------------------------------

    # Backup wiederherstellen (VORSICHT: überschreibt aktuelle Daten!)
    docker compose cp /opt/backups/backup_DATUM.gz mongo:/data/restore.gz
    docker compose exec mongo mongorestore --archive=/data/restore.gz --gzip --drop

================================================================================
10. FEHLERBEHEBUNG
================================================================================

---------------------------------------------------------------------------
Problem: Seite lädt nicht / Browser zeigt Fehler
---------------------------------------------------------------------------

Schritt 1: Ist Nginx auf dem Proxy aktiv?

    # Auf dem PROXY-SERVER:
    systemctl status nginx

    Falls "inactive" → nginx starten:
    systemctl start nginx

Schritt 2: Ist die App auf dem Main-Server aktiv?

    # Auf dem MAIN-SERVER:
    docker compose ps

    Falls Container nicht "Up" sind:
    docker compose up -d
    docker compose logs -f   # Fehler anschauen

Schritt 3: Kann der Proxy den Main-Server erreichen?

    # Auf dem PROXY-SERVER:
    curl http://MAIN-SERVER-IP:3000
    curl http://MAIN-SERVER-IP:8001/api/products

    Falls "Connection refused":
    → Firewall auf Main-Server prüfen (ufw status)
    → Container auf Main-Server prüfen (docker compose ps)

---------------------------------------------------------------------------
Problem: 502 Bad Gateway
---------------------------------------------------------------------------

Bedeutet: Nginx kann den Main-Server nicht erreichen.

    1. Main-Server erreichbar?
       ssh root@MAIN-SERVER-IP
       docker compose ps

    2. Firewall prüfen:
       ufw status
       → Port 3000 und 8001 müssen für PROXY-SERVER-IP offen sein

    3. Nginx-Config prüfen:
       cat /etc/nginx/sites-available/josten-garten.de | grep proxy_pass
       → Stimmt die MAIN-SERVER-IP?

---------------------------------------------------------------------------
Problem: Bilder werden nicht hochgeladen
---------------------------------------------------------------------------

    1. Upload-Limit prüfen (Proxy-Server):
       grep client_max_body_size /etc/nginx/sites-available/josten-garten.de
       → Sollte 25M sein

    2. EMERGENT_LLM_KEY prüfen (Main-Server):
       cat /opt/josten-shop/backend/.env | grep EMERGENT
       → Key muss gesetzt sein

    3. Backend-Logs prüfen:
       docker compose logs backend | tail -20

---------------------------------------------------------------------------
Problem: SSL-Zertifikat abgelaufen
---------------------------------------------------------------------------

    # Auf dem PROXY-SERVER:
    certbot renew
    systemctl reload nginx

    Falls Fehler:
    certbot renew --force-renewal
    systemctl reload nginx

---------------------------------------------------------------------------
Problem: Admin-Login funktioniert nicht
---------------------------------------------------------------------------

    1. Richtige Zugangsdaten? Prüfe:
       cat /opt/josten-shop/backend/.env | grep ADMIN

    2. Backend-Logs prüfen:
       docker compose logs backend | grep -i "auth\|login\|error"

    3. Backend neustarten:
       docker compose restart backend

---------------------------------------------------------------------------
Problem: Container startet nicht / Build-Fehler
---------------------------------------------------------------------------

    # Fehler anschauen:
    docker compose logs backend
    docker compose logs frontend

    # Komplett neu bauen (ohne Cache):
    docker compose down
    docker compose build --no-cache
    docker compose up -d

================================================================================
11. SICHERHEITS-TIPPS
================================================================================

1. SSH-Key verwenden statt Passwort:

    # Auf deinem Rechner:
    ssh-keygen -t ed25519
    ssh-copy-id root@PROXY-SERVER-IP
    ssh-copy-id root@MAIN-SERVER-IP

    # Dann auf beiden Servern Passwort-Login deaktivieren:
    nano /etc/ssh/sshd_config
    → PasswordAuthentication no
    systemctl restart sshd

2. Regelmäßig Updates installieren:

    apt update && apt upgrade -y

3. Starke Passwörter verwenden:
    - Admin-Passwort: mindestens 12 Zeichen, Groß/Klein/Zahlen/Sonderzeichen
    - JWT_SECRET: immer mit openssl rand -hex 32 generieren

4. Backups regelmäßig prüfen:
    - Cronjob-Log prüfen: cat /var/log/mongo-backup.log
    - Backup-Dateien prüfen: ls -la /opt/backups/

5. Monitoring einrichten (optional):
    - Uptime-Check: uptimerobot.com (kostenlos, prüft ob Seite erreichbar ist)

================================================================================
SCHNELL-REFERENZ
================================================================================

MAIN-SERVER:
    ssh root@MAIN-SERVER-IP
    cd /opt/josten-shop
    docker compose ps              # Status prüfen
    docker compose logs -f         # Logs anschauen
    docker compose restart         # Neustarten
    docker compose up -d --build   # Nach Updates neu bauen

PROXY-SERVER:
    ssh root@PROXY-SERVER-IP
    nginx -t                       # Konfiguration prüfen
    systemctl reload nginx         # Nginx neu laden
    certbot renew                  # SSL erneuern
    tail -f /var/log/nginx/*.log   # Logs anschauen

URLS:
    Website:      https://josten-garten.de
    Produkte:     https://josten-garten.de/produkte
    Admin-Login:  https://josten-garten.de/admin/login
    API:          https://josten-garten.de/api/products

================================================================================
