#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-up}"
BREW_PG_FORMULA="${BREW_PG_FORMULA:-postgresql@16}"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-$USER}"
PGDATABASE="${PGDATABASE:-m_practice_manager}"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required to manage local Postgres."
  exit 1
fi

BREW_PREFIX="$(brew --prefix "$BREW_PG_FORMULA")"
PG_BIN_DIR="$BREW_PREFIX/bin"

if [ ! -x "$PG_BIN_DIR/psql" ]; then
  echo "Postgres binaries not found for $BREW_PG_FORMULA at $PG_BIN_DIR."
  exit 1
fi

db_exists() {
  "$PG_BIN_DIR/psql" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='${PGDATABASE}'" | grep -q 1
}

start_service() {
  brew services start "$BREW_PG_FORMULA" >/dev/null
  "$PG_BIN_DIR/pg_isready" -h "$PGHOST" -p "$PGPORT" >/dev/null
}

case "$ACTION" in
  up)
    start_service
    if ! db_exists; then
      "$PG_BIN_DIR/createdb" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE"
    fi
    echo "Local Postgres ready at $PGHOST:$PGPORT (db: $PGDATABASE, user: $PGUSER)"
    ;;
  down)
    brew services stop "$BREW_PG_FORMULA" >/dev/null
    echo "Local Postgres stopped ($BREW_PG_FORMULA)."
    ;;
  reset)
    start_service
    "$PG_BIN_DIR/dropdb" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$PGDATABASE"
    "$PG_BIN_DIR/createdb" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE"
    echo "Local Postgres database reset: $PGDATABASE"
    ;;
  status)
    brew services list | grep "$BREW_PG_FORMULA" || true
    "$PG_BIN_DIR/pg_isready" -h "$PGHOST" -p "$PGPORT"
    ;;
  *)
    echo "Usage: bash scripts/local-db.sh {up|down|reset|status}"
    exit 1
    ;;
esac
