# E-Mail-Verifizierung

Account-Kunden (`has_account = true`) können erst bestellen, wenn ihre E-Mail-Adresse bestätigt ist. Gäste und die Schatten-Kunden, die Medusa für Gastbestellungen anlegt, sind nicht betroffen.

## Flag

`customer.metadata.email_verified === true` (boolean). Gesetzt wird es nur von:

- `verify-customer-email` (Token-Link aus der Mail),
- `set-customer-email-verified` (Admin, auch zum Zurücksetzen auf `false`),
- `src/scripts/backfill-email-verified.ts` (einmalig für Bestandskunden).

Alle drei schicken nur das Flag als `metadata`; das Customer-Modul merged es serverseitig in die bestehenden Metadaten.

**Schutz gegen Selbstverifizierung**: Die Core-Routen `POST /store/customers` und `POST /store/customers/me` nehmen beliebige `metadata` an. Die globale Middleware `rejectEmailVerifiedMetadata` in `src/api/middlewares.ts` lehnt deshalb jeden `POST` unter `/store/customers` ab, der `metadata.email_verified` enthält (`400`, `type: "invalid_data"`).

## Gate

Die Middleware `requireEmailVerified` sitzt vor `POST /store/carts/:id/complete` und `POST /store/carts/:id/complete-preorder`. Sie lädt den Kunden **des Carts**. Ist er ein Account und nicht verifiziert, antwortet sie mit:

```json
403 { "type": "email_not_verified", "message": "Bitte bestätige deine E-Mail-Adresse, bevor du die Bestellung abschließt." }
```

## Token

`src/utils/email-verify-token.ts`: `<base64url(customer_id:email:issuedAtMs)>.<base64url(HMAC-SHA256)>`, signiert mit `JWT_SECRET` (`src/utils/hmac.ts`, Kontext `email-verify:`).

- 24 h gültig, bis zu 5 min Uhrzeitabweichung „in der Zukunft“ werden toleriert.
- An Kunden-ID **und** E-Mail gebunden (normalisiert: trim, lowercase). Nach einer Adressänderung ist der alte Link ungültig.
- E-Mails mit `:` werden korrekt geparst, das Format ist zu alten Links kompatibel.
- Vergleich in konstanter Zeit. Ein Wechsel von `JWT_SECRET` macht alle offenen Links ungültig.

Link: `${STOREFRONT_URL}/verify-email?customer_id=…&email=…&token=…` (optional `&redirect=…`).

## Versand

Der Workflow `sendEmailVerificationWorkflow` (`src/workflows/send-email-verification.ts`) lädt den Kunden, signiert einen frischen Token, baut die Notification `email-verify` und versendet sie über `sendNotificationsStep`. Unbekannter Kunde → 404, Gast → 400.

| Auslöser | Verhalten |
|---|---|
| `customer.created` (nur Accounts) | Welcome- und Verify-Mail unabhängig voneinander. Schlägt eine fehl, wird das geloggt, die andere geht trotzdem raus. Idempotency-Key `email-verify:signup:<id>`. Bereits verifizierte Kunden bekommen keine Verify-Mail |
| `POST /store/customers/me/resend-verification` | Nur eingeloggt. **Cooldown 60s pro Kunde** über das Locking-Modul (mit Redis instanzübergreifend), sonst `429` mit `Retry-After`. Schlägt der Versand fehl, wird der Cooldown freigegeben. Bereits Verifizierte bekommen `{ sent: true }`, aber keine Mail, damit die Antwort den Status nicht verrät |
| `POST /admin/customers/:id/resend-verification` | Ohne Cooldown, auch für bereits verifizierte Kunden |

## Endpunkte

| Methode | Pfad | Body → Antwort |
|---|---|---|
| POST | `/store/auth/verify-email` (öffentlich) | `{ customer_id, email, token }` → `{ verified: true }`. Ungültiger oder abgelaufener Token und geänderte E-Mail → 400, unbekannter Kunde → 404. Idempotent |
| POST | `/store/customers/me/resend-verification` | → `{ sent: true }` \| 429 |
| POST | `/admin/customers/:id/email-verified` | `{ verified: boolean }` → `{ customer_id, verified }` |
| POST | `/admin/customers/:id/resend-verification` | → `{ sent: true }` |

Admin-Widget `email-verify-widget.tsx` (Zone `customer.details.side.after`, nur bei Account-Kunden): zeigt den Status, markiert als bestätigt, nimmt die Bestätigung nach Rückfrage zurück und verschickt die Mail erneut. Texte unter `kiji.emailVerify.*`.

Bestandskunden nach Einführung des Gates freischalten: `npx medusa exec ./src/scripts/backfill-email-verified.ts` (idempotent).

## E-Mail-Existenz prüfen

`POST /store/customers/email-exists` `{ email }` → `{ exists: boolean }`. Die Storefront fragt das vor dem Gast-Checkout ab. Gibt jemand die E-Mail eines bestehenden Accounts ein, würde die Bestellung sonst an diesen Account gehängt, und die Gast-Bestellseite wäre über den Order-Token nicht mehr erreichbar ([order-token-auth.md](order-token-auth.md)). Die Storefront leitet in diesem Fall zum Login.

- Berücksichtigt nur `has_account = true`. Eine ungültige Adresse liefert `{ exists: false }`, keinen Fehler.
- **Trade-off**: Die Route erlaubt E-Mail-Enumeration, wie es im E-Commerce üblich ist. Deshalb am Reverse Proxy oder CDN ein Rate-Limit pro IP auf genau diesen Pfad setzen (Vorschlag: 10 Anfragen/min). Im Backend gibt es keins.
