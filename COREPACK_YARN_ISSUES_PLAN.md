## Corepack/Yarn Version Mismatch During CI/CD: Analysis and Fix Plan

Error observed in CI logs:

```
Presence of the "packageManager" field indicates that the project is meant to be used with Corepack ...
Corepack must currently be enabled by running corepack enable ...

Error This project's package.json defines "packageManager": "yarn@4.4.0". However the current global version of Yarn is 1.22.22.
```

### Root causes

- `package.json` declares `"packageManager": "yarn@4.4.0"`, which requires Corepack to provision Yarn 4.
- The environment running Yarn (Docker build stage and/or GitHub Action runner) has Yarn 1 globally (1.22.22) or no Corepack shim active, so commands resolve to Yarn 1.
- Inconsistent Corepack usage: `corepack enable` may be executed as `root` or in a different stage than where we run `yarn`, leading to fallback to the global Yarn 1 binary.

### Impact

- Yarn 1 vs Yarn 4 behavior diverges (lockfile format, linker defaults, PnP handling, scripts). This can break installs/builds, reintroduce PnP artifacts, and cause permission path leaks.

### Fix strategy (high-signal changes)

1) Dockerfile – loop-free recipe that fixes both version and permissions
   - Builder stage (as `medusa`):
     - Do not enable Corepack as root. Switch to `USER medusa` first.
     - Use Corepack to execute Yarn directly: `corepack yarn -v` (expect 4.4.0), then `corepack yarn install`.
       - This guarantees Yarn 4 runs under uid 1001 and uses `/app/.yarn/*` (no `/root/.yarn`).
     - Build with `npx medusa build`.
     - Optionally prune PnP files if present and not needed: remove `.pnp.*` in `.medusa/server` only after verifying node-modules resolution works.
   - Production stage:
     - Do not run any Yarn commands. Copy `node_modules` and built server from the builder with `--chown=medusa:nodejs`.
     - Prefer a start command that does not require Yarn (e.g., run the `medusa` binary directly). If you must keep Yarn, prepare Corepack as `medusa` and call `corepack yarn run start` instead of bare `yarn`.

2) GitHub Action – avoid invoking Yarn directly on the runner
   - Build via `docker/build-push-action` only; avoid steps that run `yarn` on the host runner unless you also run `corepack enable && corepack prepare yarn@4.4.0 --activate` first.
   - If any Action step must run `yarn` (tests or scripts), insert:
     - `corepack enable`
     - `corepack prepare yarn@4.4.0 --activate`

3) Single source of truth
   - Keep `"packageManager": "yarn@4.4.0"` in `package.json`.
   - Ensure `.yarnrc.yml` has `nodeLinker: node-modules` and avoid PnP when not intended.

### Potential pitfalls and mitigations

- Corepack as root vs as medusa
  - Avoid `corepack enable` as root; prefer invoking Yarn through Corepack as `medusa` (`corepack yarn ...`) so the downloaded distribution and caches belong to uid 1001.
  - If you require global activation, do `corepack prepare yarn@4.4.0 --activate` after switching to `USER medusa`.

- Multiple Yarn versions on PATH
  - The runner may have Yarn 1 globally; Corepack shims take precedence only after activation. Verify with `yarn -v` immediately after `corepack prepare`.

- Caching layers
  - Changing where/when Corepack is enabled affects Docker caching. Place `corepack` steps before `yarn install` and after copying only `package.json`, `yarn.lock`, `.yarnrc.yml` to maximize cache hits while ensuring correct Yarn 4 provisioning.

### Verification checklist

- [ ] In builder stage (as medusa), `corepack yarn -v` prints `4.4.0`.
- [ ] `corepack yarn install` succeeds using node-modules linker; no unexpected `.pnp.*` in build output, or they are safely pruned.
- [ ] Runtime stage does not execute Yarn (preferred). If it does, `corepack yarn -v` as medusa prints `4.4.0` and only production tasks run.
- [ ] GitHub Action has no steps running Yarn without Corepack preparation.

### Optional hardening

- Use `corepack disable` in runtime stage if you never invoke Yarn there to shrink surface area.
- Use `yarn set version 4.4.0` (managed by Corepack) only if you want to vendor a `.yarn/releases` file; otherwise stick to `packageManager` + Corepack prepare.


