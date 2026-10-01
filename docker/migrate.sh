#!/bin/sh
# Non-interactive `medusa db:migrate` for containers (no TTY).
#
# Without --execute-*-links / --execute-*-search flags, db:migrate opens an
# interactive prompt as soon as a link table or search index needs a change
# and hangs forever in a container. Defaults are the SAFE variants (never drop
# or alter existing link tables / indexes).
#
#   MEDUSA_MIGRATE_LINKS=safe|all|skip    (default: safe)
#   MEDUSA_MIGRATE_SEARCH=safe|all|skip   (default: safe)
#
# Set MEDUSA_MIGRATE_LINKS=all for ONE start when a link change is required
# (e.g. first migration after the 2.15 -> 2.21 upgrade:
# product_variant_inventory_item.required_quantity integer -> numeric), then
# remove it again.
#
# Usage: migrate.sh <path-to-medusa-binary>
set -eu

MEDUSA_BIN="${1:-./node_modules/.bin/medusa}"

case "${MEDUSA_MIGRATE_LINKS:-safe}" in
  safe) links_flag="--execute-safe-links" ;;
  all)  links_flag="--execute-all-links" ;;
  skip) links_flag="--skip-links" ;;
  *) echo "[migrate] invalid MEDUSA_MIGRATE_LINKS='${MEDUSA_MIGRATE_LINKS}' (safe|all|skip)" >&2; exit 1 ;;
esac

case "${MEDUSA_MIGRATE_SEARCH:-safe}" in
  safe) search_flag="--execute-safe-search" ;;
  all)  search_flag="--execute-all-search" ;;
  skip) search_flag="--skip-search" ;;
  *) echo "[migrate] invalid MEDUSA_MIGRATE_SEARCH='${MEDUSA_MIGRATE_SEARCH}' (safe|all|skip)" >&2; exit 1 ;;
esac

echo "[migrate] medusa db:migrate ${links_flag} ${search_flag}"
"$MEDUSA_BIN" db:migrate "$links_flag" "$search_flag"
