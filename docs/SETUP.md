# Local setup

Everything below was run on Node 22, pnpm 10 and PostgreSQL 15. It gets a working store, catalogue
and admin dashboard on a local machine.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22.22 or newer |
| pnpm | 10.11 (pinned by `packageManager` in the root `package.json`) |
| PostgreSQL | 15+ |
| Redis | 7+ |
| Docker and Compose | optional, if you already run Postgres and Redis |

## 1. Install

```bash
pnpm install
```

## 2. Start Postgres and Redis

```bash
docker compose up -d
```

This publishes Postgres on `5432` and Redis on `6379`. If either port is taken, override the host
ports and point the environment at them:

```bash
POSTGRES_PORT=55432 REDIS_PORT=56379 docker compose up -d
DATABASE_URL=postgres://postgres:postgres@localhost:55432/medusa-dtc-starter REDIS_URL=redis://localhost:56379
```

## 3. Configure the backend

```bash
cp apps/backend/.env.template apps/backend/.env
```

The template's defaults match `docker-compose.yml`. Two values to change before anything but local
development: `JWT_SECRET` and `COOKIE_SECRET`. `EMAIL_VERIFICATION_SECRET` and `ORDER_ACCESS_SECRET`
also need real random values in production (`openssl rand -hex 32`); the same `ORDER_ACCESS_SECRET`
must be set in the storefront.

## 4. Migrate and create an admin user

```bash
cd apps/backend
pnpm exec medusa db:migrate
pnpm exec medusa user -e admin@example.com -p changeme
```

Use any email and password. They are local credentials for the admin dashboard.

## 5. Start the backend

```bash
pnpm run backend:dev
```

- API and admin: `http://localhost:9000`, dashboard at `http://localhost:9000/app`
- Health check: `http://localhost:9000/health`
- Readiness (database reachable): `http://localhost:9000/health/ready`

## 6. Configure the storefront

Open **Settings, Publishable API keys** in the admin, copy a key, then:

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_STORE_NAME=DevCart
```

The storefront refuses to build without a publishable key, so a missing key fails at startup with a
clear message instead of rendering an empty shop.

The seed (step 8) creates its own publishable key, so on a freshly seeded database you can copy the
key from the admin rather than creating one.

## 7. Start the storefront

```bash
pnpm run storefront:dev
```

- Storefront: `http://localhost:8000`, which redirects to a region such as `/dk`
- Design reference page: `http://localhost:8000/dk/design`

`pnpm run dev` from the repository root starts both apps.

## 8. Seed the data

The store needs a region, taxes, a sales channel, shipping options and a catalogue before the
storefront shows anything.

```bash
pnpm run backend:seed
```

That runs `src/scripts/seed-all.ts`, which executes four scripts in order:

1. `seed.ts` creates the store (EUR and USD), the Europe region with its tax regions, the sales
   channel and its publishable key, a warehouse with a fulfillment set and shipping options, and the
   demo promotion codes. It creates no products.
2. `seed-catalogue.ts` loads `src/scripts/data/storefront-catalogue.json`: 194 products across 8
   departments and 24 leaf categories, with variants, prices, stock, images and the long-form
   `metadata.details` copy, then rebuilds the search index.
3. `seed-reviews.ts` adds approved reviews from demo reviewers, matched to products by handle.
4. `refresh-catalogue.ts` attaches every product to the storefront's sales channel and reindexes.

Every step is re-runnable and skips what already exists. The catalogue step also repairs two states
it recognises as broken: a product with no category and a product with no sales channel. It never
overwrites details an admin has written; it only refreshes the copy it wrote itself, marked by
`details_source` in the product metadata.

The photos are hot-linked from the open demo data set at `cdn.dummyjson.com` and vendored paths are
listed in the JSON above, so seeding needs no network. Replace the photography before a real launch.

To start from an empty catalogue instead, run `pnpm run reset-catalog` from `apps/backend`. It
removes products, categories, collections, tags and stock while keeping regions, channels, shipping
and payment setup. [`ADMIN.md`](./ADMIN.md) covers building the catalogue back up.

## 9. Stripe (card payments)

Card payments use Stripe test mode through Medusa's payment provider. It is optional: without a key
the provider is not registered, the region keeps the manual provider, and the rest of the app works.

Set both keys, from the same Stripe account:

