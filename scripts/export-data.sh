#!/usr/bin/env bash
#
# Cube Labs — full database export (your data, portable, anytime).
#
# Produces a timestamped SQL dump of the entire database so you always hold a
# copy you can restore into ANY PostgreSQL — self-hosted Supabase, plain
# Postgres, RDS, etc. This is the "leave quick" safety net.
#
# Usage:
#   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
#     ./scripts/export-data.sh
#
# Find the connection string in Supabase → Project Settings → Database →
# Connection string (URI). Requires the postgres client tools (pg_dump).
#
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Set SUPABASE_DB_URL (or DATABASE_URL) to your Postgres connection string." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL client tools (e.g. 'brew install libpq' or 'apt-get install postgresql-client')." >&2
  exit 1
fi

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

# Full dump: schema + data for the public schema (your app data). auth.* is
# managed by the auth provider; export it separately only if migrating auth.
SCHEMA_DATA="$OUT_DIR/cubelabs-$STAMP.sql"

echo "Exporting public schema (structure + data) → $SCHEMA_DATA"
pg_dump "$DB_URL" \
  --no-owner --no-privileges \
  --schema=public \
  --file="$SCHEMA_DATA"

echo "Done. Restore into any Postgres with:"
echo "  psql \"\$TARGET_DB_URL\" -f $SCHEMA_DATA"
echo
echo "Tip: also keep a copy off-provider (download it, or push to object storage)."
