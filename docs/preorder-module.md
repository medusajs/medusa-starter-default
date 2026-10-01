# Preorder-Modul

Varianten lassen sich mit einem Verfügbarkeitsdatum als vorbestellbar markieren. Beim Checkout entstehen Preorder-Datensätze, und ein täglicher Job erstellt ab dem Verfügbarkeitsdatum das Fulfillment und verschickt die Mail „Vorbestellung verfügbar“.

## Datenmodell (`src/modules/preorder/`)

**`preorder_variant`**: Konfiguration pro Produktvariante

| Feld | Beschreibung |
|---|---|
| `variant_id` | Produktvariante, unique |
| `available_date` | Verfügbarkeitsdatum (timestamptz, indiziert) |
| `status` | `enabled` (Default) \| `disabled` |

**`preorder`**: eine Vorbestellung pro Bestellung und Preorder-Variante

| Feld | Beschreibung |
|---|---|
| `order_id` | Bestellung (indiziert) |
| `item_id` | FK auf **`preorder_variant.id`** (Relation `item`), nicht auf ein Line-Item |
| `status` | `pending` (Default) \| `fulfilled` \| `cancelled` |

Indizes: `(item_id, status)` und **unique `(order_id, item_id)`** (ab `Migration20261001061142`).

Links (`src/links/`): `preorder_variant ↔ product_variant` (Query: `variant.preorder_variant.*`, `preorder_variant.product_variant.*`) und `preorder.order_id → order` (read-only, ohne eigene Link-Tabelle).

Neue Migration nach Modelländerungen: `npx medusa db:generate preorder`.

## Wann entsteht eine Preorder?

Nur über **`POST /store/carts/:id/complete-preorder`**. Pro Cart-Position wird eine Preorder angelegt, wenn die Variante eine `preorder_variant` hat, deren Status `enabled` ist **und** deren `available_date` in der Zukunft liegt (`isActivePreorderVariant` in `src/workflows/steps/retrieve-preorder-items.ts`). Ist das Datum erreicht, wird der Artikel wie ein normaler Artikel verkauft.

Workflow `complete-cart-preorder`:

1. Lock auf die Cart-ID (`timeout` 30s, `ttl` 120s), wie beim Core-Checkout.
2. `completeCartWorkflow` als Step. Ist der Cart schon abgeschlossen, liefert er die bestehende Bestellung zurück.
3. Lädt die Bestellung mit expliziten Feldern und legt **nur fehlende** Preorders an. Wiederholte Aufrufe und Retries erzeugen keine Duplikate; zusätzlich schützt der Unique-Index.
4. Antwort `{ type: "order", order }`. Bei behebbaren Zahlungsfehlern kommt wie bei Core `{ type: "cart", cart: { id }, error }` mit HTTP 200 zurück.

Die Route steht hinter dem E-Mail-Verify-Gate ([email-verification.md](email-verification.md)).

## Täglicher Job (`src/jobs/fulfill-preorders.ts`)

- Name `daily-fulfill-preorders`, Cron `0 0 * * *`, also 00:00 Serverzeit (die Container laufen in UTC). Er läuft nur auf Instanzen mit `MEDUSA_WORKER_MODE` `shared` oder `worker`.
- Auswahl: alle `pending`-Preorders, deren `preorder_variant` den Status `enabled` hat und deren `available_date` **≤ Ende des aktuellen UTC-Tages** (`endOfUtcDay`) liegt. Eine Untergrenze gibt es nicht, verpasste Läufe werden nachgeholt.
- Ein Lock `job:fulfill-preorders` (Locking-Modul, mit Redis instanzübergreifend) verhindert parallele Läufe, etwa Cron und manuellen Aufruf gleichzeitig.
- Jede Preorder läuft einzeln durch den Workflow `fulfill-preorder`. Ein Fehler wird geloggt (`Failed to fulfill preorder <id>: <message>`) und blockiert die übrigen nicht.

Workflow `fulfill-preorder` liest Preorder und Bestellung neu und entscheidet (`planPreorderFulfillment`):

