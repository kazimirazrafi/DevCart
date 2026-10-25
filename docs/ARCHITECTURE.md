# Architecture

Two applications share one PostgreSQL database. The backend owns the data and the business rules;
the storefront reads and writes it through Medusa's store API and a small set of its own routes.

```
storefront (Next.js)  ->  Medusa store API  ->  PostgreSQL
        |                       |                   |
        |                       +-> Redis           +-> search index
        |                       +-> Stripe
        |                       +-> Resend
        +-> admin (served by the backend at /app)
```

## Backend

A Medusa v2 application. Routing is file based: `src/api/<scope>/<path>/route.ts` exports HTTP
methods, and the admin dashboard is served from the same process at `/app`.

- `src/api/store` and `src/api/admin` hold the custom routes. Everything else in the store and admin
  API comes from Medusa itself.
- `src/workflows` holds the business logic that is more than one write. Routes and subscribers call
  a workflow rather than several module methods in a row.
- `src/modules` holds custom modules, each with its own models, service and migrations.
- `src/links` defines the joins between custom modules and Medusa's product and customer modules.
- `src/subscribers` reacts to events (`order.placed`, password reset, shipment created).
- `src/jobs` holds scheduled work; `src/search` prepares documents for Medusa's search index.
- `src/api/middlewares.ts` wires authentication, rate limits and the per-route middlewares.
- `src/scripts` holds the seed scripts and maintenance commands.

### Custom modules

| Module | What it stores | Why it exists |
|--------|----------------|---------------|
| `review` | Rating, title, body, author, status per product | Product reviews are moderated, so they cannot be product metadata |
| `wishlist` | Customer to variant rows | Needs its own indexes and a per-customer uniqueness rule |
| `email-verification` | Hashed codes, attempts, expiry, verified tokens | Guest checkout proves the address without creating an account |
| `newsletter` | Subscribed address, source, timestamps | Kept separate from customers |
| `stock-alert` | Which products have been alerted and when | The low-stock job must not mail the same product every hour |
| `notification-resend` | Notification provider | Sends the transactional email templates through Resend |

The review and wishlist modules are linked to products and customers through `src/links`, so the
admin and the store API can query across them.

### Custom API routes

| Route | Purpose |
|-------|---------|
| `GET /store/reviews/summary` | Catalogue-wide rating summary |
| `GET, POST /store/products/:id/reviews` | Published reviews for a product, and writing one |
| `GET, PATCH /admin/reviews`, `GET /admin/reviews/:id` | Moderation queue |
| `POST /store/email-verification/request`, `POST /store/email-verification/confirm` | Guest address proof |
| `POST /store/newsletter` | Subscribe |
| `GET, POST /store/wishlist`, `DELETE /store/wishlist/:id` | Wishlist |
| `POST /store/auth/reset-password` | Password reset token exchange |
| `GET /admin/dashboard`, `GET /admin/sales-summary` | Dashboard figures |
| `GET /health`, `GET /health/ready` | Liveness and readiness |

### Middleware worth knowing

- `rate-limit.ts` limits the routes a stranger can hit without a cart or account: sign-in,
  registration, password reset, verification codes, newsletter, review writes and wishlists. Counters
  live in Redis when `REDIS_URL` is set, so the limit is shared by every instance; without it they
  fall back to process memory. A Redis outage does not block requests.
- `ensure-order-access.ts` makes the order id alone insufficient to read an order. The owner, a signed
  token or the guest's session is required.
- `ensure-email-verified.ts` stops a guest cart from completing before the address is confirmed.
- `resolve-import-tags.ts` and `resolve-import-categories.ts` rewrite a product import file before the
  import workflow reads it, so tag and category columns can hold names instead of ids. The parsing and
  rewriting live in `src/lib/csv.ts` and are unit tested.

### Workflows

The ones that carry a rule rather than a single write: creating, moderating and reading product
reviews, adding and removing wishlist items, requesting and confirming an email code, subscribing to
the newsletter, resetting a password, and linking an email/password identity to a customer.

Workflows also run product import and export. Both are asynchronous and report through the admin's
notification feed, which is why Redis is part of the stack.

### Search

`src/search/product.ts` builds the document Medusa indexes: title, handle, description, categories,
tags, collection, type, price per currency, availability and rating. Listing pages and the storefront
search box read that index rather than the products table, so a product has to be in the publishable
key's sales channel to appear. `src/scripts/refresh-catalogue.ts` repairs both problems: it attaches
channel-less products and rebuilds the index.

### Admin extensions

- `routes/dashboard` is the admin landing page: revenue, orders, customers, stock, and the series
  behind them.
- `widgets/sales-summary.tsx` shows the same numbers on the store page.
- `widgets/product-details-editor.tsx` is the rich-text editor for `metadata.details`, the long-form
  section under the product photos.
- `widgets/product-reviews.tsx` is the moderation queue on the product page.
- `admin-branding.ts` and the shims in `admin-landing.ts` patch the compiled dashboard at the page it
  boots from: the brand mark, the dashboard landing route, the details field on the create page, the
  import template link and the inventory search focus. They exist because Medusa 2.21 exposes no
  widget slot for those places.

## Storefront

Next.js App Router. Pages under `src/app/[countryCode]` are server components; mutations are server
actions. Anything that needs browser state is a client component under `src/modules`.

- `src/lib/data` is the only layer that talks to the Medusa SDK. Pages and actions import from it.
- `src/lib/data/cookies.ts` holds the auth and cart cookies, and the cache tags used for revalidation.
- `src/modules` groups components by domain: layout, home, products, cart, checkout, order, account,
  store, categories, collections, legal.
- Route groups: `(main)` carries the navigation and footer, `(checkout)` is the narrower checkout
  shell, and `account` renders a login slot beside the dashboard slot.
- `middleware.ts` handles region prefixes and keeps a signed-out visitor's target in `?redirect=`.

### Rendering and caching

Product, category and collection pages are cached by tag and revalidated when the data behind them
changes. Customer, cart and order data is never cached, because the same URL is served to different
people behind different cookies; those reads are explicitly `no-store`. The storefront's own health
route reports whether it can reach the backend.

### Search and filtering

The listing uses InstantSearch over the Medusa search API. Query, refinements, price range, sort and
page are URL state, so a filtered listing is linkable. The search box in the navigation uses the same
index.

### Checkout

One page with four steps: contact, address, delivery and payment. A guest proves their email with a
code before the cart can be completed; an account skips that step. The review step reads back what the
earlier steps gathered, and payment is handled by Stripe's payment element for cards or by the manual
provider for cash on delivery.

### Design system

`src/modules/design-system` holds the primitives used across the shop, and the design tokens live in
`src/styles/globals.css` and `tailwind.config.js`. A reference page at `/{country}/design` renders the
palette, type scale, spacing and components.

## Testing

- Backend unit tests (`pnpm run test:unit`) cover the pure parts: CSV rewriting, review input, rate
  limiting, order access, email verification and the sales aggregation.
- Backend module and HTTP suites boot a real Medusa application against PostgreSQL and exercise the
  routes with real sessions and carts.
- Storefront unit tests use `node:test` for the pure helpers (checkout steps, payment status, product
  option filters).
- Playwright covers four end-to-end flows against a built storefront and a seeded database: a guest
  purchase, an account order, search, and a declined card.

## Files and storage

Uploads and CSV exports use Medusa's file module. Locally it writes to `apps/backend/static` and serves
that directory at `/static`. With `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` set, the
same module uses S3 or an S3-compatible bucket instead, and the local directory is only used for the
import template.
