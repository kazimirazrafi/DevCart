# Local setup

How to get DevCart running from a clean clone. Every command below was run and verified on
Node 22.22.0 / pnpm 10.11.1 / PostgreSQL 15.

For what to build next, see [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) and [`../ROADMAP.md`](../ROADMAP.md).
To put the project on the internet, see [`DEPLOYMENT.md`](./DEPLOYMENT.md) (Vercel, Render, Supabase,
Upstash).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 22+ | The repo's `engines` field asks for `>=22.22.0` |
| pnpm | 10.11.1 | Pinned by `packageManager` in the root `package.json` |
| PostgreSQL | 15+ | Via Docker (below) or a local install |
| Redis | 7+ | Via Docker (below) or a local install |
| Docker + Compose | any recent | Optional if you already run Postgres and Redis locally |

The package manager is **pnpm**. Do not introduce a second lockfile.

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start the infrastructure

```bash
docker compose up -d
```

That starts Postgres on `5432` and Redis on `6379`. If either port is already taken by a local
service, override the host ports and point the env vars at them:

```bash
POSTGRES_PORT=55432 REDIS_PORT=56379 docker compose up -d
```

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:55432/medusa-dtc-starter
REDIS_URL=redis://localhost:56379
```

Meilisearch is behind an opt-in profile and is **not** used by the app (search runs on Medusa's
built-in search API):

```bash
docker compose --profile meilisearch up -d
```

## 3. Configure the backend

```bash
cp apps/backend/.env.template apps/backend/.env
```

The template's defaults already match `docker-compose.yml`. For anything other than local
development, replace `JWT_SECRET`, `COOKIE_SECRET` and `ORDER_ACCESS_SECRET` with strong random
values (`openssl rand -hex 32`). `ORDER_ACCESS_SECRET` must be the *same* string in
`apps/storefront/.env.local`; see [Order links](#17-order-links).

## 4. Migrate and create an admin user

```bash
cd apps/backend
pnpm exec medusa db:migrate
pnpm exec medusa user -e admin@test.com -p supersecret
```

## 5. Start the backend

From the repository root:

```bash
pnpm run backend:dev
```

or from the app:

```bash
cd apps/backend && pnpm run dev
```

- API: <http://localhost:9000>
- Health check: <http://localhost:9000/health> returns `200`
- Admin dashboard: <http://localhost:9000/app>

Log into the admin dashboard with the user from step 4.

## 6. Configure the storefront

Get a publishable API key from **Settings → Publishable API keys** in the admin dashboard, then:

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

Set the key in `apps/storefront/.env.local`:

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_STORE_NAME=DevCart
```

The storefront will not build without a publishable key — it fails the env check with a clear
message rather than at request time.

## 7. Start the storefront

```bash
pnpm run storefront:dev
```

- Storefront: <http://localhost:8000> (redirects to `/{country}`, e.g. `/dk`)
- Design system reference: <http://localhost:8000/dk/design>

Or run both apps together from the root:

```bash
pnpm run dev
```

## 8. Seed data

The database needs its Medusa migrations applied before it can be seeded. On a fresh database,
`pnpm run dev` runs `medusa develop`, which applies migrations during startup. If preparing the
catalogue before starting the backend, run `pnpm exec medusa db:migrate` from `apps/backend` first.
Then seed from the repository root:

```bash
pnpm run backend:seed            # from the repository root
# or, from apps/backend:
pnpm run seed                    # = medusa exec ./src/scripts/seed.ts
```

It creates a store with EUR/USD, the Europe region and its tax regions, a sales channel with a
publishable key, a warehouse with a fulfillment set and two shipping options, then the DevCart
catalogue: **53 products across 10 categories**, 3 collections, 5 tags, shared Size and Color options,
and variants, prices and stock for every product.

The categories are T-Shirts, Sweatshirts & Hoodies, Bottoms, Shirts, Dresses, Footwear, Bags,
Accessories, Desk and Kits. The dev-merch pieces use the public Medusa demo images; the wardrobe lines
(shirts, dresses, footwear, bags, sunglasses, earrings) use the open demo catalogue at
`cdn.dummyjson.com`, one photo set per product, which is what keeps the shop from looking like the
same four garments repeated. Both hosts are hot-linked, not copied into the repo — replace them with
your own photography before a real launch. Footwear gets its own `Shoe Size` option (EU 39–44) because
the shared `Size` option is apparel S/M/L/XL, and a product whose colour is not in the shared `Color`
option gets its own.

