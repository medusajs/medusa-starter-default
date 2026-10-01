# Order-Token-Auth (Gast-Bestellungen)

Gäste sollen ihre Bestellseite und den Link aus der Bestellmail ohne Login öffnen können, aber niemand soll mit einer bloßen Order-ID fremde Bestellungen lesen. Dafür gibt es einen HMAC-Token im Header **`x-kiji-order-token`**.

## Token

`src/utils/order-token.ts`: `base64url(HMAC-SHA256(JWT_SECRET, "order-token:" + order.id))`

- Deterministisch und ohne Ablauf, damit Links in bereits verschickten Mails gültig bleiben. Das Format darf sich deshalb nicht ändern.
- Vergleich in konstanter Zeit (`safeEqual` in `src/utils/hmac.ts`).
- Ein Wechsel von `JWT_SECRET` macht alle Links ungültig, betroffene Gäste bekommen dann 404.

## Geschützte Routen

In `src/api/middlewares.ts` läuft vor diesen Routen `authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })` und danach `verifyOrderAccess`:

- `GET /store/orders/:id`
- `GET /store/orders/:id/preorders`
- `POST /store/returns` (Order-ID aus `body.order_id`)

`verifyOrderAccess` lässt eine Anfrage durch, wenn

1. ein eingeloggter Kunde Eigentümer der Bestellung ist (`order.customer_id`), **oder**
2. die Bestellung einem Gast gehört (`customer.has_account = false`) und der Header einen gültigen Token enthält.

In allen anderen Fällen gibt es **404 `Not found`**, auch wenn die Bestellung existiert. So lässt sich von außen nicht herausfinden, ob es eine Order gibt. Ohne Order-ID antwortet die Middleware mit 400.

Der Token steht im Header statt in Query oder Body, weil Medusas Validierung unbekannte Query- und Body-Felder mit 400 ablehnt.

## Token ausstellen

`POST /store/orders/:id/token` mit `{ email }` → `{ token }`

- Die E-Mail muss zur Bestellung passen (Vergleich nach trim und lowercase), und die Bestellung muss eine Gast-Bestellung sein. Sonst kommt 404, egal ob die Order fehlt, die E-Mail falsch ist oder ein Account dahintersteht.
- Diese Route ist absichtlich nicht durch `verifyOrderAccess` geschützt, weil sie den Gast-Zugriff erst ermöglicht.

Warum nur Gäste: In Medusa v2 hängt an jeder Bestellung ein Customer-Datensatz, bei Gästen ein Schatten-Kunde mit `has_account = false`. Würde der Token auch für Accounts gelten, reichten E-Mail und Order-ID, um Bestellungen eines Accounts zu lesen. Accounts müssen sich daher anmelden. Damit Gäste nicht versehentlich an einen Account geraten, prüft die Storefront vorher `POST /store/customers/email-exists` ([email-verification.md](email-verification.md#e-mail-existenz-prüfen)).

## Ablauf in der Storefront

- **Direkt nach dem Checkout**: `POST /store/orders/:id/token` mit der E-Mail aus dem Cart, danach den Header bei den Order-Aufrufen mitsenden.
- **Link aus einer Mail** (`${STOREFRONT_URL}/order/<id>?t=<token>`, gebaut von `buildOrderUrl` in `src/utils/urls.ts` für Bestell-, Versand- und Preorder-Mail): `t` aus der URL lesen und als Header senden.
- **Eingeloggt**: Session oder Bearer genügt, ein mitgeschickter Token stört nicht.
