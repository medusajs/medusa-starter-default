# E-Mail-Benachrichtigungen (Resend)

Eigener Notification-Provider für den Kanal `email` (`src/modules/resend`). Die Mails werden mit Handlebars aus Templates gerendert und über die Resend-API verschickt.

## Konfiguration

In `medusa-config.ts` wird der Provider nur registriert, wenn `RESEND_API_KEY` gesetzt ist (Optionen: `api_key`, `from` = `RESEND_FROM_EMAIL`). In Production sind beide Pflicht.

- **Ohne Key** (lokal, Tests) übernimmt `@medusajs/medusa/notification-local` den Kanal `email` und **loggt** die Mails nur. Subscriber laufen trotzdem fehlerfrei durch.
- Der lokale Provider bedient immer auch den Admin-Kanal `feed`.
- Linkbasis ist `STOREFRONT_URL` bzw. `MEDUSA_BACKEND_URL` (`src/utils/urls.ts`). In Production wirft der URL-Builder einen Fehler, wenn sie fehlen. Footer-Daten kommen aus `COMPANY_ADDRESS_LINE` und `COMPANY_CITY`.

## Mails

| Template | Event / Auslöser | Subscriber / Workflow | Idempotency-Key |
|---|---|---|---|
| `order-placed` | `order.placed` | `subscribers/order-placed.ts` | `order-placed:<order_id>` |
| `shipment-created` | `shipment.created` (nicht bei `no_notification`) | `subscribers/shipment-created.ts` | `shipment:<fulfillment_id>` |
| `preorder-fulfilled` | `preorder.fulfilled` (Preorder-Job) | `subscribers/preorder-fulfilled.ts` | – |
| `password-reset` | `auth.password_reset` (Kunde und Admin) | `subscribers/password-reset.ts` | – (jede Anfrage soll eine Mail auslösen) |
| `welcome` | `customer.created`, nur Accounts | `subscribers/customer-created.ts` | `welcome:<customer_id>` |
| `email-verify` | `customer.created`, Resend-Routen | `sendEmailVerificationWorkflow` | nur bei Signup ([email-verification.md](email-verification.md)) |

Mit Idempotency-Key verschickt das Notification-Modul eine Mail bei wiederholt zugestelltem Event nicht doppelt.

Inhalte:

- **order-placed**: Positionen mit Hinweis „Vorbestellung · ab <Datum>“, Kostenaufstellung, Lieferadresse, Zahlart, Link `/order/<id>?t=<token>`.
- **shipment-created**: Sendungsnummern und Tracking-Links, Positionen des Fulfillments. Die Bestellung wird über den Link Fulfillment ↔ Order geladen. Tracking-URL ist `label.tracking_url`, wenn es eine `http(s)`-URL ist, sonst ein DHL-Link. Den Carrier (DHL, DPD, Hermes, UPS, FedEx, GLS) erkennt der Renderer an `provider_id` bzw. URL.
- **preorder-fulfilled**: nur die Positionen der erfüllten `preorder_variant`.
- **password-reset**: Kunden → `${STOREFRONT_URL}/reset-password?token=…`, Admin-User → `${MEDUSA_BACKEND_URL}/app/reset-password?token=…&email=…`. URL und Token werden nie geloggt.

## Aufbau

```
src/modules/resend/
  index.ts                 ModuleProvider für Modules.NOTIFICATION
  service.ts               Provider "notification-resend": Template-Registry, send()
  emails/_shared.ts        renderTemplate (isolierte Handlebars-Instanz, Cache), URLs, Datum, Adresse, Firma
  emails/<name>.ts         Renderer: baut den Kontext, liefert { subject, html }
  emails/templates/<name>.ts  HTML-Template als TS-Modul (default export string)
```

Die Templates sind TS-Module statt `.html`-Dateien, damit `medusa build` sie nach `.medusa/server` mitnimmt. Beim Bearbeiten im Template-String keine Backticks, kein `${` und keine Backslashes verwenden. `{{x}}` escaped HTML. `{{{x}}}` nie für Nutzereingaben verwenden.

`send()` wirft einen `MedusaError`, wenn das Template unbekannt ist oder Resend einen Fehler meldet. Das Notification-Modul markiert die Notification dann als fehlgeschlagen, statt einen Erfolg zu verbuchen. Die `data` einer Notification werden in der DB gespeichert, deshalb geben die Subscriber nur die Felder weiter, die das Template braucht.

## Beträge (order-placed)

- Totals sind berechnete Felder. Query liefert sie nur, wenn sie **explizit** angefordert werden; `*` liefert nur DB-Spalten. Der Subscriber listet deshalb jedes Total einzeln auf.
- Beträge kommen als Zahl, String oder (serialisierte) BigNumber; `toNumber` in `emails/order-placed.ts` deckt alle Fälle ab.
- Dargestellt wird brutto: Zwischensumme `original_item_total`, Versand `shipping_total`, Gesamt `total`, enthaltene Steuer `tax_total` (nur zur Info). Rabatte werden aus den Adjustments der Positionen und Versandmethoden pro Promotion bzw. Code summiert und auf das Brutto-`discount_total` skaliert, damit die Zeilen aufgehen (wie in der Kostenaufstellung der Storefront).
- Format `de-DE`, Währung aus der Bestellung.

## Neues Template

1. `emails/templates/<name>.ts` (HTML als default export) und `emails/<name>.ts` (Renderer mit `renderTemplate`) anlegen. Vorlage für einfache Fälle: `welcome.ts`.
2. In `service.ts` in `templates` eintragen.
3. Subscriber oder Workflow ruft `createNotifications({ to, channel: "email", template: "<name>", data, idempotency_key? })` auf.

## Production

- Absender-Domain bei Resend verifizieren (SPF, DKIM, DMARC). Ohne Verifizierung stellt Resend nur an die eigene Account-Adresse zu, alle anderen Sends schlagen fehl.
- `RESEND_FROM_EMAIL` auf die verifizierte Domain setzen und für Production einen eigenen API-Key verwenden.
- API-Keys nie in Repo oder Doku schreiben; das Repository ist öffentlich.

## Testen

- Lokal ohne `RESEND_API_KEY` erscheinen alle Mails im Log (`docker compose logs -f medusa`).
- Mit einem Resend-Test-Key erscheinen die Sends im Resend-Dashboard unter „Logs“.
- Preorder-Mail: `available_date` einer Preorder-Variante mit offenen Preorders per SQL in die Vergangenheit setzen, dann `npx medusa exec ./src/scripts/run-fulfill-preorders.ts` ausführen.