| Situation | Aktion |
|---|---|
| Preorder nicht mehr `pending` | nichts (`skip`) |
| Bestellung storniert oder bestellte Menge 0 | Preorder → `cancelled` |
| Alles schon erfüllt (z. B. manuell im Admin) | Preorder → `fulfilled`, kein neues Fulfillment |
| Restmenge offen | Fulfillment **nur für die Restmenge** (Menge minus `fulfilled_quantity`, nach Order-Edits), Preorder → `fulfilled`, Event `preorder.fulfilled` |
| Keine passende Position in der Bestellung | Fehler, die Preorder bleibt `pending` und muss manuell geprüft werden |

Das Fulfillment enthält keine Sendungsnummer. Der Versand wird wie üblich im Admin als „versendet“ markiert, das löst die Versandmail aus.

Manuell auslösen: `npx medusa exec ./src/scripts/run-fulfill-preorders.ts` (im Dev-Container: `docker compose exec medusa npx medusa exec …`).

## Stornierung

Der Subscriber `order-canceled` (Event `order.canceled`) setzt alle `pending`-Preorders der Bestellung auf `cancelled` (Workflow `cancel-order-preorders`).

## API

**Admin**

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/admin/variants/:id/preorders` | `{ available_date: ISO-Datetime }`. Legt die Konfiguration an oder aktualisiert sie und setzt sie dabei wieder auf `enabled`. 404, wenn die Variante nicht existiert |
| DELETE | `/admin/variants/:id/preorders` | Setzt `status` auf `disabled` (kein Löschen). 404 ohne Konfiguration |
| GET | `/admin/orders/:id/preorders` | Preorders inkl. Variante, Produkt und Thumbnail |

**Store**

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/store/carts/:id/complete-preorder` | Checkout, siehe oben |
| GET | `/store/orders/:id/preorders` | Preorders einer Bestellung, geschützt über Eigentümer oder Order-Token ([order-token-auth.md](order-token-auth.md)) |

Preorder-Felder an Produkten, Carts und Bestellungen der Store-API sind per `allowFields` freigeschaltet ([storefront-contract.md](storefront-contract.md#zusätzlich-freigeschaltete-felder)).

## Admin-Widgets

- `preorder-variant-widget.tsx` (Zone `product_variant.details.side.after`): Preorder einrichten, bearbeiten oder entfernen. Das Datum muss in der Zukunft liegen (Prüfung im Formular).
- `preorder-widget.tsx` (Zone `order.details.side.after`): Preorders der Bestellung mit Status und Datum; ohne Preorders wird nichts angezeigt.

Texte über `src/admin/i18n/json/{de,en}.json` (`kiji.preorder.*`), Query-Keys in `src/admin/hooks/query-keys.ts`.

## Verhalten, das man kennen sollte

- **Deaktivieren storniert nichts.** Offene `pending`-Preorders einer deaktivierten Variante bleiben bestehen und werden vom Job nicht mehr erfasst. Erst nach erneutem Aktivieren werden sie wieder erfüllt. Der Bestätigungsdialog im Admin weist darauf hin.
- **Gemischte Warenkörbe** ergeben eine Bestellung und eine Zahlung, aber zwei Fulfillments: Sofort-Artikel versendet der Admin, Preorder-Artikel kommen später über den Job. Kunden erhalten entsprechend mehrere Versandmails.
- **Zahlung**: Stripe autorisiert beim Checkout nur, erfasst wird im Admin ([DEPLOYMENT.md](../DEPLOYMENT.md#nach-dem-ersten-deploy)). Bei langen Vorlaufzeiten verfällt die Autorisierung.
- Verschiebt man `available_date`, bekommen Kunden keine Benachrichtigung.

Nützliche Abfrage für Preorders, die eigentlich fällig wären:

```sql
SELECT pv.id, pv.variant_id, pv.available_date, count(p.id) AS pending
FROM preorder_variant pv
JOIN preorder p ON p.item_id = pv.id AND p.status = 'pending' AND p.deleted_at IS NULL
WHERE pv.status = 'enabled' AND pv.available_date < now() AND pv.deleted_at IS NULL
GROUP BY pv.id;
```