- **Re-runnable.** Every step looks for what it is about to create first, so a second run adds
  nothing. Add a product to `CATALOGUE` in `src/scripts/seed.ts` and a re-run creates only that one.
  It also repairs two states it can recognise as broken on a catalogue product: an empty category and
  an empty sales channel (a product with no channel is invisible in the storefront and in search).
  Anything an admin has actually filled in is left alone.
- **It replaces the starter's placeholder products.** The four products `initial-data-seed.ts`
  creates are deleted, along with their now-empty categories. That deletion is skipped automatically
  if the store has any order, so order history is never touched.
- **The turbo task is not cached** (`turbo.json` sets `"cache": false` for `seed`). Caching would
  turn a second `pnpm run backend:seed` into a replay of the first run's log with no database work.
- `src/scripts/seed-demo-products.ts` still exists as an optional bulk filler (50 generated products)
  for exercising pagination. It is not needed for the DevCart catalogue.

After seeding, the admin dashboard at <http://localhost:9000/app> lists the products, and
<http://localhost:8000/dk/store> lists them in the storefront.

To start from an empty catalogue instead (for example to add products by hand), run
`pnpm run reset-catalog` from `apps/backend`; it removes products, categories,
collections, tags, types, price lists and stock while keeping the store's regions, sales
channel, shipping and payment setup. The step-by-step guide for building the catalogue
back up is [CATALOG.md](./CATALOG.md).

## 9. Stripe (test mode)

Card payments at checkout run on Stripe test mode through Medusa's Stripe payment provider. It is
optional: without a key the backend simply never registers the provider, the region keeps Medusa's
manual provider, and the rest of the app is unaffected.

The checkout offers exactly two options: **Credit card** (Stripe) and **Cash on delivery** (Medusa's
manual provider, relabelled — nothing is charged online and the order stays awaiting payment). The
storefront enforces that list itself in `ENABLED_PAYMENT_PROVIDERS` (`apps/storefront/src/lib/constants.tsx`),
so enabling another provider on the region in the backend does not make it appear in the checkout
until it is added there and given a title and icon in `paymentInfoMap`.

**Capture.** The provider is registered with `capture: true` (`apps/backend/medusa-config.ts`). Medusa's
Stripe provider defaults to manual capture, which merely authorizes the card — the customer's money is
held, not taken, and no receipt can honestly say it was paid. With automatic capture the intent
succeeds at checkout, the order's `payment_status` becomes `captured`, and the confirmation page says
`Payment of €X received`. A cancelled order is therefore refunded from the admin (a captured payment
cannot be voided).

**How the card flow behaves.** The card fields are Stripe's Payment Element on our own checkout page,
so nothing is sent anywhere until the customer presses **Pay … and place order** on the review step
(the payment step's **Continue** only records the choice; it says so). That click confirms the
PaymentIntent, and the browser leaves the site only when the card needs 3-D Secure — then it returns
through `/api/payment-return`, which completes the cart server-side and redirects to the confirmation
page. The confirmation page then states whether the money was taken (`Payment of €X received`), is
still clearing (`… being processed`), or is due on delivery.

**1. Get two test keys.** In the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys),
make sure **Test mode** is on, then copy:

| Key | Starts with | Goes in |
|-----|-------------|---------|
| Secret key | `sk_test_` | `apps/backend/.env` → `STRIPE_API_KEY` |
| Publishable key | `pk_test_` | `apps/storefront/.env.local` → `NEXT_PUBLIC_STRIPE_KEY` |

Both must come from the same Stripe account. Never commit either key.

```bash
# apps/backend/.env
STRIPE_API_KEY=sk_test_...

# apps/storefront/.env.local
NEXT_PUBLIC_STRIPE_KEY=pk_test_...
```

**2. Restart both apps.** The backend reads `STRIPE_API_KEY` once at startup and registers the
provider with it; the storefront inlines `NEXT_PUBLIC_*` at build/start.

**3. Re-run the seed** so the region is allowed to use the new provider:

```bash
pnpm run backend:seed
```

The seed's region step reconciles rather than only creates, so this adds `pp_stripe_stripe` to the
existing region and says so in its log (`Enabled pp_stripe_stripe on region "Europe".`). Providers
already on the region are kept — the manual provider stays available as cash on delivery.

**4. Check out with a test card.** On the checkout's payment step, choose **Credit card** and enter:

| Card number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Succeeds, the order is created and the confirmation page opens |
| `4000 0000 0000 0002` | Declined: the checkout reports the decline and the cart is left untouched, ready to retry |

Any future expiry date and any three-digit CVC work in test mode.

### Stripe webhooks (K7)

The checkout confirms the card in the browser and completes the cart itself, so the webhook is the
safety net for the cases where the browser never gets back — a closed tab, a 3-D Secure or bank
redirect, or a payment captured outside Medusa. Medusa serves the endpoint itself; this project only
supplies the signing secret.

