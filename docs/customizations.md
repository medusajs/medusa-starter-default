# Customizations & Non-Standard-Setup

Übersicht aller Sachen im Repo die vom Vanilla-Medusa-Starter abweichen — **außer Mail-System, Preorder-Modul und Order-Token-Auth**, die haben eigene Dokus:

- `docs/email-notifications.md` — Resend-Integration + alle Mail-Templates
- `docs/preorder-module.md` — Custom Preorder-Modul
- `docs/order-token-auth.md` — HMAC-Token für Gast-Order-Access auf `/store/orders/:id` & Co.

Diese Doku ist die Sammelstelle für alles andere: gepatchte Dependencies, Docker-Setup, Config-Eigenheiten, Tooling. Wichtig vor allem fürs **Production-Deployment** und für Wartungs-Updates.

---

## 1. `patch-package` — gepatchtes Admin-Dashboard

**Wo:** `patches/@medusajs+dashboard+2.14.0.patch`
**Aktiviert via:** `package.json` → `"postinstall": "patch-package"` (läuft nach jedem `yarn install`)

**Was wird gepatcht:** `customer_group_ids` aus dem `PricingDetailsSchema` im Price-List-Create-Form entfernt (zwei Files im `@medusajs/dashboard`-Bundle: `dist/app.js` und `dist/price-list-create-UEMPUJJA.mjs`).

**Warum:** Vermutlich weil das Setup ohne Customer-Groups arbeitet und das Feld im UI Verwirrung stiftet. Der genaue Grund ist nicht im Repo dokumentiert — frag denjenigen der den Patch eingebracht hat (Git-Blame `patches/`).

**Konsequenzen:**
- Bei Bump auf `@medusajs/dashboard@2.14.1+` schlägt `patch-package` ggf. fehl, wenn die gepatchten Codestellen sich geändert haben
- `yarn install` bricht in dem Fall mit Fehlermeldung ab
- **Lösung beim Bump:** Patch entweder neu erstellen (`npx patch-package @medusajs/dashboard`) oder löschen falls nicht mehr nötig

**Production-Auswirkung:** Beim Build auf dem Server muss `patches/`-Ordner committed sein und `yarn install` muss `patch-package` finden. Beides ist gegeben (devDep + Ordner im Repo).

---

## 2. Custom Docker-Setup (DEV-only)

**Files:** `Dockerfile`, `docker-compose.yml`, `start.sh`

Komplett selbstgebaut, **nicht** Bestandteil des Medusa-Starters. Drei Container:
- `medusa` — Node.js Backend + Vite-Admin (Ports 9000 + 5173)
- `postgres` — Postgres 15 Alpine
- `redis` — Redis 7 Alpine

**Wichtige Details:**
- `start.sh` macht `npx medusa db:migrate` vor `medusa develop --host 0.0.0.0`
- `medusa-Container` mountet `.:/server` (Live-Code-Bind-Mount für Hot-Reload)
- `node_modules` als anonymes Volume (separater Layer im Container, nicht im Bind-Mount)

**⚠️ Das ist KEIN Production-Setup.** `medusa develop` startet einen Dev-Server mit Hot-Reload und Vite. Production braucht `medusa build && medusa start`.

→ **Für echtes Deploy gibt es bereits `DEPLOYMENT.md` im Root** (482 Zeilen Self-Host-Anleitung). Das hier ist nur für lokale Entwicklung.

**Pitfalls dieses Setups** (siehe Mail-Doku Section 5.6 + 5.7):
- Bei neuen NPM-Paketen den `medusa`-Container samt seinem anonymem `node_modules`-Volume neu bauen:
  ```bash
  docker compose rm -f -s -v medusa
  docker compose up --build -d medusa
  ```
- Bei kaputtem Vite-Cache (z.B. nach Datei-Umbenennungen):
  ```bash
  docker compose exec medusa rm -rf /server/node_modules/.vite /server/.medusa
  docker compose restart medusa
  ```

**Helper-Scripts in `package.json`:**
- `yarn docker:up` → `docker compose up --build -d`
- `yarn docker:down` → `docker compose down`

---

## 3. `medusa-config.ts` — Anpassungen vom Default

### 3.1 Postgres ohne SSL
```ts
projectConfig: {
  databaseDriverOptions: {
    ssl: false,
    sslmode: "disable",
  },
}
```
→ Lokaler Postgres im Docker akzeptiert kein SSL. **In Production muss das raus oder umgestellt werden** (managed DBs wie Neon/Supabase verlangen SSL).

### 3.2 Vite-Admin für Docker tauglich
```ts
admin: {
  vite: (config) => ({
    server: {
      host: "0.0.0.0",                                   // Bind auf alle Interfaces (Container-extern erreichbar)
      allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
      hmr: { port: 5173, clientPort: 5173 },             // HMR über expliziten Port (sonst rätt Vite und kommt aus WSL2 nicht durch)
    },
  }),
}
```
→ Diese Vite-Config ist **nur für das lokale Docker-Setup** nötig. In Production läuft eh kein Vite-Dev-Server (Admin wird per `medusa build` gebaut). Kann beim echten Deploy weg, schadet aber auch nicht (greift nur in Dev).

