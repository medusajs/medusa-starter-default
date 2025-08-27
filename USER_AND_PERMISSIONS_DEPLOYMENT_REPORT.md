## User, Permissions, and Install Strategy Report (Docker build/runtime)

Audience: Senior software engineer familiar with Docker multi-stage builds, Node runtime, and CI/CD.

### Executive summary

- Root cause of intermittently broken builds/runs: mixed ownership and user switching between `root` and a non-root `medusa` user across stages, combined with installing dependencies in different contexts. This yields root-owned artifacts under `/app` and runtime writes by UID/GID 1001, causing EACCES and cache/path anomalies.
- Recommendation: Install and build entirely under the same non-root user in the build stage; copy the built server and `node_modules` into the runtime image with correct ownership; avoid any installs in runtime. This eliminates cross-user state and reduces drift.

### Failure analysis: EACCES with Corepack/Yarn and PnP artifacts

Error observed during image build/push:

```
! Corepack is about to download .../yarn.js
Error: Required package exists but could not be accessed (EACCES: permission denied, access '/root/.yarn/berry/cache/@medusajs-cli-npm-2.8.6-.../node_modules/@medusajs/cli/')
Missing package: @medusajs/cli@virtual:...
Expected package location: /app/.medusa/server/.yarn/__virtual__/@medusajs-cli-virtual-.../4/root/.yarn/berry/cache/.../node_modules/@medusajs/cli/
```

Likely causes:
- Corepack/Yarn enabled as `root` creates Yarn distribution/cache under `/root/.yarn/berry/*`. PnP/virtual paths inside `.medusa/server` reference those root-owned locations.
- `.medusa/server` contains PnP artifacts (`.pnp.cjs`, `.yarn/__virtual__`) despite `nodeLinker: node-modules`; the PnP loader then attempts to resolve via the root-only cache.
- Runtime stage runs `yarn install` again as `medusa`, reintroducing resolution drift and PnP/virtual refs.

Mitigations:
- Avoid any runtime install; copy `node_modules` from builder and run solely via node-modules linker.
- Enable Corepack after switching to `USER medusa` (or skip in runtime) so Yarn caches live under `/app/.yarn`, not `/root/.yarn`.
- Ensure `.pnp.*` does not remain in `.medusa/server` if the runtime relies on `node_modules`. If present, verify module resolution, or remove the PnP files post-build only when safe.
- Keep `yarn.lock` in the builder and never re-resolve in runtime.

### CI/CD interplay (GitHub Action + Dockerfile + VPS)

- GitHub Action (`.github/workflows/build-and-deploy.yml`)
  - Builds the image with target `production` and pushes to GHCR.
  - SSHes to the VPS as `root`, creates `.env`/`docker-compose.yml` if missing, pulls latest image, and runs `docker compose up -d`.
  - Since the container runs as `medusa` (uid 1001) per Dockerfile, any host bind-mounts must be writable by uid 1001. The Action currently does not pre-create or `chown` host paths.

- Dockerfile
  - Build stage runs as `medusa` and installs deps; runtime stage also runs `yarn install` as `medusa` (a source of permission/drift issues). Node modules are not copied from the builder.
  - All `COPY` operations that land in runtime must use `--chown=medusa:nodejs` to prevent root-owned artifacts.

- VPS compose
  - The Action’s on-server compose (if auto-created) lacks bind-mounts and any ownership prep. If you add mounts (uploads/logs), ensure host dirs are owned by uid/gid 1001, or switch to named volumes.

### Current state (inferred)

- Multi-stage Dockerfile (Node 20 Alpine). A `medusa` user (uid 1001, group `nodejs`) is created in both stages.
- Build stage switches to `USER medusa` and performs `yarn install` and `npx medusa build`, storing Yarn caches under `/app/.yarn/*`.
- Runtime stage copies built output and some config, then performs another `yarn install` as `medusa` (or in some variants as `root`).
- Mounted host volumes (uploads/logs) may be owned by host root and not writable by UID 1001 in container.

### Problems observed with user switching

- Ownership mismatches: artifacts created as `root` become unreadable/unwritable by `medusa` (and vice versa). This typically impacts `node_modules`, `.yarn/*` cache files, and any generated state.
- Yarn/PnP linkers: with Yarn 4, caches and install state paths are sensitive to the user and directory. Switching users can create divergent cache folders and permission errors (e.g., EACCES on cache writes, symlink/linker inconsistencies).
- Runtime install risk: running `yarn install` at runtime re-resolves the dependency tree (unless fully locked), increases surface for failures (network, registry auth, native build tools), and may attempt to write to paths that are not owned by the runtime user.

### Recommendations mapped to repo files

- Dockerfile
  - Preferred: eliminate runtime `yarn install`; copy `node_modules` from builder to production stage using `--chown=medusa:nodejs`.
  - Keep `USER medusa` through build and runtime; ensure all `COPY` lines targeting runtime use `--chown=medusa:nodejs`.
  - If you must keep a runtime install, ensure all Yarn env dirs point to `/app` and are owned by `medusa`; avoid writes to global system paths.
  - Run `corepack enable` after `USER medusa` (builder and runtime) to avoid `/root/.yarn` ownership; or omit in runtime when Yarn is unused.
  - Validate that `.medusa/server` has no `.pnp.*` when relying on `node_modules`; otherwise adjust build to not emit PnP artifacts or prune them post-build after verification.