```bash
# apps/backend/.env
STRIPE_API_KEY=sk_test_...

# apps/storefront/.env.local
NEXT_PUBLIC_STRIPE_KEY=pk_test_...
```

Re-run the seed so the region offers Stripe. The checkout shows two payment methods: card and cash on
delivery (Medusa's manual provider, relabelled). The list is defined in
`apps/storefront/src/lib/constants.tsx`; a provider enabled on the region in the backend does not
appear at checkout until it is added there.

The backend registers the provider with automatic capture, so a successful card payment is captured
at checkout rather than only authorised.

### Stripe webhooks

Medusa serves the endpoint at `/hooks/payment/stripe_stripe`. For local development:

```bash
stripe listen --forward-to localhost:9000/hooks/payment/stripe_stripe
```

Put the signing secret it prints into `STRIPE_WEBHOOK_SECRET`. Without it, deliveries fail
verification and are ignored.

## 10. Google sign-in (optional)

Create an OAuth client in Google Cloud, add `http://localhost:8000/api/auth/google/callback` as an
allowed redirect URI, and set all three values in `apps/backend/.env`:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
```

Without `GOOGLE_CLIENT_ID` the provider is not registered and the sign-in page keeps working with
email and password.

## 11. Email (optional)

Order confirmations, password resets, shipment notices, low-stock alerts and verification codes go
through Resend when it is configured:

```bash
RESEND_API_KEY=
RESEND_FROM="DevCart <orders@example.com>"
```

`RESEND_FROM` must be a verified sender. Without a key, Medusa's notification module logs the
notification instead of sending it, which is enough for local work. `RESEND_BASE_URL` can point the
client at a local stub that accepts `POST /emails`.

## 12. Order links

A guest has no account, so the confirmation link carries a signed token. The same `ORDER_ACCESS_SECRET`
must be set in the backend and the storefront, at least 32 characters. Rotating it revokes every order
link already sent.

## 13. Guest email verification

Guest checkout proves the email address with a six-digit code before the cart can be completed. The
codes are keyed by `EMAIL_VERIFICATION_SECRET`, which is required: without it the backend refuses to
issue a code rather than fall back to a value in the repository.

## 14. Product import and export

Products, **Export** writes a CSV and links it from a dashboard notification. **Import** takes a CSV
and reports how many products it will create before it runs. The import drawer's sample download is
the store's own template, served from `/static/product-import-template.csv`; the file lives at
`apps/backend/static/product-import-template.csv`.

Both are background workflows and need Redis. Without it the import never leaves the processing
state.

`Product Category` and `Product Tag` columns accept names and handles; unknown categories are
created, and a category path such as `Home & Kitchen/Kitchen Accessories` creates the parent first.
`Product Sales Channel 1` and `Shipping Profile Id` still need ids: copy them from an export.

[`ADMIN.md`](./ADMIN.md) lists the column rules and the failure cases worth knowing.

## 15. Tests

```bash
pnpm run test                       # backend: unit, module and HTTP suites
cd apps/storefront && pnpm run test # storefront unit tests
cd apps/storefront && pnpm run e2e  # Playwright, against a built app and a seeded database
```

Backend integration suites start their own Medusa test application and need a reachable PostgreSQL
with a user that may create databases. The storefront end-to-end suite builds both apps, serves them
on ports 9001 and 3001, seeds the database, and needs Stripe test keys for the payment flows.

## 16. Troubleshooting

| Symptom | Cause |
|---------|-------|
| `Missing required environment variables` on storefront start | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is empty in `apps/storefront/.env.local` |
| Storefront shows an empty catalogue | No region, wrong publishable key, or products not attached to its sales channel. Run `pnpm run refresh-catalogue` |
| `fetch failed` while the storefront renders | Backend is not running or `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is wrong |
| Backend exits at startup with a connection error | Postgres unreachable at `DATABASE_URL`, or migrations not applied |
| Import or export stays in processing | Redis unreachable at `REDIS_URL` |
| A product is published and priced but never appears | It has no sales channel. `pnpm run refresh-catalogue` |
| Admin edits are lost on restart | No persistent storage: set `S3_*` or keep `apps/backend/static` on a volume |

## Environment variables

The templates document every value:

- `apps/backend/.env.template`
- `apps/storefront/.env.template`

Real `.env` files are gitignored. When a new variable is introduced, add it to the template in the
same change.
