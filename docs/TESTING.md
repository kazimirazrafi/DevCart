# Testing

Four layers, cheapest first. The backend has three (Jest), the storefront has two (`node:test` for pure helpers, Playwright for journeys).

## Backend

All backend suites need a reachable Postgres. Integration suites create and drop their own databases, so they use `DB_HOST`, `DB_PORT`, `DB_USERNAME` and `DB_PASSWORD` rather than a single `DATABASE_URL` — pointing them at a development database is not destructive.

```bash
cd apps/backend
pnpm run test                       # all three layers, in order
pnpm run test:unit                  # **/src/**/__tests__/**/*.unit.spec.ts
pnpm run test:integration:modules   # **/src/modules/*/__tests__/**
pnpm run test:integration:http      # **/integration-tests/http/*.spec.ts
```

Single file or single test: pass it through to Jest, keeping `TEST_TYPE`.

```bash
pnpm run test:unit -- src/lib/__tests__/csv.unit.spec.ts
pnpm run test:unit -- -t "rejects an expired code"
```

`TEST_TYPE` selects the `testMatch` pattern in `jest.config.js`; `REDIS_URL` is blanked for every suite so rate limits and queue state stay in-process and a test run leaves no keys behind.

| Layer | What it covers | Needs |
| --- | --- | --- |
| Unit (`*.unit.spec.ts`) | Pure functions and route-level reasoning: CSV rewriting, order-access tokens, verification codes, rate-limit keys, sales-summary arithmetic, dashboard series, low-stock selection | Nothing but Node |
| Module (`src/modules/*/__tests__/service.spec.ts`) | A real module against a throwaway database: review, wishlist and stock-alert services | Postgres |
| HTTP (`integration-tests/http/*.spec.ts`) | The whole app, routes called over HTTP with a publishable key: reviews, wishlist, newsletter, email verification, order access, rate limiting, sales summary, low-stock job | Postgres |

HTTP suites boot the Medusa application once per file (`setup.js` registers the test database helpers), so they take seconds rather than tens of milliseconds. A new route with a validator belongs in an HTTP suite; a decision that can be made from its inputs belongs in a unit test.

## Storefront

```bash
cd apps/storefront
pnpm run test                                    # node --test "src/**/__tests__/*.test.mjs"
pnpm run test -- src/lib/util/__tests__/payment-status.test.mjs
```

`node:test` only, no Jest and no DOM: the two suites (`payment-status`, checkout `steps`) assert on pure functions that decide what a customer sees, which is the part worth locking down without a browser.

## End to end

```bash
cd apps/storefront
pnpm run e2e                    # all four journeys
pnpm run e2e -- e2e/account.spec.ts
pnpm run e2e -- --headed        # watch it
```

Playwright starts its own pair of servers — the backend on 9001 and a production storefront build on 3001 — so a dev pair on 8000/9000 keeps running. It reads the existing `.env` files, empties `RESEND_API_KEY` and `REDIS_URL`, and waits for `/health` before building the storefront, because prerendering fetches from the API.

The four journeys, each of which needs a seeded catalogue:

| File | Proves |
| --- | --- |
| `guest-purchase.spec.ts` | Verify the email, add to cart, pay with Stripe's test card, land on the confirmation page, open the order again from the link |
| `account.spec.ts` | Register, sign in, place an order, come back later and see it in order history |
| `failed-payment.spec.ts` | A declined card leaves the cart intact, reports the decline and creates no order |
| `search.spec.ts` | The search drawer and the listing agree on what "shirt" returns, and filters narrow it |

They share one database and one backend, and each places orders, so `workers: 1` and `fullyParallel: false` are deliberate. Use the installed Chrome (`channel: "chrome"`), not a downloaded build.

## CI

| Workflow | Trigger | Runs |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Every push to `main` and every pull request | Production-dependency audit at `critical`, lint, typecheck, storefront unit tests, build; a second job runs all three backend suites against a Postgres service |
| `.github/workflows/e2e.yml` | Push to `main`, nightly, manual | Seeds Postgres, builds both apps, runs the four journeys. Without the two Stripe secrets it warns and skips rather than fails |
| `.github/workflows/lighthouse.yml` | Nightly | Production build against a seeded database, then `lighthouserc.cjs` on the pages with performance budgets |

CI copies both `.env.template` files into place before anything runs, so a suite that depends on a literal value is caught by the template being wrong rather than by a developer's local file.

## Before calling a change done

- `pnpm run lint`, `pnpm run typecheck` and `pnpm run build` from the root.
- The suite that covers the changed code — a route change means its HTTP spec, a module model change means a module spec, a pure helper means a unit test.
- If the change touches checkout, auth or the cart, one browser journey: those are the paths where a green unit test says little.
- A design-system change needs the preview page (`/{country}/design`), which renders every token and component in both themes.
