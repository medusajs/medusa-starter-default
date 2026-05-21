# Preorder Module — Architektur, Datenfluss & Deployment

Eigenes Medusa-v2-Modul für Vorbestellungen. Erlaubt Admin, Product-Varianten als „Preorder mit Verfügbarkeitsdatum" zu markieren. Customer kann diese Varianten kaufen, das System erstellt eine `Preorder`-Datensatz-Verknüpfung zur Order, und ein Daily-Cron triggert das Fulfillment am `available_date`.

---

## 1. Was kann das Modul

| Feature | Wo |
|---|---|
| Variant als Preorder konfigurieren (Datum, Enable/Disable) | Admin → Variant-Detail-Seite, Widget rechts |
| Preorder-Status pro Order anzeigen | Admin → Order-Detail-Seite, Widget rechts |
| Cart mit Preorder-Items abschließen | Storefront → eigener Endpoint `/store/carts/:id/complete-preorder` |
| Daily-Fulfillment am available_date | Cron (Mitternacht UTC) → erstellt Fulfillment + setzt Preorder fulfilled + feuert Event |
| Preorders pro Order abfragen | `/admin/orders/:id/preorders`, `/store/orders/:id/preorders` |

---

## 2. Architektur

### 2.1 Module-Struktur

```
src/modules/preorder/
├── index.ts                          # Module-Export, PREORDER_MODULE = "preorder"
├── service.ts                        # Standard MedusaService mit beiden Models
├── models/
│   ├── preorder-variant.ts           # PreorderVariant Model + PreorderVariantStatus Enum
│   └── preorder.ts                   # Preorder Model + PreorderStatus Enum
└── migrations/
    └── Migration20260428113801.ts    # Initial-Migration (beide Tables + Indexes + FK)
```

Service ist ein dünner Wrapper:
```ts
export default class PreorderModuleService extends MedusaService({
  PreorderVariant,
  Preorder,
}) {}
```
→ Bekommt automatisch `createPreorderVariants`, `retrievePreorderVariant`, `updatePreorderVariants`, `deletePreorderVariants`, `listPreorderVariants` (gleich für Preorders).

In `medusa-config.ts` registriert über:
```ts
{ resolve: "./src/modules/preorder" }
```

### 2.2 Datenmodelle

**`PreorderVariant`** — die Konfiguration einer Variant als Preorder (1 pro Variant):

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | text PK | |
| `variant_id` | text **unique** (soft-deleted-aware) | Foreign-ish key zu `product_variant.id` (kein DB-FK, nur über Module-Link) |
| `available_date` | timestamptz, indexed | Datum ab dem Variant verfügbar wird |
| `status` | enum: `enabled` \| `disabled` (default `enabled`) | Disable löscht NICHT — setzt nur Status |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | Standard |
| `preorders` | hasMany → Preorder.item | Reverse-Relation |

**`Preorder`** — eine konkrete Vorbestellung pro Order und PreorderVariant:

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | text PK | |
| `order_id` | text, indexed | Foreign-ish key zu `order.id` (über Module-Link) |
| `item_id` | text **DB-FK** → `preorder_variant.id` | Echter FK mit `ON UPDATE CASCADE` |
| `status` | enum: `pending` \| `fulfilled` \| `cancelled` (default `pending`) | |
| Composite-Index | `(item_id, status)` | Für effizienten Cron-Lookup |
| `item` | belongsTo PreorderVariant | mappedBy `preorders` |

**Daten-Integrität-Hinweis:** `Preorder.item_id` hat einen echten FK auf `PreorderVariant.id` mit Cascade-Update. Beim Löschen/Deaktivieren einer Variant bleiben aber die Preorders bestehen — Disable setzt nur den Status, kein Cascade-Delete (gut so).

### 2.3 Module Links

```
src/links/
├── preorder-variant.ts    # PreorderVariant ↔ ProductVariant (bidirektional)
└── preorder-order.ts      # Preorder ↔ Order (readOnly via order_id)
```

**`preorder-variant.ts`** — bidirektional:
```ts
defineLink(
  PreorderModule.linkable.preorderVariant,
  ProductModule.linkable.productVariant
)
```
→ Du kannst per `query.graph` aus beiden Richtungen joinen:
- `variant.preorder_variant.*`
- `preorder_variant.product_variant.*`

