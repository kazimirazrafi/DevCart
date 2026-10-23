# Deploying DevCart on free tiers

The storefront on **Vercel**, the Medusa backend on **Render**, Postgres on **Supabase** and Redis on
**Upstash**. Every service below has a free plan, and this document is written for that combination: what
to create, what to set, in what order, and what breaks on a free tier that would not break on a paid one.

Local development is [`SETUP.md`](./SETUP.md). Database backups are [`BACKUP.md`](./BACKUP.md). The health
endpoints these instructions use are `SETUP.md` §20.

## The shape of the deployment

```text
                 browser
                    |
        +-----------+-----------+
        |                       |
  Vercel (Next.js)         Render (Medusa)
  storefront               API + admin
  https://shop.example     https://api.example
        |                       |
        |                       +---> Upstash Redis   (workflow queue, rate limits)
        |                       |
        +--- server-side fetches+---> Supabase Postgres
```

The storefront can only reach the backend on a **public https URL**. There is no private network between
Vercel and Render on the free plans, and a `NEXT_PUBLIC_MEDUSA_BACKEND_URL` of `localhost` in production
means every page renders empty.

| Service | What it runs | Public URL | Region |
| --- | --- | --- | --- |
| Vercel (Hobby) | `apps/storefront` | `https://<project>.vercel.app` | closest Vercel region to the backend |
| Render (Free web service) | `apps/backend` | `https://<service>.onrender.com` | one region, used by everything |
| Supabase (Free) | Postgres 15 | private, reachable over TCP | same region as Render |
| Upstash (Free) | Redis 7 over TLS | private, reachable over TCP | same region as Render |

Pick one region and put all three servers in it (Singapore, Frankfurt or Oregon, depending on where you
and your customers are). A storefront in one continent and a backend in another adds a full round trip to
every page, because the storefront renders on the server.

**At the time of writing (October 2026)** the free plans are roughly:

| Service | Free plan gives | The catch |
| --- | --- | --- |
| Supabase | 500 MB database, 2 projects | project pauses after about a week with no activity |
| Upstash | 500K commands/month, 250 MB | metered per command; a queue worker idles expensively |
| Render | 512 MB RAM, 0.1 CPU, 750 instance hours/month per workspace | spins down after 15 minutes without inbound traffic |
| Vercel | Hobby plan, generous bandwidth and function limits | **non-commercial use only**; a real shop needs Pro |

Check each provider's pricing page before you rely on a number here. The point of this document is the
wiring, and the wiring does not change when the limits do.

## 1. Supabase: the database

### 1.1 Create the project

1. Create a project at <https://supabase.com/dashboard>. Pick the region you decided on above.
2. Save the **database password** the wizard generates. Supabase shows it once; if it is lost, reset it
   from **Project Settings → Database → Reset database password** and update `DATABASE_URL` afterwards.
3. Nothing else in Supabase is used by this project. Medusa talks to Postgres directly over TCP; the
   Supabase Data API, Row Level Security and the `anon`/`service_role` keys play no part, and the
   storefront never talks to Supabase at all.

### 1.2 Choose the right connection string

Supabase offers four, and only one of them works for this app on a free tier:

| Mode | Host : port | Use it here? |
| --- | --- | --- |
| Direct connection | `db.<ref>.supabase.co:5432` | No: IPv6-only on the free plan, and Render has no IPv6 route |
| **Shared pooler, session mode** | `aws-<n>-<region>.pooler.supabase.com:5432` | **Yes — this is `DATABASE_URL`** |
| Shared pooler, transaction mode | `aws-<n>-<region>.pooler.supabase.com:6543` | No: no prepared statements, which Medusa needs |
| Dedicated pooler (paid) | `db.<ref>.supabase.co:6543` | Not on the free plan |

