# Upgrade Medusa 2.15.3 → 2.21.2

Diese Hinweise gelten für jede Umgebung (lokal, Production), deren Datenbank noch auf 2.15 läuft.

## Ablauf

1. **Datenbank sichern.** Die 2.21-Migrationen enthalten eine nicht umkehrbare Datenmigration der Produkt-Optionen, ein Rollback geht nur über ein Backup.
   ```bash
   docker exec medusa_postgres pg_dump -U postgres -d medusa-store -Fc > backup.dump   # lokal (Dev-Compose)
   ```
   Production: siehe [DEPLOYMENT.md → Betrieb](../DEPLOYMENT.md#betrieb).
2. **Node und Yarn**: Node `^20.19 || >=22.12`, Yarn 4.12 über `corepack enable`, dann `yarn install`.
3. **Migrationen mit einmaligem Link-Sync.** Die Link-Tabelle `product_variant_inventory_item` ändert `required_quantity` von integer auf numeric. Im sicheren Modus wird diese Änderung nicht ausgeführt, deshalb einmalig alle Link-Änderungen erlauben:
   - Container (Dev oder Production): für **einen** Start `MEDUSA_MIGRATE_LINKS=all` setzen, danach wieder `safe`
   - ohne Docker: `npx medusa db:migrate --execute-all-links`, danach normal `npx medusa db:migrate`

   Dabei läuft auch die Preorder-Migration `Migration20261001061142`. Sie setzt doppelte `(order_id, item_id)`-Preorders auf soft-deleted (die älteste bleibt) und legt den Unique-Index an.
4. **Stripe in der Region aktivieren** (seit 2.20 nötig): Admin → Settings → Regions → Payment Providers.
5. **Env prüfen**: `JWT_SECRET`/`COOKIE_SECRET` mit mindestens 32 zufälligen Zeichen; `supersecret` lehnt `medusa-config.ts` in Production ab. Neu ist `AUTH_MFA_ENCRYPTION_KEY`, falls Admin-MFA genutzt wird. Die vollständige Liste steht in [DEPLOYMENT.md](../DEPLOYMENT.md#umgebungsvariablen).
6. Lokal mit Docker: Das alte anonyme `node_modules`-Volume ist überflüssig (`docker volume prune`).

## Breaking Changes und was im Projekt angepasst wurde

| Änderung in Medusa | Auswirkung / Anpassung hier |
|---|---|
| **Strikte Field-Allowlists der Store-Routen (2.21)**: Felder, die nicht wörtlich in der Allowlist stehen, werden stillschweigend aus der Antwort entfernt | `allowFields` als globale Middleware in `src/api/middlewares.ts`. Die freigeschalteten Felder stehen im [Storefront-Vertrag](storefront-contract.md#zusätzlich-freigeschaltete-felder). Fordert die Storefront neue Felder an, müssen sie dort ergänzt werden |
| Stripe muss in der Region aktiviert sein (2.20) | Schritt 4 oben |
| Admin-Widgets: Platzierung über den **Layout Composer** (2.17.2) | Die Widgets registrieren weiterhin ihre Zonen (`*.details.side.after`); die Anordnung wird im Admin über den Layout Composer festgelegt |
| Passwort-Reset-Tokens sind **einmalig verwendbar** | Ein Reset-Link funktioniert nur einmal; die Storefront sollte bei einem verbrauchten Token auf „neuen Link anfordern“ verweisen |
| MFA für Admin-User | `AUTH_MFA_ENCRYPTION_KEY` (von Medusa direkt aus der Umgebung gelesen) |
| `*` auf `order` in Query berechnet seit 2.19 die Totals | Eigene Workflows fordern explizite Felder an (`complete-cart-preorder`) |
| `medusa develop`/`build` linten mit `@medusajs/eslint-plugin` und brechen bei Fehlern ab | `yarn lint`; Code an die Regeln angepasst (benannte `when`-Blöcke, `MedusaError`, Framework-Imports) |

## Mit dem Upgrade entfernt

- `patch-package` samt Dashboard-Patch (`customer_group_ids` im Preislisten-Formular). Der Admin ist wieder unverändert.
- `start.sh`, `.npmrc`, `package-lock.json`, die Upstream-Workflows unter `.github/workflows/` (ersetzt durch `ci.yml`), die Platzhalter-Routen `/admin/custom` und `/store/custom` sowie `src/scripts/test-welcome.ts`.
- `.html`-Mail-Templates. Sie sind jetzt TS-Module unter `src/modules/resend/emails/templates/`, weil `medusa build` lose `.html`-Dateien nicht nach `.medusa/server` kopiert hat.
- Committete Uploads in `static/`, das Verzeichnis ist jetzt gitignored.