Wird im Storefront/Admin verwendet um z.B. `?fields=*preorder_variant` an `productVariants.retrieve()` ranzuhängen.

**`preorder-order.ts`** — readOnly:
```ts
defineLink(
  { linkable: PreorderModule.linkable.preorder, field: "order_id" },
  OrderModule.linkable.order,
  { readOnly: true }
)
```
→ `field: "order_id"` heißt: das `order_id`-Feld am `Preorder`-Record dient direkt als Link-Key. Kein separates Link-Table nötig. `readOnly: true` heißt: Medusa erstellt diese Verknüpfung nicht selbst — sie wird beim Erstellen der Preorder gesetzt und nur ausgelesen.

### 2.4 Workflows (`src/workflows/`)

| Workflow | Trigger | Zweck |
|---|---|---|
| `upsert-product-variant-preorder` | POST `/admin/variants/:id/preorders` | Variant als Preorder einrichten oder Datum aktualisieren |
| `disable-preorder-variant` | DELETE `/admin/variants/:id/preorders` | PreorderVariant deaktivieren (kein Hard-Delete) |
| `complete-cart-preorder` | POST `/store/carts/:id/complete-preorder` | Cart abschließen + Preorder-Records anlegen |
| `fulfill-preorder` | Vom Daily-Cron pro Preorder | Order-Fulfillment erstellen + Preorder als fulfilled markieren + Event |

**Workflow-Logik im Detail:**

#### `upsert-product-variant-preorder`
1. Validiert dass die Product-Variant existiert (`useQueryGraphStep` mit `throwIfKeyNotFound`)
2. Sucht existierende `preorder_variant` für `variant_id`
3. Wenn vorhanden → `updatePreorderVariantStep` (auch wenn `disabled` → setzt zurück auf `enabled`)
4. Wenn nicht → `createPreorderVariantStep` + `createRemoteLinkStep` (erzeugt den Module-Link Eintrag)

#### `complete-cart-preorder`
1. `acquireLockStep` mit `key=cart_id, ttl=10s` — verhindert Doppel-Complete
2. `completeCartWorkflow.runAsStep` → erzeugt die Order, feuert `order.placed`
3. Lädt existierende Preorders für diese Order (idempotency-check)
4. Lädt Cart-Line-Items mit `variant.preorder_variant.*`
5. `retrievePreorderItemIdsStep` extrahiert die preorder_variant_ids
6. **Conditional via `when()`:** Wenn keine Preorders existieren UND es Preorder-Items gibt → `createPreordersStep` (eine pro preorder_variant)
7. Lädt finale Order mit allen Relations
8. `releaseLockStep`
9. Returns `{ order }`

**Wichtig:** Die Idempotency macht den Endpoint sicher gegen Doppel-Aufrufe. Wenn der Cart schon completed ist, gibt's keine doppelten Preorders.

#### `fulfill-preorder` (per Cron)
1. Lädt die Order mit `items.*`
2. `retrieveItemsToFulfillStep` filtert `line_items` deren `variant_id === preorder_variant.variant_id` → Liste mit `{id, quantity}`
3. `createOrderFulfillmentWorkflow.runAsStep` erstellt Fulfillment für genau diese Items
4. `updatePreordersStep` setzt Preorder auf `FULFILLED`
5. `emitEventStep` feuert `preorder.fulfilled` mit `{ order_id, preorder_variant_id }`

### 2.5 Steps (`src/workflows/steps/`)

Alle CRUD-Steps haben **Compensation-Handler** für Rollback bei Workflow-Fehler:

| Step | Compensation |
|---|---|
| `create-preorder-variant` | `deletePreorderVariants(id)` |
| `create-preorders` | `deletePreorders(ids)` |
| `update-preorder-variant` | restore `oldData` |
| `update-preorders` | restore `oldPreorders` |
| `disable-preorder-variant` | restore `oldData.status` |
| `retrieve-items-to-fulfill` | (read-only, kein Rollback) |
| `retrieve-preorder-items` | (read-only, kein Rollback) |

