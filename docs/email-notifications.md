# Email Notifications — Setup, Architektur & Deployment

Vollständige Doku zum Mail-System (Resend + Custom Templates). Aktueller Stand: lokal in Docker funktionsfähig, **Production-Setup steht noch aus** (siehe Abschnitt „Production-Deployment-Checklist" unten).

---

## 1. Was kann das System

| Anlass | Event | Template | Empfänger |
|---|---|---|---|
| Bestellung abgeschlossen | `order.placed` | `order-placed` | Customer (`order.email`) |
| Bestellung mit Preorder-Items | `order.placed` | `order-placed` (mit Preorder-Hinweis + Markierung pro Item) | Customer |
| Vorbestellung verfügbar (Daily-Cron) | `preorder.fulfilled` | `preorder-fulfilled` | Customer |
| Versand mit Tracking | `shipment.created` | `shipment-created` | Customer (`order.email`) |
| Passwort-Reset (Customer + Admin) | `auth.password_reset` | `password-reset` | User per `entity_id` |
| Account erstellt | `customer.created` (nur wenn `has_account=true`) | `welcome` | Customer |

Alle Mails sind im **dunklen Kiji-Theme** (Hex-only, kein OKLCH), tabellenbasiert, Outlook-tauglich, mit `color-scheme`-Meta gegen Auto-Invertierung. Native Sans-Stack, kein Webfont. Wordmark `Kiji·Games` als Text statt `<img>`.

---

## 2. Architektur

### Module: Custom Resend Provider

```
src/modules/resend/
├── index.ts                          # ModuleProvider-Export für NOTIFICATION
├── service.ts                        # AbstractNotificationProviderService — send() Methode + Template-Registry
└── emails/
    ├── order-placed.html             # Handlebars-Template
    ├── order-placed.ts               # Renderer: baut Context, ruft compiledTemplate(context)
    ├── shipment-created.html
    ├── shipment-created.ts
    ├── password-reset.html
    ├── password-reset.ts
    ├── preorder-fulfilled.html
    ├── preorder-fulfilled.ts
    ├── welcome.html
    └── welcome.ts
```

Pattern jedes Renderers:
- `fs.readFileSync` auf das `.html`-File beim Modul-Load
- `Handlebars.compile()` einmal cachen
- Export einer Funktion `(data) => { subject, html }`, die den Context aus den DTOs baut

Service hält ein Registry-Object `{ "template-name": rendererFn }` und mappt im `send()` die `notification.template` darauf.

### Subscribers

```
src/subscribers/
├── order-placed.ts          # listens to: order.placed
├── shipment-created.ts      # listens to: shipment.created
├── password-reset.ts        # listens to: auth.password_reset
├── preorder-fulfilled.ts    # listens to: preorder.fulfilled
└── customer-created.ts      # listens to: customer.created
```

Jeder Subscriber:
1. Lädt die nötigen Daten via `query.graph(...)` (nicht via DTO direkt — siehe Gotcha 2)
2. Filtert raus was nicht versendet werden soll (kein `email`, `no_notification`, Gast-Customer)
3. Ruft `notificationService.createNotifications({ to, channel: "email", template, data })`

### Konfiguration (`medusa-config.ts`)

```ts
{
  resolve: "@medusajs/medusa/notification",
  options: {
    providers: [
      {
        resolve: "./src/modules/resend",
        id: "resend",
        options: {
          channels: ["email"],
          api_key: process.env.RESEND_API_KEY,
          from: process.env.RESEND_FROM_EMAIL,
        },
      },
    ],
  },
},
```

### Storefront-Master-Templates

Quelle (Single-Source) liegt im **Storefront-Repo**:
```
kiji-store-mjs/email-templates/
├── order-confirmation.html
├── shipment-confirmation.html
├── password-reset.html
├── preorder-fulfilled.html
└── welcome.html
```

Der Backend-Modul-Ordner enthält nur Kopien. Workflow zum Update:
1. Master im Storefront-Repo editieren
2. Per `cp` ins Backend-Modul syncen (siehe Section „Templates pflegen")

---

## 3. Was wurde lokal gemacht

### Dependencies

`package.json` ergänzt:
```json
"resend": "^4.0.0",
"handlebars": "^4.7.8"
```

### `.env` (lokal, in Repo committed mit Test-Werten)

```env
# Resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=onboarding@resend.dev

# Storefront / Company info für Mail-Templates
STOREFRONT_URL=http://localhost:4321
COMPANY_ADDRESS_LINE=Badener Holz 2
COMPANY_CITY=Achim

# Optional, für Admin-Reset-URL (sonst http://localhost:9000)
MEDUSA_BACKEND_URL=http://localhost:9000
```

### Docker

`docker-compose.yml` ist unverändert — das `env_file: .env` reicht die Vars in den Container.

**Wichtig wegen anonymem `node_modules`-Volume**: Bei jedem neuen NPM-Paket muss der `medusa`-Container samt seinem `node_modules`-Volume neu gebaut werden:
```bash
docker compose rm -f -s -v medusa
docker compose up --build -d medusa
```
Sonst bleibt die alte `node_modules`-Version im Volume und das neue Paket fehlt im Container.

---

## 4. Production-Deployment-Checklist

Beim Setup auf dem echten Server **muss** die folgende Liste durchgegangen werden — sonst ist das Mail-System kaputt oder unbrauchbar.

### 4.1 Resend-Domain verifizieren ⚠️ blockierend

Ohne verifizierte Domain darf Resend **nur an die Account-Email senden** (Sandbox-Modus). Im Live-Betrieb landen alle anderen Adressen im Resend-Log als Fehler, der Kunde bekommt nichts.

1. Bei [Resend](https://resend.com) → Domains → `kiji-games.de` (oder gewünschte Sender-Domain) hinzufügen
2. Die angezeigten DNS-Records bei deinem Domain-Anbieter eintragen:
   - **SPF** (`TXT @`): `v=spf1 include:_spf.resend.com ~all`
   - **DKIM** (`TXT resend._domainkey`): wird von Resend angezeigt
   - **MX** (optional, für Bounce-Handling)
   - **DMARC** (empfohlen, `TXT _dmarc`): `v=DMARC1; p=none; rua=mailto:dmarc@kiji-games.de`
3. In Resend auf „Verify" warten (oft sofort, max. 1–2 h)
4. `RESEND_FROM_EMAIL` in der Production-`.env` umstellen, z.B. `bestellungen@kiji-games.de`

### 4.2 HTML-Templates beim `medusa build` mitkopieren ⚠️ blockierend

Aktuell lädt jeder Renderer das `.html`-File via `fs.readFileSync(path.join(__dirname, "X.html"))`. Im Dev-Mode (`medusa develop`) liegen die `.html` neben den `.ts` und das funktioniert. **In Production** läuft `medusa build && medusa start` aus dem Output-Ordner `.medusa/server/` — und der Build kopiert nur `.ts`/`.tsx`, **nicht** `.html`.

→ **Konsequenz:** Beim ersten Mail-Send in Production crasht der Renderer mit `ENOENT: no such file or directory ... order-placed.html`.

**Lösung A (empfohlen, wenig Code):** Postbuild-Script in `package.json`:
```json
"scripts": {
  "build": "medusa build && cp src/modules/resend/emails/*.html .medusa/server/src/modules/resend/emails/"
}
```
(Pfad ggf. anpassen falls Medusa das Output-Layout ändert.)

**Lösung B:** Templates inline in die `.ts`-Files als Template-Literal packen. Bulletproof, aber unschönerer Code-Style.

### 4.3 Production-Env-Vars setzen

Server-`.env` (anders als lokal):

```env
RESEND_API_KEY=re_<production-key>          # NICHT der Dev-Key
RESEND_FROM_EMAIL=bestellungen@kiji-games.de # nach Domain-Verifizierung
STOREFRONT_URL=https://kiji-games.de         # echte URL, sonst tote Links
MEDUSA_BACKEND_URL=https://api.kiji-games.de # echte Backend-URL für Admin-Reset
COMPANY_ADDRESS_LINE=Badener Holz 2
COMPANY_CITY=Achim
```

**Sicherheitshinweis:** Der lokale Dev-Key `re_FPuV78JS_DUjJGh7CvXP6scakutKHYuWf` wurde im Chat geteilt — vor Production rotieren oder zumindest im Resend-Dashboard einen separaten Production-Key anlegen und den Dev-Key auf nur-Dev-Domain einschränken.

### 4.4 Stripe `capture_method` entscheiden

Aktuell: kein `capture_method` in `medusa-config.ts` → Stripe-Default `automatic` → **Geld wird sofort beim Checkout abgebucht, auch bei Vorbestellungen**.

Das ist okay solange in den AGBs klar steht:
> „Bei Vorbestellungen erfolgt die Belastung sofort bei Bestelleingang. Der Versand erfolgt, sobald der Artikel verfügbar ist (voraussichtliches Datum auf der Produktseite)."

Bei Lieferzeit > 30 Tagen zusätzlich Widerrufsrecht klar erklären.

Falls du auf Authorize-then-Capture umstellen willst (manual capture), ist das **kein Mail-Thema**, sondern ein größerer Eingriff in den Cart-/Cron-Flow (Stripe-Authorisierung läuft nach 7 Tagen aus → Setup Intents nötig). Siehe „Erkenntnis 7" unten.

### 4.5 Storefront-Routing prüfen

Mails verlinken auf:
- `/order/{id}` (Order-Confirmation, Shipment, Preorder)
- `/account` und `/account/orders` (Welcome-Mail)
- `/reset-password?token={token}` (Customer Password Reset — **ohne** `email`-Param, wie in `PasswordResetForm.vue` erwartet)
- `/impressum`, `/agb`, `/datenschutz` (Footer in jedem Template)

Sicherstellen dass diese Routen alle existieren und unter `STOREFRONT_URL` erreichbar sind.

---

## 5. Erkenntnisse / Gotchas (alles beim Bauen gelernt)

### 5.1 Money-Felder via `query.graph` — nie `*` mit Totals mischen

```ts
// ❌ FALSCH — overrides computed totals
fields: ["*", "total", "items.*"]

// ❌ FALSCH — totals undefined
fields: ["*", "items.*"]

// ✅ RICHTIG — explizit auflisten
fields: [
  "id", "display_id", "email", "currency_code",
  "total", "subtotal", "tax_total",
  "original_item_total", "item_total", "shipping_total", "discount_total",
  "items.*",
]
```

Begründung: Order-Totals sind **computed** (nicht in der DB-Tabelle). `*` lädt nur DB-Spalten und überschreibt explizit gewünschte Computed-Felder mit `undefined`.

Quelle: <https://docs.medusajs.com/resources/commerce-modules/order/order-totals#caveats-of-retrieving-order-totals>

### 5.2 BigNumber-Format ist nicht plain number

Money-Felder kommen oft als BigNumber-Klasseninstanz oder als `{ value: "10", precision: 20 }` — `parseFloat(value)` oder `Number(value.toString())` ergibt `NaN` bzw. `0`. Lösung: defensive `toNumber`-Funktion die alle Cases abdeckt:

```ts
const toNumber = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") return parseFloat(value) || 0
  if (typeof value === "object") {
    const obj = value as any
    if (typeof obj.numeric === "number") return obj.numeric
    const raw = obj.raw ?? obj
    if (raw && (typeof raw.value === "string" || typeof raw.value === "number")) {
      return parseFloat(String(raw.value)) || 0
    }
    if (typeof obj.valueOf === "function") {
      const v = obj.valueOf()
      if (typeof v === "number") return v
    }
  }
  return parseFloat(String(value)) || 0
}
```

(Implementiert in `src/modules/resend/emails/order-placed.ts`.)

### 5.3 DACH-Brutto-Mapping

Niemals `subtotal` oder `item_subtotal` für „Zwischensumme" anzeigen — das sind **Netto**-Felder und führen in DE zu falschen Mails.

Korrekt:
- **Zwischensumme** → `original_item_total` (Brutto vor Discount)
- **Rabatt** → aggregiert aus `items[].adjustments[]` + `shipping_methods[].adjustments[]`, gruppiert per `promotion_id` / `code`
- **Versand** → `shipping_total` (Brutto)
- **Gesamt** → `total` (Brutto)
- **Davon enthaltene Steuern** → `tax_total` (nur informativ, nie addieren)

Preisformat: `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })` → `49,99 €`.

### 5.4 Order ↔ Fulfillment Lookup

Im `shipment.created`-Subscriber kommt nur `fulfillment_id` rein. Filter `{ fulfillments: { id } }` auf `entity: "order"` **funktioniert nicht** (Module-Link-Filter wird nicht aufgelöst).

Workaround: Über `fulfillment.items[0].line_item_id` → query `order` mit `filters: { items: { id: lineItemId } }`. Das funktioniert, weil `items` direkte Order-Relation ist.

### 5.5 Resend-Sandbox

Ohne verifizierte Domain darf Resend nur an die Account-Email senden. Andere Empfänger werden im Resend-Dashboard als Fehler geloggt, der Subscriber bekommt aber kein Exception (Resend antwortet 200 mit Error-Object). Mein Renderer loggt diese Fehler explizit via `logger.error`.

### 5.6 Docker `node_modules` anonymes Volume

`docker-compose.yml` mountet `/server/node_modules` als anonymes Volume → bei `docker compose up --build` bleibt das alte Volume bestehen und überdeckt das frische Image. Workaround beim Hinzufügen von Dependencies:
```bash
docker compose rm -f -s -v medusa  # -v entfernt das anonyme Volume
docker compose up --build -d medusa
```

### 5.7 Vite-Cache

Wenn man `.tsx` durch `.ts` ersetzt oder Module umbenennt, hat der Browser noch alte Vite-Bundle-Hashes im Cache → `Failed to fetch dynamically imported module`. Fix:
```bash
docker compose exec medusa rm -rf /server/node_modules/.vite /server/.medusa
docker compose restart medusa
```
+ Browser hard-reload (Ctrl+Shift+R) bzw. Service Worker / Storage clearen.

### 5.8 Cron-Filter-Bug (gefixt)

Der ursprüngliche Filter im `fulfill-preorders.ts`:
```ts
available_date: { $gte: startToday, $lte: endToday }
```
greift nur **exakt heute available** Preorders. Bei Server-Downtime an einem Tag bleiben Preorders **dauerhaft pending**.

Fix: Lower-Bound entfernt. Inner-Loop filtert eh nur `status: pending` → kein Doppel-Fulfillment-Risiko.

### 5.9 Stripe-Capture für Preorders

Aktueller Default: `automatic` → Geld sofort weg. Saubere Lösung wäre Setup Intent + verzögerter PaymentIntent beim Cron-Lauf, aber:
- Stripe-Authorization läuft nach 7 Tagen aus → für lange Preorders ungeeignet
- Setup Intent + Charge-on-Demand = größerer Cart-Refactor

Für jetzt: AGB-Text deckt das ab (siehe 4.4).

### 5.10 HTML-Templates pflegen

Single Source of Truth = `kiji-store-mjs/email-templates/`. Backend-Modul-Kopien werden manuell nachgezogen:

```bash
cp /pfad/zu/kiji-store-mjs/email-templates/order-confirmation.html \
   src/modules/resend/emails/order-placed.html
# (gleich für die anderen 4 Templates)
```

Falls ihr das automatisieren wollt: Ein npm-Script `sync:templates` einbauen das alle 5 Files kopiert. Hot-Reload in `medusa develop` zieht die neuen HTMLs sofort.

---

## 6. Mail-Datenfluss im Detail

### `order.placed`
1. Kunde schließt Cart ab → Medusa-Core feuert `order.placed`
2. `src/subscribers/order-placed.ts` lädt Order mit allen computed Totals + Items inkl. `variant.preorder_variant.*`
3. Renderer:
   - Detektiert Preorder-Items per `item.variant.preorder_variant.id`
   - Setzt `has_preorder_items: true` → conditional Hinweis-Block im Template
   - Markiert pro Item mit Pill „Vorbestellung · ab DD.MM.YYYY"
4. Subject: `Bestellung #X bestätigt`

### `shipment.created`
1. Admin klickt im Order-Detail „Mark as Shipped" → Tracking-Nummer eingeben → bestätigen
2. `createOrderShipmentWorkflow` feuert `shipment.created` mit `{ id: fulfillment_id, no_notification }`
3. Wenn `no_notification: true` → Subscriber returned sofort
4. Sonst: Fulfillment laden mit `labels[]`, Order via Line-Item-Lookup
5. Tracking-URL-Logik:
   - Wenn `label.tracking_url` mit `http(s)://` startet → benutzen
   - Sonst: DHL-Fallback `https://nolp.dhl.de/nextt-online-public/set_identcodes.do?lang=de&idc=<NUMBER>`
6. Carrier wird aus `provider_id` oder URL erkannt (DHL/DPD/Hermes/UPS/FedEx/GLS)
7. Subject: `Deine Bestellung #X ist unterwegs`

### `auth.password_reset`
1. Customer/Admin fordert Password-Reset → `generateResetPasswordTokenWorkflow` feuert `auth.password_reset`
2. Payload: `{ entity_id: email, token, actor_type }`
3. Subscriber baut URL je nach `actor_type`:
   - `customer` → `${STOREFRONT_URL}/reset-password?token=...` (**kein** `email`-Param, wie `PasswordResetForm.vue` erwartet)
   - `user` (admin) → `${MEDUSA_BACKEND_URL}/app/reset-password?token=...&email=...`
4. Subject je nach Actor: `Passwort zurücksetzen für Kiji Games` / `Admin-Passwort zurücksetzen`

### `preorder.fulfilled`
1. Daily-Cron `0 0 * * *` läuft `fulfill-preorders.ts`
2. Für jede `preorder_variant` mit `available_date <= heute 23:59` UND `status: enabled`:
   - Findet alle `preorder` mit `status: pending`
   - Ruft `fulfillPreorderWorkflow` → erstellt Fulfillment + setzt Preorder auf `FULFILLED` + feuert `preorder.fulfilled` mit `{ order_id, preorder_variant_id }`
3. Subscriber lädt Order, filtert Items deren Variant zur `preorder_variant_id` gehört
4. Subject: `Deine Vorbestellung zu #X ist verfügbar`
5. **Wichtig:** Tracking-Mail kommt erst, wenn der Admin manuell „Mark as Shipped" klickt — das Cron erstellt nur das Fulfillment, nicht den Versand.

### `customer.created`
1. Kunde registriert sich (echter Account, nicht Gast) → `customer.created` mit `{ id }`
2. Subscriber lädt Customer, filtert auf `has_account === true` (Gäste werden geskippt)
3. Subject: `Willkommen bei Kiji Games`

---

## 7. Neue Templates hinzufügen

1. Master-HTML im Storefront-Repo `email-templates/` anlegen
2. Ins Backend-Modul kopieren: `cp ... src/modules/resend/emails/<name>.html`
3. Renderer-Datei `src/modules/resend/emails/<name>.ts` nach Vorlage von `welcome.ts` (kürzeste) oder `order-placed.ts` (komplexeste) anlegen — Pattern:
   ```ts
   const compiledTemplate = Handlebars.compile(fs.readFileSync(...))
   export const renderXEmail = (data) => ({
     subject: "...",
     html: compiledTemplate(buildContext(data)),
   })
   ```
4. In `src/modules/resend/service.ts` zur `templates`-Map hinzufügen
5. Subscriber unter `src/subscribers/<name>.ts` anlegen — listet auf das Event und ruft `notificationService.createNotifications(...)` mit der Template-ID

---

## 8. Testing

### Subscriber manuell triggern (ohne echte Bestellung)

Wir haben Test-Helper-Scripts unter `src/scripts/`:
- `run-fulfill-preorders.ts` — triggert den Daily-Cron einmalig
- `test-welcome.ts` — triggert Welcome-Mail für einen existierenden Customer per Email

Ausführen im Container:
```bash
docker compose exec medusa npx medusa exec ./src/scripts/run-fulfill-preorders.ts
docker compose exec medusa npx medusa exec ./src/scripts/test-welcome.ts
```

Das gleiche Pattern lässt sich für jeden anderen Subscriber bauen — Subscriber-Default-Export importieren, mit fake-event-Payload aufrufen.

### Cron für Preorder-Test

Falls zu testende Preorder-Variant kein `available_date <= heute` hat:
```sql
-- in postgres-container:
UPDATE preorder_variant SET available_date = NOW() WHERE id = '<id>';
-- danach Cron triggern, dann zurücksetzen:
UPDATE preorder_variant SET available_date = '<original>' WHERE id = '<id>';
```

### Welche Mails landen wo

Resend-Sandbox blockt alle Empfänger außer der Account-Email. Im Resend-Dashboard unter „Logs" siehst du sowohl erfolgreiche als auch geblockte Sends.

---

## 9. Bekannte offene Punkte

| Punkt | Status | Priorität |
|---|---|---|
| Resend-Domain verifizieren | offen | **kritisch vor Deploy** |
| HTML-Templates beim `medusa build` mitkopieren | offen | **kritisch vor Deploy** |
| Order #13 Fulfillment-Fehler debuggen | offen | mittel — eine Preorder bleibt sonst dauerhaft pending |
| `[object Object]` im Job-Logger durch echte Message ersetzen | offen | klein |
| FSK-18 Image-Filter in Mails | offen | optional |
| Idempotency-Key für Resend (Doppelversand bei Worker-Restart) | offen | optional |
| Test-Scripts in `src/scripts/test-*.ts` | können bleiben | — |
| Stripe `capture_method` (Preorder Vorkasse-Logik) | bewusst `automatic` | nur ändern bei Bedarf, AGBs decken es ab |

---

## 10. AGB-Hinweis (rechtlich)

Wegen der Vorkasse-Belastung bei Preorders gehört in die AGBs (oder mindestens die Produkt-/Warenkorb-Seite) ein klarer Hinweis:

> Bei Vorbestellungen erfolgt die Belastung sofort bei Bestelleingang. Der Versand erfolgt, sobald der Artikel verfügbar ist (voraussichtliches Datum auf der Produktseite). Der Kunde kann jederzeit bis zur Versandbenachrichtigung die Vorbestellung kostenfrei widerrufen.

Bei Lieferzeit > 30 Tagen Widerrufsrecht zusätzlich gesondert hervorheben.