### 3.3 Aktive Module

```ts
modules: [
  { resolve: "./src/modules/preorder" },
  { resolve: "@medusajs/medusa/payment", options: { providers: [{ resolve: "@medusajs/medusa/payment-stripe", id: "stripe", options: { apiKey: process.env.STRIPE_API_KEY } }] } },
  { resolve: "@medusajs/medusa/notification", options: { providers: [{ resolve: "./src/modules/resend", id: "resend", options: { channels: ["email"], api_key: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL } }] } },
]
```

- **Preorder** — siehe `docs/preorder-module.md`
- **Payment-Stripe** — Standard, **`capture_method` nicht gesetzt → Default `automatic`**. Siehe `docs/email-notifications.md` Section 4.4 für die Vorkasse-Diskussion bei Preorders.
- **Notification + Resend** — siehe `docs/email-notifications.md`

---

## 4. Dummy „Custom"-Endpoints

```
src/api/admin/custom/route.ts   → GET → 200
src/api/store/custom/route.ts   → GET → 200
```

Beide tun nichts (vermutlich Reste aus dem Medusa-Starter-Template). Keine bekannten Aufrufer im Code.

→ **Empfehlung:** Bei Gelegenheit löschen. Dead Code, keine Abhängigkeiten.

---

## 5. `instrumentation.ts` — auskommentiert

Komplett auskommentierter OpenTelemetry-Boilerplate. Kein aktives Tracing/Observability.

→ **Wenn ihr Monitoring braucht** (Sentry, Datadog, Zipkin): Hier einsteigen. Anleitung steht im File. Für jetzt: ignorieren.

---

## 6. `src/admin/i18n/index.ts`

```ts
export default {}
```

Stub-File. Kein i18n implementiert. Existiert nur als Vorbereitung für eine spätere Übersetzung des Admin-UIs.

→ **Falls ihr i18n nicht plant**: Datei + Ordner können weg.

---

## 7. Custom Admin SDK

**`src/admin/lib/sdk.ts`:**
```ts
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
```

Standard-Pattern aber selbst angelegt. Wird in den Admin-Hooks (`use-preorders.ts`, `use-preorder-variant.ts`) verwendet.

**Wichtig für Production:** Die Env-Var `VITE_BACKEND_URL` (NICHT `MEDUSA_BACKEND_URL` — das ist serverseitig) muss zum Build-Zeitpunkt des Admins gesetzt sein, sonst zeigt der Admin auf `/` (relativer Pfad). Das funktioniert wenn Admin und Backend unter der gleichen Domain laufen — sonst muss `VITE_BACKEND_URL=https://api.kiji-games.de` gesetzt sein **bevor** `medusa build` läuft.

**`src/admin/lib/types.ts`:** Custom TypeScript-Types für Preorder-Datenstrukturen (s. Preorder-Doku Section 2.8).

---

## 8. `static/` Ordner

Drei JPEGs im Repo committed:
- `1774000261248-DSA5-GRUNDREGELWERK-SOFTCOVER-3D-WEB_0002.jpg`
- `1776418588648-Pathfinder-Remaster-Player-Core-and-GM-Core-2577636541.jpg`
- `1777291200645-Kult-DL-Truant-2434307988.jpg`

Werden über `/static/...` URL ausgeliefert (Medusa-Built-in-Static-Serving). Sind vermutlich Test-Cover für lokale Entwicklung.

→ **Production**: Echte Produkt-Bilder gehören nicht ins Repo, sondern auf S3/Cloudinary/o.ä. Diese Dateien können beim Production-Build entfernt werden, falls das nicht eh schon passiert. Ggf. `.gitignore`-Eintrag für `static/*.jpg` falls neue versehentlich committed werden.

---

## 9. GitHub Actions

`.github/workflows/`:
- **`update-medusa.yml`** — automatisierte Bumps der `@medusajs/*`-Pakete (PRs werden erstellt)
- **`update-preview-deps.yml` + `update-preview-deps-ci.yml`** — wahrscheinlich für Preview/Beta-Versionen
- **`test-cli.yml`** — Standard CI

**Wichtig bei automatischen Bumps:**
- Der `patches/`-Ordner (siehe Section 1) kann brechen — die Action sollte fehlschlagen, dann Patch updaten
- Die Notification-Module-Konfiguration kann brechen wenn Medusa-API ändert
- Der Preorder-Module-Code kann brechen wenn `defineLink`-API ändert

→ Bei jedem Auto-PR vor Merge **lokal testen**: `yarn install && yarn docker:up` → mindestens eine Bestellung + Welcome-Mail durchklicken.

---

## 10. Yarn 4 + Hoisting-Config