**Endpoint:** `POST /hooks/payment/stripe_stripe` (the provider id is `pp_stripe_stripe`; Medusa's
route takes it without the `pp_` prefix).

**Local:**

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and forward events to the backend:

   ```bash
   stripe listen --forward-to localhost:9000/hooks/payment/stripe_stripe
   ```

2. Copy the `whsec_...` it prints into `apps/backend/.env` as `STRIPE_WEBHOOK_SECRET` and restart the
   backend. Without the secret, every delivery is refused at verification and nothing is updated.

**Production:** add `https://<your-backend>/hooks/payment/stripe_stripe` as an endpoint in the Stripe
dashboard (Developers → Webhooks), copy its signing secret into `STRIPE_WEBHOOK_SECRET`, and subscribe
to the payment-intent events this store uses:

`payment_intent.succeeded`, `payment_intent.amount_capturable_updated`,
`payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.requires_action`,
`payment_intent.processing`, `payment_intent.partially_funded`.

**What it does.** The route hands the event to Medusa's payment module, which verifies the signature
against `STRIPE_WEBHOOK_SECRET`, maps the intent back to its payment session, and then:

- completes a cart whose payment succeeded or was authorized but whose browser never returned — the
  order is created server-side, with its confirmation email;
- captures a payment Stripe captured outside Medusa (an admin capture in the Stripe dashboard, a
  retried payment);
- ignores events that did not originate from this Medusa instance (no `metadata.session_id`), so a
  Stripe account shared with another integration is safe.

Duplicate deliveries are safe: completing a cart only runs while no order exists for it, and
capturing an already-captured payment is a no-op.

**Limits.** The route answers `200` as soon as it has queued the event — verification and processing
start after Medusa's 5-second `webhook_delay`, with up to 3 retries on the event bus. A bad signature
is therefore logged (`An error occurred in constructWebhookEvent…`) rather than returned as a 4xx, and
Stripe does not retry it. In production, run the event bus on Redis (and a worker) so a queued event
survives a restart; the local in-memory bus loses it.

## 10. Google sign-in (optional)

Customers can create an account or sign in with Google as well as with a password. It is optional in
the same way Stripe is: without the three variables below the backend never registers the provider,
the sign-in page keeps working with email and password, and nothing else changes. The Google button
is still shown — it answers "Google sign-in isn't set up for this store. Use your email and password
instead." rather than doing nothing.

**1. Create an OAuth client.** In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
create an **OAuth client ID** of type **Web application**, and add this **Authorized redirect URI**
exactly:

```text
http://localhost:8000/api/auth/google/callback
```

That is the storefront's callback route. It carries no country code, so one entry covers every region,
and it is the same URL the backend hands Google as `redirect_uri`.

**2. Put the credentials in the backend's `.env`.** All three are required together:

```bash
# apps/backend/.env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
```

**3. Restart the backend.** It registers the provider at startup, and only when all three are set.

**4. Try it.** <http://localhost:8000/dk/account> → **Continue with Google**. A first-time customer
gets a Medusa customer record created from the Google profile (name and email); afterwards the same
Google account is recognised. A cart the customer started as a guest follows them into the account,
exactly as it does after a password sign-in.

