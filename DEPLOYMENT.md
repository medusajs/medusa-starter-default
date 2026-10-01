# Deployment (Production)

Production läuft als Docker-Image, gebaut aus dem `Dockerfile` (Target `production`), zusammen mit PostgreSQL 15 und Redis 7. Produktiv-Domain der API: **`https://api.kiji-games.de`**, der Admin liegt unter `https://api.kiji-games.de/app`, die Storefront unter `https://kiji-games.de`.

Es gibt zwei Wege:

- **Coolify** (aktueller Weg), siehe [Coolify](#coolify)
- **VPS mit `docker-compose.prod.yml`** plus eigenem Reverse Proxy, siehe [VPS mit Docker Compose](#vps-mit-docker-compose)

Vor dem ersten Production-Deploy nach dem Upgrade von 2.15: [docs/upgrade-2.21.md](docs/upgrade-2.21.md) lesen (Backup, einmalig `MEDUSA_MIGRATE_LINKS=all`).

---

## Das Production-Image

```bash
docker build -t kiji-backend .     # "production" ist die letzte Stage und damit der Default
```

- Basis `node:22-alpine`. Gebaut wird mit `yarn build --no-lint` (Lint läuft in der CI), danach enthält das Image nur `.medusa/server` und die Production-Dependencies. Es läuft als User `node` unter `tini`, `WORKDIR /app`.
- `NODE_ENV=production`, `PORT=9000` und `MEDUSA_RUN_MIGRATIONS=true` sind im Image gesetzt.
- Healthcheck: `GET /health` (Intervall 30s, **Start-Period 180s**).
- Uploads des lokalen File-Providers landen in **`/app/static`**. Das Verzeichnis als Volume persistieren oder `S3_*` setzen.
- Secrets werden zur Laufzeit gelesen, nicht beim Build. `medusa build` überspringt die Production-Prüfung.

### Entrypoint (`docker/entrypoint.sh`)

1. Prüft `MEDUSA_WORKER_MODE` (`shared` | `server` | `worker`).
2. Wenn `MEDUSA_RUN_MIGRATIONS=true` und der Modus nicht `worker` ist, läuft `docker/migrate.sh`. Das ist `medusa db:migrate` ohne interaktiven Prompt: Link- und Search-Sync werden über `MEDUSA_MIGRATE_LINKS` / `MEDUSA_MIGRATE_SEARCH` gesteuert (`safe` als Default, `all` oder `skip`). Ohne diese Flags würde `db:migrate` bei einer Link-Änderung auf eine Eingabe warten und im Container hängen bleiben.
3. `medusa start`. Zusätzliche Container-Argumente werden durchgereicht, z. B. `--cluster 2`.

### Worker-Modus

| `MEDUSA_WORKER_MODE` | HTTP/Admin | Scheduled Jobs, Subscriber | Migrationen |
|---|---|---|---|
| `shared` (Default) | ja | ja | ja (wenn `MEDUSA_RUN_MIGRATIONS=true`) |
| `server` | ja | nein | ja (wenn `MEDUSA_RUN_MIGRATIONS=true`) |
| `worker` | nein (Admin automatisch aus) | ja | nie |

Eine Instanz (`shared`) reicht. Wer skaliert: eine Instanz `server` mit Domain und eine `worker` ohne Domain, beide mit derselben DB und demselben Redis. **Migrationen nur auf genau einer Instanz laufen lassen**, auf allen anderen `MEDUSA_RUN_MIGRATIONS=false`. Ohne Worker (bzw. `shared`) läuft der tägliche Preorder-Job nicht.

`DISABLE_MEDUSA_ADMIN=true` liefert den Admin unter `/app` nicht aus.

### Konfigurationsprüfung beim Start

Mit `NODE_ENV=production` bricht `medusa-config.ts` den Start mit einer Liste aller Fehler ab, wenn:

- eine Pflicht-Variable fehlt (Spalte „Prod“ in der [Referenz](#umgebungsvariablen)), `REDIS_URL` eingeschlossen,
- `JWT_SECRET` oder `COOKIE_SECRET` kürzer als 32 Zeichen oder `supersecret` ist,
- `MEDUSA_WORKER_MODE` einen ungültigen Wert hat.

Zusätzlich werfen die Mail-Link-Builder (`src/utils/urls.ts`) in Production einen Fehler, wenn `STOREFRONT_URL`/`MEDUSA_BACKEND_URL` fehlen, statt Links auf `localhost` zu verschicken.

---

## Coolify

Ressourcen im Coolify-Projekt:

1. **PostgreSQL 15** und **Redis 7** als Coolify-Datenbanken. Deren interne URLs werden zu `DATABASE_URL` und `REDIS_URL`.
2. **Application** aus dem GitHub-Repo `xxp3nxx/medusa-starter-default` (öffentlich, kein Deploy Key nötig), Build Pack **Dockerfile**:
   - Domain: `https://api.kiji-games.de`, Port **9000**
   - Health Check: Pfad `/health`, Port 9000, **Start Period mindestens 180s**, beim ersten Deploy mit Migrationen eher mehr
   - Persistent Storage: Volume auf **`/app/static`** (entfällt mit S3)
   - Environment Variables wie unten. `NODE_ENV=production` bringt das Image schon mit.

Alternativ geht der Build Pack **Docker Compose** mit `docker-compose.prod.yml`. Dann dort den `ports:`-Block des `medusa`-Service entfernen und die Domain dem Service `medusa` (Port 9000) zuweisen.

Environment (Production-Werte für kiji):

```env
DATABASE_URL=<interne Coolify-Postgres-URL>
DATABASE_SSL=                       # leer, solange die DB im selben Docker-Netz läuft
REDIS_URL=<interne Coolify-Redis-URL>
MEDUSA_BACKEND_URL=https://api.kiji-games.de
STOREFRONT_URL=https://kiji-games.de
STORE_CORS=https://kiji-games.de
ADMIN_CORS=https://api.kiji-games.de
AUTH_CORS=https://kiji-games.de,https://api.kiji-games.de
JWT_SECRET=<openssl rand -hex 32>
COOKIE_SECRET=<openssl rand -hex 32>
AUTH_MFA_ENCRYPTION_KEY=<openssl rand -hex 32>
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=<Adresse auf der bei Resend verifizierten Domain>
COMPANY_ADDRESS_LINE=...
COMPANY_CITY=...
MEDUSA_WORKER_MODE=shared
MEDUSA_RUN_MIGRATIONS=true
MEDUSA_MIGRATE_LINKS=safe           # einmalig "all" beim ersten Deploy nach dem 2.21-Upgrade
MEDUSA_MIGRATE_SEARCH=safe
```

Nach dem ersten erfolgreichen Deploy siehe [Nach dem ersten Deploy](#nach-dem-ersten-deploy).

---

## VPS mit Docker Compose

`docker-compose.prod.yml` startet Postgres, Redis (AOF-Persistenz) und Medusa (Target `production`). Nur Medusa ist erreichbar, und zwar auf `127.0.0.1:9000` für einen Reverse Proxy mit TLS. Volumes: `postgres_data`, `redis_data`, `medusa_static` (→ `/app/static`).

```bash
git clone https://github.com/xxp3nxx/medusa-starter-default.git /opt/kiji-backend
cd /opt/kiji-backend
# .env neben der Compose-Datei anlegen (wird von Compose interpoliert):
#   POSTGRES_PASSWORD (URL-sicher, z. B. openssl rand -hex 24), MEDUSA_BACKEND_URL, STOREFRONT_URL,
#   *_CORS, JWT_SECRET, COOKIE_SECRET, STRIPE_*, RESEND_* (Pflicht, sonst bricht Compose ab)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f medusa
```

`DATABASE_URL` und `REDIS_URL` setzt die Compose-Datei selbst (DB-User Default `medusa`, DB `medusa-store`).

Firewall: nur 22, 80 und 443 öffnen. Reverse Proxy, z. B. nginx mit certbot:

```nginx
server {
    server_name api.kiji-games.de;
    client_max_body_size 20M;   # Datei-Uploads im Admin
    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo certbot --nginx -d api.kiji-games.de
```

Update: `git pull && docker compose -f docker-compose.prod.yml up -d --build`. Migrationen laufen beim Start.

---

## Nach dem ersten Deploy

1. **Admin-User** anlegen (im laufenden Container):
   `npx medusa user -e <email> -p '<passwort>'`
   (VPS: `docker compose -f docker-compose.prod.yml exec medusa npx medusa user ...`, Coolify: Terminal der Application)
2. **Stripe**:
   - Webhook-Endpoint im Stripe-Dashboard: **`https://api.kiji-games.de/hooks/payment/stripe_stripe`**, mindestens die Events `payment_intent.succeeded`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.requires_action`. Das Signing-Secret kommt nach `STRIPE_WEBHOOK_SECRET`.
   - Im Admin den Provider **Stripe in der Region aktivieren** (Settings → Regions → Payment Providers). Seit Medusa 2.20 ist das Pflicht, der Seed legt nur `pp_system_default` an.
   - Die Config setzt keine `capture`-Option. Der Stripe-Provider legt PaymentIntents deshalb mit `capture_method: "manual"` an, es wird nur autorisiert, und die Zahlung wird im Admin erfasst (außer die Storefront übergibt selbst `capture_method`). Stripe-Autorisierungen verfallen in der Regel nach 7 Tagen, das ist vor allem für Vorbestellungen relevant.
3. **Resend**: Absender-Domain bei Resend verifizieren (SPF, DKIM, DMARC per DNS). Ohne verifizierte Domain stellt Resend nur an die eigene Account-Adresse zu. `RESEND_FROM_EMAIL` auf diese Domain setzen.
4. **Publishable API Key** im Admin anlegen bzw. prüfen und in der Storefront eintragen.
5. Prüfen: `https://api.kiji-games.de/health` liefert 200, Login unter `/app` funktioniert, eine Testbestellung löst die Bestätigungsmail aus.

---

## Umgebungsvariablen

Quelle: `medusa-config.ts`, `src/`, `docker/*.sh`. Vorlage mit Kommentaren: [`.env.template`](.env.template). **Prod** = ohne den Wert startet `NODE_ENV=production` nicht.

**Laufzeit**

| Variable | Prod | Beschreibung |
|---|---|---|
| `NODE_ENV` | | `production` (im Image gesetzt) / `development` (Dev-Compose) |
| `MEDUSA_WORKER_MODE` | | `shared` (Default) \| `server` \| `worker` |
| `DISABLE_MEDUSA_ADMIN` | | `true` = Admin unter `/app` nicht ausliefern |
| `MEDUSA_RUN_MIGRATIONS` | | Migrationen beim Container-Start (Default `true`, Worker nie) |
| `MEDUSA_MIGRATE_LINKS` | | Link-Sync bei `db:migrate`: `safe` (Default) \| `all` \| `skip` |
| `MEDUSA_MIGRATE_SEARCH` | | Search-Sync bei `db:migrate`: `safe` (Default) \| `all` \| `skip` |
| `PORT` | | HTTP-Port, im Image `9000` |

**URLs und CORS** (ohne Slash am Ende, CORS kommagetrennt)

| Variable | Prod | Beschreibung |
|---|---|---|
| `MEDUSA_BACKEND_URL` | ✔ | Öffentliche Backend-URL. Basis für Upload-URLs (`/static`) und Admin-Reset-Links |
| `STOREFRONT_URL` | ✔ | Storefront-URL für Links in Mails (Dev-Fallback im Code: `http://localhost:4321`) |
| `STORE_CORS` | ✔ | Storefront-Origin(s) |
| `ADMIN_CORS` | ✔ | Admin-Origin(s), in Production die Backend-Domain |
| `AUTH_CORS` | ✔ | Storefront- und Admin-Origins |

**Secrets**

| Variable | Prod | Beschreibung |
|---|---|---|
| `JWT_SECRET` | ✔ | ≥ 32 Zeichen, nicht `supersecret`. Signiert auch Order- und Verify-Tokens; ein Wechsel macht verschickte Links ungültig |
| `COOKIE_SECRET` | ✔ | ≥ 32 Zeichen, nicht `supersecret` |
| `AUTH_MFA_ENCRYPTION_KEY` | | Verschlüsselt MFA/TOTP-Secrets der Admin-User (von Medusa direkt gelesen). Nach Aktivierung von MFA nicht mehr ändern |

**Datenbank und Redis**

| Variable | Prod | Beschreibung |
|---|---|---|
| `DATABASE_URL` | ✔ | Postgres-URL, Sonderzeichen URL-encodet |
| `DATABASE_SSL` | | `true` (TLS ohne Zertifikatsprüfung) \| `verify` \| leer (kein TLS) |
| `REDIS_URL` | ✔ | Event-Bus, Workflow-Engine, Locking, Caching, Sessions. Leer = in-memory (nur lokal) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | | Nur Compose: Credentials des Postgres-Containers (`docker-compose.prod.yml`: Passwort Pflicht) |

**Datei-Uploads** (ohne `S3_BUCKET`: lokal nach `static/` bzw. `/app/static`)

| Variable | Beschreibung |
|---|---|
| `S3_BUCKET` | Aktiviert den S3-Provider |
| `S3_FILE_URL` | Öffentliche Basis-URL der Dateien |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Zugangsdaten |
| `S3_REGION` | Default `auto` (R2), AWS z. B. `eu-central-1` |
| `S3_ENDPOINT` | z. B. R2-Endpoint, leer bei AWS |
| `S3_PREFIX` | Optionaler Pfad-Präfix |
| `S3_FORCE_PATH_STYLE` | `true` für MinIO u. ä. |

**Zahlungen und Mails**

| Variable | Prod | Beschreibung |
|---|---|---|
| `STRIPE_API_KEY` | ✔ | Ohne Wert wird der Stripe-Provider nicht registriert |
| `STRIPE_WEBHOOK_SECRET` | ✔ | Signing-Secret des Webhooks `/hooks/payment/stripe_stripe` |
| `RESEND_API_KEY` | ✔ | Ohne Wert werden Mails nur geloggt (`notification-local`) |
| `RESEND_FROM_EMAIL` | ✔ | Absender |
| `COMPANY_ADDRESS_LINE` / `COMPANY_CITY` | | Footer der Mail-Templates |

**Build-Zeit (Admin)**

| Variable | Beschreibung |
|---|---|
| `VITE_BACKEND_URL` | Basis-URL des Admin-SDKs (`src/admin/lib/sdk.ts`). Leer = gleiche Origin; nur setzen, wenn der Admin nicht vom Backend ausgeliefert wird |

**Tests** (`.env.test`): `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` für `@medusajs/test-utils`.

---

## Betrieb

**Backup** (vor jedem Medusa-Upgrade Pflicht):

```bash
# VPS
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U medusa -d medusa-store -Fc > medusa_$(date +%F).dump
# Restore
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U medusa -d medusa-store --clean --if-exists < medusa_YYYY-MM-DD.dump
```

In Coolify die Backup-Funktion der Postgres-Ressource nutzen (geplante Backups, optional S3). Uploads in `/app/static` (bzw. im Volume `medusa_static`) gehören mit ins Backup, sofern kein S3 genutzt wird.

**Monitoring**: Der Preorder-Job loggt `Failed to fulfill preorder <id>: <message>` pro Fehler und am Ende eine Zusammenfassung (`Fulfill preorders job done: …`). Fehlgeschlagene Mails markiert das Notification-Modul als fehlgeschlagen; zusätzlich loggt der Provider `Resend rejected …`.

## Troubleshooting

| Problem | Ursache / Lösung |
|---|---|
| Container startet nicht, `[medusa-config] Invalid production configuration` | Fehlende oder zu kurze Variablen, siehe Liste im Log |
| Container hängt bei `db:migrate` | Tritt mit `docker/migrate.sh` nicht auf. Bei Link-Änderungen einmalig `MEDUSA_MIGRATE_LINKS=all` setzen |
| Healthcheck schlägt beim ersten Start fehl | Start Period zu kurz für Migrationen, ≥ 180s setzen |
| CORS-Fehler im Admin/Storefront | `ADMIN_CORS`/`STORE_CORS`/`AUTH_CORS` exakt mit Schema und ohne Slash am Ende |
| Upload-Bilder 404 nach Redeploy | `/app/static` nicht persistiert, Volume oder S3 einrichten |
| Stripe-Zahlungen bleiben „pending“ | Webhook-URL oder `STRIPE_WEBHOOK_SECRET` falsch, Stripe nicht in der Region aktiviert |
| Mails kommen nicht an | Resend-Domain nicht verifiziert (Sandbox), `RESEND_FROM_EMAIL` nicht auf der Domain |

## Checkliste Go-Live

- [ ] DB-Backup vorhanden (bei Upgrade: vor dem ersten Start)
- [ ] Alle Prod-Pflichtvariablen gesetzt, Secrets per `openssl rand -hex 32`
- [ ] `/app/static` persistiert oder S3 konfiguriert
- [ ] Health Check `/health` mit Start Period ≥ 180s
- [ ] Migrationen auf genau einer Instanz, ein Worker bzw. `shared` läuft (Preorder-Job)
- [ ] Stripe in der Region aktiviert, Webhook eingerichtet
- [ ] Resend-Domain verifiziert
- [ ] Admin-User angelegt, `/app` erreichbar
- [ ] Rate-Limit am Proxy für `POST /store/customers/email-exists` (siehe [docs/email-verification.md](docs/email-verification.md#e-mail-existenz-prüfen))
