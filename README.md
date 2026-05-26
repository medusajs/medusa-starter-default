# Medusa Backend (kiji)

Angepasstes [Medusa v2](https://medusajs.com) Commerce-Backend (`@medusajs/medusa` 2.15.3) mit eigenen Modulen, Workflows und API-Routen über den Vanilla-Starter hinaus.

Die wichtigsten Erweiterungen: ein **Preorder-Modul**, ein **E-Mail-Verifizierungs-Gate** für Account-Checkouts, ein **Resend-basiertes Mail-System** mit eigenen Templates und **HMAC-Token-Auth** für Gast-Order-Zugriff.

> Detaillierte Doku pro Feature liegt unter [`docs/`](docs/), das Production-Deployment unter [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Custom-Features im Überblick

### 1. Preorder-Modul
Verkauf von Varianten, die noch nicht auf Lager sind, mit automatischer Auslieferung ab einem Verfügbarkeitsdatum.

- **Datenmodell:** `preorder_variant` (pro Variante: `available_date`, `status` enabled/disabled) und `preorder` (pro Bestellposition: `order_id`, `item_id`, `status` pending/fulfilled/cancelled). Verlinkt mit `product_variant` und `order`.
- **Ablauf:** Admin aktiviert Preorder auf einer Variante → Kunde checkt über `complete-preorder` aus → `preorder`-Records (pending) entstehen → täglicher Job liefert ab Verfügbarkeitsdatum aus → `preorder.fulfilled`-Event löst Kunden-Mail aus.
- **Scheduled Job:** `daily-fulfill-preorders`, Cron `0 0 * * *` (täglich 00:00 UTC). Holt auch verpasste Preorders nach (keine untere Datumsgrenze) — kein Doppel-Fulfillment, da nur `status=pending` ausgeliefert wird.
- **Admin-UI:** Widget auf der Varianten-Detailseite (Preorder konfigurieren) und auf der Order-Detailseite (Preorder-Positionen anzeigen).
- **Manuell auslösen:** `npx medusa exec ./src/scripts/run-fulfill-preorders.ts`

→ Details: [`docs/preorder-module.md`](docs/preorder-module.md)

### 2. E-Mail-Verifizierung (Account-Gate)
Account-Kunden müssen ihre E-Mail bestätigen, bevor sie eine Bestellung abschließen können. **Gäste sind ausgenommen.**

- **Token:** HMAC-SHA256 über `customer_id:email:issuedAt`, signiert mit `JWT_SECRET`, **24 h gültig**, timing-safe geprüft.
- **Gate:** Middleware `requireEmailVerified` blockt `POST /store/carts/:id/complete` und `.../complete-preorder` mit `403`, wenn `customer.metadata.email_verified !== true` (nur bei `has_account: true`).
- **Verifizierungs-Mail:** wird beim `customer.created`-Event verschickt; Resend per API (mit 60-s-Throttle pro Kunde).
- **Admin-Override:** Widget auf der Kunden-Detailseite zum manuellen Setzen/Zurücksetzen des Flags und zum erneuten Versand.
- **Backfill (Bestandskunden):** `npx medusa exec ./src/scripts/backfill-email-verified.ts` markiert alle Account-Kunden als verifiziert (idempotent).

### 3. E-Mail-Benachrichtigungen (Resend)
Eigener Notification-Provider (`src/modules/resend`, implementiert `AbstractNotificationProviderService`), registriert unter dem `notification`-Modul. Handlebars-Templates unter `src/modules/resend/emails/`.

| Template | Auslöser (Event) |
|---|---|
| `welcome` | `customer.created` (neuer Account) |
| `email-verify` | `customer.created` / Resend-API |
| `order-placed` | `order.placed` |
| `shipment-created` | `shipment.created` (Carrier-Erkennung: DHL, DPD, Hermes, UPS, FedEx, GLS) |
| `password-reset` | `auth.password_reset` (Kunde vs. Admin via `actor_type`) |
| `preorder-fulfilled` | `preorder.fulfilled` (custom) |

→ Details: [`docs/email-notifications.md`](docs/email-notifications.md)

### 4. Order-Token-Auth (Gast-Zugriff)
HMAC-SHA256-Token (`signOrderToken(orderId)` mit `JWT_SECRET`), damit Gäste ihre eigene Bestellung lesen können, ohne Account.

- **Geschützte Routen:** `GET /store/orders/:id`, `GET /store/orders/:id/preorders`, `POST /store/returns`. Eingeloggte Kunden müssen Eigentümer sein; Gäste brauchen einen gültigen Token im Header `x-kiji-order-token`.
- **Token ausgeben:** `GET /store/orders/:id/token` (eigener E-Mail-Check, vom Gate ausgenommen).

→ Details: [`docs/order-token-auth.md`](docs/order-token-auth.md)

### 5. Sonstige Abweichungen vom Starter
`patch-package` (gepatchtes Admin-Dashboard), Custom-Docker-Setup (dev-only), Config-Eigenheiten.

→ Details: [`docs/customizations.md`](docs/customizations.md)

---

## API-Routen (Custom)

**Store**
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/store/carts/:id/complete-preorder` | Checkout inkl. Preorder-Record-Erstellung |
| GET | `/store/orders/:id/preorders` | Preorders einer Bestellung (token-/owner-geschützt) |
| GET | `/store/orders/:id/token` | Gast-Order-Token ausgeben |
| POST | `/store/auth/verify-email` | E-Mail per Token bestätigen (public) |
| POST | `/store/customers/me/resend-verification` | Verifizierungs-Mail erneut senden (auth, throttled) |
| POST | `/store/customers/email-exists` | Guest-Checkout-Preflight: ist E-Mail registriert? |

**Admin**
| Methode | Pfad | Zweck |
|---|---|---|
| POST / DELETE | `/admin/variants/:id/preorders` | Preorder pro Variante aktivieren / deaktivieren |
| GET | `/admin/orders/:id/preorders` | Preorders einer Bestellung |
| POST | `/admin/customers/:id/email-verified` | Verifizierungs-Flag setzen/zurücksetzen |
| POST | `/admin/customers/:id/resend-verification` | Verifizierungs-Mail senden (ohne Throttle) |

---

## Environment-Variablen

Basis aus [`.env.template`](.env.template) kopieren: `cp .env.template .env`

| Variable | Zweck |
|---|---|
| `DATABASE_URL` / `DB_NAME` | Postgres-Verbindung |
| `REDIS_URL` | Redis (Cache, Sessions, Event-Bus) |
| `JWT_SECRET` | **Pflicht** — signiert E-Mail-Verify- und Order-Tokens |
| `COOKIE_SECRET` | Session-Cookies |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | CORS-Origins |
| `RESEND_API_KEY` | Resend API-Key (Mail-Versand) |
| `RESEND_FROM_EMAIL` | Absenderadresse |
| `STOREFRONT_URL` | Basis-URL für Links in E-Mails (Default `http://localhost:8000`) |
| `MEDUSA_BACKEND_URL` | Backend-URL für Admin-Password-Reset-Links |
| `STRIPE_API_KEY` | Stripe-Zahlungen |
| `COMPANY_ADDRESS_LINE` / `COMPANY_CITY` | Footer-Angaben in E-Mails (optional) |

---

## Setup & Entwicklung

**Lokal**
```bash
yarn install            # postinstall führt patch-package aus
npx medusa db:migrate   # Migrationen (inkl. Preorder-Modul)
yarn seed               # optionale Demo-Daten
yarn dev                # Backend :9000, Admin :5173
```

**Docker (dev)**
```bash
yarn docker:up          # baut & startet medusa + postgres + redis
yarn docker:down
```
> Das Docker-Setup ist **dev-only** (`medusa develop`, Hot-Reload). Für Production siehe [`DEPLOYMENT.md`](DEPLOYMENT.md).

**Admin-User anlegen**
```bash
npx medusa user -e admin@example.com -p supersecret
```

**Tests**
```bash
yarn test:integration:http
yarn test:integration:modules
yarn test:unit
```

---

## Weiterführende Doku

- [`docs/preorder-module.md`](docs/preorder-module.md) — Preorder-Modul (Datenmodell, Workflows, Job)
- [`docs/email-notifications.md`](docs/email-notifications.md) — Resend-Integration & Templates
- [`docs/order-token-auth.md`](docs/order-token-auth.md) — Gast-Order-Token
- [`docs/customizations.md`](docs/customizations.md) — patch-package, Docker, Config-Eigenheiten
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Self-Hosted Production-Deployment

Allgemeine Medusa-Doku: <https://docs.medusajs.com>
