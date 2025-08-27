## Medusa Docker + CI/CD Redesign (Aligned with Medusa Docs)

References: [Medusa Build](https://docs.medusajs.com/learn/build), [Medusa Deployment Overview](https://docs.medusajs.com/learn/deployment)

Goal: Produce a deterministic Docker image for a Medusa v2 app with no Yarn/Corepack or permission loops, and a GitHub Action that builds, pushes, and deploys reliably.

### Principles

- Build once, run anywhere: all compilation happens in builder stage; runtime is a thin image.
- Single user across build and runtime: `medusa` (uid 1001); never install as root.
- No Yarn in runtime: copy `node_modules` from builder; entrypoint uses node/CLI.
- Corepack/Yarn run only as `medusa` in builder.
- No writes to `/app/.yarn`: Yarn caches under `$HOME/.yarn` for `medusa`.
- Avoid PnP in runtime; rely on node-modules linker.

### Dockerfile (proposed)

High-level steps:
1) Base: `node:20-alpine` for both stages.
2) Create `medusa` user and set `WORKDIR /app`.
3) Configure Yarn under `$HOME` to avoid `/app/.yarn`.
4) Copy package manager files; run Yarn via Corepack as `medusa`.
5) Copy source; run `npx medusa build` per docs.
6) Production stage: copy `.medusa/server` and `node_modules`; do not run Yarn.
7) Start using medusa CLI or the compiled entrypoint, not Yarn.

Notes:
- Keep `.yarnrc.yml` with `nodeLinker: node-modules`.
- If `.medusa/server` produces `.pnp.*`, remove them only after verifying node-modules resolution works.
- Install runtime OS deps (e.g., `dumb-init`, `curl`, Chromium deps if PDFs).

### docker-compose (VPS)

- Services: `medusa` and `redis`. Database is external (Supabase or Postgres URL).
- Mount only app data (uploads/logs); never mount `/app`.
- Pre-create host dirs with uid 1001 (in deploy script) or use named volumes.
- Environment from `.env` file; include DB URL(s), CORS, secrets, Redis URL.
- No build on VPS; pull image from registry.

### GitHub Action (Build & Deploy)

Build job:
- Checkout, login to GHCR.
- Build with `docker/build-push-action`, target `production`, push tags.

Deploy job:
- SSH to VPS; `cd` into app dir.
- Ensure `.env` exists (do not overwrite if present).
- Ensure `docker-compose.yml` exists; create hardened default if missing (includes volumes, env_file, depends_on, healthcheck).
- `docker login ghcr.io` with job token.
- `docker pull` the image tag.
- `mkdir -p uploads logs && chown -R 1001:1001 uploads logs`.
- `docker compose up -d` to recreate.
- Optional: run migrations only when schema changes are introduced.

### Environment checklist

- Required in production: `DATABASE_URL` (or `SUPABASE_DATABASE_URL` with `FALLBACK_TO_SUPABASE=true`), `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `REDIS_URL`.
- Optional: `NODE_OPTIONS=--max-old-space-size=2048`.
- Avoid putting Yarn envs in runtime.

### Why this avoids prior loops

- Yarn never targets `/app/.yarn`; it uses `$HOME/.yarn` owned by `medusa`.
- All Yarn/Corepack commands occur as `medusa` in builder; no root-owned caches.
- Runtime image doesn’t run Yarn; no permission-sensitive writes occur.
- Copies `node_modules` from builder; avoids re-resolution and PnP reintroduction.
- Compose on VPS doesn’t mount `/app`; no ownership drift.

### Validation steps

1) In builder, confirm:
   - `id -u` is `1001` and `corepack yarn -v` is `4.4.0`.
   - `corepack yarn install` succeeds.
   - `npx medusa build` succeeds; server runs from `.medusa/server` with node-modules.
2) In runtime, confirm:
   - No `yarn` is executed.
   - Container starts with `dumb-init` and serves `/health`.
3) On VPS, confirm:
   - Volumes writable by uid 1001; `/health` returns 200; PDFs generate if applicable.


