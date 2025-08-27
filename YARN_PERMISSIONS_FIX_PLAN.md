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

1) Ensure user before any Yarn invocation
   - Switch to the final user first in the Dockerfile:
     - `USER medusa`
     - `WORKDIR /app`

2) Pre-create Yarn directories with correct ownership
   - Before running Yarn, add:
     - `RUN mkdir -p /app/.yarn/cache /app/.yarn/global && chown -R medusa:nodejs /app/.yarn`
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

- Confirm current user: `RUN id -u && id -g` prints `1001` and `1001`.
- Confirm app dir ownership: `RUN ls -ld /app` shows `medusa nodejs`.
- Confirm Yarn resolves under `/app/.yarn`: `RUN corepack yarn config get cacheFolder` should print `/app/.yarn/cache`.

### If bind mounts are involved (runtime)

- If `/app` is bind-mounted on the VPS, ensure the host path is writable by uid/gid 1001 or switch to a named volume. Otherwise, even a correct image will error at runtime.