- .github/workflows/build-and-deploy.yml
  - After `cd /var/www/WT-medusa`, pre-create host directories for any bind mounts and set ownership:
    - `mkdir -p uploads logs` then `chown -R 1001:1001 uploads logs`.
  - If you decide to persist Redis data, `mkdir -p redis` and `chown -R 1001:1001 redis` (or use a named volume).
  - Keep the container user as defined in the Dockerfile; do not override with a different `user:` in compose unless you also align host permissions.

- VPS docker-compose.yml
  - If using bind mounts, ensure the mounted paths are writable by uid 1001. Alternatively, prefer named volumes to decouple from host ownership.

### Recommended approach (preferred)

Install once in the build stage as non-root and ship only the built artifacts.

1) Build stage
   - Create `medusa` early; set `WORKDIR /app`; switch to `USER medusa`.
   - Copy `package.json`, `yarn.lock`, `.yarnrc.yml` and set Yarn env to use `/app/.yarn/*`.
   - `yarn install` (ideally honors lockfile and node-modules linker). This is where any native module compilation happens.
   - Copy source and run `npx medusa build` (or equivalent) as `medusa`.
   - Ensure both `.medusa/server` and `node_modules` are present and owned by `medusa:nodejs` by the end of the stage.

2) Runtime stage
   - Do not run `yarn install` again. Copy `node_modules`, built server, and any needed runtime config from builder using `--chown=medusa:nodejs`.
   - Keep `USER medusa` for the container entrypoint.
   - Mount host volumes that require writes (e.g., `/app/uploads`, `/app/logs`), and ensure host paths are writable by uid/gid 1001, or use named Docker volumes and set permissions once.

Benefits
- Consistent ownership across all runtime artifacts.
- No post-install scripts or network dependency in runtime image.
- Deterministic dependency tree (lockfile respected in build stage), smaller blast radius.

### Alternative approach (acceptable fallback)

Install as root in runtime, then fix ownership and drop privileges.

1) Runtime stage performs `yarn install` as `root` (ideally with `NODE_ENV=production` and lockfile present).
2) `chown -R medusa:nodejs /app` to hand over ownership of all installed artifacts.
3) Switch to `USER medusa` for execution.

Trade-offs
- Simpler copy surface (no need to copy `node_modules` from builder).
- Larger image and longer runtime build; greater risk at deploy time (network, registry, native compilers). Requires careful chowning; easy to miss new paths.

### Anti-patterns to avoid

- Running a partial install as `root` and later writing caches as `medusa` (or the reverse). Leads to cache/lock contention and EACCES.
- Copying only built server but not `node_modules` when runtime cannot install (air-gapped, no compilers). Results in missing modules at runtime.
- Mounting host volumes owned by root without adjusting permissions, expecting a non-root container user to write to them.

### Additional considerations

Puppeteer/Chromium
- Puppeteer downloads or bundles Chromium; its binaries and cache directories need consistent ownership.
- If Chromium is fetched during `yarn install`, do that in the build stage as `medusa`. Then copy the resulting `node_modules` to runtime.
- Alpine needs extra system libs (e.g., `nss`, `freetype`, `harfbuzz`, fonts, `ca-certificates`). Install these in the runtime stage. Keep `--no-sandbox` only if you understand the security trade-offs; running as non-root helps.

Lockfile and determinism
- Always include `yarn.lock` for the build stage; avoid re-resolving deps in runtime.
- Consider `NODE_ENV=production` and a minimized runtime package footprint (or a minimal `package.json` in build output) if you must install anything in runtime.

Corepack/Yarn placement
- Enabling Corepack can happen as root; actual Yarn commands should run as the final user (`medusa`) to ensure caches and global installs are created with correct ownership.

Volumes and ownership
- For host bind mounts, set directory ownership on the host to uid/gid 1001 (or use ACLs) so the non-root container user can write.
- Prefer named volumes for persistence (Docker-managed), then adjust permissions once in an init step if necessary.

GitHub Action deployment nuances
- The SSH step runs commands as `root` on the VPS. Use this to create/chown target directories for bind mounts before `docker compose up -d`.
- If the Action ever introduces a `user:` override in compose, it must match the image’s runtime user (1001) or you’ll reintroduce permission mismatches.

### Actionable checklist

- Adopt single-user installs: install and build as `medusa` in the build stage; don’t install in runtime.
- Copy `node_modules` and built server to runtime with `--chown=medusa:nodejs`.
- Keep `USER medusa` for the runtime container.
- Ensure runtime system packages for Chromium are present if PDFs are generated.
- Ensure host-mounted directories are writable by uid/gid 1001 or use named volumes.
- If you cannot avoid runtime installs, perform them as `root`, then `chown -R medusa:nodejs /app` before switching users.
 - In the Action’s remote script, pre-create/chown VPS bind-mount directories (uploads/logs/redis if used) to 1001:1001 before `up -d`.

### Why this is the best fit here

- The repository uses Yarn 4 with explicit node-modules linker and custom Yarn cache locations; these are designed to work under `/app` for a non-root user and avoid PnP. Keeping all install/build steps under the same non-root user maintains cache consistency and prevents permission drift.
- Moving all installation to build time also isolates Chromium provisioning to a controlled environment, avoiding runtime surprises.


