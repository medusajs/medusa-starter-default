# Medusa v2 backend (kiji-games) - multi-stage image
#
# Targets:
#   production (default) - compiled app from `medusa build`, prod deps only,
#                           runs `medusa start` as non-root user `node`.
#                           docker build -t kiji-backend .
#   dev                  - all deps, runs `medusa develop` (used by docker-compose.yml
#                           with the source bind-mounted to /server).
#                           docker build --target dev -t kiji-backend-dev .

# --------------------------------------------------------------------------
# base: Node + Yarn 4 (via corepack, version pinned by package.json#packageManager
# and .yarnrc.yml#yarnPath)
# --------------------------------------------------------------------------
FROM node:22-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    YARN_ENABLE_TELEMETRY=0 \
    MEDUSA_DISABLE_TELEMETRY=true
RUN apk add --no-cache tini \
 && corepack enable

# --------------------------------------------------------------------------
# dev: dependency layer for local development (source is bind-mounted)
# --------------------------------------------------------------------------
FROM base AS dev
# YARN_INSTALL_STATE_PATH keeps Yarn's install state inside node_modules (a named
# volume in compose) instead of the bind-mounted .yarn/ dir shared with the host.
ENV NODE_ENV=development \
    YARN_INSTALL_STATE_PATH=/server/node_modules/.yarn-install-state.gz
RUN mkdir -p /server/node_modules && chown -R node:node /server
WORKDIR /server
USER node
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
COPY --chown=node:node .yarn/releases ./.yarn/releases
RUN yarn install --immutable
COPY docker/dev-entrypoint.sh docker/migrate.sh /usr/local/bin/
EXPOSE 9000 5173
ENTRYPOINT ["/sbin/tini", "--", "/bin/sh", "/usr/local/bin/dev-entrypoint.sh"]

# --------------------------------------------------------------------------
# deps: full dependency install for the build
# --------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
RUN yarn install --immutable

# --------------------------------------------------------------------------
# build: compile backend + admin dashboard into .medusa/server
# NOTE: no NODE_ENV=production here on purpose - medusa-config.ts enforces
# production secrets, which are only available at runtime.
# --------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN yarn build --no-lint

# --------------------------------------------------------------------------
# production: only the build output + production dependencies
# --------------------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production \
    PORT=9000 \
    MEDUSA_RUN_MIGRATIONS=true
WORKDIR /app
RUN chown node:node /app
USER node
# .medusa/server contains package.json, yarn.lock, medusa-config.js, src/ and
# the prebuilt admin (public/admin). Yarn needs .yarnrc.yml + the release file.
# Everything is owned by `node`: `medusa db:migrate` creates (empty) migration
# folders inside node_modules/src at runtime and fails on read-only files.
# Yarn is invoked through yarnPath directly (no corepack download as `node`).
# Uploads of the local file provider land in /app/static -> mount a volume there.
COPY --from=build --chown=node:node /app/.medusa/server ./
COPY --from=build --chown=node:node /app/.yarnrc.yml ./
COPY --from=build --chown=node:node /app/.yarn/releases ./.yarn/releases
RUN node "$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)" workspaces focus --production \
 && node "$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)" cache clean --all \
 && rm -rf /home/node/.yarn /home/node/.cache \
 && mkdir -p /app/static
COPY docker/entrypoint.sh docker/migrate.sh /usr/local/bin/

EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1
ENTRYPOINT ["/sbin/tini", "--", "/bin/sh", "/usr/local/bin/entrypoint.sh"]