**`.yarnrc.yml`:**
```yaml
yarnPath: .yarn/releases/yarn-4.12.0.cjs
nodeLinker: node-modules
```

→ Yarn 4 (Berry), aber mit `nodeLinker: node-modules` (klassisches `node_modules/`-Layout statt PnP). Kompatibel mit Medusa-Tooling, das PnP nicht versteht.

**`.npmrc`:**
```
public-hoist-pattern[]=*@medusajs/*
public-hoist-pattern[]=@tanstack/react-query
public-hoist-pattern[]=react-i18next
public-hoist-pattern[]=react-router-dom
```

→ Hoisting-Regeln: pnpm-Style-Hoist-Pattern (auch wenn wir Yarn nutzen). Sorgt dafür dass diese Pakete von tieferen Levels in `node_modules/` rangezogen werden — sonst bricht Vite/React-Resolution.

**Wichtig**: Diese Configs nicht anfassen ohne zu testen — sie sind für die Vite/Admin-Dev-Pipeline kritisch.

---

## 11. Test-Helper-Scripts (`src/scripts/`)

| Datei | Zweck |
|---|---|
| `seed.ts` | Standard Medusa-Seed (vom Starter) — `yarn seed` |
| `run-fulfill-preorders.ts` | Daily-Cron manuell triggern (von der Mail-Session) |
| `test-welcome.ts` | Welcome-Mail für existierenden Customer triggern (von der Mail-Session) |

Ausführung:
```bash
docker compose exec medusa npx medusa exec ./src/scripts/<file>.ts
```

→ **Production**: Die `test-*.ts`-Scripts sind harmlos, nicht erreichbar von außen. Können bleiben oder weg, wie ihr wollt.

---

## 12. Production-Deployment-Checklist (zentral)

Sammlung aller Production-Punkte aus dieser Doku + den anderen beiden Dokus:

### Aus dieser Doku
- [ ] `patches/`-Ordner nach jedem Medusa-Update prüfen
- [ ] `databaseDriverOptions: { ssl: false }` in `medusa-config.ts` für Production-DB anpassen
- [ ] `VITE_BACKEND_URL` zur Build-Zeit setzen (wenn Admin auf anderer Domain als Backend liegt)
- [ ] Dummy `/admin/custom` und `/store/custom` Endpoints löschen (optional)
- [ ] `instrumentation.ts` aktivieren falls Monitoring gewünscht
- [ ] Test-JPEGs im `static/` Ordner aus Production-Build entfernen

### Aus `email-notifications.md` (Section 4)
- [ ] Resend-Domain verifizieren + DNS-Records (SPF/DKIM/DMARC)
- [ ] HTML-Templates beim `medusa build` mitkopieren (sonst crash)
- [ ] Production-Env-Vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STOREFRONT_URL`, `MEDUSA_BACKEND_URL`, `COMPANY_*`
- [ ] Dev-Resend-Key rotieren (war im Chat-Verlauf sichtbar)
- [ ] Stripe `capture_method` Entscheidung (status quo + AGBs vs. Setup-Intent)

### Aus `preorder-module.md` (Section 5)
- [ ] Sicherstellen dass Medusa-Worker läuft (für Daily-Cron) — separater Container oder kombiniert
- [ ] AGBs mit Vorkasse-Klausel ergänzen
- [ ] Logger-Output an Log-System anschließen + Alerts auf „Failed to fulfill preorder"
- [ ] DB-Cleanup-Strategie für alte Preorders (langfristig)

### Aus `DEPLOYMENT.md`
- Self-Host-Setup (Docker auf eigenem Server) — eigene 482-Zeilen-Anleitung im Repo-Root

---

## 13. Verwandte Doku

- **`docs/email-notifications.md`** — Mail-System
- **`docs/preorder-module.md`** — Preorder-Modul
- **`docs/order-token-auth.md`** — Order-Token-Auth (Gast-Bestellungen)
- **`DEPLOYMENT.md`** (Repo-Root) — Self-Host-Server-Setup mit Docker
- **`README.md`** (Repo-Root) — Standard-Medusa-Starter-README

---

## 14. Bekannte Cleanup-Kandidaten (kosmetisch)

| Item | Aufwand | Empfehlung |
|---|---|---|
| `src/api/admin/custom/route.ts` + `src/api/store/custom/route.ts` löschen | 30s | irgendwann |
| `src/admin/i18n/` löschen falls i18n nicht geplant | 30s | irgendwann |
| `instrumentation.ts` löschen falls kein Monitoring geplant | 30s | nein, lass das stehen — gute Vorlage |
| `static/`-Test-JPEGs entfernen | 1min | bei Production-Switch |
| `patches/`-Patch dokumentieren (warum `customer_group_ids` raus?) | 5min | wenn Maintainer noch greifbar |
| Cron-Logger `[object Object]` fixen | 2min | sollte gemacht werden — Bug |
