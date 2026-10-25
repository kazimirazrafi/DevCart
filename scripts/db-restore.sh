#!/usr/bin/env bash
#
# Restores a dump from db-backup.sh; --verify compares row counts afterwards.
#
#   ./scripts/db-restore.sh <dump> <target database url>
#   ./scripts/db-restore.sh --verify <dump> <target database url>
#
# The target is wiped (--clean --if-exists), so restoring over the dump's own
# source database needs FORCE=1.
#
# Environment:
#   FORCE=1   allow restoring over the dump's own source database

set -euo pipefail

verify=0

if [[ "${1:-}" == "--verify" ]]; then
  verify=1
  shift
fi

dump="${1:-}"
target="${2:-}"
meta="${dump%.dump}.meta"
counts="${dump%.dump}.counts"

if [[ -z "$dump" || -z "$target" ]]; then
  echo "usage: $0 [--verify] <dump> <target database url>" >&2
  exit 1
fi

if [[ ! -f "$dump" ]]; then
  echo "No such dump: $dump" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null || ! command -v psql >/dev/null; then
  echo "pg_restore and psql are required." >&2
  exit 1
fi

# A mismatched checksum is a truncated download or a bad disk.
if [[ -f "$dump.sha256" ]]; then
  if command -v sha256sum >/dev/null; then
    actual="$(sha256sum "$dump" | awk '{print $1}')"
  else
    actual="$(shasum -a 256 "$dump" | awk '{print $1}')"
  fi

  expected="$(tr -d '[:space:]' < "$dump.sha256")"

  if [[ "$actual" != "$expected" ]]; then
    echo "Checksum mismatch for $dump. Refusing to restore it." >&2
    exit 1
  fi
fi

source_database="$(sed -n 's/^database=//p' "$meta" 2>/dev/null || true)"
target_database="$(psql "$target" -At -c "select current_database()")"

if [[ -n "$source_database" && "$source_database" == "$target_database" && "${FORCE:-0}" != "1" ]]; then
  echo "Refusing to restore $source_database over itself." >&2
  echo "Restore into a scratch database first, or set FORCE=1 if this is the production restore." >&2
  exit 1
fi

echo "Restoring $(basename "$dump") into $target_database"

pg_restore \
  --dbname="$target" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$dump"

if [[ "$verify" == "1" ]]; then
  if [[ ! -f "$counts" ]]; then
    echo "No row counts beside this dump, so the restore cannot be verified." >&2
    exit 1
  fi

  checked=0
  mismatches=0

  while IFS=$'\t' read -r table expected; do
    [[ -z "$table" ]] && continue

    actual="$(psql "$target" -At -c "select count(*) from \"$table\"")"
    checked=$((checked + 1))

    if [[ "$actual" != "$expected" ]]; then
      printf 'MISMATCH  %s: backup has %s, restored %s\n' "$table" "$expected" "$actual"
      mismatches=$((mismatches + 1))
    fi
  done < "$counts"

  if [[ "$mismatches" -gt 0 ]]; then
    echo "$mismatches of $checked tables differ from the backup." >&2
    exit 1
  fi

  echo "Verified: all $checked tables hold the same row counts as the backup."
fi