Two things this flow does not do, and says so rather than failing quietly: it cannot hand a Google
address the account that already exists for it (Medusa refuses a second customer record for one
email, so that is reported as "An account already uses that Google address. Sign in with your
password instead."), and it has no screen for an MFA or email-verification challenge.

## 11. Email (Resend)

Order confirmations, password reset links and shipment notifications are sent through
[Resend](https://resend.com) from the store's own notification provider
(`apps/backend/src/modules/notification-resend/`). Like Stripe and Google, it is optional: with no
key the backend registers Medusa's local notification provider instead, which stores each notification
and logs it. Nothing is delivered, but the order flow and the reset flow both run end to end — the
local provider's log line includes the reset link, which is how the flow is tested offline.

**1. Get an API key.** In the [Resend dashboard](https://resend.com/api-keys), create an API key and put
it in the backend's `.env` together with a verified sender:

```bash
# apps/backend/.env
RESEND_API_KEY=re_...
RESEND_FROM="DevCart <orders@yourdomain.com>"
STOREFRONT_URL=http://localhost:8000
STORE_NAME=DevCart
```

`RESEND_FROM` must be a sender Resend has verified. For a first local test, Resend's shared sender
`DevCart <onboarding@resend.dev>` works, but it only delivers to the address the Resend account is
registered with; verify a domain for anything else.

`STOREFRONT_URL` is where the links in emails point. It has no country code: the storefront middleware
adds the visitor's region. On a deployed storefront it must be the public URL.

**2. Restart the backend.** It picks the provider at startup. When both `RESEND_API_KEY` and
`RESEND_FROM` are set the Resend provider takes the `email` channel; otherwise the local provider does.
Only one provider may answer for a channel, so the choice replaces the fallback rather than adding to it.

**3. Test both flows.**

| Flow | How to trigger it | What arrives |
|------|-------------------|--------------|
| Order confirmation (E1) | Buy something at <http://localhost:8000/dk/store> (manual payment is fine) | `Order #<n> confirmed` with the lines, totals and delivery address |
| Password reset (E2) | `/dk/account` → **Forgot your password?** | `Reset your <store> password` with a link valid for 15 minutes |
| Shipment notification (E3) | In the admin (`/app`), open an order → **Create fulfillment** → **Create shipment**, with a tracking number | `Order #<n> has shipped` with the parcel's items, tracking number/link and delivery address |

Shipment emails are sent per shipment, not per order: a partially fulfilled order gets
one when the first parcel leaves and another when the rest does. Passing `no_notification`
when creating the shipment suppresses it.

Each email is HTML with a plain-text fallback. The templates live in
`apps/backend/src/modules/notification-resend/templates/`, one module per email, sharing one layout.

**4. Testing without sending.** `RESEND_BASE_URL` points the provider at another host. A local stub
there receives the same JSON payload Resend would, which is how the E1/E2 checks were run without a
real key or a real inbox. Leave it empty in normal use.

**Known limits.** The email is a side effect of an event, so a failed send is logged and never fails
the order (that is E1's acceptance criterion) — which also means a delivery failure is not retried by
anything except the event bus. Clicking **Forgot your password?** for an address with no account is
answered exactly like a real one, on purpose. A shipment is emailed once per fulfillment: a retried
`shipment.created` is de-duplicated by the notification's idempotency key.

## 12. Promotion codes

The seed creates two codes the cart accepts, so the discount path is testable on a fresh install:

| Code | What it does |
|------|--------------|
| `DEBUG10` | 10% off the order, in every currency. |
| `FIVEOFF` | A fixed 5 off the order, in the region's default currency (EUR). A fixed discount has to name one. |

Apply one in the cart or the checkout summary under **Add promotion code**; the discount appears as a
line in the totals, and the codes already on the cart are listed with a remove button. An unknown or
ineligible code is reported rather than silently ignored. To change or add codes, edit `PROMOTIONS` in
`apps/backend/src/scripts/seed.ts` and re-run `pnpm run backend:seed` — existing codes are left alone,
and the admin's **Promotions** page can edit them too.

## 13. Product reviews

Customers write reviews on a product page; nothing is public until an admin approves it.

- **Storefront:** every product page has a **Reviews** section under the product (summary, rating
distribution, the approved reviews and, for a signed-in customer, the form). A signed-out visitor gets
a **Sign in** link that returns to the product afterwards. A review is written as `pending`, so the
customer sees a confirmation instead of their own words appearing.
- **Moderation:** open a product in the admin at <http://localhost:9000/app> — a **Reviews** widget on
the product page lists that product's reviews with **Approve** / **Reject**. Only approved reviews
reach the storefront. A rejected review can be written again by the same customer (their new attempt
reuses the row rather than creating a second review), and no customer can review the same product
twice while a review is pending or approved.
- **API:** `GET /store/products/:id/reviews` (approved only, `limit`/`offset`, with a `summary` of the
whole product), `POST /store/products/:id/reviews` (signed in, Zod-validated), `GET /admin/reviews`
(`product_id` / `status` filters) and `POST /admin/reviews/:id` with `{ "status": "approved" }` or
`"rejected"`.
- **Fresh install:** the catalogue starts with no reviews, which is the empty state the section shows.

Approval reaches a cached storefront page within a minute (the reviews read revalidates every 60 s).

## 14. Wishlist

A signed-in customer saves products with the heart and finds them again under **Account → Wishlist**.
No configuration is needed: the module ships with its migration.

- **Storefront:** every product plate and every product page's buy box has a heart (a `button` with
  `aria-pressed`, next to **Add to cart**). A signed-out tap sends the customer to sign in and returns
them to the page they were on. The wishlist page lists the saves with the region's prices, says which
variant was saved when one was, and removes a plate when its heart is tapped.
- **API:** `GET /store/wishlist` (the signed-in customer's saves, newest first), `POST /store/wishlist`
  with `{ "product_id": "…", "variant_id": "…" }` (`variant_id` optional; `201` for a new save,
  `200` with the existing row for a repeat), and `DELETE /store/wishlist/:id` (`204`). All three need a
  customer token; a save belonging to somebody else answers `404`.
- **One save per product per customer:** the row has a unique index on `(customer_id, product_id)`, so a
  double tap cannot produce two. Saving the same product again with a variant updates that row.
- **Fresh install:** every wishlist starts empty, which is the empty state the page shows.

## 15. Low-stock alerts

An hourly job mails the admin when stock is running out. It is off until an address is set.

- **Configuration** (`apps/backend/.env`): `LOW_STOCK_ALERT_EMAIL` (the recipient — the job does
  nothing without it), `LOW_STOCK_THRESHOLD` (default `5`, inclusive), `LOW_STOCK_ALERT_COOLDOWN_HOURS`
  (default `24`) and `LOW_STOCK_ALERT_SCHEDULE` (cron, default hourly). Restart the backend after
  changing them: the schedule in particular is read when the job is loaded.
- **What it reports:** every inventory level at or below the threshold, in one email, with the
  product and variant name, SKU, stock location and units left. Available means stocked minus
  reserved, so units already promised to an order do not make a level look healthy.
- **How often:** once per level per cooldown. A shortage that lasts a week produces one email, and a
  level that recovers and drops again inside the cooldown stays quiet. The dedupe lives in the
  `stock_alert` table (one row per item and location).
- **Failure:** if the provider refuses the mail, the run logs it and records nothing, so the next run
  tries again. In local mode (no `RESEND_API_KEY`) the notification is stored and logged instead of
  sent, which is enough to see it working.

## 16. Sales dashboard

The admin's **Orders** page opens with a **Sales** widget: revenue per currency, the order count and
five best sellers, for the last 7, 30 or 90 days.

- **API:** `GET /admin/sales-summary?from=&to=&limit=` (admin only). `from`/`to` are inclusive ISO
  timestamps and default to the last 30 days; a window longer than 366 days, a date that cannot be
  read or a backwards range is a `400`. Revenue is reported per currency, and draft and cancelled
  orders are excluded.
- **Reconciling:** the figures come from the same orders the list below shows. In SQL, an order's
  total is the latest `order_summary` version (`totals->>'current_order_total'`) — summing the table
  directly double-counts orders whose summary was rewritten.

### 16.1 The admin's landing page

The admin opens on **Dashboard** (`/app/dashboard`, linked from the sidebar under *Dashboard*)
rather than on Orders, for the last 7, 30 or 90 days:

- **Charts:** revenue per day with the window before it drawn behind as a dashed comparison, and a
  currency switch (`EUR` / `USD`) because the catalogue is priced in both — two currencies on one
  axis would add them up visually. A donut splits the people who bought into new and returning
  customers, the Orders card carries a sparkline of the same days, and **Satisfaction** shows the
  average approved rating with its five-star distribution. Charts are drawn with **recharts** (a
  backend dependency, bundled into the admin), animated on mount, and use the admin's own theme
  tokens (`--fg-interactive`, `--border-base`, …) so they follow its palette rather than a template's.
- **Cards:** revenue per currency, orders, new customers and orders still waiting to ship, each
  revenue/order/customer figure carrying its change against the window immediately before (a
  previous window of zero shows “no earlier window” rather than a made-up percentage).
- **Work:** orders waiting to be shipped, reviews pending approval with their product and stars, and
  the lowest stock levels; then **Top selling products** (units and revenue per currency, linking to
  the product), the five newest orders with payment and fulfillment badges, and buttons for the
  tasks that usually follow.
- **API:** `GET /admin/dashboard?from=&to=` (admin only) answers everything the page shows in one
  request, with the same window rules as §16, plus the previous window (`series.previous_*`,
  `previous`, `deltas`). Counts come from the modules' `listAndCount` (the Query API only reports a
  total when it filters across modules, so a count read from a page of rows would be the page size),
  and the order badges come from Medusa's own `getOrdersListWorkflow`, so they match the Orders page.
  Days are bucketed in `src/api/admin/dashboard/series.ts`; an order is only counted in the day it
  was placed, and the comparison arrays are padded to the same length so both lines share an axis.
  Reviews and stock are counted across all time; shipments and sales over the orders in the window.
- **Why the landing is decided in HTML:** Medusa's dashboard hardcodes its home route as a redirect
  to `/orders`, and a custom admin route cannot claim that path. `admin-landing.ts` injects a small
  script into the admin's HTML, registered in `medusa-config.ts`, that sends a load of `/app` to
  `/app/dashboard`, turns the post-sign-in navigation to `/app` into the same jump, and redirects the
  one navigation that leaves a directly opened `/app/login` for `/app/orders`. Other admin routes,
  Orders included, are untouched. If Medusa ever makes the home route configurable, that file and
  its two lines in `medusa-config.ts` are what to delete.

## 17. Order links

Orders are readable only by their owner or by a link minted for them. The order id is the address,
not the credential: `GET /store/orders/:id` used to answer anyone holding the id (Medusa ships that
route open so a guest can open their confirmation page), which also meant an order URL pasted into
another browser or leaked through a referrer exposed the customer's email, address and contents.

- **What guards it:** a backend middleware (`src/api/middlewares/ensure-order-access.ts`) lets a
  request through only when it is the signed-in customer the order belongs to, or when it carries a
  valid `x-order-access-token`. Everything else is answered as `404`, the same as a missing order.
- **The token:** `HMAC-SHA256(secret, "v1:<order id>:<expiry>")`, valid for 30 days and signed with
  `ORDER_ACCESS_SECRET`. The storefront mints it into the redirect after checkout and the backend
  mints it into the “View your order” links in the confirmation and shipment emails. It is derived,
  not stored, so no migration is involved.
- **Configuration:** `ORDER_ACCESS_SECRET` (at least 32 characters) in **both** `apps/backend/.env`
  and `apps/storefront/.env.local`. Different values mean every guest link is refused. Rotating it
  revokes every link already sent; a signed-in customer still sees their orders under Account.
- **Referrer:** `/…/order/…` responses carry `Referrer-Policy: no-referrer`, so the token is not
  handed to the next site a visitor opens. Do not add third-party scripts to those pages.
- **Not a login:** a token proves the holder was given the link. It does not prove who they are,
  and it expires — the account pages remain the way to see an order after that.

## 18. Guest email verification

A guest proves they can read the address they are checking out with before an order is created. A
signed-in customer does not: their address already belongs to an account, and the order is tied to
that account.

- **Where it happens:** the contact step mails a six-digit code and holds the customer there until
  it is typed back. Addressing, delivery and payment come after it, so an unusable address costs a
  customer nothing but a minute. `POST /store/carts/:id/complete` re-checks the proof, so a script
  cannot skip the step and create an order (or charge a card) without it.
- **The storage:** the `email_verification` table holds one row per address — an HMAC of the live
  code (never the code), its expiry, the failed attempts and the send counters. The migration is
  part of `medusa db:migrate` (or `pnpm exec medusa db:migrate`); nothing is stored on the cart or
  the order.
- **The token:** a confirmation returns `v1.<expiry>.<HMAC(secret, "v1:<email>:<expiry>")>`, valid
  for 7 days. The storefront keeps it in an HttpOnly cookie and sends it as
  `x-email-verification-token` when the cart is completed. The address is part of what is signed,
  so a token cannot be moved to another address, and the backend is the only side that checks it.
- **Limits:** one code a minute per address, five an hour per address, five wrong attempts per
  code (the fifth burns it), and twenty requests per caller IP per ten minutes. The per-address
  limits live in the table and survive a restart; the per-IP one is in memory and therefore per
  instance (behind several instances it is that many times looser). A code expires after ten
  minutes and works once.
- **Configuration:** `EMAIL_VERIFICATION_SECRET` (at least 32 characters) in `apps/backend/.env`.
  Generate one with `openssl rand -hex 32`. Without it the code request answers `502` and logs why;
  it never falls back to a value from the repository. No storefront variable is needed.
- **Mail:** the message is this project's own template (`email-verification` in
  `src/modules/notification-resend/templates/`), so the copy is reviewed with the code. It contains
  the code and nothing else — no order, cart or address, because the recipient has not proved they
  can read the inbox yet.
- **Following it locally:** with no `RESEND_API_KEY` the local notification provider stores and logs
  the mail, and the code appears in the backend log as
  `… template: 'email-verification' … "code":"123456"`. To exercise the real Resend provider
  without sending, point `RESEND_BASE_URL` at a local stub that accepts `POST /emails`.

## 19. Product import/export, files and the workflow engine

The admin's **Export** and **Import** buttons on Products are background
workflows: export streams a CSV through the file module, import waits for its
confirmation and reports the result as a dashboard notification. Three pieces of
configuration make that work (all in `apps/backend/medusa-config.ts`):

- **File module with the local provider.** Required by export (the CSV is
  written to `apps/backend/static` and linked from the completion
  notification) and by the admin's upload endpoint that import uses. Set
  `MEDUSA_BACKEND_URL` to the origin a browser can reach — download links are
  built as `<MEDUSA_BACKEND_URL>/static/<file>`; it defaults to
  `http://localhost:9000`. Uploads are public; for production put an S3/R2
  provider in front of the same module instead of `file-local`.
- **Feed notification provider.** The dashboard bell reads the `feed` channel.
  Naming any notification providers replaces the module's defaults, so the
  feed provider is listed next to the email one (`notification-local` on
  `feed`); without it the export/import notifications have nowhere to go and
  the workflows that send them fail at the last step.
- **Rate limits.** Sign-in, registration, password reset, newsletter sign-ups,
  review writes and wishlist changes are limited per caller, and the counters
  live in Redis when `REDIS_URL` is set so every instance shares one window
  (without it they count in the process's memory). A Redis that is down does
  not block anything: the limiter falls back to memory and logs one warning,
  because a limiter must not be able to take checkout down. The limits and the
  message each one shows are in `src/api/middlewares.ts`.
- **Redis workflow engine.** Export marks its step `backgroundExecution` and
  import waits for a confirmation step; the in-memory engine cannot resume
  either, which left the dashboard on *We are processing your export* forever
  and the import unconfirmed. With `REDIS_URL` set (the local
  `docker compose up -d` and the production deployment both provide it) the
  backend uses `@medusajs/medusa/workflow-engine-redis`. Without `REDIS_URL`
  the in-memory engine is kept so a bare checkout and the test suites still
  boot, and those two admin features are unavailable.

No new environment variable is required locally; `MEDUSA_BACKEND_URL` is
optional. Import/export need the backend restarted after changing either one.

The CSV rules and the catalogue walkthrough are in [CATALOG.md](./CATALOG.md).

## 20. Health checks and keep-alive pings

Three endpoints answer, and they answer different questions:

| URL | What it checks | Use it for |
| --- | --- | --- |
| `GET :9000/health` | The backend process (Medusa's own route) | A load balancer deciding whether to send traffic |
| `GET :9000/health/ready` | The backend process **and** one `select 1` against Postgres | Uptime monitoring and keep-alive pings |
| `GET :8000/api/health` | The storefront process, and nothing else | Uptime monitoring and keep-alive pings |

All three are public and unauthenticated, because a monitor cannot hold a session. The two custom
endpoints send `Cache-Control: no-store` and a small JSON body (status, service or database, time; the
readiness endpoint adds the query's latency). `/health/ready` answers **503** when the database cannot
answer, and keeps the driver's reason in the server log rather than the response.

```bash
curl -s http://localhost:9000/health/ready   # {"status":"ok","database":"up","latency_ms":1,...}
curl -s http://localhost:8000/api/health    # {"status":"ok","service":"storefront",...}
```

### Keeping a free-tier deployment awake

Hosts that suspend an idle service usually sleep it after 10–15 minutes of no traffic. A scheduler such
as [cron-job.org](https://cron-job.org) can hold it open with two jobs, both `GET`, both expecting `200`:

| Job | URL | Schedule |
| --- | --- | --- |
| Backend | `https://<backend-host>/health/ready` | Every 10 minutes |
| Storefront | `https://<storefront-host>/api/health` | Every 10 minutes |

Point the backend job at `/health/ready` rather than `/health`: it wakes the database too, which matters
when the Postgres itself is a free tier that suspends on inactivity. The storefront job deliberately
hits an endpoint that does **not** call the backend — otherwise a backend cold start would make the
storefront look down, and the monitor would be measuring the wrong service. Give each job a 30-second
timeout: the first request after a suspension is the one that pays the cold start.

A ping is not a substitute for a paid plan. Free tiers still throttle, cold-start and restart, and some
sleep regardless of traffic; the ping keeps a demo, a staging shop or a low-traffic store reachable,
not a shop that must not drop a request.

## Verification checklist

With both apps running:

1. `curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/health` prints `200`.
2. <http://localhost:9000/app> loads the admin dashboard and the login succeeds.
3. <http://localhost:8000> loads the storefront, with the store name in the navigation and browser tab.
4. <http://localhost:8000/dk/design> renders the design system reference.
5. The admin dashboard lists products under Products, and the storefront lists them at
   <http://localhost:8000/dk/store> after `pnpm run backend:seed`.
6. Adding something to the cart and applying `DEBUG10` at <http://localhost:8000/dk/cart> shows a
   discount line and a total reduced by 10%. Removing it puts the total back.

## Quality checks

```bash
pnpm run lint        # both apps
pnpm run typecheck   # both apps
pnpm run build       # both apps
```

These are the same commands CI runs.

The backend's Jest suites (`test:unit`, `test:integration:modules`, `test:integration:http`) need a
reachable Postgres and its credentials. They read them from `apps/backend/.env.test`, which is not
committed; create it next to `.env` with the same database host, port, user and password:

```bash
# apps/backend/.env.test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

Then, from `apps/backend`:

```bash
pnpm run test:integration:modules   # module service suites (the review and wishlist modules)
pnpm run test:integration:http      # HTTP suites, boot a full app against a test database
```

The runners create their own databases and drop them afterwards; they never touch `DATABASE_URL`'s
data. A storefront build without a reachable backend logs a
`fetch failed` warning while generating product paths and still succeeds — the affected pages render
on demand instead.

> **Do not run the build while the dev server is running.** `next dev --turbopack` and `next build`
> write to the same `apps/storefront/.next` directory, so a build clobbers the running dev server's
> chunks and every page starts returning 500 with `Cannot find module '[turbopack]_runtime.js'`.
> Stop the dev server before building, or delete `apps/storefront/.next` and restart it afterwards.

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `Missing required environment variables` on storefront start/build | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is unset in `apps/storefront/.env.local`. |
| Storefront shows an empty catalogue | Region or publishable key missing. Check the region's currency and that the key is linked to a sales channel. |
| `fetch failed` when the storefront renders | Backend is not running or `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is wrong. |
| Backend exits at startup with a connection error | Postgres is not reachable at `DATABASE_URL`, or migrations have not run. |
| Checkout offers only **Cash on delivery** after adding a Stripe key | One of: the backend was not restarted (it registers the provider at startup), the seed was not re-run (the region is what lists providers), `pp_stripe_stripe` is missing from `ENABLED_PAYMENT_PROVIDERS` in `apps/storefront/src/lib/constants.tsx`, or the storefront was not restarted (`NEXT_PUBLIC_*` is read at start). |
| Payment step shows a placeholder card and Continue stays disabled | The Stripe session could not be created or the element failed to load; the step reports the reason above the button. Check that `NEXT_PUBLIC_STRIPE_KEY` and the backend's `STRIPE_API_KEY` are from the same account and that `pk_test_` was used, not `sk_test_`. |
| No email arrives, and the backend log shows `Attempting to send a notification to` | No `RESEND_API_KEY`/`RESEND_FROM` in `apps/backend/.env`: the local provider is active and nothing is delivered. |
| Resend answers `403` with `domain is not verified` | `RESEND_FROM` uses a domain that is not verified in Resend. Use a verified sender, or Resend's shared `onboarding@resend.dev` for a test to your own address. |
| A reset link says it expired | Reset tokens live 15 minutes and are single-use; the second click on the same link is refused. Ask for a new link. |
| An order link says the order was not found | The link is older than 30 days, its token was truncated by a chat client, or `ORDER_ACCESS_SECRET` differs between `apps/backend/.env` and `apps/storefront/.env.local` (guest links only; a signed-in customer sees the order under Account). |
| **Continue with Google** says it is not set up | The backend has no `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` or `GOOGLE_CALLBACK_URL` in `apps/backend/.env`, or it was not restarted after adding them (they are read once, at startup). |
| The contact step says the code could not be sent | `EMAIL_VERIFICATION_SECRET` is missing from `apps/backend/.env` (it must be at least 32 characters), or the mail provider is misconfigured. The backend log names the reason. |
| A verification code is refused before it can be typed | Codes expire after 10 minutes, work once, and are replaced by a resend. “Too many incorrect codes” means ask for a new one — the old one is burned. |
| Google answers `redirect_uri_mismatch` | The OAuth client's Authorized redirect URI and `GOOGLE_CALLBACK_URL` must be the identical string — locally `http://localhost:8000/api/auth/google/callback`. |
| Export stays on *We are processing your export*, or an import never finishes | The backend has no Redis workflow engine: `REDIS_URL` is unset, or the backend was started before it was added. Set it, restart, and the background steps run (§19). |
| Product export/import answers 500 with a missing file module | The `file` module was removed from `medusa-config.ts`; it is what stores the exported CSV and receives imported uploads (§19). |
| `medusa start` fails with `Could not find index.html in the admin build directory` | It serves `public/admin` relative to the working directory. Locally run `pnpm run backend:dev` (`medusa develop`), which serves the dashboard itself; for a production start run from `.medusa/server` with its `.env` in place, as Medusa's deployment docs describe. |
| Redis warnings during build | Harmless: `redisUrl not found. A fake redis instance will be used.` only appears when `REDIS_URL` is absent. |
| Every storefront page returns 500 with `Cannot find module '[turbopack]_runtime.js'` | A production build ran while the dev server was running and corrupted `.next`. Delete `apps/storefront/.next` and restart the dev server. |

## Environment variables

- Backend: [`apps/backend/.env.template`](../apps/backend/.env.template)
- Storefront: [`apps/storefront/.env.template`](../apps/storefront/.env.template)

`.env` files are gitignored. Add new variables to the templates in the same change that introduces
them.
