## Deployment Risks and Actions (GitHub Action → VPS)

This document lists potential issues when deploying this repository to a VPS using the GitHub Action `.github/workflows/build-and-deploy.yml` and the image built by the `Dockerfile`. Each item includes why it matters and what to do.

Note: The Action creates `.env` and `docker-compose.yml` on the VPS only if they do not already exist. If your VPS directory already has a configured `.env`, it will be left intact.

### Critical blockers (must fix before first deploy)

- **Database URL is not provided in VPS .env**
  - Impact: Backend will crash at startup in production. `medusa-config.ts` requires a database URL; the VPS script currently creates `.env` with only `NODE_ENV`, `REDIS_URL`, and `FALLBACK_TO_SUPABASE=false`.
  - Action: On the VPS, set one of:
    - `DATABASE_URL` (preferred if using direct Postgres), or
    - `SUPABASE_DATABASE_URL` and set `FALLBACK_TO_SUPABASE=true`.
  - Also ensure `DATABASE_URL` includes SSL parameters if your provider requires it (e.g., `?sslmode=require`).
  - If your `.env` already includes the correct DB variables, no change is needed.

- **Missing required production env vars (CORS and secrets)**
  - Impact: Startup may fail or run with insecure defaults. Production check expects: `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`.
  - Action: Add these to the VPS `.env` (or pass via compose `environment:`):
    - `JWT_SECRET`, `COOKIE_SECRET`: long random strings.
    - `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`: comma-separated allowed origins.

- **Database migrations step (optional for your current Supabase DB)**
  - Impact: If your Supabase database already has the full, up-to-date schema and data, the app can run without executing migrations during deploy.
  - Action: You may skip running migrations now. Revisit this if you upgrade Medusa modules or introduce new migrations in this repo; then run `docker compose exec -T medusa medusa db:migrate`.

- **Puppeteer/Chromium runtime deps likely missing in the runtime image**
  - Impact: Invoice PDF generation (`src/workflows/invoicing/steps/generate-invoice-pdf.ts`) will fail at runtime on Alpine without required shared libs (e.g., `nss`, `freetype`, `harfbuzz`, fonts, `ca-certificates`).
  - Action: Either:
    - Install required packages in the runtime image (typical Alpine set: `chromium` or the set of `nss`, `freetype`, `harfbuzz`, `ttf-freefont`, `ca-certificates`, etc.), or
    - Use a Debian-based Node 20 image for production, or
    - Move PDF generation to a separate worker/image that has Chromium deps.
  - Note: The code launches Puppeteer with `--no-sandbox`; confirm it runs as non-root user (it does) and that this flag is acceptable in your environment.

- **File storage is not persisted on the VPS**
  - Impact: Generated invoice PDFs (via `Modules.FILE`) will be stored inside the container FS and lost across deploys. The GitHub Action’s VPS compose does not mount volumes.
  - Action: On the VPS compose file, mount persistent volumes for uploads/logs, e.g.:
    - `- /var/www/WT-medusa/uploads:/app/uploads`
    - `- /var/www/WT-medusa/logs:/app/logs`
  - Alternatively, configure an external file service (e.g., S3 via `@medusajs/file-s3`).

### High-priority risks

- **Production image may install devDependencies (image size/instability)**
  - Impact: In the production stage, the `Dockerfile` copies only `package.json` and `.yarnrc.yml` then runs `yarn install` without `NODE_ENV=production` or an explicit `--production` install. This can pull dev toolchain (jest/vite/etc.).
  - Action: Ensure production-only installs in the runtime stage (e.g., set `NODE_ENV=production` before `yarn install`, or use `yarn workspaces focus --production`, or provide a minimal package.json for runtime deps only). Keep as-is only if you accept larger images and longer installs.

- **VPS compose created by the Action omits volumes and memory flags**
  - Impact: No persistence for Redis or app logs/assets; Node heap limit not raised (if needed for workload).
  - Action: Extend compose on VPS to mount volumes and, if necessary, set `NODE_OPTIONS=--max-old-space-size=2048` for runtime.

- **Redis security**
  - Impact: Redis is exposed internally without auth. While only bridged in Docker, misconfiguration could lead to access from other containers or hosts.
  - Action: If needed, configure a password and update `REDIS_URL` to `redis://:password@redis:6379` and secure network boundaries. Persist Redis data if you require durability (`volumes:` mapping).

