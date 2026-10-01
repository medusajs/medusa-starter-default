# kiji-backend (Medusa)

Medusa-Backend für den kiji-games-Shop (`@medusajs/*` **2.21.2**). Die Astro-Storefront `kiji-store-mjs` spricht mit diesem Backend; der Admin läuft unter `/app`.

Eigene Erweiterungen gegenüber dem Medusa-Starter:

| Feature | Kurz | Doku |
|---|---|---|
| Preorder-Modul | Varianten mit Verfügbarkeitsdatum vorbestellbar, täglicher Job erstellt die Fulfillments | [docs/preorder-module.md](docs/preorder-module.md) |
| E-Mail-Verifizierung | Account-Kunden können erst nach bestätigter E-Mail bestellen (Gäste nicht betroffen) | [docs/email-verification.md](docs/email-verification.md) |
| Gast-Order-Zugriff | HMAC-Token im Header `x-kiji-order-token` für Bestellseite und Retouren | [docs/order-token-auth.md](docs/order-token-auth.md) |
| E-Mails über Resend | Eigener Notification-Provider, Handlebars-Templates als TS-Module | [docs/email-notifications.md](docs/email-notifications.md) |
| Admin-Widgets | Preorder (Variante, Bestellung) und E-Mail-Verifizierung (Kunde), Texte DE/EN | siehe Feature-Doku |

Weitere Doku:

- [docs/storefront-contract.md](docs/storefront-contract.md): was die Storefront von diesem Backend erwartet
- [docs/upgrade-2.21.md](docs/upgrade-2.21.md): Upgrade 2.15 → 2.21 (Migrationen, Breaking Changes)
- [DEPLOYMENT.md](DEPLOYMENT.md): Production (Coolify, VPS), vollständige Referenz der Umgebungsvariablen

---

## Voraussetzungen

- **Node** `^20.19 || >=22.12` (empfohlen 22, z. B. `nvm install 22`)
- **Yarn 4.12** über corepack: `corepack enable`. Die Yarn-Version ist über `packageManager` in `package.json` und `yarnPath` in `.yarnrc.yml` festgelegt.
  Unter Ubuntu ist `yarn` manchmal das Paket `cmdtest` (ein anderes Programm). Dann `sudo apt remove cmdtest` und erneut `corepack enable`.
- **PostgreSQL** und **Redis**, lokal oder über Docker (siehe unten)

## Schnellstart mit Docker (empfohlen)

```bash
cp .env.template .env          # Werte prüfen; die Secrets im Template taugen nur für lokal
docker compose up --build      # postgres + redis + medusa (medusa develop, Hot Reload)
docker compose exec medusa npx medusa user -e admin@example.com -p '<passwort>'
```

- Admin: <http://localhost:9000/app>, Store-API: <http://localhost:9000/store/...>
- Port 5173 ist nur der Vite-HMR-Websocket des Admins, nicht der Admin selbst.
- Alle Ports sind nur an `127.0.0.1` gebunden.
- Der `medusa`-Container nutzt das Dockerfile-Target `dev`. Quellcode ist nach `/server` gemountet, `node_modules` liegt in einem **benannten Volume**. `docker/dev-entrypoint.sh` führt bei jedem Start `yarn install --immutable` und `medusa db:migrate` aus (abschaltbar mit `MEDUSA_RUN_MIGRATIONS=false`) und startet dann `medusa develop`. Nach Änderungen an Dependencies reicht deshalb ein Neustart des Containers.
- Ältere Setups hatten ein anonymes `node_modules`-Volume. Das liegt jetzt verwaist herum und kann mit `docker volume prune` entfernt werden.
- `DATABASE_URL`/`REDIS_URL` müssen die Service-Hosts `postgres`/`redis` verwenden, so wie in `.env.template` vorgegeben.

Nützlich:

```bash
docker compose logs -f medusa
docker compose down                     # stoppt, Daten-Volumes bleiben erhalten
docker exec medusa_postgres pg_dump -U postgres -d medusa-store -Fc > backup.dump              # DB-Backup
docker exec -i medusa_postgres pg_restore -U postgres -d medusa-store --clean --if-exists < backup.dump   # Restore
```

Wenn der Admin nach Umbenennungen `Failed to fetch dynamically imported module` meldet, den Vite-Cache löschen: `docker compose exec medusa rm -rf node_modules/.vite .medusa`, danach `docker compose restart medusa`.

## Schnellstart ohne Docker

```bash
corepack enable
yarn install
cp .env.template .env
# In .env: DATABASE_URL=postgres://postgres:postgres@localhost:5432/medusa-store
#          REDIS_URL=redis://localhost:6379   (leer = alles in-memory)
#          JWT_SECRET / COOKIE_SECRET (Template-Werte reichen lokal)
npx medusa db:migrate
yarn seed                      # optional: Demo-Daten
npx medusa user -e admin@example.com -p '<passwort>'
yarn dev                       # http://localhost:9000/app
```

Postgres und Redis kann man auch nur aus Docker nehmen: `docker compose up -d postgres redis`.

`JWT_SECRET` ist auch lokal nötig. Medusa selbst fällt in der Entwicklung zwar auf einen Default zurück, aber die Order- und Verify-Tokens (`src/utils/hmac.ts`) lesen `JWT_SECRET` direkt und werfen einen Fehler, wenn es fehlt.

Ohne `RESEND_API_KEY` werden Mails nicht versendet, sondern vom lokalen Notification-Provider nur geloggt. Ohne `STRIPE_API_KEY` wird der Stripe-Provider nicht registriert.

## Scripts

