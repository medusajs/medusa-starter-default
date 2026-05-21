# Order-Token-Auth (Gast-Bestellungen)

Custom-Auth-Layer für `/store/orders/:id` und Co., damit Gäste **nach dem Checkout** ihre Bestätigungs-Seite (und den Mail-Link) auch ohne Login öffnen können — ohne dass jemand mit nur der Order-ID fremde Bestellungen lesen kann.

**Kurz:** HMAC-SHA256-Token, ausgestellt nach Email-Match-Beweis, mitgeschickt im Header `x-kiji-order-token`. Logged-in-Customers brauchen das nicht — die laufen über den normalen JWT-Pfad.

---

## 1. Files

### Neu

| Datei | Zweck |
|---|---|
| `src/utils/order-token.ts` | `signOrderToken(orderId)` + `verifyOrderToken(orderId, token)` — HMAC-SHA256 über `order-token:<id>`, base64url, `crypto.timingSafeEqual` |
| `src/api/store/orders/[id]/token/route.ts` | `POST /store/orders/:id/token` — stellt den Token aus, wenn die mitgegebene Email zur Order passt **und** der Customer ein Gast ist (`customer.has_account === false`) |

### Erweitert

| Datei | Was kam dazu |
|---|---|
| `src/api/middlewares.ts` | Custom-Middleware `verifyOrderAccess` vor `GET /store/orders/:id`, `GET /store/orders/:id/preorders`, `POST /store/returns`. Davor `authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })`, damit `req.auth_context` für Logged-in-Customers gefüllt ist, ohne Gäste rauszuwerfen. |
| `src/subscribers/order-placed.ts` | Die `order_url` in der Confirmation-Mail trägt jetzt `?t=<HMAC>` an — damit funktioniert der Mail-Link auch auf einem zweiten Gerät, wo keine Storefront-Session existiert. |

**Nicht angefasst:** `medusa-config.ts`, CORS, Custom-Module, andere Routen.

---

## 2. Wie der Token funktioniert

```
HMAC-SHA256(JWT_SECRET, "order-token:" + order.id) → base64url
```

- **Deterministisch** — derselbe Token solange `JWT_SECRET` und `order.id` gleich bleiben. Kein Expiry, kein Replay-Schutz darüber hinaus.
- **Geheimnis:** `JWT_SECRET` aus dem Env (das Medusa eh schon nutzt). Wenn die Var fehlt, wirft `getSecret()` direkt — Fail-loud.
- **Vergleich:** length-check + `crypto.timingSafeEqual`. Kein String-`===`.

Sicherheitsmodell: Wer das Geheimnis nicht kennt, kann den Token nicht raten. Wer es kennt (= Server), kann ihn jederzeit re-signen — Stateless, keine DB-Lookup.

---

## 3. Flow

### 3.1 Gast (frischer Checkout, selber Tab)

```
Storefront → POST /store/carts/:id/complete  (existiert schon)
            ← order.id

Storefront → POST /store/orders/:id/token   { email }
            ← { token }

Storefront → GET  /store/orders/:id   header: x-kiji-order-token: <token>
            ← order
```

Storefront muss den Token in `localStorage`/`sessionStorage` halten oder bei jedem Reload neu anfordern (Email ist im Cart bekannt → trivial).

### 3.2 Gast (zweites Gerät über Mail-Link)

```
Mail → https://shop.../order/<id>?t=<HMAC>
Storefront liest `t` aus der URL → Header bei API-Calls.
```

→ Kein Token-Issue-Call nötig, der Token steht direkt in der URL. Genau dafür hängt `order-placed.ts` ihn an `order_url` an.

### 3.3 Logged-in Customer

```
Storefront → GET /store/orders/:id   (Bearer/Session-Cookie)
```

`verifyOrderAccess` sieht `req.auth_context.actor_type === "customer"`, vergleicht mit `order.customer_id`, durchwinken. Token wird **nie geprüft** wenn das matched — der Mail-Link mit `?t=...` schadet auch logged-in nichts.

---

## 4. Routing & Middleware-Reihenfolge

In `src/api/middlewares.ts`:

```ts
{
  matcher: "/store/orders/:id",
  methods: ["GET"],
  middlewares: [
    authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
    verifyOrderAccess,
  ],
}
```

