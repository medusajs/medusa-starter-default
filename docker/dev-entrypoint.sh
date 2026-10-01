#!/bin/sh
# Development entrypoint (Dockerfile target "dev", used by docker-compose.yml).
# The project is bind-mounted to /server, node_modules lives in a named volume.
#
#   MEDUSA_RUN_MIGRATIONS   true (default) | false
#   MEDUSA_MIGRATE_LINKS / MEDUSA_MIGRATE_SEARCH  see docker/migrate.sh
set -eu

cd /server

# Sync node_modules (named volume) with yarn.lock. Fast no-op when nothing
# changed; avoids stale deps after `docker compose up --build`.
echo "[dev] yarn install --immutable"
yarn install --immutable

if [ "${MEDUSA_RUN_MIGRATIONS:-true}" = "true" ]; then
  /bin/sh /usr/local/bin/migrate.sh ./node_modules/.bin/medusa
fi

echo "[dev] starting medusa develop"
exec ./node_modules/.bin/medusa develop --host 0.0.0.0 "$@"
