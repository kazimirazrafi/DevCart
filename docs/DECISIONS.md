# Decisions

Why the code is shaped the way it is. Each entry is a choice that a later change is likely to question, with the reason it was made.

## Platform

**Medusa v2, self-hosted.** The shop needs products with variants and inventory, regions and currencies, carts, orders, payment and fulfilment. Those are Medusa's core; the custom parts are the modules listed below. There is no headless CMS and no separate search service, so the stack is Postgres, Redis, the backend and the storefront.

**Postgres with one warehouse of stock.** Inventory is tracked per variant with no location split: the number on a product page is the number the shop can ship. Adding a second fulfilment location is a Medusa configuration change, not a code change.

**Next.js App Router storefront, no UI kit.** Pages and data fetching are server components; interactivity is confined to small client components (cart drawer, option picker, checkout steps). Components come from the local design system in `src/modules/design-system` rather than an external kit, because the shop's look is a print-inspired system with square corners and a fixed three-colour riso palette.

## Backend

**Business logic in workflows, routes kept thin.** A route resolves input, validates it and runs a workflow; the workflow's steps do the work. This is Medusa's own pattern and it pays off twice: a workflow can be run from a subscriber, a job or a script, and a failing step rolls back the compensations of the ones before it. Any operation that writes to more than one module belongs in a workflow.

**Custom modules own their tables.** Reviews, wishlists, email-verification codes, stock alerts and newsletter subscriptions each have a module with a model, a service and a migration. Nothing is added to core Medusa tables, so a Medusa upgrade does not need a schema reconciliation. Relations to core entities (a review to its product and its customer) are module links, not foreign keys.

**Guest orders are read behind a signed token.** `GET /store/orders/:id` used to be readable by anyone holding an order id, and an order id is a URL. The storefront now mints a token with `ORDER_ACCESS_SECRET` after checkout; `ensure-order-access` verifies it before the order is returned. A customer with an account is checked through their auth context instead.

**Guest checkout proves the email address.** `POST /store/email-verification/request` issues a six-digit code, keyed by `EMAIL_VERIFICATION_SECRET`, that has to be presented before an order is placed. The gate lives in middleware (`ensure-email-verified`) rather than in the checkout components, so a modified client cannot skip it.

**Third-party providers register conditionally.** Stripe, Google sign-in and Resend are each added only when their credentials are present. A missing key leaves the feature off and the backend booting; without the guard, a provider that throws on a missing option takes the whole process down at startup. Because naming `providers` replaces a module's defaults, the defaults this project still needs (`auth-emailpass`, the local notification and file providers) are named back in the same array.

**Resend for transactional email, hand-written templates.** Medusa's default notification provider only logs. Notification templates are plain functions returning HTML in `src/modules/notification-resend/templates`, sharing a layout, so a new email is a new file and one `send` call. Templates are not stored in a hosted email builder: the text is versioned with the code that triggers it.

**Search is Medusa's own index, not a second service.** Product documents are built in `src/search` and queried through the Search API, so faceting, sorting and filtering come from the same API that serves the listing. A dedicated engine (Algolia, Meilisearch) would add a service, a sync job and a bill for a catalogue of a few hundred products.

**Cart and stock reads are deliberately uncached.** A server action writes the cart and immediately repaints it; a cached read can be served the entry from before the write, which showed up as a stale subtotal roughly once in ten cart changes. Both reads use `no-store` and pay for the round trip.

**Rate limits are in-process unless Redis is set.** With `REDIS_URL`, counters are shared by every instance; without it they live in the process, which is fine locally and looser behind several instances. Checkout and auth endpoints are the ones limited.

**Product import rewrites tag and category columns.** Medusa's importer reads those columns as ids, which is unusable for a spreadsheet of names. Middleware in `src/api/middlewares/resolve-import-tags.ts` resolves or creates tags and categories and rewrites the CSV before the import workflow sees it; the parsing and rewriting are pure functions in `src/lib/csv.ts` so they can be tested without a database.

**Admin customisations are a route and two widgets.** The sales overview is an admin route at `/app/dashboard` reading `GET /admin/dashboard`; product reviews and the product details editor are widgets injected into the product detail page. Both talk to the admin API through the admin SDK, never to Postgres.

## Storefront

**One design system, tokens in CSS variables.** Colours, spacing, radius and the focus ring are custom properties in `src/styles/globals.css`, surfaced to Tailwind as theme values. Dark mode inverts paper and ink by re-mixing the riso palette for a dark ground; no component names a mode. The preview page at `/{country}/design` shows every token and component, which is where a change to the system is checked.

**Region in the URL, currency from the region.** `/{countryCode}/...` keeps a shared link pointing at the same prices and the same catalogue. The middleware fills in a default region when one is missing.

**Server actions for writes, `lib/data` for reads.** Mutations live in server actions under `src/lib/data`, reads are plain async functions there too, and components call them rather than the SDK directly. This keeps the publishable key and the backend URL in one place.

**Prices are formatted where they are displayed.** The backend holds amounts in the region's currency's minor unit; `lib/util/money.ts` turns them into a string with the region's locale. No component does arithmetic on a formatted price.

## Testing

**Three backend layers, one browser layer.** Jest unit tests cover pure logic; module tests boot a real module against a throwaway Postgres; HTTP tests boot the whole app and call routes. Playwright drives the four journeys that involve money or auth, because those are the ones a unit test cannot prove. The storefront's pure helpers use `node:test`, so the browser test runner is not a dependency of a plain function.

**Tests create their own databases.** Integration suites use `DB_HOST`/`DB_USERNAME`/`DB_PASSWORD` rather than a single `DATABASE_URL` so they can create and drop a database per suite without touching the development one.
