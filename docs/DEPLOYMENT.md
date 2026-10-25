# Deployment

Two services and two pieces of infrastructure: the storefront (Next.js), the backend (Medusa), a Postgres database and, optionally, Redis. Any host that runs a Node process and gives you a Postgres connection string will do; the storefront can also be served as a static-free Node app on a platform that builds Next.js natively.

Everything below assumes the repository is built with pnpm 10 (`packageManager` in the root `package.json`) and Node 22.

## What each service needs

| | Backend | Storefront |
| --- | --- | --- |
| Build | `pnpm --filter @dtc/backend build` | `pnpm --filter @dtc/storefront build` |
| Start | `cd apps/backend/.medusa/server && ../../node_modules/.bin/medusa start` | `pnpm --filter @dtc/storefront start` |
| Port | `PORT` (9000 locally) | `PORT` (8000 locally) |
| State | Postgres, optional Redis, local or S3 file provider | none |

The backend start command is not `pnpm start`. `medusa build` writes the server and the admin dashboard to `apps/backend/.medusa/server`, and only a start from that directory serves the dashboard at `/app`. Starting from `apps/backend` serves `public/admin` instead, which the build no longer populates.

The build also copies `apps/backend/static/` into `.medusa/server/static/` (`scripts/copy-static.mjs`, run as part of `build`), because `medusa start` serves `/static` from the directory it runs in. Without that copy the admin's product-import sample CSV is a 404 in production while it works locally.

Starting from `.medusa/server` also means `apps/backend/.env` is **not** read: the process looks for its environment in its working directory. A host that injects variables into the process is unaffected; a local run of the production build has to export them first (`set -a; . ../../.env; set +a`), or the server refuses to boot with `http.jwtSecret not found`.

Run one backend process. `medusa start` accepts `--servers` and `--workers` to fork the cluster, so the HTTP servers and the job/workflow workers can be sized separately once scheduled jobs outgrow a single instance; until then one process does both.

### Database hosting and region

Two properties matter more than the provider's feature list:

- **Region.** Put the database in the same region as the backend process. Medusa issues dozens of queries per page render, so a cross-continent hop is paid on every one of them. Measured on this project: a single `select 1` from a backend in Singapore to a database in Sydney took **181 ms**, and the same probe in-region takes **2-3 ms**. That difference is the whole of a three-second page load.
- **No transaction pooler.** MikroORM names its prepared statements (`s0`, `s1`, ...). A PgBouncer endpoint in transaction mode hands each statement to a different backend connection, so the name does not exist in the next transaction and requests fail with `prepared statement "s0" does not exist`. Use a direct endpoint; a session-mode pooler also works, at the cost of one extra hop.

This project uses **Neon** in Singapore (`aws-ap-southeast-1`), reached through its direct endpoint. Nothing Neon-specific is involved: no SDK, no Data API, no row level security to disable. The backend opens an ordinary TCP connection with a connection string, exactly as it would to a local Postgres, so any managed Postgres in the right region is a valid substitute.

If you restore an existing database rather than seeding a new one, create these first. The schema depends on both and Medusa's migrations do not create either:

```sql
create extension if not exists unaccent with schema public;
create extension if not exists pg_trgm  with schema public;
```

The text search configuration references `public.unaccent`, and the search tables carry `gin (search_text public.gin_trgm_ops)` indexes, so both extensions have to live in `public` for a restore to match.

### Redis

Optional, and worth setting in production: the workflow engine (imports, exports) and the rate limiter share state through it. Without `REDIS_URL` both fall back to in-process state, which makes rate limits per-instance and queues unusable across restarts.

### Files

Import/export CSVs and uploaded media need a file provider. Local disk (`@medusajs/medusa/file-local`, the default) is fine on a host with a persistent volume; on an ephemeral filesystem configure the S3 provider instead, or imported images disappear with the next deploy.

## Environment

Copy `apps/backend/.env.template` and `apps/storefront/.env.template`; they document every variable. The ones that must be set, and the ones that must agree:

**Backend**

