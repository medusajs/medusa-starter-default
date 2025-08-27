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


