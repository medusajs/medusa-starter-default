# Live-Installation auf Self-Hosted Server

Schritt-für-Schritt-Anleitung zur Installation des Medusa-Backends auf einem eigenen Linux-Server (Ubuntu / Debian empfohlen).

Die Anwendung besteht aus drei Docker-Containern:

- **medusa** – Node.js Backend + Admin-Dashboard (Port `9000`, Admin unter `5173`)
- **postgres** – Datenbank (Port `5432`)
- **redis** – Cache & Sessions (Port `6379`)

---

## 1. Voraussetzungen

### Server-Mindestanforderungen

| Ressource | Empfehlung           |
|-----------|----------------------|
| OS        | Ubuntu 22.04 / 24.04 |
| CPU       | 2 vCPU               |
| RAM       | 4 GB (min. 2 GB)     |
| Speicher  | 20 GB SSD            |
| Netzwerk  | öffentliche IPv4     |

### Benötigte Zugänge

- SSH-Zugang als Benutzer mit `sudo`-Rechten
- Eine Domain, die auf den Server zeigt (A-Record), z. B. `shop.example.com`
- (Optional) Stripe API-Key für Zahlungen

### Ports, die offen sein müssen

- `22` (SSH, nur eigene IP zulassen)
- `80` (HTTP – für Let's Encrypt)
- `443` (HTTPS)

Die Ports `9000`, `5173`, `5432`, `6379` dürfen **nicht** nach außen offen sein. Sie werden später über Nginx erreicht.

---

## 2. Server vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Grundtools installieren
sudo apt install -y git curl ufw nano ca-certificates gnupg
```

### Firewall konfigurieren

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 3. Docker und Docker Compose installieren

```bash
# Offizielles Docker-Repo einbinden
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
                    docker-buildx-plugin docker-compose-plugin

# Aktuellen Benutzer zur docker-Gruppe hinzufügen (damit sudo entfällt)
sudo usermod -aG docker $USER

# Einmal ausloggen und wieder einloggen, damit die Gruppe aktiv wird!
```

Test:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

---

## 4. Projekt auf den Server laden (per Deploy Key)

Der Server bekommt einen eigenen SSH-Schlüssel, der als **Deploy Key** im privaten GitHub-Repo hinterlegt wird. Der Kollege braucht dafür **keinen eigenen GitHub-Account** – der Schlüssel ist an das Repo gebunden, nicht an eine Person.

### 4.1 Zielverzeichnis anlegen

```bash
sudo mkdir -p /opt/medusa
sudo chown $USER:$USER /opt/medusa
cd /opt/medusa
```

### 4.2 SSH-Deploy-Key auf dem Server erzeugen

```bash
ssh-keygen -t ed25519 -C "medusa-deploy@server" -f ~/.ssh/medusa_deploy -N ""
```

Das erzeugt zwei Dateien:

- `~/.ssh/medusa_deploy`      – **privater** Schlüssel (bleibt auf dem Server!)
- `~/.ssh/medusa_deploy.pub`  – öffentlicher Schlüssel (wird gleich bei GitHub eingetragen)

Öffentlichen Schlüssel anzeigen und in die Zwischenablage kopieren:

```bash
cat ~/.ssh/medusa_deploy.pub
```

### 4.3 Deploy Key in GitHub eintragen

Der **Repo-Besitzer** (Entwickler) macht das – der Kollege muss nichts bei GitHub anlegen:

1. Auf GitHub zum privaten Repo gehen.
2. `Settings` → `Deploy keys` → **`Add deploy key`**.
3. Title: `Live-Server` (oder sprechender Name).
4. Key: den gerade kopierten Inhalt von `medusa_deploy.pub` einfügen.
5. **„Allow write access“** nicht anhaken (Server soll nur lesen).
6. `Add key`.

### 4.4 SSH-Config auf dem Server

Damit `git` automatisch den richtigen Schlüssel nutzt:

```bash
nano ~/.ssh/config
```

Folgenden Block einfügen (GitHub-Benutzer und Repo-Namen anpassen):

```
Host github-medusa
  HostName github.com
  User git
  IdentityFile ~/.ssh/medusa_deploy
  IdentitiesOnly yes
```

Rechte setzen und Verbindung testen:

```bash
chmod 600 ~/.ssh/config ~/.ssh/medusa_deploy
ssh -T github-medusa
```

Erwartete Antwort (das ist **kein** Fehler):

```
Hi <repo-name>! You've successfully authenticated, but GitHub does not provide shell access.
```

### 4.5 Repository klonen

```bash
cd /opt/medusa
git clone git@github-medusa:xxp3nxx/medusa-starter-default.git .
```

> Falls sich der Repo-Name später ändert, hier anpassen. Der Teil **vor** dem Doppelpunkt (`github-medusa`) ist kein Tippfehler – das ist der Alias aus der `~/.ssh/config` und muss genau so bleiben.

> **Wichtig:** Der Host-Alias `github-medusa` aus der `~/.ssh/config` sorgt dafür, dass der Deploy Key verwendet wird, ohne dass der GitHub-Account des Kollegen ins Spiel kommt.

### 4.6 Alternative: ohne GitHub (nur Notfall)

Falls kein Git-Zugang gewünscht ist, das Projekt per `rsync` vom Entwickler-Rechner übertragen:

```bash
rsync -avz --exclude node_modules --exclude .env \
  ./my-medusa-store/ user@server:/opt/medusa/
```

Nachteil: Updates müssen jedes Mal manuell neu übertragen werden – `git pull` (siehe Abschnitt 11) funktioniert dann nicht.

---

## 5. `.env`-Datei für Produktion anlegen

```bash
cd /opt/medusa
cp .env.template .env
nano .env
```

Inhalt der `.env` (Werte anpassen – Domain und Secrets):

```env
# === Öffentliche URLs ===
STORE_CORS=https://shop.example.com
ADMIN_CORS=https://admin.example.com,https://shop.example.com
AUTH_CORS=https://admin.example.com,https://shop.example.com

# === Datenbank (Passwort ersetzen!) ===
DATABASE_URL=postgres://postgres:BITTE_STARKES_PASSWORT@postgres:5432/medusa-store

# === Redis ===
REDIS_URL=redis://redis:6379

# === Secrets (mit `openssl rand -base64 48` generieren) ===
JWT_SECRET=
COOKIE_SECRET=

# === Stripe (optional) ===
STRIPE_API_KEY=sk_live_...
```

Sichere Secrets erzeugen:

```bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "COOKIE_SECRET=$(openssl rand -base64 48)"
```

Die Ausgabe in die `.env` kopieren.

---

## 6. Datenbank-Passwort in `docker-compose.yml` anpassen

Die Standard-Credentials (`postgres:postgres`) müssen vor einem Live-Deployment ersetzt werden. In `docker-compose.yml` unter `postgres.environment`:

```yaml
environment:
  POSTGRES_DB: medusa-store
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: BITTE_STARKES_PASSWORT   # <- gleich wie in DATABASE_URL
```

Zusätzlich empfiehlt es sich, die öffentlichen Ports `5432` und `6379` in der `docker-compose.yml` zu entfernen (nur interner Zugriff über das Docker-Netzwerk nötig):

```yaml
postgres:
  # ports:                 <-- diesen Block entfernen
  #   - "5432:5432"

redis:
  # ports:                 <-- diesen Block entfernen
  #   - "6379:6379"
```

---

## 7. Container starten

```bash
cd /opt/medusa
docker compose up --build -d
```

Was passiert dabei:

1. Docker baut das Medusa-Image (`Dockerfile`).
2. Postgres und Redis starten.
3. Medusa läuft `npx medusa db:migrate` (siehe `start.sh`) und startet danach den Server.

Status prüfen:

```bash
docker compose ps
docker compose logs -f medusa
```

Der Start dauert beim ersten Mal 2–5 Minuten (Build + Migrationen). Fertig ist er, sobald in den Logs steht:

```
Server is ready on port: 9000
```

---

## 8. Admin-Benutzer anlegen

```bash
docker compose exec medusa npx medusa user \
  -e admin@example.com -p EinSicheresPasswort
```

Damit ist der erste Admin-Account erzeugt und kann sich über das Admin-Dashboard einloggen.

---

## 9. Reverse Proxy mit Nginx + HTTPS

Medusa selbst sollte nicht direkt aus dem Internet erreichbar sein. Davor setzen wir Nginx mit Let's Encrypt.

### Nginx installieren

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Site-Konfiguration anlegen

```bash
sudo nano /etc/nginx/sites-available/medusa
```

Inhalt:

```nginx
server {
    listen 80;
    server_name shop.example.com admin.example.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

Aktivieren:

```bash
sudo ln -s /etc/nginx/sites-available/medusa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS-Zertifikat holen

```bash
sudo certbot --nginx -d shop.example.com -d admin.example.com
```

Certbot passt die Nginx-Konfiguration automatisch an und richtet einen Cron-Job für Auto-Renewal ein.

Test:

```bash
sudo certbot renew --dry-run
```

---

## 10. Funktionsprüfung

- Health-Check API:  `https://shop.example.com/health` → sollte `OK` liefern.
- Admin-Login:       `https://admin.example.com/app` → mit Admin-Benutzer aus Schritt 8 einloggen.
- Logs live ansehen: `docker compose logs -f medusa`

---

## 11. Betrieb & Wartung

### Container neu starten

```bash
cd /opt/medusa
docker compose restart medusa
```

### Updates einspielen

```bash
cd /opt/medusa
git pull
docker compose up --build -d
```

Migrationen werden beim Start automatisch ausgeführt (`start.sh`).

### Datenbank-Backup

```bash
# Dump erzeugen
docker compose exec postgres pg_dump -U postgres medusa-store \
  | gzip > /opt/medusa/backups/medusa_$(date +%F).sql.gz

# Wiederherstellen
gunzip < backup.sql.gz | docker compose exec -T postgres \
  psql -U postgres -d medusa-store
```

Ein täglicher Cron-Job (`crontab -e`):

```
0 3 * * * cd /opt/medusa && docker compose exec -T postgres pg_dump -U postgres medusa-store | gzip > /opt/medusa/backups/medusa_$(date +\%F).sql.gz
```

Backup-Verzeichnis zuvor anlegen:

```bash
mkdir -p /opt/medusa/backups
```

### Logs rotieren

Docker-Log-Größe in `/etc/docker/daemon.json` begrenzen:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

Danach `sudo systemctl restart docker`.

---

## 12. Troubleshooting

| Problem                               | Prüfung / Lösung                                                                 |
|---------------------------------------|----------------------------------------------------------------------------------|
| Container startet nicht               | `docker compose logs medusa`                                                     |
| `ECONNREFUSED` auf DB                 | Ist `DATABASE_URL` in `.env` identisch zum Passwort in `docker-compose.yml`?     |
| Admin zeigt CORS-Fehler               | `ADMIN_CORS` / `AUTH_CORS` in `.env` muss die exakte HTTPS-Domain enthalten      |
| 502 Bad Gateway in Nginx              | Läuft Medusa? `docker compose ps`. Port 9000 lokal erreichbar?                   |
| Migrationen hängen                    | Einmalig manuell: `docker compose exec medusa npx medusa db:migrate`             |
| Seite lädt, Assets 404                | Container neu bauen: `docker compose up --build -d`                              |

---

## 13. Hinweis für den Produktionsbetrieb

Die mitgelieferte `start.sh` startet den Server aktuell im Entwicklungsmodus (`medusa develop`). Für echten Produktionsbetrieb wird empfohlen, auf den Produktions-Befehl umzustellen:

In `start.sh`:

```sh
#!/bin/sh
npx medusa db:migrate
npx medusa build
npx medusa start
```

Und in der `docker-compose.yml` unter `medusa.environment`:

```yaml
environment:
  - NODE_ENV=production
```

Außerdem sollte der `volumes`-Mount `.:/server` im `medusa`-Service entfernt werden, damit der Container mit dem gebauten Image läuft und nicht mit lokalem Code.

---

## 14. Checkliste vor Go-Live

- [ ] Domain zeigt auf Server-IP (A-Record)
- [ ] Firewall aktiv (`ufw status`)
- [ ] `.env` mit echten Secrets und Domain-Werten
- [ ] Starkes Postgres-Passwort in `docker-compose.yml` + `.env`
- [ ] Postgres- und Redis-Ports nicht mehr öffentlich gemappt
- [ ] HTTPS-Zertifikat aktiv
- [ ] Admin-Benutzer angelegt
- [ ] Backup-Cron eingerichtet
- [ ] `NODE_ENV=production` und `medusa start` (siehe Abschnitt 13)

---

**Support-Kontakt Entwicklung:** fabian.reichwald1@googlemail.com
