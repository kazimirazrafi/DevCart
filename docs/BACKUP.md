# Backing up and restoring the database

Everything the shop knows is one Postgres database: the catalogue, prices, stock, carts, orders,
customers, addresses, reviews, wishlists, newsletter subscribers, promotions, and the notification rows
Medusa writes when it mails someone. This document is about that database — what the two scripts do,
where the dump has to go, and the restore that was actually run rather than assumed.

## What the dump does not contain

- **Product photography and imported files.** These live in object storage (an S3 bucket) or the local
  upload directory, not in Postgres. A restore brings back the URLs, not the bytes: back the bucket up
  where it lives.
- **Redis.** It holds the workflow engine's queue and the rate limiter's counters, both of which are
  derived. A restore needs none of it.
- **Secrets.** `DATABASE_URL`, the Stripe and Resend keys, the JWT and cookie secrets and the S3
  credentials are environment configuration. Keep them in the deployment's secret store, never in a
  dump, and never in this repository.
- **The search index.** It is built from the catalogue. After a restore, reindex (the seed and the
  catalogue refresh both do it) so search answers with what the database now holds.

## The scripts

Both live in `scripts/` and need only the Postgres client tools.

```bash
# A dump of the database in DATABASE_URL, written to ./backups
DATABASE_URL=postgres://... ./scripts/db-backup.sh

# Restore it into a scratch database and prove the row counts match
./scripts/db-restore.sh --verify backups/medusa-<stamp>.dump postgres://.../scratch
```

`db-backup.sh` writes four files, all owner-readable only, because the dump holds customer data:

| File | What it is |
| --- | --- |
| `medusa-<stamp>.dump` | `pg_dump` in custom format, compressed — restores table by table |
| `medusa-<stamp>.dump.sha256` | The dump's checksum, so a truncated copy is caught before it is restored |
| `medusa-<stamp>.meta` | The database it came from, when it was taken, its size and checksum |
| `medusa-<stamp>.counts` | The row count of every table, which is what a restore is verified against |

It refuses to keep a dump with no table data, and prunes dumps older than `BACKUP_RETENTION_DAYS`
(default 14) from `BACKUP_DIR` (default `./backups`).

`db-restore.sh` verifies the checksum, then runs `pg_restore --clean --if-exists --exit-on-error`, so
the target is wiped first — that is what makes a restore repeatable. It **refuses to restore over the
database the dump came from** unless `FORCE=1` is set, because that is the production path and the one
that cannot be undone. With `--verify` it compares every table's row count against the backup and fails
if any differ.

## Schedule, retention and the copy that matters

```cron
# Nightly at 02:15, two weeks kept locally.
15 2 * * * cd /srv/devcart && set -a && . ./apps/backend/.env && set +a \
  && BACKUP_DIR=/var/backups/devcart ./scripts/db-backup.sh >> /var/log/devcart-backup.log 2>&1
```

A dump on the same disk as the database is not a backup. Each run's four files belong in object
storage in another location, encrypted at rest, with a longer retention than the local copy (30 days is
a reasonable start). The script deliberately does not upload anything: which bucket, which
region and which encryption key are deployment decisions, and a wrong default would quietly copy
customer data somewhere nobody chose.

If a nightly dump is not enough — it can lose up to a day of orders — turn on the database provider's
point-in-time recovery (continuous WAL archiving) as well, and keep the nightly dump as the independent
copy that survives a provider mistake.

## The drill: 23 October 2026

Run against the local database (`medusa-dtc-starter`, 38 MB, 159 tables) with the Postgres 18.6 client
against a Postgres 15 server:

```bash
BACKUP_DIR=/tmp/backup-drill ./scripts/db-backup.sh
# Wrote medusa-20261023T095858Z.dump — 1.4M, sha256 161bd41ead4a139a…
# Row counts for 159 tables

./scripts/db-restore.sh --verify medusa-20261023T095858Z.dump postgres://…/medusa_restore_drill
# Verified: all 159 tables hold the same row counts as the backup.
```

- **Backup:** 7.2 s for 1,456,247 bytes — most of it is the 159 count queries, not `pg_dump`.
- **Restore into a fresh database and verify:** 8.0 s, every table's count matched.
- **The two guards were exercised:** restoring over the dump's own database exits `1` with
  *"Refusing to restore … over itself"* before `pg_restore` runs, and a dump whose checksum does not
  match exits `1` with *"Checksum mismatch"*.
- The scratch database was dropped afterwards; nothing outside `BACKUP_DIR` was touched.

The first version of the script rejected a perfectly good 1.4 MB dump: `pg_restore --list | grep -q`
let `grep` exit early, `pg_restore` died of SIGPIPE, and `set -o pipefail` reported failure. The listing
is captured instead of piped now, and the failure is recorded in `ROADMAP.md` because it is the exact
shape of "the backup tool says the backup is bad".

## Restoring production

1. **Take a dump of the broken database first.** It may hold orders the last good dump does not, even
   if the application cannot read it.
2. Stop the backend and its worker, so nothing writes while the tables are replaced.
3. Restore with the checksum guard on, into the production database:
   ```bash
   FORCE=1 ./scripts/db-restore.sh --verify <dump> "$DATABASE_URL"
   ```
4. Run migrations if the dump predates the code that is deployed: `pnpm exec medusa db:migrate`.
5. Start the backend and worker again, reindex search, and smoke-test the shop: a listing page, a
   product's stock, signing in, and one order's detail page.

**Rollback** is the dump taken in step 1, restored the same way. That is why it is step 1.

## What this does not give you

- **No point-in-time recovery by itself.** Up to a day of orders can be lost between dumps; see above.
- **A restore is all or nothing.** It replaces the whole database, not one table.
- **Row counts prove completeness, not correctness.** They catch an empty or truncated restore, not a
  subtly wrong one. Open the shop after a restore.