- **CORS misconfiguration**
  - Impact: Frontends may fail to call the API.
  - Action: Verify all public/admin/auth origins are set correctly in `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS`.

- **Healthcheck expectations**
  - Impact: The image has `HEALTHCHECK` for `GET /health`. If the route is missing or slow to initialize, container may flap.
  - Action: Confirm `/health` is available in production mode; adjust healthcheck timing if necessary.

- **Supabase vs direct Postgres environment parity**
  - Impact: There’s a dual path for DB connectivity (`DATABASE_URL` vs `SUPABASE_DATABASE_URL` with `FALLBACK_TO_SUPABASE`). Inconsistency can cause surprises.
  - Action: Pick one path and ensure variables align across `.env`, compose, and `medusa-config.ts`.

### GitHub Action specific considerations

- **Registry authentication on the VPS**
  - The Action runs `docker login ghcr.io` on the VPS using `${{ secrets.GITHUB_TOKEN }}`. Ensure the token allows pulling from `ghcr.io/<owner>/medusa-app:latest` during the job. This is generally fine as configured (`packages: write` in workflow permissions), but it’s job-scoped and ephemeral.

- **Compose file creation**
  - The Action writes a minimal `docker-compose.yml` on the VPS if it doesn’t exist. It lacks volumes, secrets, and migrations. Plan to manage and harden that file manually on the VPS (commit a production compose to the repo or provision it once on the server).

- **Optional migration step in the Action**
  - If/when schema changes are introduced, add a remote script step to run `medusa db:migrate` after `up -d`. For your current Supabase setup (already migrated), this is optional.

### Networking and ingress

- **Ports/firewall**
  - Ensure port `9000` is open on the VPS or use a reverse proxy (Nginx/Caddy/Traefik) to expose via 80/443. Update firewall rules accordingly.

- **Reverse proxy/SSL**
  - Terminate TLS at the proxy and forward to `medusa:9000`. Set appropriate headers and timeouts. Validate CORS against the public domain.

### Observability & operations

- **Logs**
  - Without volumes or centralized logging, logs are container-local. Add mounts or use a log driver (e.g., `gelf`, `loki`, or ship logs to a service).

- **Backups**
  - The Action no longer manages DB backups (and the DB service isn’t on the VPS if you use Supabase). Ensure a separate backup policy exists.

- **Resource limits**
  - Add CPU/memory limits in compose if needed. For Puppeteer workloads, ensure enough memory/headroom.

### Concrete step-by-step hardening plan

1) On the VPS, update `/var/www/WT-medusa/.env` to include at minimum:
   - `DATABASE_URL` (or `SUPABASE_DATABASE_URL` and `FALLBACK_TO_SUPABASE=true`)
   - `JWT_SECRET`, `COOKIE_SECRET`
   - `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`
   - Optional: `NODE_OPTIONS=--max-old-space-size=2048`

2) Replace the auto-created `docker-compose.yml` on the VPS with a hardened version:
   - Add volumes for persistence: `/var/www/WT-medusa/uploads:/app/uploads`, `/var/www/WT-medusa/logs:/app/logs`.
   - If using Redis persistence: `/var/www/WT-medusa/redis:/data` and a password if required.
   - Add environment variables or `env_file: .env` for all production settings.

3) Add a migrations step to the Action’s remote script:
   - After `docker compose up -d`, run `docker compose exec -T medusa medusa db:migrate`.

4) Address Puppeteer runtime:
   - Either switch to a Debian-based runtime image or install required Alpine libs in the runtime stage; verify PDF generation on the VPS.

5) Optimize the runtime image install:
   - Ensure only production deps are installed in the runtime stage to reduce size/failure surface.

6) Put a reverse proxy in front (optional but recommended):
   - Serve HTTPS (Let’s Encrypt) and proxy to `medusa:9000`. Align CORS to the public domains.

7) Monitoring and logs:
   - Persist logs or ship to a centralized system; set up alerts on container restarts/healthcheck failures.

### Quick verification checklist (post-deploy)

- [ ] Container is healthy (`docker compose ps` shows `healthy`).
- [ ] `GET /health` responds 200.
- [ ] Schema is compatible with current code (no pending migrations for your setup).
- [ ] Create an invoice and generate a PDF successfully (validates Puppeteer).
- [ ] Files persist across container restarts.
- [ ] CORS works from your frontend domains.
- [ ] Logs visible and persisted.


