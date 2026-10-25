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

Starting from `.medusa/server` also means `apps/backend/.env` is **not** read: the process looks for its environment in its working directory. A host that injects variables into the process is unaffected; a local run of the production build has to export them first (`set -a; . ../../.env; set +a`), or the server refuses to boot with `http.jwtSecret not found`.

Run one backend process. `medusa start` accepts `--servers` and `--workers` to fork the cluster, so the HTTP servers and the job/workflow workers can be sized separately once scheduled jobs outgrow a single instance; until then one process does both.

### Redis

Optional, and worth setting in production: the workflow engine (imports, exports) and the rate limiter share state through it. Without `REDIS_URL` both fall back to in-process state, which makes rate limits per-instance and queues unusable across restarts.

### Files

Import/export CSVs and uploaded media need a file provider. Local disk (`@medusajs/medusa/file-local`, the default) is fine on a host with a persistent volume; on an ephemeral filesystem configure the S3 provider instead, or imported images disappear with the next deploy.

## Environment

Copy `apps/backend/.env.template` and `apps/storefront/.env.template`; they document every variable. The ones that must be set, and the ones that must agree:

**Backend**

- `DATABASE_URL` — add `?sslmode=require` for a managed database. If the provider offers both a session pooler (5432) and a transaction pooler (6543), use the session pooler: Medusa's ORM uses prepared statements, which a transaction pooler breaks.
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
