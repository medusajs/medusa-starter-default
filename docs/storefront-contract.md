# Storefront-Vertrag

Was die Astro-Storefront `kiji-store-mjs` von diesem Backend erwartet. Wer hier etwas ändert, muss die Storefront mitziehen und umgekehrt. Details stehen in der jeweiligen Feature-Doku.

## Checkout

- Den Warenkorb **immer** über `POST /store/carts/:id/complete-preorder` abschließen, nie über `/complete`. Nur diese Route legt Preorder-Datensätze an; ohne Preorders werden vorbestellte Artikel nie automatisch erfüllt. Ohne Preorder-Artikel verhält sich die Route wie `/complete`.
- Antworten:
  - `{ type: "order", order }`. `order` enthält nur `id, display_id, email, status, currency_code, created_at` und `items.{id, title, quantity, variant_id, variant.preorder_variant.{id, status, available_date}}`.
  - `{ type: "cart", cart: { id }, error }` (HTTP 200) bei behebbaren Zahlungsfehlern (`payment_authorization_error`, `payment_requires_more_error`). Anders als bei Core kommt nur die Cart-ID zurück, den Cart bei Bedarf neu laden.
  - andere Fehler als HTTP-Fehler.
- `403 { type: "email_not_verified" }` auf `/complete` und `/complete-preorder`, wenn der Cart einem Account-Kunden ohne bestätigte E-Mail gehört.
- Eine Variante gilt als Preorder, wenn `variant.preorder_variant.status === "enabled"` **und** `available_date` in der Zukunft liegt. Dieselbe Regel nutzt das Backend beim Anlegen der Preorders (`isActivePreorderVariant`).

## Preorders

- `GET /store/orders/:id/preorders` → `{ preorders: [{ id, order_id, item_id, status, created_at, updated_at, item: { id, variant_id, available_date, status } }] }`
- **`preorder.item_id` ist die ID der `preorder_variant`**, nicht die eines Line-Items. Der Abgleich läuft über `item.variant.preorder_variant.id`.
- `status`: `pending` | `fulfilled` | `cancelled`.

## E-Mail-Verifizierung

- Flag: `customer.metadata.email_verified === true` (boolean). Kunden können es nicht selbst setzen: `POST /store/customers*` mit `metadata.email_verified` → `400 invalid_data`.
- `POST /store/auth/verify-email` `{ customer_id, email, token }` → `{ verified: true }`. Ungültiger oder abgelaufener Token und geänderte E-Mail → 400, unbekannter Kunde → 404.
- `POST /store/customers/me/resend-verification` (eingeloggt) → `{ sent: true }`, oder `429` mit `Retry-After` und `retry_after` (60s Cooldown).
- `POST /store/customers/email-exists` `{ email }` → `{ exists: boolean }` (nur echte Accounts).

## Gast-Zugriff auf Bestellungen

- Header **`x-kiji-order-token`** bei `GET /store/orders/:id`, `GET /store/orders/:id/preorders` und `POST /store/returns`, wenn der Nutzer nicht eingeloggt ist. Eingeloggte Kunden nutzen Session oder Bearer und müssen Eigentümer sein.
- Token holen: **`POST /store/orders/:id/token`** `{ email }` → `{ token }`. Nur für Gast-Bestellungen.
- Jede Ablehnung (Order unbekannt, falsche E-Mail, falscher Token, fremde Order) ist **404**.

## Links in E-Mails

Basis ist `STOREFRONT_URL`. Diese Routen muss die Storefront bereitstellen:

| Link | Herkunft |
|---|---|
| `/order/<id>?t=<token>` | Bestell-, Versand- und Preorder-Mail. `t` als Header `x-kiji-order-token` weitergeben |
| `/verify-email?customer_id=…&email=…&token=…` (optional `&redirect=…`) | Verifizierungs-Mail. Die drei Werte an `POST /store/auth/verify-email` schicken |
| `/reset-password?token=…` | Passwort-Reset für Kunden. **Ohne** `email`-Parameter; die Storefront fragt die E-Mail im Formular ab |
| `/account`, `/account/orders`, `/products` | Welcome- und andere Mails |
| `/impressum`, `/agb`, `/datenschutz`, `/placeholder.png` | Footer, Platzhalterbild für Artikel ohne Thumbnail |

Admin-Reset-Links zeigen auf `${MEDUSA_BACKEND_URL}/app/reset-password?token=…&email=…`. Reset-Tokens sind seit 2.21 einmalig verwendbar.

## Zusätzlich freigeschaltete Felder

Seit 2.21 liefern Store-Routen nur Felder, die in ihrer Allowlist stehen. `src/api/middlewares.ts` ergänzt per `allowFields`:

| Routen (Präfix) | Felder |
|---|---|
| `/store/products` | `variants.preorder_variant.{id, available_date, status}` |
| `/store/carts` | `items.variant.id`, `items.variant.preorder_variant.{id, available_date, status}`, `items.product.metadata`, `items.product.categories.metadata` (FSK-Altersprüfung) |
| `/store/orders` | `items.variant.preorder_variant.{id, available_date, status}`, `promotions.application_method`, `returns`, `returns.items` |

Neue `fields`, die die Storefront anfordert, müssen hier ergänzt werden, sonst fehlen sie ohne Fehlermeldung in der Antwort.