→ Bei Fehler in einem späteren Step werden alle vorher erfolgreichen Steps automatisch zurückgerollt. Saubere Saga-Pattern-Implementation.

### 2.6 API Routes (`src/api/`)

#### Admin

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/admin/variants/:id/preorders` | Variant als Preorder einrichten. Body: `{ available_date: ISO-String }` (Zod-validiert via Middleware) |
| DELETE | `/admin/variants/:id/preorders` | PreorderVariant deaktivieren |
| GET | `/admin/orders/:id/preorders` | Alle Preorders einer Order mit Variant- und Product-Daten (für Admin-Widget) |

Validation läuft über `src/api/middlewares.ts`:
```ts
matcher: "/admin/variants/:id/preorders",
methods: ["POST"],
middlewares: [validateAndTransformBody(UpsertPreorderVariantSchema)],
```

#### Store

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/store/carts/:id/complete-preorder` | **Cart abschließen, wenn Preorder-Items im Cart sind** |
| GET | `/store/orders/:id/preorders` | Preorders einer Order (für Storefront-Anzeige) |

**Wichtig fürs Storefront:** Es gibt keine Auto-Erkennung. Das Storefront muss selbst entscheiden welchen Endpoint es aufruft:
- Cart enthält Preorder-Items → `POST /store/carts/:id/complete-preorder`
- Cart enthält keine Preorder-Items → `POST /store/carts/:id/complete` (Standard)

Erkennen ob Preorder-Items im Cart sind: Die Variant über `?fields=*preorder_variant` laden, prüfen ob `preorder_variant.status === "enabled"`.

### 2.7 Admin Widgets (`src/admin/widgets/`)

