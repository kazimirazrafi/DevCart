#!/usr/bin/env bash
#
# Writes a custom-format dump, its checksum, the source database and a row count
# per table. Files are owner-readable only; the dump holds customer data.
#
#   DATABASE_URL=postgres://... ./scripts/db-backup.sh
#
# Environment:
#   DATABASE_URL            the database to dump (required)
#   BACKUP_DIR              where dumps are written (default ./backups)
#   BACKUP_RETENTION_DAYS   prune dumps older than this (default 14)

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is not set. Point it at the database to back up." >&2
  exit 1
fi

for tool in pg_dump pg_restore psql; do
  if ! command -v "$tool" >/dev/null; then
    echo "$tool is not installed; the Postgres client tools are required." >&2
    exit 1
  fi
done

umask 077
mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="$BACKUP_DIR/medusa-$stamp"
dump="$name.dump"
meta="$name.meta"
counts="$name.counts"

database="$(psql "$DATABASE_URL" -At -c "select current_database()")"

echo "Backing up $database"

# Custom format, because it restores table by table and compresses as it goes.
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$dump"

# A schema-only dump is not a backup. The listing is captured rather than piped
# into grep: with pipefail, grep -q exits early and pg_restore dies of SIGPIPE on
# a healthy dump.
if [[ "$(pg_restore --list "$dump")" != *"TABLE DATA"* ]]; then
  echo "The dump contains no table data. Refusing to keep it." >&2
  rm -f "$dump"
  exit 1
fi

# Without counts, "it restored" only means pg_restore exited zero.
: > "$counts"

while IFS= read -r table; do
  count="$(psql "$DATABASE_URL" -At -c "select count(*) from \"$table\"")"
  printf '%s\t%s\n' "$table" "$count" >> "$counts"
done < <(psql "$DATABASE_URL" -At -c "
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by 1
")

checksum() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

digest="$(checksum "$dump")"
printf '%s\n' "$digest" > "$dump.sha256"

{
  printf 'database=%s\n' "$database"
  printf 'taken_at=%s\n' "$stamp"
  printf 'bytes=%s\n' "$(wc -c < "$dump" | tr -d ' ')"
  printf 'sha256=%s\n' "$digest"
  printf 'tables=%s\n' "$(wc -l < "$counts" | tr -d ' ')"
} > "$meta"

# Every file of one backup shares a timestamp, so they age together.
find "$BACKUP_DIR" -maxdepth 1 -name 'medusa-*' -mtime +"$RETENTION_DAYS" -print -delete

echo
echo "Wrote $(basename "$dump") — $(du -h "$dump" | cut -f1), sha256 ${digest:0:16}…"
echo "Row counts for $(wc -l < "$counts") tables are in $(basename "$counts"), and $(basename "$meta") names the database."
echo "Restore it with: ./scripts/db-restore.sh --verify '$dump' '<target database url>'"
echo "Move it off this host and keep it encrypted: it contains customer data."