| Script | Zweck |
|---|---|
| `yarn dev` | `medusa develop`: Backend und Admin mit Hot Reload |
| `yarn build` | `medusa build`: Backend und Admin nach `.medusa/server` |
| `yarn start` | `medusa start`: gebaute App starten |
| `yarn lint` | `medusa lint` mit `@medusajs/eslint-plugin` (`eslint.config.ts`). `medusa develop` und `medusa build` linten vorher ebenfalls und **brechen bei Lint-Fehlern ab** (`--no-lint` überspringt das, `--fix` behebt Fehler automatisch) |
| `yarn typecheck` | `tsc` für Backend und Admin (`src/admin/tsconfig.json`) |
| `yarn test:unit` | Unit-Tests `src/**/__tests__/**/*.unit.spec.ts` |
| `yarn test:integration:http` | HTTP-Integrationstests `integration-tests/http/*.spec.ts` |
| `yarn test:integration:modules` | Modul-Tests `src/modules/*/__tests__/**` |

Die Integrationstests brauchen eine Postgres-Instanz, z. B. den Dev-Container:

```bash
DB_HOST=localhost DB_PORT=5432 DB_USERNAME=postgres DB_PASSWORD=postgres yarn test:integration:http
```

`DB_HOST` muss `localhost` sein, nicht `127.0.0.1`: `@medusajs/test-utils` schaltet sonst SSL ein und die Verbindung hängt. Die Tests legen eigene Datenbanken an und löschen sie wieder.
| `yarn seed` | Demo-Daten (`src/scripts/seed.ts`) |
| `yarn docker:up` / `yarn docker:down` | `docker compose up --build -d` / `docker compose down` |

Die Tests laden `.env.test`. Diese Datei hat Vorrang vor `.env` und schaltet Redis, Stripe und Resend ab. Sie brauchen ein Postgres auf `localhost:5432` (`postgres`/`postgres`, z. B. `docker compose up -d postgres`). Die CI (`.github/workflows/ci.yml`) führt lint, typecheck, build, Unit- und HTTP-Tests aus und baut das Production-Image.

Einmal-Scripts (`npx medusa exec <datei>`):

- `src/scripts/run-fulfill-preorders.ts`: Preorder-Job manuell auslösen
- `src/scripts/backfill-email-verified.ts`: alle bestehenden Account-Kunden als verifiziert markieren (idempotent)

## Projektstruktur

```
medusa-config.ts            Config inkl. Production-Validierung, Redis-Module, File/Stripe/Resend
src/
  admin/                    Widgets, Hooks, i18n (json/de.json, json/en.json, Keys unter "kiji.*")
  api/middlewares.ts        allowFields, E-Mail-Gate, Order-Zugriff, Validatoren
  api/admin/...             Preorder- und E-Mail-Verify-Routen (Admin)
  api/store/...             complete-preorder, Order-Token, Verify-Email, email-exists
  jobs/fulfill-preorders.ts Täglicher Preorder-Job
  links/                    preorder_variant ↔ product_variant, preorder → order
  modules/preorder/         Datenmodell, Service, Migrationen
  modules/resend/           Notification-Provider, emails/ (Renderer), emails/templates/ (HTML als TS)
  scripts/                  seed, run-fulfill-preorders, backfill-email-verified
  subscribers/              Mails (order/shipment/password/customer/preorder), order.canceled
  utils/                    HMAC-Tokens, URL-Builder, Resend-Cooldown
  workflows/                Preorder- und E-Mail-Verify-Workflows inkl. steps/
docker/                     Entrypoints (dev, production) und migrate.sh
Dockerfile                  Targets dev und production (Default)
docker-compose.yml          Lokale Entwicklung
docker-compose.prod.yml     Production auf einem VPS / Coolify (Docker Compose)
```

## Abweichungen vom Medusa-Starter

Neben den Features oben:

- **`medusa-config.ts`**: In Production bricht der Start bei fehlenden oder schwachen Werten ab (siehe [DEPLOYMENT.md](DEPLOYMENT.md#konfigurationsprüfung-beim-start)). Mit `REDIS_URL` werden Event-Bus, Workflow-Engine, Locking und Caching über Redis registriert. Datei-Uploads gehen lokal nach `static/` oder mit `S3_BUCKET` in einen S3-kompatiblen Speicher. `MEDUSA_WORKER_MODE`, `DATABASE_SSL` und `DISABLE_MEDUSA_ADMIN` werden ausgewertet. Die Vite-Config (`host 0.0.0.0`, HMR auf 5173) wirkt nur bei `medusa develop` in Docker.
- **Admin-SDK** (`src/admin/lib/sdk.ts`): `baseUrl` ist `VITE_BACKEND_URL` oder `/` (gleiche Origin, passend, solange der Admin vom Backend unter `/app` ausgeliefert wird).
- **`static/`** enthält nur Laufzeit-Uploads des lokalen File-Providers und ist in `.gitignore`.
- **Tooling**: Yarn 4 mit `nodeLinker: node-modules`, eigene CI (`ci.yml`), Dependabot mit gruppierten `@medusajs/*`-Updates (Majors manuell).
- `instrumentation.ts` ist der unveränderte, auskommentierte OpenTelemetry-Boilerplate des Starters.

## Repository

`xxp3nxx/medusa-starter-default` ist ein **öffentlicher** Fork auf GitHub. Secrets gehören nie ins Repo, auch nicht in die Doku. Forks öffentlicher Repos lassen sich nicht auf privat stellen; dafür bräuchte es ein neues privates Repository, z. B. per `git push --mirror` in ein neu angelegtes Repo.

Medusa-Doku: <https://docs.medusajs.com>