**`preorder-variant-widget.tsx`**
- Zone: `product_variant.details.side.after` → Widget rechts auf der Variant-Detail-Seite
- Zeigt aktuellen Status (Pill „Enabled" oder leer)
- Dropdown: Add/Edit/Remove
- Drawer mit `DatePicker` (minValue=heute) zum Setzen von `available_date`
- Bestätigungs-Dialog beim Disable mit Hinweis: „existing preorders will not be automatically fulfilled" — **ist aber nicht ganz korrekt**: Das Disable verhindert nur dass NEUE Preorders auf dem Cron auflaufen (Filter `status: enabled`). Existierende `pending`-Preorders zur Variant bleiben unfulfilled stehen.

**`preorder-widget.tsx`**
- Zone: `order.details.side.after` → Widget rechts auf der Order-Detail-Seite
- Wird nur angezeigt wenn die Order Preorders hat (sonst leer)
- Liste mit Thumbnail, Variant-Title, Status-Badge, Available-Date, Link zur Variant

### 2.8 Admin Hooks (`src/admin/hooks/`)

**`usePreorderVariant(variant)`** — TanStack-Query
- Fetched die Variant via SDK mit `?fields=*preorder_variant`
- Filter: nur als „aktiv" zurückgeben wenn `status === "enabled"` (im Hook-Return)
- Mutations: `upsertPreorder` (POST), `disablePreorder` (DELETE), beide invalidate die Query und zeigen Toast

**`usePreorders(orderId)`** — TanStack-Query
- Fetched `/admin/orders/:id/preorders`
- `retry: 2`, `refetchOnWindowFocus: false`

### 2.9 Daily-Cron (`src/jobs/fulfill-preorders.ts`)

```ts
export const config = {
  name: "daily-fulfill-preorders",
  schedule: "0 0 * * *",   // täglich Mitternacht UTC
}
```

Pseudocode:
```
endToday = today 23:59:59 UTC
for each preorder_variant where status=enabled AND available_date <= endToday (paginated, 1000):
  for each preorder where item_id=variant.id AND status=pending:
    try:
      fulfillPreorderWorkflow({ preorder_id, item: variant, order_id })
    catch error:
      logger.error(error)
      // continue with next preorder
```

**Wichtig:**
- `try/catch` pro Preorder → eine fehlerhafte Order blockt die anderen nicht
- Filter `available_date <= endToday` (nicht `==`) → verpasste Preorders werden auch aufgegriffen, falls Cron mal nicht lief (Bug-Fix vom 2026-04-29; ursprünglich war `$gte: startToday` drin → verpasste blieben dauerhaft pending)
- Inner-Loop filtert `status: pending` → kein Doppel-Fulfillment-Risiko

---

## 3. Datenflüsse

### 3.1 Admin: Variant als Preorder konfigurieren

```
Admin öffnet Variant-Detail
  → preorder-variant-widget lädt via usePreorderVariant
  → Klick "Add Pre-order Configuration"
  → Drawer mit DatePicker
  → Submit
  → POST /admin/variants/:id/preorders { available_date: "2026-08-21T00:00:00Z" }
  → Middleware validiert mit Zod
  → upsertProductVariantPreorderWorkflow
    ├── Variant existiert? (sonst 404)
    ├── PreorderVariant für variant_id existiert?
    │   ├── ja → updatePreorderVariantStep (auch zurück auf enabled wenn vorher disabled)
    │   └── nein → createPreorderVariantStep + createRemoteLinkStep
    └── Returns preorder_variant
  → React-Query Cache invalidiert, Widget zeigt "Enabled" Status-Pill
```

### 3.2 Customer: Preorder kaufen

```
Customer fügt Variant zum Cart (Standard-Flow, kein Preorder-spezifischer Endpoint nötig fürs Hinzufügen)
  → Cart-Anzeige sollte markieren dass es eine Preorder ist (Storefront-Logik via variant.preorder_variant)
  → Checkout-Flow läuft normal (Adresse, Versand, Payment-Session)
  → Beim Cart-Complete: Storefront ruft POST /store/carts/:id/complete-preorder (statt /complete!)
  → completeCartPreorderWorkflow:
    ├── Lock auf cart_id (10s TTL) — schützt vor Doppel-Submit
    ├── completeCartWorkflow.runAsStep → erzeugt Order, feuert order.placed
    │   ├── (Stripe captured automatisch — siehe Production-Punkt 5.4 in email-notifications.md)
    │   └── (order.placed Subscriber → Bestellbestätigungs-Mail mit Preorder-Markierung)
    ├── Lädt Line-Items mit preorder_variant Relation
    ├── Wenn Preorder-Items vorhanden UND noch keine Preorders existieren:
    │   └── createPreordersStep → eine Preorder pro preorder_variant
    └── Lock release
  → Storefront zeigt Order-Confirmation /order/:id
```

### 3.3 Tag X: Daily-Cron läuft

```
00:00 UTC: daily-fulfill-preorders feuert
  → fulfillPreordersJob:
    └── für jede preorder_variant mit available_date <= heute UND status=enabled:
        └── für jede preorder mit status=pending:
            └── fulfillPreorderWorkflow:
                ├── createOrderFulfillmentWorkflow → Fulfillment für die Preorder-Items der Order
                │   (KEIN tracking_number — das setzt der Admin später manuell)
                ├── updatePreordersStep → preorder.status = FULFILLED
                └── emitEventStep "preorder.fulfilled" { order_id, preorder_variant_id }
                    └── (preorder.fulfilled Subscriber → "Vorbestellung verfügbar" Mail)
```

### 3.4 Admin verschickt physisch

```
Admin öffnet Order-Detail → Fulfillment-Karte
  → Klick "Mark as Shipped"
  → Tracking-Nummer + (optional) URL eingeben
  → Bestätigen
  → createOrderShipmentWorkflow → feuert shipment.created { id, no_notification }
    └── (shipment.created Subscriber → Versandbestätigungs-Mail mit Tracking)
```

---

## 4. Was im Storefront beachten

1. **Endpoint-Wahl**: Cart-Complete läuft über `/store/carts/:id/complete-preorder` wenn Preorder-Items im Cart. Die Storefront-Logik muss das prüfen.

2. **Cart-Anzeige**: Items mit `variant.preorder_variant.status === "enabled"` als „Vorbestellung · ab DD.MM.YYYY" markieren — sonst wundert sich der Kunde wann das Paket kommt.

3. **Verfügbarkeitsdatum prominent zeigen**: Auf Produktseite + Cart + Checkout. Das ist auch rechtlich relevant (siehe AGB-Hinweis).

4. **Preorder-Status für eingeloggte Customer**: `/store/orders/:id/preorders` liefert die Liste — kann auf der Order-Detail-Seite genutzt werden um „Status: Vorbestellung pending bis DD.MM.YYYY" anzuzeigen.

5. **Mixed-Cart-Verhalten** (Preorder + sofort verfügbar im selben Cart):
   - Es gibt nur EINE Order, EIN Payment
   - Sofort-Items werden vom Admin manuell fulfilled (über die normale Fulfillment-UI)
   - Preorder-Items bekommen ein **separates** zweites Fulfillment vom Cron am `available_date`
   - Konsequenz: Der Kunde bekommt zwei Versand-Mails (eine pro Fulfillment) — das ist zwar technisch korrekt, aber UX-mäßig erklärungsbedürftig
   - Empfehlung im Cart-UI: Wenn Mixed → Hinweis „Lieferung in zwei Sendungen" anzeigen

---

## 5. Production-Deployment-Checklist

### 5.1 Cron-Scheduling

Standard-Schedule `0 0 * * *` (Mitternacht UTC = 02:00 Sommerzeit / 01:00 Winterzeit MEZ). Falls deine Server-TZ anders steht, läuft der Cron immer noch korrekt — Medusa-Schedules nutzen serverseitige TZ. Falls Mitternacht UTC unpassend ist, in `fulfill-preorders.ts:88` ändern.

**Wichtig**: Das Cron läuft im Medusa-Worker — auf dem Server muss sichergestellt sein, dass der Worker auch tatsächlich läuft (nicht nur der HTTP-Server). In Production-Setups oft separate Worker-Container.

### 5.2 Stripe `capture_method`

Aktuell `automatic` → Geld wird **sofort** abgebucht, auch bei Vorbestellungen mit Wochen Vorlauf. Siehe `docs/email-notifications.md` Section 4.4 für Details zur Lösungs-Variante (status quo akzeptieren + AGBs vs. Setup Intent + verzögerter Capture).

### 5.3 AGB-Text

Wegen der Vorkasse-Belastung gehört in die AGBs:

> Bei Vorbestellungen erfolgt die Belastung sofort bei Bestelleingang. Der Versand erfolgt, sobald der Artikel verfügbar ist (voraussichtliches Datum auf der Produktseite). Bei Lieferzeiten von mehr als 30 Tagen kann der Kunde jederzeit bis zur Versandbenachrichtigung kostenfrei widerrufen.

### 5.4 Monitoring

Der Daily-Cron loggt nur `Failed to fulfill preorder X: [object Object]` bei Fehlern (siehe Gotcha 6.4). Empfehlung für Production:
- Logger-Output ins Log-System (Datadog, Sentry, etc.) routen
- Alert wenn `Failed to fulfill preorder` mehr als 0× pro Tag
- Sonst bleiben kaputte Preorders dauerhaft `pending` und keiner merkt's

### 5.5 Datenbank-Cleanup

Aktuell wird nichts automatisch gelöscht (alle Preorders bleiben für immer). Falls die `preorder`-Tabelle wächst:
- `cancelled` Preorders nach X Monaten archivieren
- `fulfilled` Preorders nach X Jahren (für Audit-Trail) archivieren
- Empfehlung: Eigener Cleanup-Cron, nicht in den Fulfill-Job mischen

---

## 6. Erkenntnisse / Gotchas

### 6.1 Cron-Filter

Ursprünglich war der Filter `available_date BETWEEN startToday AND endToday` — verpasste Preorders blieben dauerhaft `pending`. Gefixt am 2026-04-29: nur noch `<= endToday` als Upper-Bound. Detail in `docs/email-notifications.md` Gotcha 5.8.

### 6.2 Disable ≠ Delete

`DELETE /admin/variants/:id/preorders` setzt nur `status = disabled` auf der `PreorderVariant`. Bestehende `pending`-Preorders zu dieser Variant bleiben in der DB UND werden vom Cron nicht mehr aufgegriffen (weil Filter `status: enabled` auf der Variant ist).

→ **Manuell zu beachten**: Wenn du eine Variant deaktivierst, gibt es vielleicht offene Preorders die nie automatisch fulfilled werden. Der Confirm-Dialog im Admin-Widget weist darauf hin („existing preorders will not be automatically fulfilled").

Workaround wenn das ein Problem ist: Vor dem Disable die Preorders in der DB auf `cancelled` setzen (Custom-Script).

### 6.3 Cart-Complete-Endpoint ist getrennt

`/store/carts/:id/complete-preorder` ist ein **eigener Endpoint** — `/store/carts/:id/complete` (Standard) erzeugt KEINE Preorders. Wenn das Storefront den falschen Endpoint trifft, geht die Bestellung durch, aber:
- Order wird erstellt
- Customer wird belastet
- Aber **kein** Preorder-Record → der Cron erfährt nie davon → Item wird nie fulfilled

**Defensive Empfehlung**: Im Storefront immer `/complete-preorder` aufrufen, auch wenn keine Preorder-Items im Cart sind. Der Workflow checkt das selbst und macht nichts mit Preorders wenn keine im Cart sind. Spart einen Branch in der Storefront-Logik.

### 6.4 Job-Logger zeigt `[object Object]`

In `fulfill-preorders.ts:73`:
```ts
logger.error(`Failed to fulfill preorder ${preorder.id}: ${error}`)
```
→ `${error}` interpoliert das Error-Object als String → `"[object Object]"`. Echte Fehlermeldung geht verloren. Quick-Fix:
```ts
logger.error(`Failed to fulfill preorder ${preorder.id}: ${error?.message ?? error}`, error?.stack)
```

### 6.5 Mixed-Carts erzeugen zwei Versandsendungen

Eine Order mit Preorder-Item + Sofort-Item bekommt:
- Sofort-Fulfillment (Admin manuell)
- Preorder-Fulfillment (Cron automatisch, Wochen später)

Das sind zwei separate `Fulfillment`-Records → zwei Versand-Mails (wenn der Admin beide separat „Mark as Shipped"). Aus Customer-Sicht okay wenn die Cart-UI vorher klar gemacht hat dass die Lieferung in zwei Etappen kommt.

### 6.6 `preorder_variant.variant_id` ist soft-delete-aware unique

Migration:
```sql
CREATE UNIQUE INDEX "IDX_preorder_variant_variant_id_unique"
ON "preorder_variant" ("variant_id") WHERE deleted_at IS NULL;
```
→ Wenn eine `preorder_variant` soft-deleted wird (`deleted_at` gesetzt), kann eine neue für die gleiche `variant_id` angelegt werden. Aktuell wird soft-delete nicht aktiv genutzt (Disable setzt nur `status`), aber falls jemand `deletePreorderVariants()` direkt aufruft, ist das Verhalten konsistent.

### 6.7 `Preorder.item_id` heißt `item_id`, nicht `preorder_variant_id`

Im Model:
```ts
item: model.belongsTo(() => PreorderVariant, { mappedBy: "preorders" })
```
→ Resultierendes DB-Feld: `item_id` (FK auf `preorder_variant.id`). Das ist intuitiv beim Lesen aber etwas verwirrend wenn man via SQL arbeitet — `item_id` klingt nach Order-Line-Item, ist aber die Preorder-Variant-ID.

In Workflows wird konsistent `preorder_variant_id` als Variable benutzt, aber das DB-Schema und die Filter sagen `item_id`. Bei manuellen DB-Queries dran denken.

### 6.8 Compensation = Rollback

Alle CRUD-Steps haben Compensation-Handler. Wenn `complete-cart-preorder` z.B. nach `createPreordersStep` an `releaseLockStep` scheitert (sehr unwahrscheinlich), werden die gerade erstellten Preorders automatisch wieder gelöscht. Die Order bleibt aber bestehen (weil completeCartWorkflow ein eigener Workflow ist und seine eigene Compensation hat).

→ Sehr robust, aber bei Debugging kann „die Preorder ist plötzlich weg" auf Compensation hindeuten.

### 6.9 `useQueryGraphStep` mit `throwIfKeyNotFound`

In `upsert-product-variant-preorder.ts`:
```ts
useQueryGraphStep({ entity: "product_variant", filters: { id: input.variant_id }, options: { throwIfKeyNotFound: true } })
```
→ Wirft sofort 404 wenn Variant nicht existiert. Sauber für Validation in Workflows.

### 6.10 Lock-Strategy

Der Lock in `complete-cart-preorder` (`acquireLockStep` mit `key=cart_id, timeout=2, ttl=10`) verhindert:
- Doppel-Submit vom Customer (Doppelklick auf „Bestellen")
- Race-Condition wenn zwei Tabs/Devices den gleichen Cart abschließen wollen

`timeout: 2` Sekunden zum Erwerben des Locks, `ttl: 10` Sekunden Lebensdauer. Wenn der Workflow länger braucht, läuft der Lock aus — sehr unwahrscheinlich aber theoretisch möglich.

---

## 7. Wartung

### 7.1 Migrations

Aktuell nur eine Migration (`Migration20260428113801`). Bei Schema-Änderungen:
```bash
docker compose exec medusa npx medusa db:generate preorder
docker compose exec medusa npx medusa db:migrate
```

### 7.2 Manuelle DB-Operationen

Häufige Cases:

**Preorder als cancelled markieren** (z.B. wenn Variant ausverkauft ist):
```sql
UPDATE preorder
SET status = 'cancelled'
WHERE order_id = 'order_XXX' AND status = 'pending';
```

**Available-Date verschieben** (z.B. Lieferung verzögert sich):
```sql
UPDATE preorder_variant
SET available_date = '2026-12-01'
WHERE id = 'pv_XXX';
```
→ Nach einem Verschiebungsdatum **Customer benachrichtigen!** Aktuell gibt es **keinen** Subscriber/Mail dafür — das wäre ein sinnvolles Feature für später (Event `preorder_variant.updated` o.ä. müsste dann emitted werden).

**Hängengebliebene Preorders prüfen** (Cron-Bug-Erkennung):
```sql
SELECT pv.id, pv.variant_id, pv.available_date, COUNT(p.id) AS pending
FROM preorder_variant pv
JOIN preorder p ON p.item_id = pv.id AND p.status = 'pending'
WHERE pv.available_date < NOW() AND pv.status = 'enabled'
GROUP BY pv.id;
```
→ Wenn was zurückkommt: Cron hat verpasst, manuell triggern via Test-Script.

### 7.3 Cron manuell triggern

```bash
docker compose exec medusa npx medusa exec ./src/scripts/run-fulfill-preorders.ts
```
(Test-Script existiert seit dem Mail-Setup.)

---

## 8. Bekannte offene Punkte

| Punkt | Priorität |
|---|---|
| `[object Object]` in Job-Logger durch echte Message ersetzen | klein |
| Beim Disable einer Variant die offenen Preorders auf `cancelled` setzen (oder zumindest klar warnen welche Orders betroffen sind) | mittel |
| Verschiebungs-Email wenn `available_date` geändert wird | mittel — wichtig für Customer-UX |
| Cancellation-Email wenn Preorder cancelled wird | mittel |
| DB-Cleanup-Strategie für alte `fulfilled`/`cancelled` Preorders | niedrig (erst relevant bei viel Volumen) |
| Stripe Setup-Intent statt sofortigem Capture (lange Vorlaufzeiten) | je nach AGBs niedrig bis hoch |
| Mixed-Cart UI-Hinweis im Storefront („Lieferung in zwei Sendungen") | mittel |
| Test mit großem Volume (Pagination 1000 — wie performant ist der Cron bei 10k+ Preorders?) | niedrig bis groß werden |

---

## 9. Verwandte Doku

- `docs/email-notifications.md` — Mail-System inkl. der zwei Preorder-bezogenen Mails (`order-placed` mit Preorder-Markierung, `preorder-fulfilled`)
- Storefront-Repo `kiji-store-mjs/email-templates/` — Master-Templates der HTML-Mails
- Medusa-Doku „Module Links": <https://docs.medusajs.com/learn/fundamentals/module-links>
- Medusa-Doku „Workflows & Saga Pattern": <https://docs.medusajs.com/learn/fundamentals/workflows>