- `DATABASE_URL` — the provider's **direct** connection string, with TLS on. Prefer it over a pooled endpoint: a transaction-mode pooler breaks the prepared statements Medusa's ORM uses, and a session-mode pooler works but adds a hop. Neon's string already carries `?channel_binding=require&sslmode=require`, and needs no other parameter: its certificate chains to a public CA, so `sslmode=require` verifies cleanly. A host whose certificate is not publicly trusted needs `uselibpqcompat=true&sslmode=require` instead.
- `JWT_SECRET`, `COOKIE_SECRET`, `ORDER_ACCESS_SECRET`, `EMAIL_VERIFICATION_SECRET` — generate fresh values (`openssl rand -hex 32`). The last two are at least 32 characters; rotating them revokes existing order links and verification codes.
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` — the storefront origin, plus the admin origin if it is served from elsewhere.
- `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` — the webhook endpoint is `/hooks/payment/stripe_stripe` on the backend origin.
- `RESEND_API_KEY`, `RESEND_FROM` — `RESEND_FROM` must be an address on a domain verified in Resend, or every send is rejected.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — the callback is a storefront route, `https://<storefront>/api/auth/google/callback`, and it has to be listed under Authorized redirect URIs in the Google console.
- `REDIS_URL` — see above.

**Storefront**

- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — the backend's public URL.
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — from the backend's admin (Settings → Publishable keys).
- `NEXT_PUBLIC_BASE_URL` — the storefront's own public origin. Canonical URLs, Open Graph tags, `sitemap.xml` and `robots.txt` are built from it, so a wrong value is invisible on the page and wrong everywhere a crawler looks.
- `NEXT_PUBLIC_STRIPE_KEY` — the publishable key from the same Stripe account as the backend's secret key.
- `ORDER_ACCESS_SECRET` — exactly the backend's value. The storefront mints the token, the backend verifies it. Server-side only; never prefix it with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_DEFAULT_REGION` — the navigation, page titles and the region a bare `/` redirects to.

All `NEXT_PUBLIC_*` values are inlined at build time, so changing one means rebuilding the storefront. `ORDER_ACCESS_SECRET` is read at runtime and does not.

## First deploy

1. **Create the database** and note both connection strings you need (the application's and, if the host requires it, the direct one migrations can use).
2. **Deploy the backend** with its environment set, then run the schema and seed once. These are one-off commands, not part of the start command:

   ```bash
   cd apps/backend
   pnpm exec medusa db:migrate
   pnpm run seed
   pnpm exec medusa user -e admin@example.com -p '<password>'
   ```

   `pnpm run seed` seeds the region, currencies, sales channel, shipping options, payment providers and the demo catalogue. It is idempotent enough to re-run, but run it against a fresh database first; see `docs/SETUP.md` for what it creates and `docs/ADMIN.md` for what to do instead when a catalogue already exists.

   A seed change reaches a deployed shop only when the seed is re-run against its database. A plan with no shell (Render's free tier) means running it from your machine with the production connection string exported:

   ```bash
   cd apps/backend
   DATABASE_URL='<production url>' pnpm run seed          # all four seeds
   DATABASE_URL='<production url>' pnpm run seed-catalogue # catalogue and product details only
   ```

   `seed-catalogue` is the one to run after a change to the catalogue or its `metadata.details`: it repairs products created before the details band existed and leaves admin-written details alone.

3. **Deploy the storefront** with `NEXT_PUBLIC_MEDUSA_BACKEND_URL` pointing at the backend's public URL and the publishable key set. Its build fetches the store's region data, so the backend must be up and seeded before the build runs.
4. **Point Stripe at the webhook**: add `https://<backend>/hooks/payment/stripe_stripe` as an endpoint, subscribe to payment events, and put the signing secret in `STRIPE_WEBHOOK_SECRET`. Without it every delivery fails verification and is ignored, which shows up as orders stuck at "awaiting payment".

## After deploying

- `GET https://<backend>/health` answers `200` for the process, `GET https://<backend>/health/ready` answers `200` only when Postgres answers too, `GET https://<storefront>/api/health` answers for the storefront alone. Point uptime monitoring at `/health/ready` and the storefront's `/api/health`; on a free tier, a monitor every 10 minutes also keeps the instances warm. Do not monitor the backend's `/health` as the keep-alive: it never touches the database.
- Load `/app`, sign in with the admin user, and confirm the dashboard widgets and the product detail page render.
- Place one real test-mode order end to end and check the confirmation email arrives.

## Rolling back

The storefront and the backend deploy independently. A storefront rollback is a redeploy of the previous build. A backend rollback is the previous image plus a decision about the database:

- Code that only reads or writes through the modules is safe to roll back while the schema stays forward.
- A release that added a migration is not: Medusa's migrations are forward-only, so rolling back the code against a migrated database leaves new columns and tables in place. Either restore the database from the backup taken before the deploy or roll forward with a fix.
- A release that added a module also needs its migration run before the new code starts, so the safest sequence is migrate, then swap the process.

Take a database dump before every backend deploy that includes a migration.
