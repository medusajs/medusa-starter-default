#!/bin/sh
# Production entrypoint (Dockerfile target "production", WORKDIR /app = .medusa/server).
#
#   MEDUSA_WORKER_MODE      shared (default) | server | worker
#   MEDUSA_RUN_MIGRATIONS   true (default in image) | false
#                           Migrations run only in shared/server mode, never in
#                           a worker. With several replicas, set it to true on
#                           exactly one instance (or run migrations as a
#                           separate one-off job) and false everywhere else.
#   MEDUSA_MIGRATE_LINKS / MEDUSA_MIGRATE_SEARCH  see docker/migrate.sh
#
# Extra arguments are passed to `medusa start` (e.g. --cluster 2).
set -eu

cd /app
MEDUSA_BIN=./node_modules/.bin/medusa
MODE="${MEDUSA_WORKER_MODE:-shared}"

case "$MODE" in
  shared|server|worker) ;;
  *) echo "[entrypoint] invalid MEDUSA_WORKER_MODE='$MODE' (shared|server|worker)" >&2; exit 1 ;;
esac

if [ "${MEDUSA_RUN_MIGRATIONS:-false}" = "true" ] && [ "$MODE" != "worker" ]; then
  /bin/sh /usr/local/bin/migrate.sh "$MEDUSA_BIN"
else
  echo "[entrypoint] skipping migrations (MEDUSA_RUN_MIGRATIONS=${MEDUSA_RUN_MIGRATIONS:-false}, mode=$MODE)"
fi

echo "[entrypoint] starting medusa (mode=$MODE, NODE_ENV=${NODE_ENV:-})"
exec "$MEDUSA_BIN" start "$@"