The reason the last column matters: MikroORM (Medusa's ORM) uses parameterised queries and names its
prepared statements (`s0`, `s1`, …). A transaction-mode pooler hands each statement to a different
backend connection, so `s0` created in one transaction does not exist in the next, and requests fail with
`prepared statement "s0" already exists` or `does not exist`. Session mode keeps a connection for the
whole session, which is what the driver expects.

Get the exact string from **Connect → Session pooler** in the dashboard. Do not compose it from the
region: the pooler cluster index (`aws-0`, `aws-1`, …) is not derivable, and pooled connections use the
username `postgres.<project-ref>` rather than `postgres`.

The result looks like this:

```text
postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

- **`?sslmode=require` is not optional.** Supabase requires TLS; node-postgres reads `sslmode` from the
  connection string and encrypts the connection when it is present (this project ships
  `pg-connection-string` 2.14, where `sslmode=require` sets `ssl` with certificate verification off;
  `verify-full` is the stricter option if you have Supabase's CA).
- **Percent-encode reserved characters** in the password (`@`, `:`, `/`, `#`, `?`, `&`). A raw `@` in the
  password splits the URL in the wrong place, and the error names the host rather than the password.
- **Migrations are the one task that prefers a direct session.** On a laptop with IPv6 the direct
  connection is the most predictable; the session pooler works from anywhere. Never run migrations through
  the transaction pooler.

### 1.3 Migrate and seed from your machine

The database starts empty, so create the schema, an admin user and the store before the backend ever
serves a request. Run this from the repository root, with the production URL in a variable:

```bash
export PROD_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require"

DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter @dtc/backend exec medusa db:migrate
```

`pnpm exec medusa db:migrate` applies every migration Medusa ships plus the project's own modules
(review, wishlist, email verification, stock alerts, newsletter). A variable exported on the command line
wins over `apps/backend/.env`: Medusa's `loadEnv` uses dotenv's default `override: false`, so the local
file is read but cannot replace what is already in the environment. Keep that file in place while you run
these commands — the config loader still requires `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `JWT_SECRET`
and `COOKIE_SECRET`, and it only needs values that validate, not the ones the host will use. No local
Postgres is needed for this: the only database reached is Supabase.

Then create the admin user and the store:

```bash
DATABASE_URL="$PROD_DATABASE_URL" \
  pnpm --filter @dtc/backend exec medusa user -e admin@example.com -p 'a-long-password'

DATABASE_URL="$PROD_DATABASE_URL" STRIPE_API_KEY=sk_test_... \
  pnpm --filter @dtc/backend exec medusa exec ./src/scripts/seed.ts
```

- `medusa user` creates a dashboard login. It is the only way into `/app` until one exists.
- `seed.ts` creates the store, a region with countries and a currency, shipping options, the demo
  catalogue, and **a publishable API key**. Pass `STRIPE_API_KEY` so the region is seeded with the Stripe
  payment provider; without it the region only offers the manual provider, and the storefront's checkout
  shows no card form.
- The seed is re-runnable (it skips products whose handles already exist), so a mistake there is cheap.

Keep the publishable key: it is the storefront's build-time requirement. Read it from the admin later
under **Settings → API keys**, or from the seed's output.

### 1.4 Free-tier behaviour

- A free project **pauses after about a week without activity** and only resumes when the dashboard wakes
  it. The backend's own queries count as activity, and the keep-alive ping in §7 touches the database
  every ten minutes, so a live deployment does not pause.
- The free plan has a finite number of Postgres connections. One Render instance opens a small pool, which
  is what the session pooler exists for; do not scale the backend to several instances on this plan
  without watching connection counts.
- There are no point-in-time backups on the free plan. Take a dump with [`BACKUP.md`](./BACKUP.md)'s
  script after the first successful deploy and keep it somewhere that is not Supabase.

## 2. Upstash: Redis

Redis is optional for the backend to boot, and required for two features:

| Uses Redis | Reads | Without it |
| --- | --- | --- |
| Workflow engine (`@medusajs/medusa/workflow-engine-redis`, BullMQ) | `REDIS_URL` | product import/export and any `backgroundExecution` step stall or never finish |
| Rate limiter (`src/lib/rate-limit.ts`) | `REDIS_URL` | limits still apply, but per instance and in memory, and a restart forgets them |

### 2.1 Create the database

1. Create a Redis database at <https://console.upstash.com>. Choose the region closest to Render.
2. Enable **TLS** (it is on by default) and copy the **`rediss://`** URL, which looks like:

   ```text
   rediss://default:<password>@<endpoint>.upstash.io:6379
   ```

3. Confirm it answers before wiring it into Render:

   ```bash
   redis-cli -u "rediss://default:<password>@<endpoint>.upstash.io:6379" ping   # PONG
   ```

The scheme matters: `redis://` opens a plaintext connection and Upstash closes it. `rediss://` makes
ioredis — which is what this project uses for both the limiter and the workflow engine — negotiate TLS.
The URL is passed through untouched, so there is no separate "TLS on" flag to set.

### 2.2 What Upstash costs in commands

Upstash bills per command, and this backend is chattier than a cache:

- the **rate limiter** runs one Lua `EVAL` per limited request (guest verification, auth, newsletter,
  reviews, wishlist). That is one command per request to those endpoints, not per visitor.
- the **workflow engine** is BullMQ, which polls. An idle worker is not free: it keeps asking whether
  there is work. This is why Upstash's own BullMQ guide recommends a fixed-capacity plan for queue
  workloads.

On the free 500K commands/month this is fine for a demo or a low-traffic shop. If the allowance runs out,
the visible symptoms are the ones in the troubleshooting table: exports that never finish, and a warning
line from the limiter that says it fell back to memory. Checkout keeps working, because the limiter fails
open.

Use a **dedicated** Upstash database for this project. The limiter prefixes its keys with `rate-limit:`,
but the workflow engine's keys are its own and sharing a database with another app is an invitation to a
`FLUSHDB` you did not intend.

If you would rather not spend the commands, leave `REDIS_URL` unset: everything boots, checkout and the
storefront work, and the admin's import and export are the price.

## 3. Render: the backend

### 3.1 Create the web service

1. **New → Web Service**, connect the GitHub repository.
2. Fill it in exactly like this:

| Setting | Value |
| --- | --- |
| Language | Node |
| Region | the region you chose (e.g. Singapore) |
| Branch | `main` |
| Root Directory | leave empty (the repository root) |
| Build Command | `corepack enable pnpm && pnpm install --frozen-lockfile && pnpm --filter @dtc/backend build` |
| Start Command | `cd apps/backend/.medusa/server && ../../node_modules/.bin/medusa start` |
| Health Check Path | `/health/ready` |
| Auto-Deploy | On Commit |
| Instance Type | Free |

Notes on each:

- **`corepack enable pnpm`** honours `"packageManager": "pnpm@10.11.1"` in the root `package.json`, so the
  build uses the same pnpm as your machine instead of whatever global version the image has.
- **`--frozen-lockfile`** makes the build fail when the lockfile and `package.json` disagree, which is what
  you want in CI and on a host. It also guarantees no second lockfile is ever written.
- **Do not add `--prod`** to the install. `medusa build` needs the dev dependencies (Vite builds the admin).
- **`pnpm --filter @dtc/backend build`** runs `medusa build` in `apps/backend` and writes the production
  output to `apps/backend/.medusa/server`.
- **No port configuration is needed.** `medusa start` takes its port from `process.env.PORT` (it defaults to
  9000 only when that is unset), and Render assigns `PORT` per service.

### 3.2 Why the start command is not `pnpm start`

`medusa start` serves the admin dashboard from `<working directory>/public/admin`, and it does nothing to
find the build: the build lives in `apps/backend/.medusa/server/public/admin`. Starting from the app
directory therefore dies at boot with

```text
Error: Could not find index.html in the admin build directory. Make sure to run 'medusa build' before starting the server.
```

which is what `pnpm --filter @dtc/backend start` does on this repository — reproduced locally while writing
this document. Starting from `apps/backend/.medusa/server` (with the same relative path to the CLI in either
Root Directory layout) is the arrangement that works: locally it served `/health` `200`, `/health/ready`
`200` with `Cache-Control: no-store`, and `/app` `200` with the dashboard's HTML.

Environment variables do not need to be in `.medusa/server/.env`: Render injects them into the process,
and `loadEnv` never overwrites a variable that is already set.

### 3.3 Environment variables

Required for the backend to boot correctly:

| Variable | Value | Why |
| --- | --- | --- |
| `DATABASE_URL` | Supabase **session pooler** string + `?sslmode=require` | the database |
| `STORE_CORS` | `https://<storefront-domain>` | browser calls from the shop |
| `ADMIN_CORS` | `https://<backend-domain>` | the admin dashboard's own origin |
| `AUTH_CORS` | `https://<storefront-domain>,https://<backend-domain>` | sign-in and token refresh |
| `JWT_SECRET` | `openssl rand -hex 32` | signs auth tokens |
| `COOKIE_SECRET` | `openssl rand -hex 32` | signs cookies |
| `ORDER_ACCESS_SECRET` | `openssl rand -hex 32`, **identical in Vercel** | guest order links |
| `EMAIL_VERIFICATION_SECRET` | `openssl rand -hex 32` | guest checkout codes |
| `MEDUSA_BACKEND_URL` | `https://<backend-domain>` | the origin static file links are built from |
| `BACKEND_URL` | `https://<backend-domain>` | the admin link inside low-stock alert emails |

CORS values are **exact origins**: scheme, host, optional port, no trailing slash, no wildcard. A
trailing slash makes the browser treat the header as a mismatch. The storefront renders on the server, so
most requests are not subject to CORS at all — but the instant search does: the listing and the navbar
drawer hand InstantSearch's adapter to the browser, which fetches `/store/search` directly with the
publishable key. A wrong `STORE_CORS` therefore breaks search and its facet counts while the pages around
it still render, which is a confusing way for it to fail.

Recommended once each service exists:

| Variable | Value | Effect when missing |
| --- | --- | --- |
| `NODE_VERSION` | `22` | Render may pick another major |
| `REDIS_URL` | the Upstash `rediss://` URL | import/export stop; limits are per instance |
| `STOREFRONT_URL` | `https://<storefront-domain>` | password-reset and confirmation links point at `localhost:8000` |
| `STORE_NAME` | `DevCart` (or yours) | emails and the storefront's default name |
| `RESEND_API_KEY`, `RESEND_FROM` | Resend key and a verified sender | Medusa's local provider logs email instead of sending it |
| `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | `sk_test_...` and `whsec_...` | no card payments, and webhooks are rejected |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | OAuth client and `https://<storefront-domain>/api/auth/google/callback` | the Google button reports it is not set up |
| `LOW_STOCK_ALERT_EMAIL` | where shortages go | the hourly job does nothing |
| `LOW_STOCK_THRESHOLD`, `LOW_STOCK_ALERT_COOLDOWN_HOURS`, `LOW_STOCK_ALERT_SCHEDULE` | defaults are `5`, `24`, `0 * * * *` | — |
| `SUPPORT_EMAIL` | a real address | the newsletter welcome uses a fallback address |

Not needed on Render: `DB_NAME` (unused), `MEILISEARCH_*` (search runs on Medusa's built-in API),
`S3_*` (the file module is wired to the local provider, see §3.5), `RESEND_BASE_URL` (test-only).

Changing any of these deploys the service again; several of them (`STRIPE_*`, `GOOGLE_*`, `RESEND_*`) are
read once at startup, so a change is not live until the restart finishes.

### 3.4 Migrations

Schema changes have to reach the production database. Three ways, in order of preference:

**A. From your laptop (recommended for the free plan).** After a deploy that includes a new migration:

```bash
DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter @dtc/backend exec medusa db:migrate
```

Migrations are idempotent — Medusa records applied ones — so running it when nothing changed is harmless.

**B. In the build command (if you want it automatic on the free plan).** The free plan has no
pre-deploy command, so the usual place is the build itself:

```text
corepack enable pnpm && pnpm install --frozen-lockfile && pnpm --filter @dtc/backend build && pnpm --filter @dtc/backend exec medusa db:migrate
```

Environment variables are present at build time on Render, so this works. The trade is that a failing
migration fails the deploy, and the migration runs against the old instance still serving traffic.

**C. Pre-Deploy Command (paid plans).** Render runs it after the build and before the new instance takes
traffic, which is the safest automatic option:

```text
pnpm --filter @dtc/backend exec medusa db:migrate
```

New module or model, locally, before any of this:

```bash
cd apps/backend
pnpm exec medusa db:generate <module-name>
```

Commit the generated file. A model change without its migration is a change that never reaches production.

### 3.5 What the free instance does to this app

- **It sleeps.** A free web service that receives no inbound traffic for 15 minutes is suspended; the next
  request pays a cold start (Render documents roughly a minute). §7 sets up a ten-minute ping so a demo
  stays warm.
- **750 instance hours a month, per workspace.** One service kept awake around the clock is about 730
  hours: it fits, but it consumes almost the whole allowance, so a second always-on service is not free.
- **512 MB of RAM.** The running backend is comfortable; `medusa build` (which also runs Vite for the admin)
  is the memory-hungry step. If the build is killed with a heap error, the options are a paid instance
  type for the deploy or building an image elsewhere — the free plan will not finish it.
- **The filesystem is ephemeral, and the build directory is recreated on every deploy.** The file module in
  `medusa-config.ts` is configured with `file-local`, so exported CSVs and admin media uploads are written
  to a `static/` directory under the process's working directory — with the start command above that is
  `apps/backend/.medusa/server/static`, and under `medusa develop` it is `apps/backend/static`. Either way
  they are gone after a restart or a redeploy. Downloads that 404 a day after they worked are this, not a
  bug. Production storage is an S3-compatible bucket (Cloudflare R2, S3,
  MinIO): the module has to be switched from `file-local` to the S3 provider and given the `S3_*` values
  already listed in `.env.template`.
- **One instance, and the scheduled jobs run inside it.** The low-stock alert is an hourly job in the web
  process, so it only runs while the service is awake. With the ping in §7 it runs; without it, a quiet
  shop reports shortages late.

### 3.6 First boot

Watch the log for `Server is ready on port` and then:

```bash
curl -s https://<backend-domain>/health          # OK
curl -s https://<backend-domain>/health/ready    # {"status":"ok","database":"up",...}
curl -s -o /dev/null -w '%{http_code}\n' https://<backend-domain>/app   # 200
```

`/health/ready` is the one that matters: it runs `select 1` against Supabase, so a `200` proves the
connection string, the pooler mode and TLS in one request. A `503` there means the database is not
reachable, and the reason is in the log rather than the response — by design, since the endpoint is public.

## 4. Vercel: the storefront

### 4.1 Import the project

1. **Add New → Project**, import the repository.
2. Configure it:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/storefront` |
| Build Command | leave the default (`next build`) |
| Install Command | leave the default (Vercel installs the pnpm workspace from the root lockfile) |
| Output Directory | `.next` (default) |
| Node.js Version | 22.x |
| Include source files outside of the Root Directory in the Build Step | **on** |

Vercel detects pnpm from `pnpm-lock.yaml` at the repository root and installs the whole workspace, which
is why the build in `apps/storefront` can resolve `next` and the shared config. The "include source files
outside of the Root Directory" toggle is what guarantees the root lockfile and workspace definition are
available; turn it on rather than debugging an install that cannot find the lockfile later.

If the build cannot find the Next binary, the override is `pnpm --filter @dtc/storefront build` with the
Root Directory left at the repository root — but the default works and keeps Vercel's framework detection.

### 4.2 Environment variables

Set these for **Production** and **Preview** before the first build:

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_...` from Admin → Settings → API keys | **required at build time** |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://<backend-domain>` | no trailing slash |
| `NEXT_PUBLIC_DEFAULT_REGION` | `dk` (or your region's country code) | must exist in the seeded regions |
| `NEXT_PUBLIC_BASE_URL` | `https://<storefront-domain>` | canonical URLs, sitemap, robots, Open Graph |
| `NEXT_PUBLIC_STORE_NAME` | `DevCart` (or yours) | navigation, titles, metadata |
| `NEXT_PUBLIC_STRIPE_KEY` | `pk_test_...` from the same Stripe account as `STRIPE_API_KEY` | the card form |
| `ORDER_ACCESS_SECRET` | **the same value as the backend's** | server-only, never `NEXT_PUBLIC_` |

Two properties of these that cost people an afternoon:

- **Everything with a `NEXT_PUBLIC_` prefix is inlined into the bundle when the build runs.** Changing one
  does not change a deployment that already exists: redeploy (Deployments → ⋯ → Redeploy, with the build
  cache cleared if in doubt). The publishable key is checked by `check-env-variables.js` during
  `next build`, so a missing one fails the build loudly instead of producing a site that fetches nothing.
- **`ORDER_ACCESS_SECRET` is signed by the storefront and verified by the backend** (guest order pages).
  If the two values differ, every guest order link answers "order was not found" while signed-in customers
  are unaffected — an asymmetry that looks like a bug in the order pages.

### 4.3 What Vercel runs, and what to expect

- **Server rendering with server actions.** Pages and data reads run as serverless functions, so the
  storefront must be able to reach the backend from the internet. `fetch failed` during the build is the
  most common first-deploy warning: it means product pages could not be prerendered and will render on
  demand instead. Deploy the backend first, and keep it awake while the storefront builds — a sleeping
  backend answers only after its cold start, and a `fetch failed` that arrives mid-cold-start is exactly
  how that warning is produced.
- **`/api/health`** answers for the storefront itself, without calling the backend. It is a liveness check
  for §7, not a readiness check for the whole shop.
- **The image optimiser is enabled** (`next.config.js`), with hosts listed in `remotePatterns`. A new image
  host — your own bucket, for example — has to be added there, or the plates fall back to "No image". On
  Vercel the optimiser is part of the platform; the `sharp` dependency is what makes it work locally under
  `next start`, and it does no harm here.
- **The security headers and the report-only CSP** come from `next.config.js` and are applied by Vercel.
  The CSP names the backend origin from `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, so pointing that at a different
  backend also updates the policy.
- **The middleware runs on every request** at the edge; it only reads `NEXT_PUBLIC_*` values and cookies
  (region redirect, cart id), so it needs no Node APIs.
- **Hobby is non-commercial.** Vercel's terms restrict the free plan to personal, non-commercial projects.
  A shop that takes money needs Pro, whatever the traffic.
- **Region.** Set the project's function region to the one nearest the Render service (Project → Settings →
  Functions). A default US region with a Singapore backend adds serial round trips to every render.

### 4.4 Custom domain

Add the domain in Vercel, point DNS as it instructs, then update the variables that name it:
`NEXT_PUBLIC_BASE_URL`, the backend's `STOREFRONT_URL` and `STORE_CORS`, Google's redirect URI (§6), and
redeploy the storefront so the new base URL is baked in.

## 5. Wiring the four together

The order matters because each step produces a URL the next one needs.

```text
Supabase ──DATABASE_URL──▶ Render (backend)
Upstash  ──REDIS_URL─────▶ Render (backend)
Render   ──https URL─────▶ Vercel  NEXT_PUBLIC_MEDUSA_BACKEND_URL
Vercel   ──https URL─────▶ Render  STOREFRONT_URL, STORE_CORS, AUTH_CORS, GOOGLE_CALLBACK_URL
```

1. **Supabase** (§1): create, migrate, seed, create the admin user.
2. **Upstash** (§2): create, copy the `rediss://` URL.
3. **Render** (§3): create the service with `DATABASE_URL`, `REDIS_URL`, the secrets, and *placeholder*
   CORS values; deploy; copy its `https://<service>.onrender.com` URL.
4. **Render again**: set `MEDUSA_BACKEND_URL`, `BACKEND_URL` to that URL, `STORE_CORS`/`AUTH_CORS` to the
   storefront's eventual origin (and its `.vercel.app` URL in the meantime), and redeploy.
5. **Vercel** (§4): import with the storefront env vars pointing at the Render URL; deploy; copy the
   storefront URL.
6. **Both again**: put the storefront URL into Render's `STORE_CORS`, `AUTH_CORS` and `STOREFRONT_URL`, and
   redeploy Render. Then redeploy Vercel with `NEXT_PUBLIC_BASE_URL` set to the final domain, because it is
   baked in at build time.

CORS is a value you will change twice; that is normal, not a mistake.

## 6. Third-party services

### 6.1 Stripe webhooks

The storefront completes the cart in the browser after confirming the card, so the webhook is the safety
net for a closed tab, a 3-D Secure redirect or a payment changed outside Medusa. Medusa serves the endpoint
itself; this project supplies the signing secret.

- Endpoint: `https://<backend-domain>/hooks/payment/stripe_stripe`
- Events: `payment_intent.succeeded`, `payment_intent.amount_capturable_updated`,
  `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.requires_action`,
  `payment_intent.processing`, `payment_intent.partially_funded`
- Copy the endpoint's `whsec_...` into Render as `STRIPE_WEBHOOK_SECRET` and restart.

Do not reuse the secret `stripe listen` prints locally: it signs deliveries to your laptop, not to the
deployed endpoint, and every real delivery then fails signature verification (Stripe shows a `400` on the
endpoint, and orders paid through a redirect stay unpaid). See `SETUP.md` §9 for the full flow and the test
cards.

`STRIPE_API_KEY` and `NEXT_PUBLIC_STRIPE_KEY` must come from the same Stripe account — a mismatch shows a
payment step that loads and then refuses to confirm.

### 6.2 Google sign-in

In the OAuth client (Google Cloud → APIs & Services → Credentials), add the redirect URI exactly:

```text
https://<storefront-domain>/api/auth/google/callback
```

Google allows several URIs on one client, so keep the local one listed beside it. The value must be
character-identical to Render's `GOOGLE_CALLBACK_URL` — a trailing slash, an `http` instead of `https`, or
the `.vercel.app` URL instead of the custom domain is the difference between a sign-in and
`redirect_uri_mismatch`.

The backend registers the Google provider only when all three variables are set, and it reads them at
startup: adding them means a restart, not just a save.

### 6.3 Resend

Verify the sending domain in Resend and set `RESEND_FROM` to a sender on it
(`DevCart <orders@yourdomain>`). Until both `RESEND_API_KEY` and `RESEND_FROM` are set, the backend uses
Medusa's local notification provider: notifications are stored and logged, and nothing is delivered. The
backend log line `Attempting to send a notification to` is the tell.

Every link in those emails is built from `STOREFRONT_URL`, so a wrong value there is a working email with
links to `localhost`.

## 7. Keep it awake and monitored

A free Render service is suspended after 15 minutes without inbound traffic. The project answers with the
two endpoints in `SETUP.md` §20, and a scheduler such as [cron-job.org](https://cron-job.org) pings them
every ten minutes:

| Job | URL | Expected | Schedule |
| --- | --- | --- | --- |
| Backend | `https://<backend-domain>/health/ready` | `200` | every 10 minutes |
| Storefront | `https://<storefront-domain>/api/health` | `200` | every 10 minutes |

Why the backend job hits `/health/ready` and not `/health`: Medusa's own `/health` answers for the process
and never touches Postgres, so pinging it would leave a free database idle (and a monitor blind to a real
database outage). `/health/ready` runs one `select 1`, which is what keeps Supabase from pausing after its
week of inactivity as well.

Give each job a 30-second timeout: the first request after a suspension is the one that pays the cold
start, and a 5-second timeout turns a waking service into a false alarm.

Add a real uptime monitor (UptimeRobot, Better Stack, Healthchecks.io) on the same two URLs if you want to
be told when they fail: a cron ping keeps a service warm, but it does not tell you that a `503` happened.
Render's own health check path restarts an unhealthy instance; it is not a pager.

A ping is not a paid plan. Free tiers still cold-start, restart and throttle, and the free instance is
512 MB. For a shop that must not drop a request, the backend belongs on a paid instance.

## 8. Verify the deployment

In order, from a terminal and a browser:

```bash
curl -s https://<backend-domain>/health            # OK
curl -s https://<backend-domain>/health/ready      # {"status":"ok","database":"up",...}
curl -s https://<storefront-domain>/api/health     # {"status":"ok","service":"storefront",...}
```

1. `https://<backend-domain>/app` loads the dashboard and the admin user from §1.3 can sign in.
2. **Products** lists the seeded catalogue; **Settings → API keys** shows the key the storefront is using.
3. `https://<storefront-domain>` redirects to `/{country}` (e.g. `/dk`) and renders the catalogue with
   images, prices and stock.
4. A product page renders, its images are served through `/_next/image`, and reviews and the wishlist
   section are present (empty states are correct on a fresh database).
5. Add to cart, go to checkout as a guest: the contact step sends a verification code, the code arrives,
   the address and shipping steps work, and a Stripe test payment (`4242 4242 4242 4242`) completes.
6. The confirmation email arrives, its order link opens the order for the guest, and the order appears in
   the admin.
7. Sign in with a customer account: order history, wishlist, a review submission (it arrives as pending in
   the admin).
8. Admin: **Products → Export** finishes and downloads a CSV (this is the Redis queue working). **Import**
   accepts that CSV back.
9. Debug log on Render shows no repeating errors; the Stripe endpoint's delivery log shows `200`s.

If a button on the storefront does nothing and the browser console shows a CORS error, the origin in
`STORE_CORS` is not the origin in the address bar — that is the check to run first.

## 9. Releasing changes

| Change | What to do |
| --- | --- |
| Storefront code | push; Vercel builds and deploys |
| Backend code | push; Render builds and restarts |
| New module, model or migration | `pnpm exec medusa db:generate <module>` locally, commit the migration, push, then run `db:migrate` against Supabase (§3.4) |
| New environment variable | add it to `.env.template` in the same change, to Render or Vercel, and restart/redeploy |
| `NEXT_PUBLIC_*` change | change it in Vercel **and redeploy**; a saved variable alone changes nothing |
| Seed data change | run the seed against the production database (§1.3) |
| Custom domain | §4.4, then update CORS, `STOREFRONT_URL`, `NEXT_PUBLIC_BASE_URL`, Google redirect |

A deploy of the backend while the storefront is serving is expected: the two are separate services, and
the storefront only notices if the API contract changed.

## 10. Backups

`scripts/db-backup.sh` works unchanged against Supabase — `pg_dump` understands the same connection string,
including `sslmode=require`:

```bash
DATABASE_URL="$PROD_DATABASE_URL" ./scripts/db-backup.sh
```

That writes the dump, its checksum, a metadata file and per-table row counts to `./backups`. Move the
files off the machine and off Supabase; they hold customer data and are written owner-readable for that
reason. `BACKUP.md` covers what a dump does not contain (uploads, secrets, Redis) and the restore drill
that was actually run.

Take one after the first successful deploy, after the seed, and before any migration you are unsure of.

## 11. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Render build killed with a heap error | The admin's Vite build on a 512 MB instance. Use a paid instance type for the deploy, or build an image elsewhere. |
| Deploy fails with `Could not find index.html in the admin build directory` | Wrong start command. `medusa start` serves `public/admin` relative to the working directory; start from `apps/backend/.medusa/server` (§3.2). |
| `GET /health/ready` returns `503` | The database is unreachable. Check the session-pooler host and port, that the password is percent-encoded, and that `?sslmode=require` is present. The reason is in the Render log. |
| Every database query fails with `prepared statement "s0" already exists` or `does not exist` | `DATABASE_URL` is the **transaction** pooler (port `6543`). Use the session pooler (port `5432`). |
| `no pg_hba.conf entry` or `SSL required` | `?sslmode=require` is missing from `DATABASE_URL`. |
| `getaddrinfo ENOTFOUND` / timeout on `db.<ref>.supabase.co` | `DATABASE_URL` is the direct connection, which is IPv6-only on the free plan and unreachable from Render. Use the session pooler. |
| Backend boots, storefront pages say `fetch failed` | `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is wrong, or the backend is asleep. Wake it (`/health/ready`) and redeploy the storefront. |
| Storefront build fails: `Missing required environment variables` | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is unset for that environment in Vercel. |
| Storefront renders but the catalogue is empty | The publishable key is not linked to the seeded sales channel, or `NEXT_PUBLIC_DEFAULT_REGION` is not a region country in the database. |
| A browser action is blocked by CORS | `STORE_CORS`/`AUTH_CORS` must list the exact storefront origin, no trailing slash, and the backend must be redeployed after the change. |
| Admin dashboard loads at `/app` but assets 404 | The start command is serving `public/admin` from the wrong directory (§3.2). |
| First request after a quiet period takes ~60 s | The free instance was spun down. That is the free plan; the ping in §7 prevents it. |
| Product export stays on *We are processing your export* | No Redis workflow engine (`REDIS_URL` unset or the instance predates it), or the Upstash command allowance is exhausted. |
| Admin media or an exported CSV 404s after a restart | The `file-local` provider wrote into the ephemeral build directory (§3.5). Move uploads to an S3-compatible bucket. |
| Emails do not arrive | `RESEND_API_KEY`/`RESEND_FROM` missing (local provider), or the sending domain is not verified in Resend. |
| Guest order link says the order was not found | `ORDER_ACCESS_SECRET` differs between Render and Vercel. |
| Google: `redirect_uri_mismatch` | The OAuth client's redirect URI and `GOOGLE_CALLBACK_URL` must be the same string, and the client must list the production URL. |
| Stripe endpoint returns `400`, order stays unpaid | `STRIPE_WEBHOOK_SECRET` is the local `stripe listen` secret, or missing; use the deployed endpoint's signing secret. |
| Card form loads but `Continue` never enables | `NEXT_PUBLIC_STRIPE_KEY` and `STRIPE_API_KEY` are from different Stripe accounts, or `pk_` was mixed up with `sk_`. |
| Google button says sign-in is not set up | One of the three `GOOGLE_*` variables is missing on Render, or the backend was not restarted after adding them. |
| Upstash bill or command limit warning in the logs | BullMQ polling plus the limiter's per-request `EVAL`. See §2.2; leaving `REDIS_URL` unset is a valid choice. |
| Rate limiting stopped being shared | The limiter warned and fell back to memory: Redis was unreachable at that moment. Check `REDIS_URL` and Upstash status. |

## 12. Security checklist

- **Secrets live only in the two dashboards.** `.env` and `.env.local` stay gitignored; nothing secret is
  ever prefixed `NEXT_PUBLIC_`, because that prefix ships it to the browser.
- **`JWT_SECRET`, `COOKIE_SECRET`, `ORDER_ACCESS_SECRET`, `EMAIL_VERIFICATION_SECRET`** are 32+ random
  bytes. `ORDER_ACCESS_SECRET` is shared, deliberately, by the two services; the others are per service.
- **Rotating them has consequences**: `JWT_SECRET`/`COOKIE_SECRET` sign everyone out; `ORDER_ACCESS_SECRET`
  invalidates every guest order link already sent; `EMAIL_VERIFICATION_SECRET` invalidates codes in flight;
  the Supabase password change has to be followed by updating `DATABASE_URL` and redeploying.
- **Stripe stays in test mode** until the shop is real; the test keys are what this document assumes.
- **The admin is public.** `/app` is protected by the admin user's password alone, so give it a long one,
  and do not create extra admin accounts for people who do not need them.
- **Keep the free tiers honest with themselves**: a public shop on Vercel Hobby is outside their terms, and
  a demo on any free tier is one cold start away from looking broken. Say so in the README of a demo, so a
  reader does not think a 60-second page load is a defect.

## What was verified for this document

- The Render build and start commands were run locally against a local Postgres: `medusa build` through
  `pnpm --filter @dtc/backend build`, then `cd apps/backend/.medusa/server && ../../node_modules/.bin/medusa
  start`, which answered `/health` `200` (`OK`), `/health/ready` `200`
  (`{"status":"ok","database":"up","latency_ms":2,...}` with `Cache-Control: no-store`) and `/app` `200`
  with the dashboard HTML.
- `pnpm --filter @dtc/backend start` was run first and reproduces the admin build error quoted in §3.2, so
  the start command is not a preference.
- `medusa start` honours `PORT` from the environment (the test server ran on `PORT=9059`), which is how
  Render's port assignment works.
- `pg-connection-string` 2.14 (the version installed here) maps `sslmode=require` to an encrypted
  connection, which is why the Supabase string is written that way.
- **Not verified:** accounts on Vercel, Render, Supabase and Upstash were not created, so their dashboards'
  current labels, free-tier limits, cold-start timings and pause behaviour come from their documentation
  and this document's reading of it, dated October 2026. The commands and configuration the services run
  are the ones above, and they are the part that could silently be wrong.
