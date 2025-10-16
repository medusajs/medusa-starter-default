## Fixing EACCES: permission denied, mkdir '/app/.yarn'

Symptom:

```
internal error: EACCES: permission denied, mkdir '/app/.yarn'
```

This indicates the process running Yarn cannot create the Yarn cache directory under `/app/.yarn`.

### Root causes

- The current user lacks write permission on `/app` or `/app/.yarn`.
- `/app/.yarn` (or its parent) already exists but is owned by another user (e.g., created as root in a prior layer).
- Corepack/Yarn were run as root earlier, creating root-owned directories inside `/app`.

### Step-by-step fix (deterministic)

1) Ensure correct user/context for ownership operations
   - Any `chown` must be executed as `root`, not as `medusa`. If you need to set ownership, do it before switching to `USER medusa`.
   - Recommended order in the Dockerfile builder stage:
     - `WORKDIR /app`
     - `RUN chown medusa:nodejs /app` (as root)
     - Option A (root sets up dirs/ownership, then switch):
       - `RUN mkdir -p /app/.yarn/cache /app/.yarn/global && chown -R medusa:nodejs /app/.yarn`
       - `USER medusa`
     - Option B (no chown under medusa):
       - `USER medusa`
       - `RUN mkdir -p /app/.yarn/cache /app/.yarn/global` (do NOT chown here; medusa will own newly created dirs because `/app` is already owned by medusa)

2) Pre-create Yarn directories and point Yarn to them
   - Use Option A or B above depending on where you switch to `USER medusa`.
   - Ensure environment variables point to these paths:
     - `ENV YARN_CACHE_FOLDER=/app/.yarn/cache`
     - `ENV YARN_GLOBAL_FOLDER=/app/.yarn/global`

3) Invoke Yarn via Corepack as medusa
   - Use: `RUN corepack yarn -v && corepack yarn install`
   - Do not call `corepack enable` as root; if you need activation, do `corepack prepare yarn@4.4.0 --activate` after `USER medusa`.

4) Prevent runtime writes (optional but recommended)
   - Don’t run Yarn in the production stage. Copy `node_modules` from the builder; start the app without Yarn.

5) Clean up conflicting ownership, if present
   - If you still see EACCES, inspect and correct ownership:
     - `RUN find /app -maxdepth 2 -name ".yarn" -exec ls -ld {} +`
     - `RUN chown -R medusa:nodejs /app/.yarn`

### Extra checks

- Confirm current user: `RUN id -u && id -g` prints `1001` and `1001` (after `USER medusa`).
- Confirm app dir ownership: `RUN ls -ld /app` shows `medusa nodejs` (before creating `.yarn` as medusa) or verify after Option A chown.
- Confirm Yarn resolves under `/app/.yarn`: `RUN corepack yarn config get cacheFolder` should print `/app/.yarn/cache`.

### If bind mounts are involved (runtime)

- If `/app` is bind-mounted on the VPS, ensure the host path is writable by uid/gid 1001 or switch to a named volume. Otherwise, even a correct image will error at runtime.

### Why you saw "Operation not permitted" with chown

- You were already `USER medusa` when running `chown -R medusa:nodejs /app/.yarn`. Changing ownership requires root privileges, so it fails. Either move the chown before switching to `USER medusa` (Option A) or drop the chown entirely and let `medusa` create the directories (Option B).

### Zoomed-out remediation plan (avoids loops)

1) Hard reset any stale, root-owned Yarn dirs in build cache
   - In the builder stage, before switching to `USER medusa`, add a root step to neutralize stale cache:
     - `RUN rm -rf /app/.yarn && mkdir -p /app && chown medusa:nodejs /app`
   - This ensures no leftover `/app/.yarn` directories with wrong owners survive cached layers.

2) Relocate Yarn caches to $HOME to decouple from `/app`
   - Set and rely on medusa’s home directory for Yarn:
     - `ENV HOME=/home/medusa`
     - `ENV YARN_CACHE_FOLDER=/home/medusa/.yarn/cache`
     - `ENV YARN_GLOBAL_FOLDER=/home/medusa/.yarn/global`
   - Pre-create as root, then hand ownership once (still before switching user):
     - `RUN mkdir -p /home/medusa/.yarn/cache /home/medusa/.yarn/global && chown -R medusa:nodejs /home/medusa/.yarn`
   - After switching to medusa, Yarn writes under `$HOME/.yarn`, avoiding `/app` entirely.

3) Ensure Corepack/Yarn run only as medusa
   - After `USER medusa`, run:
     - `RUN corepack yarn -v`
     - `RUN corepack yarn config set cacheFolder $YARN_CACHE_FOLDER`
     - `RUN corepack yarn install`
   - Do not run `corepack enable/prepare` as root. If activation is needed, perform `corepack prepare yarn@4.4.0 --activate` after switching to medusa.

4) Eliminate runtime Yarn
   - Do not run Yarn in the production stage. Copy `node_modules` from the builder and start with a binary or `node` script. This removes another write point that could target `/app`.

5) If you absolutely must run Yarn in production
   - Mirror the same `$HOME` and `YARN_*` env for medusa in the production stage and pre-create `$HOME/.yarn` as root with correct ownership before switching users.

6) Clear CI builder cache if symptoms persist
   - If older cached layers still contain root-owned `/app/.yarn`, force a cache bust (e.g., touch `yarn.lock`, change a preceding `ENV`, or run Action with `--no-cache`).

### No-regression guardrails

- Ensure all Yarn commands execute after the `ENV YARN_*` lines and after `USER medusa`.
- Keep `nodeLinker: node-modules` in `.yarnrc.yml`; do not reintroduce PnP unintentionally.
- Avoid any `chown` after switching to `USER medusa`.
- In the Action’s remote script, do not bind-mount `/app` itself; if you mount subdirs (uploads/logs), ensure ownership is uid/gid 1001.