Reihenfolge ist wichtig:
1. **`authenticate(...)`** populated `req.auth_context` — mit `allowUnauthenticated: true`, damit Gäste **nicht** mit 401 fliegen, sondern weiterlaufen.
2. **`verifyOrderAccess`** entscheidet dann: Customer-JWT matched `order.customer_id`? → durch. Sonst: Gast-Order + gültiger HMAC im Header? → durch. Sonst: `404 Not found`.

`404` (statt `403`) auch bei Email-Mismatch im Issue-Endpoint — vermeidet Probing-Oracle (existiert die Order? falsche Email? → kein Unterschied von außen).

**Token-Issue-Endpoint `POST /store/orders/:id/token` ist absichtlich NICHT in dieser Liste.** Der hat seinen eigenen Email-Check und ist der Bootstrap für den Gast-Flow.

---

## 5. Header statt Query/Body

Token wird via `x-kiji-order-token` gelesen, nicht als `?t=` Query-Param oder Body-Feld.

**Grund:** Medusa's Request-Validierung lehnt unbekannte Query/Body-Felder mit 400 ab. Ein Header ist der robuste Weg, beliebige Custom-Werte durchzubekommen ohne in jeden Validator-Schema einzugreifen.

Ausnahme: in der **Mail-URL** steht `?t=<HMAC>` — die geht an den Storefront, nicht direkt an die API. Der Storefront liest `t` und packt's in den Header.

---

## 6. Warum nur Gast-Orders?

```ts
if (order.customer?.has_account) {
  return res.status(404).json({ message: "Not found" })
}
```

In Medusa v2 hat **jede** Order einen `customer`-Record — Gäste bekommen einen Shadow-Customer mit `has_account=false`. Würde der Token-Pfad auch für echte Customer-Accounts gelten, könnte jemand mit nur **Email + Order-ID** eine fremde Bestellung lesen. Logged-in-Customers haben Passwort/JWT als zweiten Faktor — die müssen den authenticated Pfad nehmen.

Selbe Logik in der `verifyOrderAccess`-Middleware: HMAC-Pfad ist nur erlaubt wenn `!order.has_account`.

---

## 7. Konsequenzen / Edge-Cases

- **`JWT_SECRET` rotieren** invalidiert **alle** existierenden Mail-Links. Gäste, die ihre Mail später öffnen, kriegen 404. Akzeptabel, weil die Confirmation-Page eh nicht ewig live sein muss — aber wissen.
- **Kein Expiry** auf dem Token. Wer ihn einmal hat, hat ihn für immer (bis Secret-Rotation). Für eine reine Bestätigungs-Seite ohne sensible Aktionen ist das ok. Falls später z.B. Stornierungen darüber laufen sollen → Expiry mit reinhashen (`order-token:<id>:<exp>`) und `exp` separat mitgeben.
- **`POST /store/returns`** läuft auch über `verifyOrderAccess`. Token kommt im **Body** als `order_id` rein — die Middleware liest beides (`req.params.id ?? req.body.order_id ?? req.query.order_id`). Token bleibt im Header.

---

## 8. Production-Punkte

- [ ] **`JWT_SECRET` muss in Production gesetzt sein** (war in Medusa eh Pflicht — jetzt zusätzlich sicherheitskritisch für den Mail-Link).
- [ ] **`STOREFRONT_URL` muss korrekt sein**, sonst zeigt der Mail-Link auf `localhost:8000` (siehe `order-placed.ts`).
- [ ] **Storefront muss den Header setzen** — bei jedem Fetch zu `/store/orders/:id` (und Co.), wenn der User nicht eingeloggt ist. Sonst 404.
- [ ] **Bei Secret-Rotation** alte Mail-Links akzeptieren wir bewusst nicht weiter — falls ein Grace-Window gewünscht ist, müssen zwei Secrets parallel verifiziert werden (nicht implementiert).

---

## 9. Verwandt

- `docs/email-notifications.md` — die Confirmation-Mail die den Token in `order_url` rein-bäckt
- `docs/customizations.md` Section 3 — `medusa-config.ts` (kein Eingriff durch dieses Feature)
