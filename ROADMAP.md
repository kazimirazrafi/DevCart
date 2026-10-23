# DevCart — Roadmap tracker

`docs/PROJECT_SPEC.md` is the ground truth for what to build and in what order. This file only tracks
progress against it: what is done, what is in flight, what is left. If this file and the spec disagree,
the spec wins.

Legend: `[x]` done and verified · `[~]` in progress / partially done · `[ ]` not started · `[!]` blocked

Last updated: P1.0, P1.0b, C1, C2, C3, C4, C5, C6, C7, K1, K2, K3, K4, K5, K6, K7, A1, A2, A3, A4, the Phase 1 states pass, the Phase 2 SEO baseline, E1, E2, E3, §5.5 Option A (product reviews), Option B (wishlist), Option C (low-stock alert), Option D (sales summary), the catalogue expansion, the Phase 3 accessibility pass, both the accessibility and performance passes re-run on 23 October 2026 after the homepage, footer, legal-page and sign-in work, the listing's serverside render, the decision to keep the listing's instant client-side filtering and record its 81–87 simulated score rather than rewrite the facets to URL state, the Phase 3.5 production-hardening backlog, and its first four items (the backend suites in CI, the security headers with the report-only CSP, rate limiting that is shared through Redis and covers the auth and write endpoints, the structured data the catalogue already supported, the backup and restore drill, the dependency and performance gates, the health endpoints for uptime checks and free-tier keep-alive pings, and the deployment guide for Vercel, Render, Supabase and Upstash).

---

## Phase 0 — Foundation

Exit criteria: fresh clone + `docs/SETUP.md` → both apps run; CI green.

- [x] **P0.1** Inspect starter; report on structure, versions, integrations, gaps. Design plan in `docs/DESIGN.md`.
- [x] **P0.2** Document exact local commands in `docs/SETUP.md`.
- [x] **P0.3** `docker-compose.yml` (Postgres, Redis; Meilisearch behind an opt-in profile).
- [x] **P0.4** `.env.template` files updated; `.gitignore` covers secrets.
- [x] **P0.5** Starter branding removed; store name/metadata from env.
- [x] **P0.6** CI skeleton: install, lint, typecheck, build for both apps.

**Phase 0 exit criteria met:** both apps run locally from the documented commands, and lint,
typecheck and build all pass for both apps from the repository root (the same commands CI runs).

## Phase 1 — Core Store MVP

Tasks: seed data (§5.6) → C1–C5 → K1–K5 → A1–A2 → responsive + states pass.

- [x] **P1.0** `src/scripts/seed.ts`: DevCart catalogue (23 products, 5 categories, 3 collections), re-runnable (§5.6). Run with `pnpm run backend:seed`. Verified against a fresh migrated database: first run creates the catalogue and search index, second run leaves the catalogue counts unchanged. Backend typecheck, lint and build pass; admin, storefront and product routes return 200.
- [x] **P1.0b** Catalogue enlarged to a shop-sized range: **53 products across 10 categories** (the original 23 dev-merch pieces plus 30 wardrobe lines — shirts, dresses, footwear, bags, sunglasses and earrings), all with real photography, eur/usd prices, variants and stock. `CATALOGUE` in `src/scripts/seed.ts` gained the new items, the new categories and their handles; the photography is fetched from the open dummyjson demo catalogue through the one `demoShots` helper (each product's own photo set, so no two products share an image), and footwear gets its own `Shoe Size` option because the shared `Size` is apparel S/M/L/XL. Adding 30 products surfaced three seed defects, all fixed rather than documented: **the starter's legacy category `shirts` was deleted after the catalogue had re-used that handle** (the legacy sweep now skips any handle `CATEGORIES` owns, and a catalogue product that has lost its category or every sales channel is put back — a product with no channel is invisible to the storefront and to search, which is how `hello-world-tee` had gone missing); **the shared `Color` option swallowed a product's own colours** (`Option value Blue does not exist for option Color` — a product is now only linked to a shared option whose values can actually express it, and gets its own exclusive one otherwise); and a mis-typed `options: SIZE` entry. Verified on the **production** build after a cache-cleared rebuild, 21/21 + 22/22 checks with the Store API as the independent source: the listing enumerates all 53 products over 5 pages (12/12/12/12/5, no repeats, every plate's photo loaded, 30 of them served from the demo CDN), `blue-check-flannel-shirt` shows its own title, €32, four sizes and a 9-photo gallery, choosing M writes a `v_id`, `/categories/shirts` lists exactly its four products, home lists all ten categories, the sitemap carries 68 URLs, sneakers (EU 39–44) and a single-variant tote both add to the cart with the right line and price, and there is no horizontal overflow at 360/768/1280 on the listing, a product page or a category page with no console errors. Seed re-runs are still no-ops ("Every catalogue product already exists"), and `tsc`, `medusa lint` and `next build` pass. Caveats below.
- [x] **C1** Homepage — hero, featured products, category links, collection section. Data comes from Medusa (`/store/products`, `/store/product-categories`, `/store/collections`). Hero takes the newest product or falls back to a yellow plate; categories and collections each have an empty state; a failed catalogue load renders an in-page error instead of a 500. Verified in the browser at 360 / 768 / 1280: no horizontal overflow, 3 collection rails of 3 plates each, all category and collection links present.
- [x] **C2** Product listing — grid, image/title/price, loading + empty states. The listing is the starter's search-driven `/store` page, kept and restyled onto the design-system `Plate`: 12 plates per page from a 23-product catalogue, pagination through InstantSearch URL state (`?product[page]=2` → 11 plates, `aria-current` and a `nav[aria-label="Pagination"]` landmark), formatted prices per plate, skeleton plates while a query is in flight, and "No products matched these filters." for an empty result. A search backend that never answers now shows an error with a **Try again** button after 10s instead of an endless skeleton (verified by blocking `/store/search`). Verified against the production build served on the CORS-allowed origin.
- [x] **C3** Category & collection pages — resolve by handle, 404 for unknown handle. Both routes resolve the handle through the Store API and render only the products the API reports for that id: every category and collection was compared against its API membership and matched exactly (the `everyday-basics` collection spans two pages, 14 of 14 products). Unknown handles returned HTTP 404 with the storefront's own not-found page (nav, footer, display heading, links back to the catalogue) — since the states pass added route-level `loading.tsx` files, the same page is served with HTTP 200; see the standing note on soft 404s. Rebuilt on the design system: display heading, breadcrumb for nested categories, child-category strip, heavy rule, plate grid matching the `/store` listing, page-param pagination with `aria-current` and a `nav[aria-label="Pagination"]` landmark, and an empty state when a filter matches nothing (verified through `?optionValueIds=` with an unknown value). Verified against the production build served on the CORS-allowed origin, at 360 / 768 / 1280.
- [x] **C4** Product detail — gallery, variant selectors, per-variant price, stock state. Rebuilt on the design system: square main image with a thumbnail strip (click swaps the image, thumbnails expose `aria-pressed` and a label), name as the page's only `h1` in the display face, price in mono, option chips grouped in labelled `fieldset`s that resolve to a variant and write `v_id` into the URL, a stock line beside the price (`In stock`, `Only N left` under five units, `Out of stock`), and an add-to-cart button that is disabled whenever no complete variant is selected or that variant cannot be bought. Verified with real data: `hello-world-tee` (Colour × Size, 8 variants) resolves a distinct variant id per combination, and `race-condition-hoodie` size M shows `Only 5 left` with the button enabled while size XL shows `Out of stock` with the button disabled — inline, in the sticky phone bar, and in the mobile option sheet. Also: unknown handles now render the storefront 404 view instead of the bare root one (the `notFound()`-in-`generateMetadata` trap) — see the soft-404 standing note for the status, the product page loads four related plates, and the spec table and shipping copy are on the design tokens. Verified against the production build at 360 / 768 / 1280 with no horizontal overflow.
- [x] **C5** Sort & filter — newest/price, category, price range, reflected in URL. Verified both directions against the Store API as the independent source of truth: every sort, filter and combination was loaded from a URL (URL → state) and driven by clicking the controls (state → URL). Newest (`created_at:desc`), price ascending and price descending each return the same 12 products the API expects, with prices monotonic; `everyday-basics` and `sweatshirts-hoodies` sort identically on the category and collection pages through their own `sortBy` parameter. Price range filters exactly as expected (from €40 → 11 products, up to €20 → 3, €20–50 → 12) and the slider is keyboard-operable, refining on release. Category filter returns the 7 T-Shirts, and combinations (category + range + sort) compound correctly with a chip per active filter. Two caveats recorded below: a price tie can swap the last slot on a page, and the search-driven `/store` keeps InstantSearch's parameter names.
- [x] **K1** Cart — add/remove/quantity, persists across reload, stock errors handled. Rebuilt on the design system (plates and rules, mono money, display headings) and verified on the production build against the Store API as the independent source: adding from the product page puts `Cart (1)` in the nav and opens the cart drawer with the line and its subtotal within 608 ms; the cart page's subtotal, taxes, total and every line total equal the API's figures after each add, quantity change, removal and reload (5/5 steps), and the same cart id cookie survives the reload. Quantities offered are stock-derived — `race-condition-hoodie` size M offers 1–5, what the API reports for that variant. Stock paths, with stock moved through the Admin API so the Store API really changes: a quantity the API rejects leaves the line at the quantity the cart holds, with "There isn't enough stock left for that quantity. Lower it and try again." in the row, and a line holding 2 of 1 left is flagged ("Only 1 left. Lower the quantity to continue."), blocks checkout, and clears both once lowered; a product page prerendered when stock was 5 still offers the add and reports the same rejection inline. Two runs of the stock pass agreed exactly; no console errors, and no horizontal overflow at 360 / 768 / 1280.
- [x] **K2** Checkout steps — email → address → shipping → payment → review, validation, back without data loss. The checkout is now the five-step sequence the spec names, rebuilt on the design system, and its state is *derived* rather than stored: the URL names the step (`?step=`) and the cart decides whether that step is reachable, so `/checkout` with no parameter lands on Contact, `?step=payment` before an address is redirected back to Contact, and an already-answered step stays editable. A numbered stepper (DESIGN.md §4 permits numbers for checkout steps) links only to reachable steps and shows the rest as locked; every step is a shared `StepSection` that collapses to its own summary once answered. Email moved out of the address form into its own Contact step. Validation is the server's job — `setCartEmail` and `setAddresses` re-check every field and return messages keyed by input name — with the browser's `required`/`type=email` only catching the empty case in front of them. `setCartEmail`, `setAddresses`, `setShippingMethod`, `initiatePaymentSession` and `placeOrder` now return `{ ok, message }`/field errors instead of throwing, joining the cart's mutators (so K4's declined card can show its own copy in production). Verified twice on the production build with the Store API as the independent source, 72/72 checks both times, the two runs differing only in the order id: the cart's own checkout button deep-links to the first unfinished step; an email the browser accepts but the server rejects (`a@b`) is caught and stays in the field; a whitespace-only city is rejected with the row still holding what was typed and nothing written to the cart; a valid address puts the street, postal code and a billing address on the cart; a billing address that differs from the shipping one is validated field by field, rejected while incomplete, kept through the rejection, and stored on the cart; choosing a method writes it to the cart and enables Continue; payment writes a pending `pp_system_default` session and review reads back email, address, method and provider; walking back from review to the address step shows the saved values, and re-saving the address keeps the shipping method and the payment session; placing the order from review lands on `/order/:id/confirmed` with the order rendered (the confirmation page's own contents are K5's). No console errors; no horizontal overflow at 360 / 768 / 1280.

The four defects this turned up, fixed rather than documented: **`<li>` inside `<tbody>`** — the summary re-used the cart's line-item list item inside the starter's `Table`, so the browser hoisted it out of the table and every checkout page logged React #418 and re-rendered its whole tree on the client; the summary is a list now. **A rejected field was wiped** — React resets an uncontrolled field once a form action runs, so the email the customer had to correct came back empty; it is controlled. **A rejected address silently checked the billing box again** — the same reset put the checkbox back to its mount-time state while React's state still said unchecked, so the next submit sent "billing same as shipping" and threw away the billing address the customer had typed; the toggle now re-asserts the chosen state when a result arrives. **A one-provider region needed a pointless click** — payment opened with nothing selected and Continue disabled; the cart's active session, or the first provider the region offers, is preselected.
- [x] **K3** Guest + logged-in checkout, address prefill. The checkout now knows who is asking. A cart started against an authenticated session arrives with the customer's email and `customer_id` on it (Medusa sets both when the cart is created), so the Contact step says "Signed in as <email>", offers no sign-in link, and the customer lands on the address step; the address step seeds its fields, its country select and its saved-address picker from the default shipping address before anything is typed. A customer with no saved address in the region gets the empty form a guest gets, and the guest checkout itself is unchanged — the K2 suite's 78 checks still pass against the same build. Verified on the production build with the Store API as the independent source, twice (41/41 both runs, differing only in the new order id): a wrong password reports "Invalid email or password" and leaves the customer signed out, the right one swaps the sign-in form for the account, and the browser's own `_medusa_jwt` reads back through `/store/customers/me` as the account under test (so the session is not a neighbour's); adding to the cart signed in produces a cart whose row the API reports with that customer's id and email; the contact step is prefilled with the account's email; the address step arrives filled with the saved address, the picker names it as chosen, and submitting it **unchanged** puts street, postal code, phone and country on both the shipping and billing side of the cart; delivery → payment → review reads the saved street back; placing the order yields an order whose `customer_id` is the account's, which appears in `/store/orders` for that account and as exactly the one order card on `/dk/account/orders` (page and API agreed on both the count and the display id). A second walkthrough joined the two flows: a guest cart started before signing in is attached to the account when the customer signs in from the checkout's own sign-in link, keeps its line, takes the account's email, prefills the saved address and completes as that customer's order. One defect turned up and was fixed rather than documented: **the prefill read back as "Choose an address"** — a saved address that never had a field holds `null` where an untouched input holds `""`, and the picker compares the two field by field, so the form was filled while the picker claimed nothing was chosen; the form's empty values are handed to the picker as null now. The picker also offers only the addresses the region can ship to: it listed every address the customer had saved, so an address from another region could be chosen and then rejected by the server. Caveats recorded below: the prefill takes the default shipping address (falling back to the first), a saved address is only recalled when its country is in the region being shopped, and that region filter is the one path not exercised with a real second region — the catalogue has a single region, so the picker's shorter list is only verified for the case it must still show.
- [x] **K4** Stripe payment — PaymentIntent via Medusa, Elements UI, declined-card handling. `medusa-config.ts` registers `@medusajs/medusa/payment-stripe` only when `STRIPE_API_KEY` is set, the seed reconciles `pp_stripe_stripe` onto the region, and the storefront maps that id to "Credit card". No session exists until the payment step opens, and the step creates its own (the customer never has to click the preselected card option), mounts the Payment Element from that session's client secret, and holds Continue disabled until the form is complete. Verified on the production build against real Stripe test-mode objects, three runs of 33/33 checks with identical labels: the session the step created on its own is a real `pi_…` PaymentIntent, and the element — driven with real mouse and keyboard input through its own cross-origin frame — takes the declined card (`4000 0000 0000 0002`) to a reported "Your card has been declined." with no order created, the same cart id, line and address, the same pending session to retry with, and the customer left on Review. The payment step then reopens (its own Edit link, where the card form is reachable) and `4242 4242 4242 4242` creates the order: `GET /store/orders/:id` reports it as the cart's, `authorized`, holding the PaymentIntent for `visa ****4242`, and the confirmation page renders that order number, total, card and method. K2 (78/78), K3 (41/41) and K3b (21/21) still pass against the same build, so the manual-provider path did not move. No console errors, and no horizontal overflow at 360 / 768 / 1280 with the card form mounted and at Review. The three defects this turned up, fixed rather than documented: **the payment element was unmounted at Review, so every card payment failed and failed silently** — the step's form rendered only while the step was open, and Place order lives on Review, exactly where the step collapses; Stripe refuses to confirm ("Invalid value for stripe.confirmPayment(): elements should have a mounted Payment Element") and the rejection escaped as an unhandled one, leaving the button spinning with nothing said. The form is hidden (`hidden`) instead of unmounted now. **A thrown `confirmPayment` and a failed `placeOrder` were both silent** — the rejection is caught and answered with copy and an enabled button, and `placeOrder`'s `{ ok: false }` result is read instead of only its thrown errors. **The confirmation's card line never rendered** — `payment-details` read `payment.data.card_last4`, which the Stripe provider never sets (it stores the whole PaymentIntent, so the card is at `payment_method.card.last4`); every Stripe receipt fell back to the paid-at line. A fourth defect was reported from a real attempt afterwards and fixed the same way: **a second card session replaced the first while the payment element stayed mounted, and Stripe answered the confirm with a bare "A processing error occurred."** Two things were wrong. The step's own checks asked for *the* pending session — the first one on the cart — rather than the selected provider's, so a manual session created earlier in the same checkout made the card step look sessionless and re-initiate a card session (canceling the live PaymentIntent with it) on every visit; the session is looked up per provider now, and only created when that provider has none, so coming back to the card option keeps the session, the intent and whatever was already typed. And nothing tied the mounted element to its session: react-stripe-js deliberately ignores changes to `clientSecret` — it is read once, when the Elements instance is created — so the element went on confirming the intent of a session that had already been canceled; `StripeWrapper` now keys the instance on the client secret, so a genuinely replaced session mounts a fresh element. Verified against the reported flow on the dev server (open Payment, look at the manual option, come back, pay): `"A processing error occurred."` before the change, 14/14 checks after it, including a session replaced behind the customer's back through the Store API — the element followed the new session and the order holds the new PaymentIntent rather than the canceled one. Removing only the `key` line puts that replacement case back to a Review with no order and no error copy, which is how the line was shown to be load-bearing. K4's own 33 checks still pass against the same server (32/33: its `b1` reads the manual option's "for testing purposes only" pill, which is only rendered in development and is absent from the production build that check was written against). Caveats recorded below.
- [x] **K5** Order confirmation — order number, items, totals, address. The page (and the order components it renders) is rebuilt on the design system: the order number is the headline fact in mono, then the email, the lines, the money, the delivery and payment blocks and a way back to the shop. It is a receipt for the order the Store API returned, not a replay of the cart. Verified in the same walkthrough run as K2 (78/78 both surfaces): after placing an order from review, the order number, email, the product and its quantity, the total, the shipping address and the payment method on the confirmation page all equal what `GET /store/orders/:id` reports. Caveats recorded below: nothing else in the confirmation page's own error path was exercised, and the item table is deliberately kept a real `<table>` (`<tr>`/`<tbody>`) after K2's nested-`<li>` hydration bug.
- [x] **A1** Register / login / logout, error messaging, protected routes. Built on Medusa's own authentication: a customer account *is* a Medusa customer, so orders, carts and saved addresses keep working without a second source of identity — no Clerk or Supabase layer in between, and the password provider the spec's "works with Medusa auth" asks for is the baseline the Google path extends (below). The sign-in and create-account forms are one route with a view switch, rebuilt on the design system, and every field the customer would have to correct after a rejection is controlled — React resets an uncontrolled input once a form action returns, which is what wiped a rejected email in K2. Server actions return their failures (`{ state: "error" }`, or `{ state: "exists" }` for an address that already has an account, which is reported as such and linked to the sign-in view instead of being answered with "invalid email or password"), so the copy survives a production build, which masks thrown server-action messages. Protected routes are the middleware's: a signed-out visitor to `/account/*` is sent to `/{country}/account?redirect=<the page asked for>` and the action itself follows that path after signing in, which is where it has to happen — a `router.push` before the refresh the new session needs cancels its own navigation, measured as a sign-in that stayed on the sign-in URL. `/api` is deliberately outside the middleware, for the Google callback below. Verified on the production build with the Store API and the browser's own `_medusa_jwt` as independent sources, 25/25 checks: a guest is asked to sign in and shown no account navigation; registering signs the customer in, `/store/customers/me` reads back the address that was typed with the name on it; a protected page is reachable signed in and refused signed out; a wrong password is reported as "Invalid email or password." with the address still in the field; signing up with a taken address names it and points at the sign-in view; a protected page's `?redirect=` is carried through the sign-in and lands on that page as that account; logging out clears the cookie and closes the account pages again; and a customer row left behind by a guest checkout can still become an account. No console errors. The one defect this turned up was the swallowed return navigation above; the redirect it fixes is why `finishAuth` navigates rather than the form's effect.
- [x] **A1+ Google sign-in** (beyond spec, requested directly — see "Beyond-spec work already done"): the same account, reached without a password.
- [x] **A2** Order history — list + detail, own orders only. Rebuilt on the design system, and the two order pages K5 left in the starter's markup now converge on one look: the account's detail page is the same receipt as the confirmation page (the order number as the headline fact in mono, then the email, the lines and `CartTotals`, the delivery and payment blocks), and the starter's `OrderSummary` is gone rather than left as a second way to print the same money. The list is a plate per order — number, placed date, item count, delivery state and total, then what was bought and a link into it — with a count line, the shared `Pagination` when the history is longer than ten, an empty state that links to the shop, and an error state that says what failed and offers **Try again**. "Own orders only" is enforced twice, on the two different locks Medusa actually has: `/store/orders` takes the customer from the request's own authentication, so the list can only ever be the caller's, and the detail page reads the order and refuses it unless `order.customer_id` is the signed-in customer — `/store/orders/:id` is deliberately unauthenticated (the UUID is the capability, which is what lets a guest open the confirmation page they are sent to), so that page's own check is the only thing standing between one customer and another's order. The check needs `order.customer_id`, which is an allowed extra but not one of the route's default fields, so `retrieveOrder` asks for it (and for the two statuses, which the receipt needs and the defaults omit). `generateMetadata` no longer calls `notFound()` (the C3 trap) and names an order in the title only when it is the caller's. Both reads moved off the data cache with `no-store`: the list URL is identical for every customer and only the Authorization header differs, so a cached response could serve one customer the previous customer's orders, and either read would keep showing an order an admin had just shipped. `listOrders` returns `{ ok, orders, count }` and `retrieveOrder` returns the order or null instead of throwing, so a failed read reaches the customer as a returned message instead of the production build's masked one. Verified on the dev server with the Store API as the independent source and a real browser session, two fresh accounts with 11 and 1 orders: 46/46 checks, exit 0 — page 1 is exactly the newest ten of the API's own list, in its order, and page 2 the rest (the oldest last), the stranger's order is on neither, the count line reports 11, clicking page 2 shows the remaining order, `?page=9` lands on page 2, and each card's total, date and delivery state are what the API reports for that order. The detail page's number, email, date, line items, subtotal, total, shipping method and its price, address, payment method and all three states (Pending / Not fulfilled / Authorized) equal `GET /store/orders/:id`, and the back link returns to the history. Signed out, both the list and a detail URL go to the sign-in page; the browser's own `_medusa_jwt` reads back as the account under test; the guest confirmation page still opens the same order by its id, so K5's capability route did not move. The refusal was checked against the API's own behaviour: the Store API hands the stranger's order to anyone holding its id (200), so the page is what refuses it — the storefront's own not-found page, with nothing of the order in it (no container, no number, no email, no address). The first version of that check "found" the display id in Next's own `<script>` payload embedded in the body, which is why these assertions read visible text and elements instead of `textContent`. The empty state (7/7) and the error state (the list endpoint made to fail: the message, the **Try again** link, no cards, no count, and not the empty state) were verified separately. K2 (78/78) and K3 (41/41) still pass against the same server, so the confirmation page and the sibling suites' account checks did not move. No console errors on the pages under test and no horizontal overflow at 360 / 768 / 1280 on both pages. Two caveats recorded below: the status code of a refused order, and the fact that K4's card path was not re-run.
- [x] Responsive + loading/empty/error state pass. Every data route now has an answer for all three moments, not just a page for the finished one. **Loading:** route-level `loading.tsx` for `(main)` (home, store, verify, transfer), `products/[handle]`, `categories/[...category]`, `collections/[handle]`, `account` and `account/@dashboard`, `cart` and `order/[id]/confirmed`; the starter's grey blocks are replaced by one `SkeletonBar` (ink at 10%, `motion-reduce` off) composed into a listing shell (heading, rule, filter rail from `small` up, a page of plates), a product shell (gallery, buying column, related strip) and account shells, each shaped like the page that replaces it so nothing jumps. **Error:** one `RouteError` component and three boundaries — root (no chrome, plain `/` link, for failures in the layouts themselves), `(main)` (nav and footer kept, **Try again**, browse link) and `(checkout)` (retry, back to the cart, "Your cart and its details are safe"). A boundary prints Next's digest as `Reference <digest>` so a customer can quote it. **Empty:** the in-page states stay where they were (listing "No products matched these filters.", empty cart, no orders, overview's no-orders plate). The one genuinely broken layout was the account dashboard: the whole overview sat inside `hidden small:block`, so `/account` was blank on a phone. It is rebuilt as stacked bands on the design system (welcome and signed-in address, four facts, recent orders as full-width rows) and keeps every test id the earlier phases read. The profile and addresses headings, rules and address plates moved onto the tokens too; the address add/edit/delete behaviour is still A3/A4. Verified on the dev server with a real session, through headless Chrome at 360 / 768 / 1280: 27/27 checks on `/dk/account`, `/dk/account/profile` and `/dk/account/addresses` — each page renders its content, has no horizontal overflow (`scrollWidth` ≤ `innerWidth`), and logs no hydration warning. Loading and error were forced on the storefront's *upstream* reads through a small gateway (2.5s delay / 503), since a browser network layer cannot see a server-side fetch: 3/3 for the product page (its own skeleton appears while the product is pending, then `Cache Miss Shorts` and its buying controls replace it, no overflow) and 9/9 for the category page (listing skeleton, then 7 T-Shirts; a failed read renders the boundary with **Try again**, the storefront chrome and no overflow). The first harness attempt sampled after `load` and blocked requests in the browser, so it could not have seen either state; the gateway run is what the numbers above come from. One defect turned up and was fixed rather than documented: **the profile page hydrated with mismatched ids** — `account-info` wrapped its three panels in Headless UI `Disclosure`s whose generated ids drifted between the server render and hydration (2 loads in 36 logged React's "A tree hydrated but some attributes … didn't match"); they are plain blocks driven by the component's own state now, and the 27-load run above is clean.

Exit criteria: guest can browse → pick variant → cart → checkout with `4242 4242 4242 4242` → confirmation;
register, buy again, see both orders; admin sees orders and can fulfill one; no console errors; both builds pass.

## Phase 2 — Commerce Completeness

Tasks: E1–E3 → K6, K7 → A3, A4 → C6, C7 → SEO baseline → sitemap/robots/JSON-LD.

- [x] **E1** Order confirmation email (subscriber on `order.placed`, failure must not break the order). Email is Resend, as §2 of the spec names, through the store's own notification provider module — there is no Resend provider inside Medusa, and no SDK dependency either: the provider is one `POST /emails` (`modules/notification-resend/services/resend.ts`) and the templates are code (`modules/notification-resend/templates/`), one module per email over a shared ink-on-paper layout, each with an HTML body and a plain-text fallback. The module is registered exactly once for the `email` channel: Resend when `RESEND_API_KEY` and `RESEND_FROM` are both set, Medusa's local provider otherwise (it stores and logs the notification instead of sending, which keeps a fresh clone and CI working). The subscriber reads the order back through the Query API — the event carries only `{ id }` — and builds the email from the committed order, not the cart; every failure is caught and logged, so a broken email provider cannot fail an order. Verified against a real checkout through the Store API with a local stub standing in for Resend (`RESEND_BASE_URL`): 18/18 checks on the happy path — the completed cart produced an order, and exactly one email was posted for it with the verified sender, the customer's address, the order number in the subject, the item and its quantity, the line and order totals, the delivery address and a link to `/order/:id/confirmed`, in both HTML and text. 10/10 on the failure path, with the stub answering `500 domain is not verified`: checkout still returned `200` with an order, the attempt was posted once, no email was counted as sent, and the backend logged both the rejection and `Could not send the confirmation email for order …` without throwing. 10/10 with no email configuration at all, which is the fresh-clone path: the checkout completed, Medusa's local provider logged `Attempting to send a notification … template: 'order-confirmation'`, and no request reached Resend. Caveats below.
- [x] **E2** Password reset email. Medusa's core already owns the security here — `POST /auth/customer/emailpass/reset-password` mints a signed token bound to the address and purpose, stores only its hash, expires it in 15 minutes, and `POST /auth/customer/emailpass/update` consumes it once — so this project owns the link and the email around it: a subscriber on `auth.password_reset` sends the reset URL through the same provider and template layout, and the storefront gained the two ends of the flow. The request is a third view on the sign-in page (`LOGIN_VIEW.FORGOT_PASSWORD`) so it keeps the page's `?redirect=` handling; the reset page is `/{country}/reset-password` — outside `/account` on purpose, because the middleware sends a signed-out visitor from every `/account/*` URL to sign in, and the person opening a reset link is signed out by definition. The emailed URL carries no country code; the middleware adds the visitor's region. Verified twice, on the API and through the browser. API run (17/17): the request is accepted with `201`; exactly one email is posted, with the link in HTML and text, "15 minutes" stated, and no claim that an account exists; the token's claims say `purpose: "reset"`, the customer's address, a `jti`, and a 900-second lifetime; it sets the new password (`200`), the same link then answers `401`, the new password signs in and the old one does not, an *expired* token of the same shape signed with this project's secret is refused (`401`), and an address with no account gets the same `201` and no email. Browser run (15/15) at 360px: the sign-in page offers **Forgot your password?**, the request form opens and has no overflow, submitting it shows the check-your-inbox panel and the email arrives with a link that opens `/dk/reset-password` (no overflow), a mismatched confirmation is reported with the typed password still in the field, the matching pair completes, and the new password signs in to the account overview — no hydration or console errors. One defect was found and fixed: **the request reported a success as an error** — the endpoint answers `201` with the plain text `Created`, and the SDK parses a response whenever `accept` asks for JSON, so `"Unexpected token 'C'…"` was shown while the email had already been sent; that one request now asks for text (see the standing note).
- [x] **E3** Shipment notification. Sent when a fulfillment is *shipped*, not when it is created: Medusa emits `shipment.created` from `createOrderShipmentWorkflow` with the fulfillment id and a `no_notification` flag, and the unit a customer thinks of as "a parcel shipped" is the shipment. The subscriber (`subscribers/shipment-created.ts`) reads the order back through the Query API by filtering on `fulfillments.id` and builds the email from the committed fulfillment — its items (paired with the order line so the product's title is printed, not just "Black / S"), its labels' tracking numbers and URLs, the shipping address and the order link — rather than from the event. `no_notification: true` is honoured, the notification is keyed `shipment-created:<fulfillment id>` so a retried event cannot email the customer twice, and every failure is caught and logged so a dead provider cannot fail the shipment. The template (`templates/shipment.ts`, registered as `shipment` in `templates/index.ts`) is the fourth email on the shared layout, HTML plus plain text, and deliberately carries no money: the confirmation settled that, and repeating it invites the two emails to disagree after a refund. Verified against a real order through the Store API, fulfilled and shipped through the Admin API with a local Resend stub (`RESEND_BASE_URL`): 20/20 checks — the fulfillment alone sends nothing, the shipment sends exactly one email with the order number in the subject, the shipped product and quantity, both the tracking number and its link, the delivery address and the order link in HTML and text, and no totals; `no_notification: true` sends none; a stub answering `500` still leaves the shipment at `200` and logs `Could not send the shipment email for fulfillment …`. Idempotency was verified by re-emitting `shipment.created` for an already-shipped fulfillment twice: both events were processed, zero additional emails were posted, and the notification row holds the fulfillment's key. Caveat below: one parcel per fulfillment, so a partially shipped order gets one email per shipment, and the retry case was exercised through the event bus rather than by a provider timeout that a real bus would retry.
- [x] **K6** Promo codes. Two sides, because Medusa accepts or refuses a code at the cart API and the customer needs to hear about it on the page. The seed now creates two promotion codes (`PROMOTIONS` in `src/scripts/seed.ts`, matched by code so a re-run never duplicates them): `DEBUG10`, 10% off the order in every currency, and `FIVEOFF`, a fixed 5 off scoped to the region's default currency (a fixed discount has to name one). On the storefront, `lib/data/cart.ts` grew `applyPromotionCode`/`removePromotionCode`, both returning `{ ok } | { ok: false, message }` like every other cart mutation. They write the cart's whole code list, then read the applied promotions back: an unknown code is a `400` from the API and becomes "That promotion code is not valid. Check it and try again." through the error translator, and a code that the API accepts but drops (expired, not applicable, limit reached) is detected as missing from the returned promotions and removed from the cart again so it cannot ride along on every later change and start working once the cart qualifies. The rebuilt `discount-code` control applies and removes in place — pending state on its own button, the refused code left in the field to be corrected, a row per applied code with what it takes off, remove buttons only for customer codes — and the cart's `CartTotals` now reads `discount_total` (the old component asked for a `discount_subtotal` that no cart has, so a discount could never have shown) and prints it as a negative line. Verified on the production storefront build at 360 / 768 / 1280 against the Store API as the independent source: 32/32 checks — an invalid code shows its error, stays in the field and writes nothing; `DEBUG10` shows a row and a −€2.80 discount whose `data-value` and total equal the API's `discount_total` and `total` (€28 → €25.20); the code survives a reload; removing it clears the row, the discount and the API's promotions; the same control applies `FIVEOFF` from the checkout summary, where the API's `discount_total` is exactly 5 and the displayed discount matches; no hydration or console errors, no horizontal overflow. One caveat: the checkout side was verified on the Contact step's summary rather than carried through to placing an order.
- [x] **K7** Stripe webhook, verified and idempotent. The endpoint is Medusa's own — `POST /hooks/payment/stripe_stripe` (its route prepends `pp_` to the provider name) — and this project's part is the secret: `medusa-config.ts` has passed `STRIPE_WEBHOOK_SECRET` to the Stripe provider since K4, so setting it is what turns verification on. The route queues the event and the payment module verifies the signature, maps the intent back through `metadata.session_id`, and runs `processPaymentWorkflow`: it completes a cart whose payment succeeded or was authorized but whose browser never returned, captures a payment Stripe captured outside Medusa, and ignores events that did not originate here. Verified end to end with real Stripe test-mode PaymentIntents (card confirmed server-side with `pm_card_visa`, because no Stripe CLI is installed) and HMAC-signed events in Stripe's `t=…,v1=…` format: 25/25 checks. An abandoned cart — authorized intent, never completed — becomes an order with `payment_status: authorized`, the cart's total and the confirmation email; redelivering the same event leaves exactly one order and no capture. An order completed normally whose intent is then captured directly in Stripe goes from `not_paid`/uncaptured to `captured` on `payment_intent.succeeded`, with one capture row, and the redelivery leaves one capture row and the same `captured_at`. A wrong signature is refused at verification and creates no order, and an event whose intent has no `metadata.session_id` is ignored silently. Set-up steps and the production endpoint/event list are in `docs/SETUP.md` §9. Caveats below.
- [x] **A3** Saved addresses (add/edit/delete/default). The address book is now behaviour, not just plates: an add card, one plate per saved address, a marker for each default, **Make default shipping** / **Make default billing** on the cards that are not, and a remove that asks first. The mutations moved to the project's returned-failure shape (`{ ok, message, fields }` for the forms, `{ ok, message }` for delete and set-default), and they validate on the server: six required fields are trimmed and rejected with a message keyed to the input, optional blanks are sent as `null`, and nothing is written on a rejected submit. The first saved address is offered as both defaults; later ones are not. Editing never writes the default flags, so an edit cannot clear one, and Medusa's own update workflow clears the previous default when a new one is set, so there is never more than one of each. The addresses page's dialogs hold their fields in React state (`address-form.tsx`, shared by add and edit) instead of `defaultValue`, because React resets an uncontrolled field once a form action returns — a rejected city had to stay rejected next to the street that was typed. Each dialog's form is mounted only while the dialog is open, so cancelling an attempt cannot leave its errors on the next one. Billing address on the profile page uses the same add/update actions and still becomes the billing default; its hidden `addressId` is a string now, which removed a pre-existing uncontrolled-to-controlled warning on `/account/profile`. Verified twice against the production build and once on dev, 45/45 each time, with the Store API as the independent source and a fresh account per run: an empty account shows only the add card; the first address's two default checkboxes are checked while a second address's are not; a whitespace-only city is refused with the typed street, first name and everything else kept and zero addresses written; a valid save appears as a card and in `/store/customers/me` with every field that was typed and both default flags; the second address saves with the flags still on the first, and the API holds exactly one of each; **Make default shipping** moves only the shipping flag and **Make default billing** then moves the billing one, with the old card's marker gone each time; the edit dialog opens with the saved values, a whitespace city is refused with the typed street kept, and a valid edit persists without clearing either default; **Remove** asks for confirmation, changes nothing before it, then removes the card and the API row; the remaining address can be made default and deleted too, leaving the add card and no markers, and the page reloads cleanly; the profile's billing editor saves through the same actions and its address is the billing default in the API. No hydration warnings, no console errors, and no horizontal overflow with the dialog open at 360 or on the page at 360 / 768 / 1280. Caveats below.
- [x] **A4** Profile edit + password reset. The profile page's editors moved off the starter's stubs and onto the project's returned-failure shape: `updateCustomerName` and `updateCustomerPhone` in `lib/data/customer.ts` validate on the server and answer `{ ok, message, fields }`, with messages keyed to the input they belong to, so a rejected name or number stays in the field it was typed in (both are controlled now — React resets an uncontrolled field once a form action runs, the defect K2 found on the checkout email) and nothing is written to the API. Names are trimmed and both halves required; the phone is optional and empty is sent as `null` rather than `""`, so the row returns to "Not set" instead of a blank, and a number with letters or an unclosed bracket is refused before it reaches the API. The **email** row is now a fact rather than a form: the starter's editor reported "Email updated succesfully" while writing nothing, and in Medusa the address a customer signs in with lives on the auth identity, so changing the customer record's copy would leave the two disagreeing. **Password** is the reset flow E2 built, reachable from the profile: a button emails the same single-use, 15-minute link from `lib/data/password-reset.ts`, so the page's promise to "change your password" is a working path rather than a stub that logged "not implemented". Verified on the dev server through headless Chrome with the Store API as the independent source, 18/18 checks on a fresh account: the email row shows the address and has no editor; a whitespace-only first name is refused with the message beside the field and the typed last name kept, and the API still holds the old name; a padded valid name saves trimmed (`Ada` / `Byron`) and the row repaints; `call me maybe` is refused and the API keeps the old number, `+45 99 88 77 66` saves, and an empty field clears it to `null` with the row back to "Not set"; **Send reset link** reports success for the signed-in address. The emailed token was then taken from the notification row and used for real: `POST /store/auth/reset-password` answered 200, the new password signed in, the old one was refused (401) and the same link replayed (401) — so the profile's button starts the same flow E2 verified, end to end. No console errors; no horizontal overflow at 360 / 768 / 1280. C6's search was verified in the same run. Caveats below.
- [x] **C6** Search — typo-tolerant, reindexed on product change. Meilisearch stays out, per the standing note below: the store ships Medusa's own Search Module over Postgres (`@medusajs/search-postgres`), the index is `src/search/product.ts`, and the storefront is its InstantSearch adapter. Typo tolerance was declared in the index (`settings.typo_tolerance`) and still returned nothing for `hoddie`, and the reason is that the provider only fuzzy-matches when **the query** asks for it — `search_options.typo_tolerance` defaults to off, and the index setting can only turn it off, not on. The adapter in `lib/search-client.ts` now sends `typo_tolerance: true` alongside its `match_strategy`, so the listing, its facet queries and the navbar search all opt in. Reindexing needed no code: the index definition already declares the product events (`product.created/updated/deleted`, variants, options, tags, categories, sales channels), so the module re-reads and re-writes the affected documents. Verified twice on the backend and once through the storefront, against the Store API as the independent source. API run (8/8): a product created through the Admin API appeared in `/store/search` 20 ms after the query (title, handle, published, sales-channel scoped); renaming it replaced the indexed document in 14 ms with no reindex command; deleting it removed it 444 ms later (and the index table's own `document->>'title'` agreed — 23 documents before, 24 during, 23 after); `hoddie` returns exactly the 3 hoodies `hoodie` returns (same titles, not fuzzy neighbours from another category); the same query with the option left out returns 0, which is what proves the flag is load-bearing rather than incidental. Browser run: typing `hoddie` into `/dk/store`'s search box shows LGTM, Recursion and Race Condition Hoodie with the facet counts the correct query shows, the query reaches the URL as `product[query]=hoddie`, and `zzzzzz` still reaches the empty state. Caveats below.
- [x] **C7** Related products (≥4, same category/collection). The rail under the product page is now decided in one place, `listRelatedProducts` in `lib/data/products.ts`, instead of the component: the product's own **category** first (its closest siblings), then its **collection**, then the newest of the catalogue to fill the rail — three separate reads, because the Store API combines filters with AND and one request for category plus collection would only return products in both. Candidates are deduplicated and the product itself can never come back, whichever source offers it; the result is capped at four, which is the spec's minimum. Product reads now ask for `*categories` (one small field add on the shared listing read), so the page's own product already knows where it belongs without a second lookup, and the rail renders on the shared plate with prices, images and the design-system rule. Verified in the browser across **every one of the 23 product pages** — on the dev server and again against the production build, 12/12 checks both times — with the Store API as the independent source: each page shows at least four related products, the rail is headed, every related plate carries a price and an image, the current product is never among them, no product appears twice, and **every related product shares the current product's category or its collection** (0 exceptions across 23 pages); the store listing still renders its 12 plates, so the added field did not disturb it. No horizontal overflow with the rail at 360 / 768 / 1280. The run also turned up a pre-existing defect and it was fixed rather than documented: **every product page hydrated with mismatched ids** — Radix's `Accordion` generated `radix-_R_…` ids for the two tab triggers/panels that differed between the server render and the client one, so React logged "A tree hydrated but some attributes … didn't match" on the page (the same class of defect the states pass fixed in `account-info`, and exactly what this suite's console check caught). The tabs are a plain disclosure now (`product-tabs/accordion.tsx`): ids derive from the item's value (`product-tab-product-information`), a closed panel is `hidden`, and the trigger carries `aria-expanded`/`aria-controls`. Verified separately on both surfaces, 9/9: both tabs start closed, each opens and closes on its own with its content inside, the spec table is in the first and the shipping copy in the second, ids are unchanged across a reload, no overflow with a panel open at 360, no console errors. Caveats below.
- [x] SEO baseline: per-page metadata, Open Graph, `sitemap.ts`, `robots.ts`, JSON-LD Product. Every public page now answers with its own title, description, canonical URL and share card, and the private flows are marked `noindex` and disallowed in `robots.txt`. **Metadata:** one helper (`lib/util/seo.ts`) builds it, so the canonical URL is always the region URL the page is actually served from (`/{country}/...`, never the country-less address the middleware only redirects and never a query string), and the category page's old half-relative canonical was replaced by it. The homepage deliberately sets no title, so the root layout's strapline default becomes the search result rather than "Home | DevCart". **Open Graph:** the layout defines `type`, `siteName`, locale and the site card; a page with a picture of its own (a product) replaces the card with its thumbnail. Two things had to be true for a share image to exist at all: a page's `openGraph` object replaces the layout's instead of merging into it, so `pageMetadata` names the site image whenever the page has none, and the file-convention `app/opengraph-image.jpg` is not attached once `openGraph` is declared, so it is listed explicitly. **`sitemap.ts`** lists the default region's home, listing, 5 categories, 3 collections and 23 products (33 URLs), with `lastmod` where the API reports one, and regenerates hourly so an admin's new product does not wait for a deploy. **`robots.ts`** allows the catalogue and disallows `/api/` plus the account, cart, checkout, order, reset and verify flows; the same pages answer `noindex, nofollow` in their metadata, so a link into them is not indexed either. **JSON-LD:** every product page carries a schema.org `Product` (`product-json-ld`) with name, description, images, brand, category, SKU and one `Offer` per variant — region price, currency, `InStock`/`OutOfStock` from the variant's stock, and a `?v_id=` URL per offer so the canonical stays one page. Verified on the production build against the Store API as the independent source, **54/54 checks**: `robots.txt` allows, disallows and points at the sitemap; `sitemap.xml` is well-formed, absolute, duplicate-free, lists every category, collection and product, lists nothing private, and **every one of its 33 URLs answers 200**; home, listing, product, category and collection each have a title, the region canonical, `og:title`/`og:description`/`og:url`/`og:type`/`og:site_name`, an absolute share image (the site card, or the product's own photo) and `index, follow`; cart, checkout, account, verify, order confirmation and the transfer page are `noindex, nofollow`; and all 23 product pages parse and validate their JSON-LD: `@type`/`@context`, name, description, image list, brand, SKU, category, canonical URL, and one offer per priced variant whose price, currency and availability equal what the API reports for that variant (the sold-out hoodie variant is `OutOfStock` while its siblings are `InStock`). Caveats below.

## Phase 3 — Differentiators & Polish

Tasks: ≥2 options from §5.5 (start with Reviews) → accessibility pass → performance pass → dark mode (optional).

- [x] **§5.5 Option A** Product reviews module, links, store + admin APIs, admin widget, storefront UI, tests. A local module (`src/modules/review`) holds the row — `product_id`, `customer_id`, `rating` 1–5, `title`, `body`, `status` (`pending` | `approved` | `rejected`) and the framework's timestamps — and two module links (`links/review-product.ts`, `links/review-customer.ts`) are what make those ids mean something: the storefront reads a reviewer's first name through the customer link, and the product page's admin widget reads a product's reviews through the product link. The rule lives in `workflows/create-product-review.ts` rather than in the route: the product must exist, a customer gets one review per product (`422` on the second, before anything is written), a review is always stored as `pending` so nobody can publish their own words, and a *rejected* review is re-opened by the same customer's next attempt instead of becoming a second row — so the one-per-customer-per-product limit survives the second chance. It also writes both link rows, only when the review is new (`when(...)`, so a re-opened row never duplicates them). Moderation is a second workflow (`moderate-product-review.ts`) and two routes: `GET /admin/reviews` (every status, filtered by `product_id` / `status`, paginated, with the author's name) and `POST /admin/reviews/:id` with `{ status: "approved" | "rejected" }`; `pending` is refused as a decision. The store side is `GET /store/products/:id/reviews` — approved only, `limit`/`offset`, newest first, an author name reduced to "Ada B." and **no** `customer_id` or email in the payload — and `POST /store/products/:id/reviews`, which is behind `authenticate("customer", …)` plus `validateAndTransformBody(StoreCreateReviewSchema)` in `src/api/middlewares.ts`, so a signed-out POST is `401` before the handler and a rating of 0 or 6, a 2-character title or a 9-character body is `400` before the workflow. `summary` on the list response is the *whole* product's rating picture (count, average to one decimal, per-star distribution), not the current page's — a page of one review cannot tell you the average is 4.0. The admin widget (`src/admin/widgets/product-reviews.tsx`) sits on the product page (`product.details`), lists that product's reviews with stars, author, date and a status badge, and approves or rejects in place with a toast and a refetch; it talks to the same routes through `@medusajs/js-sdk`, which had to become a direct backend dependency (it was only a transitive one through the dashboard). The storefront section (`modules/products/components/product-reviews`, rendered under the product) shows the average in mono, a five-bar distribution, the ten newest reviews with author and date, the empty state a fresh catalogue has, and — for a signed-in customer — the form (`modules/products/components/product-review-form`), whose rating is a five-option radio group rather than clickable stars and whose fields are controlled, so a refused submission keeps what was typed. Tests: **6/6** module-service checks (`src/modules/review/__tests__/service.spec.ts`) and **17/17** HTTP checks (`integration-tests/http/reviews.spec.ts`) covering the auth, validation, pending-invisibility, duplicate, re-submission, ordering, summary, pagination, filter and moderation paths. Verified on the **production** build through headless Chrome, 20/20 checks, against the Store API as the independent source: a signed-out visitor sees the approved reviews, the API's count, a 4.0 average that matches its `summary.average`, both reviewers' names, the five distribution rows with the API's per-star counts and a labelled star widget — but no form, only a **Sign in** link that comes back to the same product; signing in swaps that link for the form; an empty submit is stopped by the browser; submitting writes a `pending` review that is **not** added to the public list; reloading and submitting again is refused in place with "You have already reviewed this product." and the typed title still in the field; approving that review from the admin widget made it the newest review on the page once the cache window passed, authored as "Nina N.". The admin widget itself was driven in the browser, 7/7: it renders on the product page, lists the product's four reviews, shows their statuses, and rejects then approves the top one with the status following each time, console clean. No horizontal overflow at 360 / 768 / 1280, no console errors, and `tsc`, `next lint`, `next build` and `medusa build` (which compiles the admin extension) all pass. Caveats recorded below.
- [x] **§5.5 Option B** Wishlist module, links, store API, storefront hearts and wishlist page, tests. A local module (`src/modules/wishlist`) holds the row — `customer_id`, `product_id`, `variant_id` (nullable), timestamps — with a **unique index on (customer_id, product_id)**, and two module links (`links/wishlist-item-customer.ts`, `links/wishlist-item-product.ts`) make those ids mean something. Unlike the review's `review`/`wishlist_item` naming trap, the linkable key is the model name **camelCased** (`WishlistModule.linkable.wishlistItem`) while the link definition's field stays snake_case (`wishlist_item_id`) — the two disagree, and `medusa db:generate` is how it shows up. Saving is a workflow (`workflows/add-wishlist-item.ts`): the product must exist, a variant must belong to that product (`400`), and the write is an **upsert** against the unique index — a second tap returns the same row with `200` and `created: false` rather than an error, because a heart is a toggle and two clicks can arrive out of order; a save that already existed and is saved again with a variant updates the variant instead of adding a row. Removal (`workflows/remove-wishlist-item.ts`) scopes the row to the signed-in customer in its own filter, so somebody else's id is `404` and cannot be deleted, and it dismisses both link rows before deleting the row (with compensation in the reverse order, so a failed run leaves the save intact). Routes: `GET /store/wishlist` (the customer's saves, newest first, ids only — prices are a region calculation the storefront reads from the product endpoints), `POST /store/wishlist` (`201` new, `200` repeat), `DELETE /store/wishlist/:id` (`204`); all three are behind `authenticate("customer", …)` in `src/api/middlewares.ts`, and the body schema names exactly two fields, so Medusa's body validation refuses a `customer_id` smuggled into the payload. The storefront is a heart on **every plate** and in the **buy box**, and a page under the account. The heart (`modules/products/components/wishlist-button`) is a `button` with `aria-pressed` drawn as a sibling of the card's link — a `button` inside an `a` is invalid and would turn a tap into a navigation — and it reads its state from one client store (`lib/util/wishlist-store.ts`) fed by `GET /api/wishlist`, so a listing of twelve plates costs **one** request rather than twelve; a route handler rather than a layout read, because `cookies()` in the layout would make every prerendered catalogue page dynamic for a heart. Nothing is drawn as saved until the server confirms it, and a signed-out tap is sent to sign-in and returned to the page it was on. The wishlist page (`/account/wishlist`, with a nav entry) reads the module's rows and the region-priced products separately, says which variant was saved, and takes a plate away on removal. Tests: **7/7** module-service checks (`src/modules/wishlist/__tests__/service.spec.ts`, including the duplicate-index refusal and two customers saving one product) and **17/17** HTTP checks (`integration-tests/http/wishlist.spec.ts`) covering the three `401`s, `201`/`200`, the variant rules, the `400`/`404` bodies, per-customer isolation, ordering, removal, a foreign removal refused, and the two link rows being created and dropped. Verified on the **production** build through headless Chrome, **20/20**, with the Store API as the independent source: a signed-out visitor sees a heart with `aria-pressed=false` and no form of state; tapping it lands on `/dk/account?redirect=…` and signing in returns to the product; the tap writes one row for that customer and product, and the heart is still saved after a reload (state from the API, not the button); all 12 plates on `/dk/store` carry a heart and exactly the saved product's is marked; `/dk/account/wishlist` lists the save with its price, links to the product, marks the nav link `aria-current="page"`, and removing it empties the API and shows the empty state; no horizontal overflow at 360 / 768 / 1280 on either page, no console errors, and `tsc`, `next lint`, `next build` and `medusa lint` pass. §5.5 A's **20/20** review checks still pass on the same build, so the buy box's new heart did not disturb that section. Caveats below.
- [x] **§5.5 Option C** Low-stock alert job. A scheduled job (`src/jobs/low-stock-alert.ts`, hourly by default via `LOW_STOCK_ALERT_SCHEDULE`) reads every inventory level through the Query API and mails the admin address (`LOW_STOCK_ALERT_EMAIL`) one digest when stock is at or below `LOW_STOCK_THRESHOLD` (5 by default). "Available" is stocked minus reserved — a level whose units are all promised is a shortage — and a level's threshold is **inclusive**, so "5 left" is reported. The dedupe is a module, not the schedule: `src/modules/stock-alert` holds one row per (inventory item, location) with `alerted_at`, so a shortage that lasts a week is one email, and `LOW_STOCK_ALERT_COOLDOWN_HOURS` (24) is what makes it due again; a level that recovers and drops again inside the cooldown still stays quiet, because it is the same shortage. The email is a template in the project's provider module (`templates/low-stock-alert.ts`, registered in `EMAIL_TEMPLATES`), with the product and variant name read through the variant's product link, the SKU, the location name and the units left. Nothing is recorded until the mail is confirmed sent — a provider failure is logged and the next run retries, rather than a shortage going missing for a day. With no admin address the job does nothing and says so (a fresh clone never mails anyone). Rules are pure functions in `modules/stock-alert/low-stock.ts`; tests: **16/16** unit (`__tests__/low-stock.unit.spec.ts`), **5/5** module-service, and **8/8** app-level (`integration-tests/http/low-stock-alert.spec.ts`) which runs the real job against a booted app and points the provider at a local stub — asserting the digest, the threshold, the timeout, the cooldown, the recovery case, the unconfigured case and the email's own subject/HTML/text. Caveats below.
- [x] **§5.5 Option D** Admin sales dashboard widget. `GET /admin/sales-summary?from=&to=&limit=` reports revenue, order count and the best-selling products for a window, read through the Query API and summed in the route rather than in SQL so the numbers agree with the orders an admin can open. Revenue is **per currency** (the catalogue is priced in eur and usd; one mixed total would be quietly wrong), draft and cancelled orders are excluded (they were never revenue), `from`/`to` are inclusive ISO timestamps defaulting to the last 30 days, and the range is validated: unreadable dates, a backwards window and anything longer than 366 days are `400` with a message, `limit` is capped at 20. The page is read in 500-order pages and answers `truncated: true` past 20,000 orders rather than a total that silently stops. The widget (`src/admin/widgets/sales-summary.tsx`, zone `order.list.before`) shows revenue per currency, the order count, the window and the five best sellers with units and money, with **Last 7 / 30 / 90 days** buttons that re-read the route. Tests: **18/18** unit (range parsing and aggregation, including per-currency sums, the tie-break, the empty window and rounding) and **7/7** HTTP (the `401`, the three `400`s, the default window, the `limit` cap and an empty window). Verified against the **live database**, 8/8: the route's order count, per-currency revenue and best-seller units equal SQL over the same window once the latest `order_summary` version and the latest `order_item` version are used — which is also how the first two runs' mismatches (duplicate summary and item versions) were found, and why the check is written that way. The widget itself was driven in the admin, 9/9: it renders above the order list, offers the three windows, and its order count, revenue and best sellers equal the API for 30 days, then the 7- and 90-day buttons each show the API's count for their window, console clean. `tsc`, `medusa lint` and `medusa build` (which compiles the admin extension) pass.
- [x] **Admin dashboard landing page.** The admin now opens on a **Dashboard** page instead of Orders. It reports the shop's numbers for a window — revenue per currency, orders, new customers and orders still waiting to ship, with **Last 7 / 30 / 90 days** buttons — then what is waiting on an admin: unshipped orders, reviews pending approval (each with its product, rating and date, linking to the product) and the lowest stock levels with what is left at each, then the five newest orders with payment and fulfillment badges, the window's best sellers, and buttons for the tasks that usually follow (new product, orders, inventory, promotion, store settings). One route answers all of it: `GET /admin/dashboard?from=&to=` (admin only, same window rules as Option D, `400` on an unreadable, backwards or over-366-day range). Two API details drove the shape: **counts** come from the modules' `listAndCount` rather than from the Query API, which only reports a total when it filters across modules and otherwise hands back the rows it was asked for — a count read from a page of rows is the page size (the first draft reported 5 pending reviews when there were 10, and 0 customers when there were 192); and the recent orders' **status badges** come from Medusa's own `getOrdersListWorkflow`, because `payment_status` and `fulfillment_status` are computed while an order is serialized and are not queryable, so a Query API read returns `null` for both. Shipments are counted over the same window read the sales figures use (the read grew a `withFulfillments` option and `countUnshipped` in `aggregate.ts`): an order is waiting if no live fulfillment has shipped, and a cancelled fulfillment is ignored rather than held against it. **The landing itself could not be done in React:** Medusa's dashboard hardcodes its home route as `navigate("/orders")` and a custom route cannot claim the empty path, so `admin-landing.ts` — a one-plugin Vite file registered through `admin.vite` in `medusa-config.ts` — injects a script into the admin's HTML that sends a load of `/app` to `/app/dashboard` and turns the post-sign-in navigation to `/app` into the same jump; every other admin route, Orders included, is untouched. Tests: **24/24** unit in the sales-summary suite, six of them new (`countUnshipped`: no fulfillment, unshipped parcel, all shipped, one of two shipped, a cancelled fulfillment, a mixed window). Verified: `tsc` (backend and the admin's own tsconfig), `medusa lint` clean, and the route against the running backend with the Admin API as the independent source — a 6-day window, 46 orders and €1,118 + $883, matching the Orders page; 192 customers, 108 new since the window opened; 38 unshipped, which is exactly the 31 `not_fulfilled` + 7 `fulfilled` the Orders API reports (the 7 `shipped` + 1 `delivered` are the 8 that count as gone); 10 pending reviews; and the default 30-day page showing 152 orders, 144 unshipped and 192 new customers, consistent with 152 orders in total and 8 shipped. Driven in headless Chrome: signing in lands on `/app/dashboard`, loading `/app` does too, the page renders its figures, the 7-day button re-reads to 46 orders, the sidebar's **Dashboard** entry navigates there, and `/app/orders` still opens with its table and the Option D widget showing the same 152 orders and €5,146 for 30 days, with no failed requests.
- [x] **Admin dashboard charts.** The Dashboard's figures became charts, in the admin's own palette rather than a template's: revenue per day as a filled area with the window before it drawn behind as a dashed line (with `EUR` / `USD` buttons, because the catalogue is priced in both and two currencies on one axis would add them up visually), a donut splitting the people who bought into new and returning customers around the window's total, a sparkline of orders per day inside the Orders card, four cards each carrying its change against the preceding window, a **Top selling products** table with units and revenue per currency (each row linking to the product), and a **Satisfaction** card with the average approved rating and its five-star distribution. The chart library is **recharts**, added to the backend because the admin is bundled from it; the components sit in `src/admin/routes/dashboard/page.tsx`, animate on mount, and are coloured with the admin's theme variables (`--fg-interactive`, `--fg-subtle`, `--border-base`). Two things had to come from the API and were built as pure, tested functions in `src/api/admin/dashboard/series.ts`: **day buckets** (`bucketOrdersByDay`, one per UTC day, both ends included, empty days left as zeros so the line is not drawn straight through a quiet day, an order outside the window left out rather than moved) and the **comparison** (`percentChange`, `alignTo`) — a previous window of zero answers `null` and the card says “no earlier window” instead of inventing a percentage, and the earlier window's arrays are padded to this one's length so the two lines share an axis. The route now also reads the window before, counts returning customers (ordered in this window, created before it — asked in 500-id parts so a long window cannot build one huge filter) and counts approved reviews per star for the distribution. Tests: **86/86** unit in the backend, 17 of them new (`series.unit.spec.ts`: buckets, currency separation, out-of-window and unreadable dates, rounding, padding, and the percentage's zero and empty-baseline rules). Verified end to end with the API as the source: for the 7-day window the per-day series sums to exactly the reported figures (eur 1,118, usd 883, 46 orders) and the earlier week's to its own (eur 4,028, 106 orders), 108 new + 1 returning customers, 5 approved reviews averaging 4.2 from a 0/0/1/2/2 breakdown. Driven in headless Chrome at 1600 px: the chart renders two areas with a grid and both axes, the donut shows one ring at 30 days (all customers new) and two slices at 7 days (108 / 1), switching `USD` redraws the axis from `€0–€6K` to `$0–$1K`, hovering shows the “this period / previous period” tooltip, the tables and grid lay out in three and four columns, `/app` still lands on the dashboard after a reload and after signing in from a directly opened `/app/login`, and `/app/orders` is untouched with no failed requests. `tsc` (backend and the admin tsconfig), `medusa lint`, `medusa build` (which compiles the admin with the new dependency) and the unit suite pass.
- [x] **Accessibility pass.** Audited with axe-core 4.10 in headless Chrome, then fixed rather than documented. **Landmarks:** `<main>` sat in the root layout, so it wrapped the header and the footer on every page — a screen reader was told the navigation was the page's content, and the header was inside the content landmark. It moved into the two group layouts (and the three pages outside them: root not-found, root error, and the design page), and the nav and the checkout header gained a **Skip to content** link that is the first tab stop, hidden until focused, and moves focus to `<main id="main" tabIndex={-1}>` rather than only scrolling. **Contrast:** the starter's leftover classes were below AA on the stock ground — `text-ui-fg-muted` (zinc-500, 3.95:1) in the footer and the search panel, `text-ui-fg-interactive` (blue-500, 3.01:1) on the three homepage collection links, and `text-ink/60` (4.31:1) on facet counts, struck-through sale prices, placeholders and step numbers. All 11 `ui-fg-muted`, both `ui-fg-interactive` and all 24 `ink/60` uses are now `ink/70` (6.00:1) or `riso-blue` (4.53:1); the menu panel went from `rgba(3,7,18,0.5)` (white on it, 4.42:1) to `bg-ink/90`, and the cart-mismatch banner from orange-800 on orange-300 (4.33:1) to ink on `riso-yellow` (12.40:1). **Keyboard:** the region and language switchers were mouse-only — they rendered their options only while a *hover* state said so, so Space on the button opened a Listbox whose panel was not in the DOM (measured: 0 options rendered). Both are now Headless UI Listboxes that own their open state, with `transition` instead of a `static` panel, so Space/ArrowDown open them, the arrow keys move, Escape closes and returns focus, and clicking still works. The close buttons in the side menu and the shared modal were icon-only with no name. The store listing's facet groups were Radix `h3`s under an `h1` (skipped level) and are `h2`s now; the product tabs likewise, and the card grids gained a visually hidden `h2` so the plates' `h3` titles follow a level. **Structure that only shows up in the accessibility tree:** the account profile's collapsed editors kept focusable fields under `aria-hidden` (axe: `aria-hidden-focus`) — they are `inert` while closed now; the phone option sheet's dialog had no name and does; the search results are announced through a polite status line ("12 products found."); the footer's three column titles were spans and are `h2`s; the design page's plate list is a `ul` of `li`s; and a single `prefers-reduced-motion: reduce` rule shortens every animation and transition, including Headless UI's and the skeletons' (0.01ms, not `none`, so transition-end still fires and panels still unmount). The first audit also caught the storefront serving a **build-time error state** — the running build had been made while the backend was down, so every prerendered page read "The store is unavailable" / "Page not found" and the audit found almost nothing; it was rebuilt with the API up before any of the numbers below were taken. Verified on the production build, signed in with a fresh account and a cart holding one line: **axe-core, 33 surfaces, 0 violations** — 9 pages at 1280 and 360 (home, listing, product, category, collection, cart, sign-in, design, unknown-handle 404), 11 signed-in surfaces (cart, checkout contact, checkout address, account overview, profile, addresses, orders, wishlist, reset-password, verify-account, order confirmation), the address dialog open, the phone option sheet open and the side menu open, with 0 console errors. **Keyboard, 30/30:** the first Tab lands on the skip link, it is visible at that moment, Enter moves focus to `main`, the next Tab leaves the nav, the menu opens from the keyboard, the region list opens with Space, arrow keys move inside it, Escape closes it and returns focus to its button (and Escape again closes the menu), the search drawer opens from the keyboard with focus in the field, announces "12 products found." through its status line, closes on Escape and returns focus to the search button, the price slider's thumb is named and moves with the arrow keys, the product's option chips are labelled fieldsets that toggle with Enter and write `v_id` once one is chosen per fieldset, and the address dialog opens from the keyboard, traps focus, has a name, closes on Escape and returns focus to the add-address control. **Layout, 16/16:** no horizontal overflow on home, listing, product or cart at 360 / 768 / 1280, the skip link measures 1px while unfocused, the reduced-motion rule computes to 0.01ms, a click still opens the region list, and add to cart still updates the nav count through the restructured layout. **Re-run 23 October 2026** after the homepage rebuild (departments, product rails, FAQ, real-review rail), the new footer, the seven legal pages and the sign-in artwork: axe-core 4.10.3 over **37 surfaces** — 27 public at 1280 and 360 (home: plain, menu open, FAQ open, dark; listing, product, category, collection, sign-in light and dark, design, 404 and all seven policy/support pages) plus 10 signed-in ones (account overview at 1280 and 360, profile, addresses, orders, wishlist, cart with an item at 1280 and 360, and the checkout contact step, reached by creating an account through the store's own signup and adding a product through its page) — **0 violations and 0 console errors**, with the homepage passing 48 rules. Keyboard, driven with real key events: the first Tab lands on the skip link (first focusable in the DOM, 38 px tall when focused), Enter and Space open the FAQ's focused `<summary>` and Tab moves to the next question, Enter on a rail's next button moves its row 980 px, the newsletter field has a real `<label>`, and the policy sidebar is a named `nav` whose current page is marked `aria-current="page"`. Footer: one `nav`, four `h2` column names and a named payment list. Layout: no horizontal overflow at 360 / 1280, and the hero's clamp keeps the display headline inside the 342 px content column at 390 px. `tsc --noEmit`, `next lint` (one pre-existing `exhaustive-deps` warning in `product-actions`) and `next build` pass. Caveats below.
- [x] **Performance pass.** Measured with Lighthouse 12 (mobile, its default simulated throttling) against the production build of the storefront, on the three pages the spec names — home, listing, product. **Images were the reason the listing carried 3.1 MB.** `next.config.js` asked for `unoptimized: true`, so every plate fetched the uploaded original: the demo PNGs are 220 kB and up, and the largest paint on a product page was a 1 MB photograph downloaded at whatever size the phone happened to ask for. The optimiser is on now — AVIF and WebP, a 31-day minimum cache, `cdn.dummyjson.com` added to `remotePatterns` beside the Medusa bucket and localhost — and `sharp` became a storefront dependency, which self-hosted `next start` needs before it will resize anything (Next lists it as an optional dependency of its own, and a pnpm install does not link an optional dependency into the app). The plates already carried `sizes`, so the browser now picks a width instead of a fallback: measured 221 kB → **2.4 kB** for the tee's 640 w AVIF, and 115 kB → **31 kB** for a product page's 1080 w main image. **The layout shift was the listing being a client-only page.** `react-instantsearch` renders nothing on the server without `getServerState`, so the delivered listing was a title, a search box and a footer inside the first screen; the filters and twelve plates then pushed the footer two screens down (CLS **1.00**). Two reserves fix it, both dropped once the search is real: a screen of height on the listing until InstantSearch has mounted, and the filter column's own height — 1640 px on a phone, where it stacks above the grid — held both before it exists and until the first response fills its facets. CLS is **0.000** on all three pages. **And the search stack no longer rides along on every page.** The navbar's drawer imported InstantSearch and its client eagerly (~100 kB), so a homepage that never opens it paid for it; the panel is now `next/dynamic` (`search/components/search-panel.tsx`), loaded on first open, with a status line while the chunk arrives. `browserslist` in the storefront's `package.json` states the browsers the build targets (Chrome/Edge/Firefox 111+, Safari 16.4+) — the polyfill bundle it emits carries `noModule`, so modern browsers skip it; the legacy bytes the audit still reports are inside dependencies compiled to ES5, not ours. Verified on the production build: **three consecutive Lighthouse passes** — home **93–96**, listing **88–91**, product **94–96**, with Accessibility **100** and SEO **100** on all three and CLS 0.000 throughout; the spread is main-thread contention on the machine under test, and the listing's ~200–350 ms of total blocking time is the search stack parsing and running, which is what the audit's swing between 88 and 91 is made of. Under a load spike the same build read 85/87/94, recorded rather than hidden. The listing's behaviour was re-checked in headless Chrome after the restructuring, **8/8**: twelve plates render, typing narrows them to 11 and writes `product[query]` to the URL, the pager moves to the next page (`Hello World Tee` → `Race Condition Hoodie`), the drawer opens from the nav, its panel loads on demand, a drawer search returns 11 hits and announces "11 products found." through its status line, and the grid's own skeleton holds its place before the first response. Images were checked on the optimiser, 10/10, 12/12 and 9/9 loading through `/_next/image` on home, listing and product with no console errors. **Re-run 23 October 2026** on the production build after the homepage and footer work, Lighthouse 12 as above, three consecutive passes per page plus two extra listing runs: **home 94 (87–98)**, **listing 73–81**, **product 94 (92–95)**, with Accessibility, SEO and Best Practices **100** throughout. CLS is **0.000** on home and product; the listing now reads **0.009**, the shift being its results column resizing as the grid arrives. Its LCP was 4.07–4.40 s and its total blocking time 286–529 ms, dominated by the search stack's 1.1 s of script evaluation under simulated throttling. Home's LCP ranged 1.81–4.02 s with CLS 0.000 after the new FAQ and rails; product LCP 2.80–3.36 s and TBT 44–139 ms. The listing's score is lower than the 88–91 recorded in the earlier pass with no change to its code, recorded as measured rather than smoothed.
- [x] **Performance pass, listing server-rendered (re-run 23 October 2026).** The listing moved from a client-only InstantSearch tree and its `120vh` reserve to `InstantSearchNext`: the search now runs on the server, so the first page's plates and facets are in the delivered HTML and React hydrates onto those results. The reserve and the `1640px` filter-column placeholder are gone, and `useSearchSettled` keeps the server and the client's first render on the same skeleton-then-results state, so the plates never replace a shorter grid. Verified on the rebuilt production storefront (`next start` on port 8000, the region the database serves), Lighthouse 12 mobile with its default simulated throttling, three passes per page: **home 91–92** (74 on the first, cold-image pass before the optimiser had warmed), **listing 81–87**, **product 94–96** (85 first), with Accessibility, SEO and Best Practices **100** and CLS **0.000** on home and listing (product 0.001). The listing's observed LCP is **0.24–0.49 s** and its total blocking time 215–256 ms, but the simulated LCP is 3.47–4.16 s: Lantern charges the page's 223 kB first-load JavaScript — 120 kB of it the route's own, most of that the search stack, with 974 ms of script evaluation — before the 4 kB first-plate AVIF, which is what keeps the default simulation under 90 even though DevTools throttling on the same build reads 95. The page's behaviour was re-checked on the production build through headless Chrome, **14/14**: twelve plates in the HTML with no skeleton left behind, the sort radio writes `product[sortBy]` and reorders the grid with ascending prices monotonic, the search box writes `product[query]` and narrows the grid to five hits, the pager moves to page 2, the phone filter panel opens as a dialog and Escape closes it, no console errors, and no horizontal overflow at 1280 or 390. `tsc --noEmit`, `next lint` and `next build` pass. This is the recorded result, not a pending one: the owner was offered the URL-state rewrite and chose to keep instant filtering on 23 October 2026. The remaining cost and the path past it are in the caveats below. Caveats below.
- [x] **Dark mode (optional).** The same six tokens, inverted: `stock` becomes near-black `#14151A`, `ink` becomes the paper `#E8E9E3`, and the four riso inks are re-mixed at print strength because the darkened `#006DAE` is 2.6:1 on a dark sheet. `docs/DESIGN.md` §2.2 records every pairing and its measurement. Nothing in a component names a mode — `styles/globals.css` swaps the values under `.dark` on `<html>` — so the two modes cannot drift, and the classes a button already had (`bg-riso-blue text-stock`) are correct in both: `stock` on blue is 4.53:1 light and 7.99:1 dark, and `ink` on a coloured fill, which was already banned, is 1.85–2.08:1 in dark. The choice is `light` / `dark` / `system` in `localStorage` under `dc-theme`, applied by an inline `<head>` script (`THEME_SCRIPT` in `lib/theme.ts`) before the first paint so a returning visitor never sees the other mode, with `color-scheme` and the viewport `theme-color` following so scrollbars, form controls and Chrome's autofill repaint with the page. The `useTheme` hook reads the browser through `useSyncExternalStore` rather than copying it into React state, so a control cannot disagree with the document, the OS change reaches every open tab and no SSR mismatch is possible. Auto is the default and a real third option; the control is a three-way radio group, and it lived in the footer when this was written — the header entry below moved it to the header and the menu panel. The starter's remaining fixed colours went with it: every `ui-fg-*` / `ui-bg-*` / `ui-border-*` class (which resolve to the Medusa preset's sRGB greys), the zinc/green gradients in the free-shipping nudge, the badge palette, `shadow-borders-*` on the radio and the input's `rose-500` asterisk are now tokens, and the thumbnail plates take a border instead of a black drop shadow that a dark sheet would swallow. Verified on the production build through headless Chrome, **20/20**: 7 behaviour checks — no preference with the OS light paints `#E8E9E3`; the theme control offers Light/Dark/Auto with Auto checked (it was in the footer at the time); choosing Dark paints `#14151A`, sets `color-scheme: dark` and stores `dark`; on reload **every frame from the first paint is dark** (a `requestAnimationFrame` recorder installed before any document script sees the class already applied — no flash); Auto stores `system` and follows `prefers-color-scheme` into dark and back to light — and 13 surfaces scanned with axe-core 4.13 with **0 violations**: home, listing and the design page in both modes, plus product, cart, sign-in, category, collection, the 404 page and a real checkout (with a cart built through the Store API) in dark. `tsc --noEmit`, `next lint` (the one pre-existing `exhaustive-deps` warning in `product-actions`) and `next build` pass. Caveats below.
- [x] **Header navigation, theme placement and icons.** Three things a wide screen was getting wrong. **The primary destinations left the panel.** Every link sat behind the menu button at every width, so a click on a desktop was two: open the panel, then follow the link. The header now draws **Store** beside the menu button at `small` and up; the panel is unchanged below that, where the header has no room for both. The links live in one list (`lib/nav-links.ts`), each entry marked `primary` only if the header should repeat it, so a link cannot exist in one place and be missing from the other — the panel still carries Home, Store, Account and Cart, the header's copy included, because the user asked for the panel to remain the *complete* navigation as the list grows. A new destination is one entry in that file and it appears in both places. **The colour control moved out of the footer.** It is drawn twice from the one `ThemeSwitcher`: `compact` in the header (three icons, each with a tooltip and a visually hidden name, `hidden small:flex`), and `full` with its labels in the panel, at every width. So the header offers it on a desktop and the panel offers it everywhere, including a phone — the footer used to be the only home for it and a preference nobody scrolls to is one most visitors never learn exists. The header's copy and the panel's can be on screen together, so the radio group's name comes from `useId` instead of a constant; with one shared name they would read as a single group with two controls. **Cart, account and menu are icons, not words.** `ShoppingBag` and `User` from `@medusajs/icons` with `aria-label`s written out (`"Cart, 2 item(s)"` — the count is part of the name, since a bag says nothing about how full it is) and `BarsThree` for the menu, which was already an icon. The cart's count stays beside the bag in mono and at zero, so the control does not jump as it fills; the phone link and the desktop popover remain mutually exclusive by breakpoint, as before. Verified on the production build through headless Chrome, **13/13**: at 1280 the header draws the Store link, an account link whose whole content is one `User` icon with `aria-label="Account"`, a cart link of one `ShoppingBag` icon with `aria-label="Cart, 0 items"` beside the mono count, and a menu button that is one `BarsThree` icon named "Open menu"; the header's theme group is a three-option radio group (light / dark / system) and the footer contains no theme control at all; choosing Dark there adds `dark` to `<html>` and Light removes it; opening the panel gives all four links (Home, Store, Account, Cart — the header's Store included) and the labelled theme group on the panel's ink ground. At 390 the Store link and the header's theme group are gone, the three icons stay, and the panel opens with the same four links, the labelled group, no internal overflow and no horizontal overflow on the page. No console errors and no failed requests. `tsc --noEmit`, `next lint` (the one pre-existing `exhaustive-deps` warning in `product-actions`) and `next build` pass.

## Phase 3.5 — Production hardening

Gaps found by reviewing the shop after Phase 3 (23 October 2026). The customer-facing surface is already
at the standard the spec asks for; everything below is the layer that makes it safe to run, and it comes
before Phase 4's deployment because a deploy without it has no net under it. The order is deliberate:
the tests go in first, because they are what stops everything after them from regressing.

- [x] **P3.5.1 The backend suites in CI.** The suites existed but nothing ran them: `apps/backend/package.json`
  had no `test` script, so `turbo test` ran only the storefront's one unit file, and the workflow said the
  backend suites were "covered separately" while no job covered them. `apps/backend` gained a `test` script
  that runs unit → modules → HTTP in that order, so the fast suite stops the expensive ones; the workflow
  keeps the storefront's database-free unit tests in the build job (now `--filter @dtc/storefront`) and gained
  a **`backend-tests` job** with a `postgres:15-alpine` service container, a `pg_isready` health check, and the
  four `DB_*` variables the runners read instead of the uncommitted `.env.test`. Verified locally with
  `pnpm --filter @dtc/backend run test`: **97 unit tests in 8 suites, 37 module tests in 5 suites, 79 HTTP tests
  in 7 suites, exit 0**, against the same Postgres 15 the service container runs. The GitHub job has not run
  yet — it needs a push — so the first push is what proves the service wiring; the command it runs is the one
  that just passed. Superseded P4.1: the tests were written, the wiring was not.
- [x] **P3.5.2 Security headers, and a CSP that can be enforced.** `next.config.js` now sends, on `/:path*`:
  HSTS (one year, `includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Permissions-Policy` without camera, microphone or geolocation, one **enforced** CSP carrying only the
  directives that cannot break a page (`base-uri`, `object-src`, `frame-ancestors`, `form-action`) and one
  **`Content-Security-Policy-Report-Only`** carrying the fetch policy — `default-src`, `img-src` with the
  backend origin, the demo CDN and the upload bucket, `connect-src` with the backend and `api.stripe.com`,
  `frame-src` for both Stripe hosts, `worker-src`, `manifest-src`, `font-src` — assembled from the same env
  the app reads, with `'unsafe-eval'` and the dev websocket only outside production. `Referrer-Policy` is
  deliberately absent from the wildcard rule so the order routes' own `no-referrer` is the single value sent.
  Verified on the production build: `next build` exit 0, the headers present on a redirect, a page and an
  order route (which keeps its `no-referrer` and `X-Robots-Tag`), and a headless-Chrome sweep of nine surfaces
  — home, listing, listing with a query, product, category, cart, signed-out account, about, checkout with an
  empty cart — **0 CSP violations, 0 console errors, 0 failed requests** (the run's only console error was the
  intentional 404). The card form is not in that sweep: it needs a cart with an address, and Stripe's frames
  are exactly what a report-only policy is there to catch, so enforcement is still the separate decision the
  item reserves.
- [x] **P3.5.3 Rate limiting that covers more than OTP.** The counter moved to a shared store and the
  coverage widened. `src/lib/rate-limit.ts` is async now and keeps each window in Redis as a sorted set
  — one Lua script, so two instances cannot interleave a read and a write — whenever `REDIS_URL` is set,
  falling back to the process's own map for a bare checkout, CI and the suites. A Redis that is down
  lets the request through and logs one warning: a limiter must not be able to take checkout down.
  `ioredis@5` (the version Medusa already ships) is a direct backend dependency now. A `rateLimit()`
  middleware (`src/api/middlewares/rate-limit.ts`) is attached in `src/api/middlewares.ts` to sign-in
  (60 per 5 minutes per IP), registration (60/hour), admin sign-in (30 per 5 minutes), both
  password-reset routes (10/hour, one counter for the pair), newsletter sign-ups (10 per 10 minutes),
  review writes (10/hour per customer) and wishlist saves (300 per 10 minutes per customer) — counted
  by customer once `authenticate` has run and by IP otherwise, answering the `too_many_requests` body
  and `Retry-After` header the verification route already used. The newsletter form now repeats the
  API's refusal instead of telling a limited visitor to "try again in a moment". Verified: unit **97
  passed, 2 skipped** (the Redis pair skips when `REDIS_URL` is unset) and those two pass against the
  local Redis when it is set; a new HTTP suite (`integration-tests/http/rate-limit.spec.ts`, **2/2**)
  proves the eleventh sign-up is `429` with `Retry-After`, that the refused address was not written,
  and that a spent newsletter allowance leaves the sign-in counter alone; the full backend suite is
  **97 unit + 37 module + 81 HTTP, exit 0**, so the existing suites' own sign-ups and sign-ins do not
  trip the limits; `tsc`, `medusa lint`, and the storefront's `tsc`/`next lint` pass. Caveat below:
  these are per-caller flood limits, not a per-account lockout.
- [ ] **P3.5.4 Error monitoring and an uptime check.** `apps/backend/instrumentation.ts` is a commented
  stub, the storefront has no reporter, and nothing alerts anyone when a payment, a webhook or a checkout
  read fails. Nobody finds out except the customer. Needs a provider and a DSN (owner input); the code is
  the small part.
- [x] **P3.5.5 Backup and restore.** Two scripts and a runbook, and the restore was run rather than
  assumed. `scripts/db-backup.sh` writes a custom-format dump with its checksum, a `.meta` naming the
  database and time, and a row count per table — refusing to keep a dump that carries no table data —
  then prunes anything older than `BACKUP_RETENTION_DAYS` (14 by default) from `BACKUP_DIR`. Everything
  is written `0600`: the dump holds customer data, and it is deliberately not uploaded anywhere, because
  which bucket, region and key are deployment decisions. `scripts/db-restore.sh` verifies the checksum,
  restores with `--clean --if-exists --exit-on-error`, **refuses to restore over the dump's own
  database** without `FORCE=1`, and with `--verify` compares every table's row count against the
  backup. `docs/BACKUP.md` carries the schedule, the retention rule, the offsite/encryption requirement,
  what the dump does **not** contain (object-storage images, Redis, secrets, the search index), the
  production restore steps and their rollback. Measured on 23 October 2026 against the local database
  (38 MB, 159 tables): **backup 7.2 s / 1,456,247 bytes**, **restore into a fresh database + verify
  8.0 s, all 159 tables matched**, and both guards exercised — restoring over the source exits `1`
  before `pg_restore` runs, and a wrong checksum exits `1`. One defect was found and fixed in the
  script itself: `pg_restore --list | grep -q` let `grep` exit early, `pg_restore` died of SIGPIPE and
  `pipefail` reported a good dump as empty; the listing is captured rather than piped now.
- [x] **P3.5.6 Regression budgets.** The gate exists and it immediately earned its keep in a way that is
  not about scores: `pnpm audit --prod` found **39 vulnerabilities in production dependencies, including
  two critical** — **Next.js 15.5.24 was in the range of the unauthenticated RCE in the Image
  Optimization API** (`>=10.0.0 <=15.5.27`, fixed in 15.5.28), on a storefront that has the optimiser
  switched on, and `proxy-addr <2.0.8` allowed IP spoofing behind a trusted proxy, which is the same
  signal the rate limiter keys on. Both are fixed: **Next and `eslint-config-next` are on 15.5.28**, and
  the root `pnpm.overrides` pins `proxy-addr` to `>=2.0.8` (Express's own `~2.0.7` range accepts it).
  Re-audit: **0 critical**, 18 high, 14 moderate, 2 low — nearly all in Medusa's transitive toolchain.
  CI now runs `pnpm audit --prod --audit-level=critical` in the build job, so a critical advisory fails
  a build, and `.github/dependabot.yml` opens grouped weekly PRs for npm (majors ignored, security
  updates still raised) and monthly ones for the actions.
  **Lighthouse CI** is `lighthouserc.cjs` behind `pnpm run lighthouse`: home, listing and product, with
  `categories:performance ≥ 70`, accessibility and SEO at **1.0**, Best Practices at **0.95** and CLS
  at **≤ 0.02**. The performance floor is 70 because that is what the simulator actually spread over with
  no code change between runs — home 73–90, listing 72–83, product 84–91 — while accessibility, SEO,
  Best Practices and CLS never moved. A nightly `.github/workflows/lighthouse.yml` builds and seeds the
  shop on a Postgres service, resolves the publishable key from the seeded row, serves both apps, warms
  the image optimiser and runs the same config on the median of three runs. Verified locally against the
  production build: the first run at a 75 floor **failed** on a cold home page (73), a warm run read
  home 90 / listing 72 / product 91, and the shipped config **passes, exit 0**, on home 90, listing 79,
  product 88, with 100/100/100 and CLS 0 on all three. `tsc`, `next lint`, `next build` (on the upgraded
  Next), the backend's unit suite (**97 passed**) and the rate-limit HTTP suite (**2/2**) still pass.
  The nightly workflow itself has not run on GitHub yet; its first scheduled run is what proves the
  service wiring, exactly as `backend-tests` does.
- [x] **P3.5.7 Structured data the catalogue can already support.** Three nodes were added where the data
  already existed. **`aggregateRating`** on the `Product` node, from the same read the reviews section
  uses: `ratingValue` to one decimal, `reviewCount`, `bestRating` 5 and `worstRating` 1, and omitted
  entirely while a product has nothing approved — a rating of zero is not a rating. The read is cached
  on the `reviews-<id>` tag for a minute, so an admin's approval reaches the markup without a deploy.
  **`BreadcrumbList`** (`modules/common/components/breadcrumb-json-ld`) from the trail each page already
  draws: home → store → department → product, and home → ancestors → category, with consecutive
  positions and absolute URLs so the names and order cannot drift from the visible breadcrumb.
  **`Organization` and `WebSite`** in the root layout's `@graph`, naming the store, its URL, its
  language and the publisher link by `@id`; the node deliberately carries no `SearchAction`, because
  the listing's URL names a region the database owns rather than the build, and a template naming the
  configured default would 404 on a shop whose regions are elsewhere (which is why `sitemap.ts` resolves
  its region from the API). Verified on the production build with the Store API as the independent
  source, **17/17**: the cup's page reports 3 reviews at 5.0, exactly what `/reviews` returns; the trail
  reads *Home > Store > Home & Kitchen > Black Aluminium Cup* with consecutive positions and absolute
  items; a product with no approved reviews carries no `aggregateRating` at all; the category trail ends
  at *Electronics*; and the home page's graph holds both nodes with the publisher link. `tsc`,
  `next lint` and `next build` pass.

Not gaps, decided: **analytics and a consent banner** (the cookie and privacy policies state there are no
cross-site trackers; adding one means rewriting both pages first), **CAPTCHA** (BUGS.md §2 records why it
was not added), and **self-service returns** (the policies and admin-side refunds exist; a customer-facing
return request is a product decision, not plumbing).

## Phase 4 — Testing & Deployment

- [ ] **P4.1** Backend tests for custom modules/workflows/routes. _(Tests are written; running them in CI is
  P3.5.1.)_
- [ ] **P4.2** Playwright E2E: guest purchase, register+login+order history, search, failed payment.
- [ ] **P4.3** CI runs lint, types, tests, build; E2E on main/nightly.
- [ ] **P4.4** Production config: server + worker, migrations on deploy, Redis, S3, CORS, Stripe webhook.
- [ ] **P4.5** Deploy storefront + backend; run production seed; smoke-test full purchase.
- [ ] **P4.6** `docs/DEPLOYMENT.md` with steps and a rollback note.

## Phase 5 — Documentation

Only when asked.

- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/DECISIONS.md`
- [ ] `docs/TESTING.md`
- [ ] `README.human.md`

---

## Beyond-spec work already done

- **Google sign-in (A1+).** Not in the spec's roadmap; requested directly. Medusa's own Google auth
  provider (`@medusajs/medusa/auth-google`, which ships inside the `@medusajs/medusa` dependency the
  backend already had) registered the way Stripe is: only when `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` are all set, because the provider throws on a
  missing option and a provider that throws takes the whole backend down at startup rather than one
  button. Listing `providers` replaces the Auth Module's defaults, so `auth-emailpass` is named back
  in the same array. The storefront side is a button on both account views, a server action that
  redirects to Google, and a callback route that finishes the sign-in. Verified: the provider is
  registered and `POST /auth/customer/google` answers with Google's own consent URL carrying
  `redirect_uri=http://localhost:8000/api/auth/google/callback`; `emailpass` still authenticates and
  still refuses a wrong password; and 11/11 browser checks cover the button on both views, the
  unconfigured-store message, and each of the callback route's answers, all on the production build.
  Then verified end to end with a real OAuth client and a real Google account: the button hands the
  browser to `accounts.google.com/o/oauth2/v2/auth` with our client id and `redirect_uri`, and Google
  accepts it (4/4 boundary checks, so the sign-in page rather than its error page). A first-time
  sign-in produced the server sequence
  `GET /auth/customer/google/callback` 200 → `POST /store/customers` 200 → `POST /auth/token/refresh`
  200 → `POST /store/carts/:id/customer` 200 (a guest cart started before signing in followed the
  customer into the account) → `GET /store/customers/me` 200 → `GET /store/orders` 200, with no 5xx on
  either server. The database agrees: one customer for that address, carrying the first and last name
  **from the Google profile**, linked to exactly one `google` auth identity whose
  `app_metadata.customer_id` is that row. The client id and secret are valid independently of all this
  (Google's token endpoint answers `invalid_grant`, not `invalid_client`, for a fake code), and the
  `emailpass` identities are untouched (27 before and after the provider was registered). Two branches
  remain unexercised: a *second* sign-in by the same Google account, and the email collision below.
  The one thing the console has to get right is the callback URL — that it must be listed under
  **Authorized redirect URIs** is not a detail: until it is, Google refuses with `redirect_uri_mismatch`
  however correct `.env` is (hit for real during this work, and recorded in `docs/SETUP.md`).
- **Design foundation (P1.1).** Not in the spec's roadmap; requested directly. Fonts, theme tokens, base
  components and an internal `/{country}/design` preview page. See `docs/DESIGN.md`.
- **Health endpoints for uptime and free-tier keep-alive.** Not in the spec; requested directly, so an
  external scheduler (cron-job.org) can keep a free-hosted deployment awake. Medusa already answers
  `GET /health` for the process, so the project added the two answers it did not have:
  **`GET /health/ready`** on the backend (`src/api/health/ready/route.ts`) runs one `select 1` through
  the framework's Postgres connection — `200` with `{status, database, latency_ms, time}` when it
  answers, `503` with `{status: "unavailable", database: "down", time}` when it does not, and the
  driver's reason goes to the log rather than the body, because the endpoint is public. **`GET
  /api/health`** on the storefront (`app/api/health/route.ts`) answers for the storefront alone and
  deliberately does not call the backend, so a backend cold start cannot make the storefront look
  down. Both are `force-dynamic`/`no-store`, so a monitor always gets a fresh answer. The keep-alive
  does not sit on Medusa's `/health` on purpose: it never touches the database, so it would leave a
  free Postgres asleep and a monitor blind to a database outage. Verified against the running servers:
  `/health/ready` answered `200 {"status":"ok","database":"up","latency_ms":1,...}` with
  `Cache-Control: no-store` in 2–15 ms over three calls, `/api/health` answered `200` with its JSON and
  the site's security headers, and the readiness route's two branches are unit-tested (**2/2**: the 200,
  and the 503 that keeps `ECONNREFUSED` out of the body and in the log). `tsc`, `medusa lint`, and the
  storefront's `tsc`/`next build` pass — the build lists `ƒ /api/health`. The scheduling recipe (two
  cron jobs, every 10 minutes, 30-second timeout, why the backend hits `/health/ready`) is in
  `docs/SETUP.md` §20.
- **Deployment guide (Vercel, Render, Supabase, Upstash).** Requested directly, after the health
  endpoints: one document describing how to host this repository on four free tiers. What it settles
  is not the providers but the details a first deploy gets wrong — Supabase's session pooler on port
  5432 rather than the transaction pooler on 6543 (MikroORM's prepared statements), `?sslmode=require`
  in `DATABASE_URL`, the exact Render start command (see below), Upstash's metered BullMQ polling, and
  the environment values that have to agree across the two services. The Render start command
  changed while writing it: `pnpm --filter @dtc/backend start` runs `medusa start` from the app
  directory, which serves the dashboard from `<cwd>/public/admin`, while `medusa build` writes it to
  `.medusa/server/public/admin` — so the documented command is
  `cd apps/backend/.medusa/server && ../../node_modules/.bin/medusa start`. Verified locally against
  the production build: `/health` `200`, `/health/ready` `200` with `no-store`, `/app` `200`. The
  provider-side steps are documented, not exercised: no account was created on any of the four hosts.

## Standing notes

- **The product photography comes from two hosts, one of them third-party.** The dev-merch pieces use
  the public Medusa demo bucket; the 30 wardrobe lines use the open dummyjson.com demo catalogue
  (`cdn.dummyjson.com`), which is what gives each product its own real photo instead of the same four
  garments repeated. Nothing is proxied or downloaded into the repo, so a deployment that blocks that
  host shows empty image wells on those products (the plate falls back to its "No image" state, the
  page still renders). `next/image` now runs **with** the optimiser, so both hosts are named in
  `remotePatterns` — a host that is missing is refused and its plates fall back to "No image" — and the
  optimiser fetches the original itself, which means the deploy has to be able to reach that host.
  `sharp` is a storefront dependency for the same reason: without it `next start` refuses to resize and
  every `/_next/image` request fails.

- **A shared option is only shared when it can hold the product's values.** `Size` and `Color` are
  created once and linked by id, which is what the storefront's option filter reads; but a bag in
  `Blue` cannot hang off a `Color` that only knows Black and White. The seed asks for the option's
  existing values and links the product to it only when every value it needs is there, otherwise the
  product gets its own exclusive `Color` (or `Shoe Size`). Nothing is added to an existing option's
  values, because Medusa's option-value API only creates.

- **The 30 wardrobe products are demo data, not stock a shop could sell.** Their names, descriptions,
  prices and stock are ours and plausible, but the photographs are demo-catalogue imagery of the
  generic kind (a check shirt, a midi dress, a tote); a real launch would replace them with the
  store's own photography, which the seed takes as a URL per product and does not care where it comes
  from. Deliberately left out: the demo catalogue's branded items (sneakers, bags and watches that
  show a real label) and its dresses sold under a designer's name, so nothing trademarked is shipped
  in the seed.

- **A catalogue product that loses its sales channel disappears.** Search and the Store API are
  scoped to the publishable key's channel, so a document with an empty `sales_channel_ids` matches
  nothing — the product is still in the database, still in the admin, and simply missing from the
  listing (found on `hello-world-tee` after an admin edit). The seed repairs an empty channel and an
  empty category on catalogue products only, and only when empty, so an admin's own filing survives a
  re-run.

- **The cart and stock reads are deliberately uncached.** `retrieveCart` and the listing's
  stock lookup (`listVariantAvailability`) both read with `no-store`. A cached read is repainted from
  inside the server action that just wrote it, and the repaint can be served the entry from before the
  change: measured as a stale subtotal in roughly one cart change in ten, and as a stock cap that lagged
  a real stock drop. The routes that read them are dynamic anyway, so the cache bought one round trip and
  cost correctness. A2 put the order reads on the same footing, for a sharper reason: the two orders
  endpoints are the same URL for every customer and differ only in the Authorization header, so a cached
  entry could serve one customer the previous customer's history. Anything else that must never lag a write,
  or must never be shared between customers, should follow suit.
- **A refused order is the storefront's 404 page with an HTTP 200.** The account's routes render through
  parallel-route slots (`@dashboard`/`@login`), so Next has already flushed the layout shell — and its status
  with it — by the time the slot's page raises `notFound()`: the customer sees the storefront's own not-found
  page inside the account chrome, while the response says 200 where a category page's unknown handle says 404
  (`/dk/account/orders/details/<unknown>` 200 vs `/dk/categories/<unknown>` 404, both measured). The body
  carries nothing of the order; only the status is wrong. The alternative — raising `notFound()` from
  `generateMetadata`, which is what the starter did — answers 404 but renders the bare root not-found page,
  the C3 trap. Fixing the status properly means not rendering the account pages through a slot, which is a
  restructure A2 did not take on.
- **Google sign-in cannot adopt an email that already has an account.** Medusa gives each provider
  its own auth identity and refuses a second customer record for one email, so a customer who signed
  up with a password and then clicks **Continue with Google** with that address is told to sign in with
  their password instead. Linking the two would mean updating the existing customer's auth identity
  server-side, which needs an admin-scoped route; the alternative (creating a second customer for the
  address) is worse. The MFA and email-verification branches of the callback are likewise reported as a
  failure rather than given a screen.
- **The Google callback lives under `/api` on purpose.** `middleware.ts` guards `/account/*`, so a
  callback there would be unreachable to the signed-out visitor who needs it; and a URL without a
  country code is the one redirect URI to allow-list on the OAuth client, since the middleware puts the
  region back on the way out. The destination to return to after the round trip is carried in a
  `_medusa_auth_return` cookie (the callback has no memory of which page asked), read once and only
  followed when it is a path on this site.
- **The storefront keeps the session in an httpOnly cookie, not the SDK's storage.** The SDK would put
  the JWT in `localStorage`; `lib/data/cookies.ts` puts it in `_medusa_jwt`, which is why the Google
  flow decodes the callback token server-side (for the email a first-time customer is created with)
  and refreshes with an explicit `Authorization` header rather than through `sdk.auth`'s stored token.
- **A server action must return its failures, not throw them.** A production build replaces a thrown
  server-action error with "An error occurred in the Server Components render. The specific message is
  omitted in production builds" — this is what the customer saw for a rejected quantity before the cart's
  mutations were changed to return `{ ok: false, message }`. Fixed for `addToCart`, `updateLineItem`,
  `deleteLineItem`, and in K2 for `setCartEmail`, `setAddresses`, `setShippingMethod`,
  `initiatePaymentSession` and `placeOrder`, and in A1 for the sign-in, create-account and Google flows.
  The order reads in `lib/data/orders.ts` were converted in A2 (`listOrders` returns `{ ok, orders, count }`,
  `retrieveOrder` returns the order or null). K6 converted the promotion mutations (`applyPromotionCode`,
  `removePromotionCode`), and A3 the address mutations (`addCustomerAddress`, `updateCustomerAddress`,
  `deleteCustomerAddress`, `setDefaultCustomerAddress`). Still to do, same class: `updateCustomer` in
  `lib/data/customer.ts` (A4), which still throws, so its message is masked in production.
- **A form action resets the fields it just submitted.** React clears an *uncontrolled* input after a form
  action returns, so a rejected value is erased from the field the customer has to correct (measured in K2:
  the email came back empty after the server rejected it). Any field whose rejection message asks the
  customer to change it has to be controlled (`value` + `onChange`); `defaultValue` is only safe when the
  action redirects on every path. **Checkboxes are the sharper edge:** the reset restores the *mount-time*
  state, not the customer's choice, and a controlled `checked` does not correct the DOM afterwards — the
  K2 billing toggle came back checked after a rejected address while React's state still said unchecked, so
  the box's DOM state and the state that decides the payload disagreed. A toggle whose value reaches a
  server action has to re-assert its state in an effect keyed on the action result.
- **Checkout step state is derived, not stored.** The URL names the step and the cart says which steps are
  complete (`modules/checkout/lib/steps.ts`); a step is reachable when every step before it is. Nothing
  keeps a separate copy of "where the customer is", which is what lets someone walk back to any answered step
  and keep everything entered after it. A new step means one entry in `CHECKOUT_STEPS` plus its completion
  rule, and the page's redirect, the stepper and the cart's checkout button all follow.
- **Line items are lists, not table rows.** The cart's `Item` renders an `<li>`, so anything that shows cart
  lines has to be a `<ul>`; the checkout summary used to wrap them in the starter's `Table`, which put `<li>`
  inside `<tbody>` and cost every checkout page a client re-render (see K2). The shared `SkeletonLineItem`
  stays a `<tr>` because the order page's table is its caller; the cart and the summary each keep their own
  `<li>` placeholder.
- **An empty input and an absent saved field are not the same value.** `compareAddresses` — and the saved-address picker built on it — decides "this is that address" by comparing the fields for equality, and a saved address that never had a field holds `null` where an untouched input holds `""`. The two therefore never matched: in K3 the prefill filled the shipping form while the picker above it still said "Choose an address". Anything that compares what the customer typed against what is stored has to normalise the empty case to one value first; `shipping-address` hands its empty values to the picker as `null`.
- **The order pages converged in A2.** K5 restyled the confirmation page and the components it renders
  (`modules/order/components/*`); A2 brought the account's history and detail pages onto the same look, so one
  order reads the same whichever page it is reached from, and deleted the starter's `OrderSummary`, which was
  the second way to print the same money. The order card and list keep the test ids K3's `f3`/`f4` read
  (`orders-page-wrapper`, `order-card`, `order-display-id` with the display id as its whole text), so those
  checks keep their meaning. The Phase 1 states pass then brought the remaining account surfaces onto the same
  look: the overview (which had been `hidden` below `small`, i.e. blank on a phone), the profile page's bands
  and the address plates. A3 then gave the address plates their behaviour — adding, editing, deleting and
  defaulting — and moved those mutations onto returned failures. What A4 still owns in the account is the
  profile's edits and password reset, including `updateCustomer`, which still throws (see the server-action
  note above).
- **A default address is a flag on the address, not an id on the customer.** `is_default_shipping` and
  `is_default_billing` are the only defaults Medusa keeps; the `default_*_address_id` fields in
  `@medusajs/types` are not computed by this version's Store API. A3 sets them through
  `updateAddress`, whose workflow clears the previous default (the partial unique index would otherwise
  reject the second one), and K3's checkout prefill already reads `is_default_shipping` with a fallback to
  the first address in the region. Deleting the default address therefore leaves no default of that kind:
  nothing promotes a replacement, the cards simply stop showing a marker, and checkout falls back to the
  first saved address. **Billing** defaults are an account fact only — the checkout asks for a billing
  address itself — so "Make default billing" changes what the account page and profile report, not what a
  checkout prefills.
- **The address form's country list is the region's countries.** Like the checkout's address step, the
  account form offers the countries of the region the storefront is being browsed in (one region in this
  catalogue), so saving an address in another country means visiting that region's storefront first.
- **The profile's billing address still has uncontrolled fields.** A3 converted the address book's forms to
  controlled values, but `profile-billing-address` still uses `defaultValue` throughout, so a rejected billing
  save resets what was typed. That belongs to A4's profile pass, not A3's address book.
- **The accessibility pass is a harness, not a CI gate, and it says what it did not cover.** axe-core 4.10
  was injected into headless Chrome and run page by page; the keyboard behaviour was driven with real key
  events and the landmark/name/focus state read off the live DOM. axe is a mechanical subset of WCAG: it
  cannot judge reading order, whether an alternative text is meaningful, or focus-ring visibility, and **no
  screen reader was driven** — there is no AT in this environment, so what a screen reader actually
  announces is inferred from the accessibility tree, not heard. The **Stripe Payment Element is a
  cross-origin iframe**, so the card form itself was outside the audit; the payment step's own chrome is
  covered by the checkout steps' headings and the review step shares the audited components. Contrast is
  measured against the computed styles of the default, light scheme. Wiring this harness into CI belongs to
  P4.1/P4.3; until then a UI change is only audited when someone runs it. The 23 October re-run covered 37
  surfaces: the 27 public ones and 10 signed-in ones, but not the address dialog, the phone option sheet, the
  side menu's open state, the order confirmation or the Stripe iframe.
- **The audited build took two attempts, and the first one was a trap worth knowing about.** The storefront
  on `:8000` had been built while the backend was down: home said "The store is unavailable" and every other
  page "Page not found", served from the prerender cache with a `200`. An axe run against that build reports
  almost no violations — the error pages are simple and clean — which reads as a pass. Rebuilding with the
  API up (and clearing `.next` first) was step one of this pass. If an audit's numbers look too good, check
  that the page under it is the page you meant.
- **The landmarks come from the route groups, so a new page has to say which one it is.** The root layout
  renders no `<main>` at all: `(main)` and `(checkout)` each draw their own around their children, and the
  three pages outside both groups (root `not-found`, root `error`, the design page) draw theirs themselves.
  The nav's and the checkout header's "Skip to content" links target `#main`, so a page that renders without
  one silently sends a keyboard user back to the top of the nav. A new group layout means a new `<main
  id="main" tabIndex={-1}>` — the `tabIndex` is what moves focus rather than only scrolling, and without it
  the next Tab walks back into the navigation the customer just skipped.
- **Secondary text is `ink/70`, never `ink/60`, and never the starter's `ui-fg-*` colours.** The alpha tones
  are measured in `docs/DESIGN.md` §2.1: `ink/60` on `stock` is 4.31:1 and fails AA at the 12–14px sizes
  these labels use, while `ink/70` is 6.00:1. `ink/40` is 2.46:1 and is only ever a disabled control. The
  accessibility pass replaced the last of the starter's palette too — `text-ui-fg-muted` was zinc-500
  (3.95:1) and `text-ui-fg-interactive` was blue-500 (3.01:1), both on a stock ground that the starter's
  preset was never measured against. Any new class that comes from the starter needs its ratio checked
  before it ships.
- **Headless UI keeps Enter for form submission, so its Listbox opens with Space or an arrow.** In
  `@headlessui/react` 2.2 the `ListboxButton`'s `keydown` for Enter calls `attemptSubmit`, and only Space and
  the arrows open the list. That is the library's choice, not a missing handler: the two region/language
  switchers are operable from the keyboard through Space, ArrowDown, the arrow keys, Enter to select and
  Escape to close, and the audit's keyboard suite drives exactly those keys. Do not "fix" Enter on those
  buttons — pressing it inside a form would then submit and open at once.
- **A collapsed panel that still holds fields needs `inert`, not `aria-hidden`.** The account profile's
  editors stay mounted so their max-height can animate, which leaves their inputs in the DOM while the
  panel is closed. `aria-hidden` hides that content from assistive tech but leaves it in the tab order, so
  a keyboard user tabs into fields they cannot see (axe: "aria-hidden-focus", three editors). `inert`
  takes it out of both. Any future always-mounted panel with controls inside needs the same.
- **Reduced motion is one global rule, not a class per component.** `globals.css` shortens every animation
  and transition to 0.01ms under `prefers-reduced-motion: reduce`. `0.01ms` rather than `none` on purpose:
  Headless UI unmounts a panel on `transitionend`, and a duration of `none` would leave it mounted. The rule
  covers the panels, the accordion chevron, the skeletons and the spinner without any component opting in.
- **Headless UI ids are not hydration-safe here, so none of them may carry meaning.** `/account/profile`
  logged React's mismatch warning in roughly one load in twenty (2 in 36 measured): `account-info` wrapped
  always-mounted panels in `Disclosure`s, and Headless UI's generated ids were not the same on the server and
  the client. The panels are plain blocks driven by local state now. The same rule applies to any future
  `Dialog`/`Disclosure` whose `id` or `aria-controls` is rendered: it has to be named explicitly rather than
  left to the library's counter, or the warning comes back intermittently and with it a full client re-render.
- **Both payment providers stay on the region, and only K4 exercises the card one.** Stripe is configured
  in K4 (see the Stripe note below) and the manual provider stays, because the K2/K3 suites need a payment
  path that costs no key. So a green K2 or K3 says nothing about the card form, which gates Continue on the
  element being complete; that path is covered by K4's own 33-check walkthrough.
- **The SDK drops the error `code`.** `@medusajs/js-sdk` throws a `FetchError extends Error` carrying the
  API's message and status only, so `lib/util/medusa-error.ts` translates by matching Medusa's wording
  ("does not have the required inventory" → copy that says what to do about it) rather than by code.
- **The SDK only parses JSON when `accept` asks for it — and some routes answer with nothing.** `normalizeResponse`
  returns the raw `Response` unless the request's `accept` header contains `application/json` (the SDK's default).
  `POST /auth/customer/emailpass/reset-password` is the exception that matters: it answers `201` with the body
  `Created`, so the default header made the SDK throw `Unexpected token 'C', "Created" is not valid JSON` on a
  **successful** request, and E2's form reported that to the customer while the email had already been sent. The
  request now sends `accept: text/plain` (`lib/data/password-reset.ts`). Watch for the same shape if another
  Medusa route uses `sendStatus()`: for those the raw response is the right answer, not a parse. §5.5 B hit the
  same edge from the other side: `DELETE /store/wishlist/:id` answers `204` with no body, so the SDK threw
  `Unexpected end of JSON input` on a **successful** removal — the row was deleted and the heart reported a
  failure, which read as "the remove button does nothing". `removeFromWishlist` sends `accept: text/plain` too.
  A route that answers `204` is a route whose client must say it is not expecting JSON.
- **Email is Resend behind the store's own provider; local mode is deliberate.** Spec §2 names Resend and every
  other integration in this repo is conditional on its key, so `medusa-config.ts` registers
  `src/modules/notification-resend` only when `RESEND_API_KEY` **and** `RESEND_FROM` are set, and registers
  Medusa's `notification-local` otherwise. The notification module has no provider unless one is named, and it
  refuses two providers on one channel, so this is a choice: in local mode notifications are stored and logged
  (the reset link is in that log line, which is how E2 is exercised without an inbox) and nothing is delivered.
  `RESEND_BASE_URL` exists so the email paths can be tested against a local stub; it is empty in normal use.
  Resend sends email only: the provider rejects any other channel rather than pretending to send it.
- **A shipment email belongs to the fulfillment, not the event.** `shipment.created` carries a fulfillment id
  and `no_notification`, and the same fulfillment can only be shipped once, so the fulfillment is both the
  thing the email describes and its identity: `createNotifications` is keyed
  `shipment-created:<fulfillment id>`. A retried event (the local bus retries a subscriber that throws) is
  therefore de-duplicated by the notification module rather than by a flag this project would have to keep.
  The one-per-fulfillment rule is also the limit: a partially shipped order gets one email per shipment, one
  email per parcel.
- **A promotion code is written as a list and answered with `200` even when it is refused.** The Store API's
  `PATCH /store/carts/:id` takes the customer's *whole* `promo_codes` list; an unknown code answers `400`
  (`The promotion code X is invalid`), but a code that is ineligible is simply dropped from the cart and the
  request still succeeds. So there is no response to trust: `applyPromotionCode`/`removePromotionCode` read the
  applied promotions back, report a code that is missing as refused, and write the cart again without it. That
  is why a refused code cannot be left on the cart and quietly start working once the customer's subtotal or
  address changes. The fixed discount (`FIVEOFF`) names a currency because a fixed amount has no meaning
  without one; the percentage (`DEBUG10`) works in both of the store's currencies. Both are created by the
  seed and left alone on a re-run if an admin has since edited or deactivated them.
- **A reset link is `/{country}/reset-password`, not `/account/reset-password`.** The middleware redirects every
  signed-out visitor away from `/account/*` to sign in, and the person following a reset link is signed out —
  putting the page under `/account` would have made every emailed link land on the sign-in page. The emailed URL
  carries no country code (the middleware adds the visitor's region), and the page is `noindex`: a URL with a
  token in it has no business in a search index. The token's lifetime (15 minutes), its single-use rule and its
  binding to purpose and address are Medusa core's (`consumePasswordResetToken`), not re-implemented here; the
  storefront only reports a refused token as "expired or already used" with a way to ask for a new one.
- **One line holds at most ten units.** The quantity picker offers 1..min(stock, 10); a well-stocked
  variant reports hundreds of units, and a picker with hundreds of entries is not a quantity control.
  The API's own limit still applies on top.
- **Being exact about stock in a test.** Cart line items do not reserve inventory (`inventory_level` and
  `reservation_item` stay empty while a cart holds units), so a second cart does not consume stock; and a
  raw `UPDATE inventory_level` is not seen by the Store API's availability, which stayed at its old value
  for minutes. Move stock through the Admin API
  (`POST /admin/inventory-items/{id}/location-levels/{locationId}`) — the change is visible to the Store
  API within ~50 ms — and put it back afterwards.
- **Cart mutations take ~300–600 ms to settle.** Measured from a quantity change to the repainted total,
  across add, quantity, remove and empty: 277–608 ms. Each one re-renders the layout as well as the page
  (nav, regions, locales), which is where the time goes; the performance pass should look at it.

- **Two URL vocabularies, by design:** `/store` is search-driven and keeps InstantSearch's names —
  `product[sortBy]`, `product[refinementList][category][0]`, `product[range][min_price_euro]`, `product[page]`.
  C5 accepts these as "reflected in URL query params": they round-trip (loaded URLs reproduce the exact result
  set) and are shareable. The category and collection pages, which read the Store API directly, use plain
  `sortBy`, `optionValueIds` and `page`. Unifying them would mean giving up InstantSearch's routing on `/store`;
  not worth it unless a requirement says so.
- **Price ties can swap the last card on a page:** sorting by price puts the catalogue's €38 products in an
  arbitrary order among themselves, so page 1 of "Price: High -> Low" can show either `cache-miss-shorts` or
  `weekend-debug-shorts` in slot 12. The set is correct either way; it is a limit of comparing equal values, not
  of the sort.
- **The price slider hides itself when the results share one price:** filtering to a category whose products all
  cost the same removes the range control, because there is no spread to slide between. Expected, and it is why
  a price test must run against the unfiltered catalogue.
- **Search:** the spec names Meilisearch; the starter ships Medusa's built-in search API plus an
  InstantSearch adapter. Per spec §2 the starter's choice is authoritative, so Meilisearch is dropped.
  Meilisearch stays in `docker-compose.yml` behind a profile but is not wired to anything.
- **Stripe needs no new dependency.** `medusa-config.ts` resolves `@medusajs/medusa/payment-stripe`, which
  ships inside the `@medusajs/medusa` dependency the backend already had, so K4 added only the module
  registration and the two env vars in the templates. The registration is skipped entirely when
  `STRIPE_API_KEY` is unset: a missing `apiKey` throws at startup ("Required option `apiKey` is missing in
  Stripe plugin") and would take the whole backend down rather than disable one payment option, so a
  checkout without a key still boots with the manual provider. The key itself lives only in
  `apps/backend/.env`; the region is reconciled by `pnpm run backend:seed`, which is what enables
  `pp_stripe_stripe` on an already-seeded store.
- **The `data` on a Stripe payment is the PaymentIntent, not a summary.** The provider stores Stripe's own
  object, so anything reading a card, a receipt or an error off a payment has to go through
  `data.payment_method.card.last4` (and `data.status`) rather than the flat `card_last4` the starter's
  `payment-details` still asked for; that lookup was dead for every Stripe order until K4. The same shape
  is what an order's `payment_collections[0].payments[0]` returns from the Store API, and what the Store
  API only returns at all when the request asks for `*payment_collections.payments`.
- **The webhook answers `200` before it verifies anything.** Medusa's route emits a delayed event (5 s by
  default, 3 attempts on the event bus) and replies immediately, so a wrong signature is a log line
  (`An error occurred in constructWebhookEvent…`) and no state change, not a 4xx that Stripe would retry.
  This is core behaviour, not this project's: the route is Medusa's. It is why the secret is the whole
  configuration, why a delivery that arrives before `STRIPE_WEBHOOK_SECRET` is set is silently lost, and why
  production needs the Redis event bus plus a worker — the local in-memory bus drops queued events on a
  restart.
- **The webhook is a safety net, not the checkout's completion path.** The storefront still places the order
  itself after Stripe confirms the card; the webhook's job is the case where the browser never gets back (tab
  closed, bank/3-D Secure redirect, a capture made in the Stripe dashboard). Idempotency comes from the two
  guards the workflows already have: cart completion only runs while no order exists for the cart
  (`completeCartAfterPaymentStep`), and capturing checks the payment's own `captured_at` before calling the
  provider (`capturePayment_` returns early when it is set). Verified both ways: a redelivered authorized
  event left one order, and a redelivered succeeded event left one capture row and one `captured_at`. An
  event whose intent has no `metadata.session_id` is ignored before those guards, so a Stripe account shared
  with another integration cannot touch this store's carts.
- **Stripe stays on PaymentIntents rather than Checkout Sessions.** Stripe's own guidance now steers integrations
  to the Checkout Sessions API with the Payment Element, and the dashboard says so; the reasoning does not
  transfer here. The PaymentIntent is Medusa's: `@medusajs/medusa/payment-stripe` creates it and owns its
  lifecycle — authorize, capture, refund, cancel, and the webhook reconciliation K7 verified — and the storefront
  mounts the Payment Element from the session's `client_secret`. Moving to Checkout Sessions
  (`ui_mode: "elements"`) would mean replacing that provider with a custom one that speaks the other API and
  re-implementing the payment lifecycle Medusa's own workflows call, to gain features this checkout does not
  use (Adaptive Pricing is the notable one). It would not address the failure reported from the real attempt
  either: that one reproduced from the storefront's own session handling, above.
- **What K4 does not prove.** The walkthrough pays with Stripe's test cards, which is as far as a local run
  goes: nothing here covers live keys, an authentication-challenged card (`requires_action`) or 3-D Secure.
  The webhook that reconciles a payment Medusa missed is K7's, and was verified there. Anything that leaves the site and comes back
  through `/api/payment-return` is unexercised too: the route validates the returning PaymentIntent against
  the cart's session and retries or places the order, but a card confirmed with `redirect: "if_required"`
  never reaches it. The provider **authorizes** — the order is
  `authorized` and `captured_at` stays null — so "paid" on the confirmation means authorized, not captured.
  The `catch` that reports a thrown `confirmPayment` is also unexercised by the run: the failure it guards
  was the unmounted element itself, and the fix removes the cause. Forcing it was tried and abandoned —
  CDP's `Fetch.enable` on the page target never sees the confirm request (Stripe's own frames are outside
  it), and blackholing `api.stripe.com` browser-wide stops the element mounting in the first place, so the
  only way left would be to fake the failure rather than cause it. Finally, the card number on the receipt
  is only as good as what Stripe returns for the payment actually made: the walkthrough sees `visa ****4242`
  and that is what the page now reads back. A2 changed the fields `retrieveOrder` asks for and took the order
  reads off the data cache, and did not re-run this walkthrough: the order read it shares with the confirmation
  page is covered by K2 (78/78) and K3 (41/41) on the same server, but the card path itself was last run in K4.
- **Waiting for the payment session is the harness's job, not the app's.** The payment step creates its
  Stripe session in an effect a beat after the page paints, and mounts the element from it. The walkthrough
  therefore waits for the session (a `pi_…` with a client secret) and for the selected card option to render
  the element before it asserts anything about them. The first version sampled the paint instead and failed
  one run in five at exactly those checks with a session that was still on its way — a harness race, not a
  checkout one.
- **Known pre-existing lint debt:** none outstanding — the errors in `src/lib/data/cart.ts` and
  `src/modules/layout/components/language-select/index.tsx` were fixed as part of P0.6 so CI can be green.
- **Seed replaces starter data:** `src/scripts/seed.ts` deletes the starter's four placeholder
  products and their empty categories. `src/migration-scripts/initial-data-seed.ts` is no longer part
  of the setup path; `src/scripts/seed-demo-products.ts` remains as an optional bulk filler.
- **Turbo caches nothing for `seed`:** `turbo.json` sets `"cache": false` for the task, so a repeat
  `pnpm run backend:seed` actually runs the script instead of replaying cached output.
- **Product images:** the public Medusa demo bucket only holds 11 product shots, so the catalogue
  reuses them. Real photography is a later task.
- **Never run `next build` while `next dev` is running:** both write `apps/storefront/.next`, and a build wipes
  the dev server's turbopack runtime chunks, which then serves `500` until `.next` is removed and the dev server
  restarted. This happened during C1 verification; the dev server on port 8000 was killed, `.next` deleted and the
  server restarted. Stop the dev server before `pnpm build`.
- **`notFound()` must not run inside `generateMetadata`:** doing so renders the root `app/not-found.tsx`
  instead of the route group's own not-found page. C3 hit this on unknown category and collection handles: the
  metadata helpers now return plain fallback metadata and the page component raises `notFound()`, which keeps the
  404 inside the storefront layout. Watch for the same pattern in any later route that resolves a handle.
- **Every variant of a product costs the same:** the seeded catalogue has no size-based or colour-based pricing, so
  C4's "correct price per variant" is only provable as a mechanism (each option combination resolves its own variant
  and reads that variant's calculated price), not as visibly different amounts. The same data has no variant on a
  sale price, so the sale branch of the price display is unexercised too. Adding one product with per-size prices
  (and one promotional price list) to the seed would make both visible; K6 needs the latter anyway.
- **Spec table has no SKU:** `docs/DESIGN.md` shows a SKU in the product spec table, but the tabs receive the
  product, not the selected variant, and SKUs are per variant. Left out rather than printed from the wrong variant;
  it needs the selected variant passed down when something asks for it.
- **Nested categories are unexercised:** the seeded catalogue is five flat categories, so the C3 breadcrumb and
  child-category strip cannot be seen at runtime. They render only when a category has a parent or children;
  re-check them if the catalogue ever gains a hierarchy.
- **A loading or error state is forced at the backend, not in the browser.** The storefront reads Medusa from its
  own server process, so CDP request blocking or throttling in the page never reaches those calls: a harness that
  does it sees a fully rendered page and concludes the state is missing. The states pass used a throwaway gateway
  between the storefront and Medusa whose behaviour is a mode file (`pass` / `delay 2.5s` / `fail 503`), which is
  also the cheapest way to see a route-level `loading.tsx` — Next streams the fallback while the delayed read is
  still open. Product and category reads are `force-cache`, so a route already fetched in the same dev session
  answers without touching upstream; force the state on a route whose query has not run yet, or clear
  `.next/cache/fetch-cache` first.
- **Typo tolerance is opt-in per query, not per index (C6).** The postgres search provider only
  fuzzy-matches when `search_options.typo_tolerance` is true; the index's `settings.typo_tolerance`
  can switch it off but cannot switch it on, so a definition that enables it and a client that never
  asks for it get exact matching with no warning. The storefront's adapter sends the flag on every
  query now (`lib/search-client.ts`); any other client of `/store/search` has to do the same.
- **Profile edits stop at name and phone (A4).** The email is shown read-only because the address a
  customer signs in with is the auth identity's, not the customer record's — writing one without the
  other locks the customer out. Changing it properly needs an admin-scoped route that moves the
  identity, which is the same shape of work the Google/email-collision note below describes. The
  password is changed through the emailed reset link rather than by collecting the old password in
  the profile form.
- **A4's reset link was not delivered, only queued (A4).** The run's notification row for
  `password-reset` holds the right recipient, template and a 15-minute link, and that token reset the
  password for real — but the row's status is `failure`: this machine's `RESEND_API_KEY` is not one
  Resend accepts, so the provider's `POST /emails` was rejected. Delivery itself is E1/E2's verified
  path (with a local stub answering as Resend), not something A4 re-proved. The reset request always
  answers `201`, so the profile block's own error branch (a network failure reaching the API) was left
  unexercised.
- **A reindex is only as complete as the events (C6).** The index definition lists the events it
  consumes, and the gaps are its own `TODO`s: price lists emit nothing on create/update/delete or when
  they cross their start or end date, `linkProductsToSalesChannelWorkflow`,
  `batchLinkProductsToCategoryWorkflow` and a directly-called `upsertVariantPricesWorkflow` emit
  nothing either. A price change through those paths shows an old figure in the listing until the
  product itself is touched. Reindexing was verified on the dev server with the in-process event bus;
  a Redis-backed bus and a separate worker were not exercised.
- **An unknown handle is the not-found page with an HTTP 200 (SEO baseline).** The product, category
  and collection routes each have a route-level `loading.tsx` (added by the states pass), and Next
  flushes the response with its fallback before the page can raise `notFound()` — so the customer gets
  the storefront's own not-found view, but the status says 200 where C3 and C4 measured 404 *before*
  those loading files existed. It is a soft 404: the SEO baseline mitigates it in `generateMetadata`
  (`notFoundMetadata()` answers `noindex, nofollow`, so the page is not indexed) and the sitemap never
  lists it. Making the status honest means choosing one of: dropping the route-level loading boundary
  for these routes, `dynamicParams = false` (which would 404 a product added in the admin until the next
  build — the worse trade for a shop), or a middleware lookup. Not taken here.
- **The sitemap lists one region (SEO baseline).** `sitemap.ts` uses `NEXT_PUBLIC_DEFAULT_REGION` when
  the API knows it and otherwise the first region's first country, because every region renders the
  same catalogue and listing all of them would offer duplicate URLs for one query. A store that
  genuinely differs per region should add `alternates.languages` there. It regenerates hourly, so a
  product deleted in the admin can stay listed for up to an hour.
- **The base URL is what canonical URLs, the sitemap and robots.txt are built on (SEO baseline).**
  `NEXT_PUBLIC_BASE_URL`, with `http://localhost:8000` as the fallback; `.env.template` used to claim
  `https://localhost:8000`, which is not the origin the dev server serves, so a fresh clone's sitemap
  and canonicals pointed at a URL nothing answered. Deployments must set it to the public https origin.
- **JSON-LD offers are per variant and still carry no rating (SEO baseline, §5.5 A).** A product with
  eight variants emits eight `Offer`s, each with its own `?v_id=` URL, because that is what the visitor
  can actually buy, and no `AggregateOffer`. There is no `aggregateRating` either: reviews now exist,
  but the number a rating may carry is the one the page shows, and the JSON-LD is emitted with the
  prerendered product while the review summary is its own 60-second read — the two can disagree inside
  the cache window. Adding it means giving both the same read (fetching the summary once in the
  template and passing it to `ProductJsonLd`), which is a deliberate follow-up, not an oversight.
  Prices are the region's calculated prices at the time the page was rendered, which is the same
  figure the page shows.
- **A review link's `isList` goes on the *review* side (§5.5 A).** `defineLink(product, { linkable:
  review, isList: true })` means "one product, many reviews". Written the other way round the link
  service answers `Cannot create multiple links between 'product' and 'review'` for the second review
  of the same product — which is exactly how the mistake first showed up in the HTTP suite (a `400` on
  a review of a product that already had one), not as a type error.
- **Moderation is the only thing between a review and the page (§5.5 A).** A review is written as
  `pending` by the workflow and the store list filters `status: "approved"` itself; there is no
  `?status=` on the store route, so a customer cannot ask to see anyone's waiting review either. A
  rejected review is re-opened rather than duplicated when its author writes again, which is why the
  uniqueness check is "no existing review that is not rejected" and why the link rows are only written
  for a new row. The duplicate answer is `422` (`DUPLICATE_ERROR`), not `409`.
- **A moderation takes up to a minute to reach a cached product page (§5.5 A).** The storefront reads
  the reviews with `force-cache` and `revalidate: 60` under a `reviews-<product id>` tag, and nothing
  revalidates that tag: an approval happens in the admin, which the storefront has no channel to hear
  from, and the form's own action deliberately does not (see the next note) — measured as a newly
  approved review appearing on the next load after the window. A webhook from the admin route into the
  storefront's tag is the upgrade if that window ever matters.
- **A `revalidateTag` inside a form action throws the action's own answer away (§5.5 A).** The review
  form's action revalidated `reviews-<product id>` after a successful write, and the customer was then
  shown the *form* again instead of "your review is with us": the revalidation refreshes the route
  while that same action's result is being rendered, so the section (and the form holding the
  `useActionState` state) remounted with a fresh, empty state. Measured on the production build — the
  submit wrote a `pending` review and the confirmation never appeared; removing the call made the same
  flow pass, and the test now asserts the confirmation text rather than only that no error is shown.
  A new review is `pending` anyway, so the list the revalidation would refresh cannot have changed:
  the rule is that an action revalidates a tag only when the write is what makes the tag stale.
- **`getAuthHeaders()` answers `{}`, not `null` (§5.5 B).** The review and wishlist reads both start with
  `const headers = await getAuthHeaders()`, and `if (!headers)` is always false — an empty object is truthy —
  so a signed-out visitor's read went to the API unauthenticated and came back `401`, logged as "Could not read
  the wishlist", instead of being skipped. The check is `"authorization" in headers`. It matters most in the
  add action: that `401` was reported as a plain failure, so the heart never learned it should send the
  customer to sign in.
- **A link's `linkable` key is camelCase; its `LinkDefinition` field is snake_case (§5.5 B).**
  `WishlistModule.linkable.wishlistItem` is what `defineLink` wants for a model named `wishlist_item`, while the
  link rows and the `LinkDefinition` passed to `createRemoteLinkStep` use `wishlist_item_id`. The first mismatch
  fails loudly ("Invalid linkable passed for the argument"), the second only when a link is written, so both are
  worth checking against `medusa db:generate`'s output rather than guessing.
- **"Is this saved?" is one request per page, not one per card (§5.5 B).** The hearts sit inside
  server-rendered plates, so a client store (`lib/util/wishlist-store.ts`) is what shares the answer: the first
  heart to mount fetches `GET /api/wishlist` and the rest subscribe to the same snapshot, which
  `useSyncExternalStore` requires to be identity-stable (the server snapshot is one constant, not a fresh
  object). The route handler exists because the alternative — `cookies()` in the layout — would make every
  prerendered catalogue page dynamic for the sake of a heart. The store is per page load, deliberately: a
  cached list in a module that outlived a navigation would show a heart the API disagrees with.
- **"Can this visitor write a review?" is a `no-store` read (§5.5 A).** Next's data cache key for a
  fetch is its url — the `Authorization` header is not part of it — so `retrieveCustomer`, which caches
  `/store/customers/me` with `force-cache`, can answer a signed-out visitor with the previous
  customer's identity. That is a pre-existing property of the starter's customer read (the same shape
  A2 documented for orders), and on a page whose whole point is showing or hiding a form it would put
  the form in front of the wrong person. `retrieveReviewer` in `lib/data/reviews.ts` reads the auth
  cookie first and, only when it is present, fetches the customer with `no-store`. The wider customer
  read used by the layout was left as it was; it is worth revisiting as its own change.
- **A scheduled job's dedupe belongs in the database, not in its schedule (§5.5 C).** The low-stock
  job runs hourly and a shortage lasts days, so "already told them" has to survive a restart: the
  `stock_alert` row (one per item and location) is the whole state, and the cooldown is a comparison
  against `alerted_at`. Writing that row only after the provider accepts the mail is the other half:
  recording first would turn one failed send into a silent day. The job is inert without
  `LOW_STOCK_ALERT_EMAIL`, which is what keeps a fresh clone and CI from mailing anyone.
- **A module service's array filter is not an `$in` (§5.5 C).** `listStockAlerts({ inventory_item_id:
  [id1, id2] })` compiles to a comparison against an array value and returns **nothing**, so every run
  looked like a first alert and the cooldown never fired — the symptom was "three runs, three emails"
  in the job suite. The filter has to be `{ inventory_item_id: { $in: [...] } }`. Scalar filters
  (`{ id }`) are unaffected, which is why the same pattern looks fine elsewhere in this codebase.
- **The email suite has to stub the provider, not mock the notification module (§5.5 C).** In this
  environment Resend is configured with a real key and an unverified domain, so it refuses any
  recipient but its owner; the job deliberately records nothing when a send fails, so the success
  path (and the dedupe) cannot be tested against it. `integration-tests/http/low-stock-alert.spec.ts`
  points `RESEND_BASE_URL` — an option the provider already read for exactly this — at a local HTTP
  server before the app boots, keeps the POSTed subject/HTML/text, and restores the variable
  afterwards. Asserting on what the provider was actually asked to send is stronger than asserting a
  notification row exists.
- **Order money lives on the latest version, not on a `total` column (§5.5 D).** The `order` table has no
`total` column (the Query API computes it from `order_summary.totals->>'current_order_total'`), and both
  `order_summary` and `order_item` are **versioned** — a join straight onto either double-counts an
  order whose summary or line quantities were rewritten. The sales-summary verification therefore
  compares against `distinct on (order_id) … order by version desc` (and `distinct on (item_id)` for
  units); the first two attempts failed on exactly that, 154 vs 131 orders and 116 vs 112 units, and
  the route's own numbers were the right ones.
- **Revenue is reported per currency (§5.5 D).** The catalogue is priced in eur and usd, and the
  summary returns `revenue: [{ currency_code, amount }]` plus each product's
  `revenue_by_currency` rather than one figure. An order with no currency falls back to `eur` so an
  odd row cannot break the read, and amounts are rounded to two decimals so float tails do not
  accumulate.
- **The review tests need `apps/backend/.env.test` (§5.5 A).** Both Jest runners read `DB_HOST`,
  `DB_PORT`, `DB_USERNAME` and `DB_PASSWORD` from the environment (`jest.config.js` loads `.env.test`)
  and create their own databases, so the file is local-only and gitignored; `docs/SETUP.md`
  "Quality checks" says how to fill it. Without it the suites fail with
  `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`, which reads like a code bug
  and is not one.
- **The admin widget made `@medusajs/js-sdk` a direct dependency (§5.5 A).** It was already in the
  tree through the dashboard, but pnpm does not resolve a transitive package for your own imports, so
  the widget's client is `apps/backend/src/admin/lib/sdk.ts` on a declared dependency. It is configured
  with `baseUrl: "/"` (the dashboard is served by this backend) and `import.meta.env` is avoided
  because `tsc` compiles the admin folder as CommonJS and rejects it.
- **The related rail's fill step is untested with real data (C7).** When a product has fewer than four
  category and collection siblings, the rail tops itself up from the newest products in the catalogue.
  Every seeded product has enough siblings through one or the other, so the fallback never ran — it is
  the branch to look at first if a product ever shows an unrelated plate. Related products are priced
  for the region but not filtered by stock, and nothing discourages the same product appearing in two
  different products' rails; both are what the spec asked for and neither was changed.
- **Related products cost three catalogue reads (C7).** Category, collection and the fill are separate
  requests per product page. They go through the Next data cache (`force-cache`) like every other
  catalogue read, so a warm page pays one round trip per source only on the first render.
- **Radix's generated ids are a hydration trap (C7).** `@radix-ui/react-accordion` built its trigger and
  content ids itself and they came out different on the server and the client, which React reports as a
  hydration mismatch and which no assertion on visible text would have caught — only the console-error
  count did. The product tabs no longer use it. Any future Radix component whose ids are generated
  rather than passed in deserves the same check.
- **Typo tolerance is word similarity, not a dictionary (C6).** The postgres provider matches with
  `pg_trgm` word similarity above 0.3, and neither the threshold nor a per-field opt-out is
  configurable through the index (`disabled_on_attributes` is rejected by this provider). A
  three-word query can therefore match a product that shares only a fuzzy word with it — observed
  while writing the check: `zebra check sweatshirt` still returned one unrelated catalogue product
  after the test product was deleted. The storefront's own results for `hoddie` were correct, but a
  longer misspelled query can be generous; a `min_score` would tighten it if that becomes a problem.
- **The listing's score is the search stack's JavaScript, and the simulator charges it (Performance).**
  The server render puts the plates in the HTML, which is why the observed LCP is a quarter of a second
  and CLS is 0.000, but Lighthouse's default simulation does not model it that way: it places the LCP
  image behind the bundle's 974 ms of script evaluation and reads 3.5–4.2 s. The route adds 120 kB over the 103 kB every page ships, and most of that is InstantSearch
  and its widgets; the facets re-query through it as the customer filters. Getting the listing over 90 on the default simulation therefore means moving the
  grid and the facets to server-rendered URL state (a `?size=`/`?category=` link with a navigation per
  filter) and dropping the search chunk from the route; the navbar drawer is already lazily imported
  and would not pull it back. That is a UX trade — instant client filtering for a higher simulated
  score — and it was put to the project owner on 23 October 2026, who chose to keep the instant
  filtering and record the result rather than trade it away. **The listing therefore stands at 81–87
  on the default simulation, and 95 under DevTools throttling on the same build**, which is the number
  to quote for a real phone. Home (91–92) and product (94–96) meet the spec's ≥ 90; the listing is the
  one page of the three that does not, so Phase 3's Lighthouse criterion is met on two pages of three
  and §7's checklist item stays open. Closing it means the URL-state rewrite above, not a smaller
  tweak — there is no cheaper version of dropping 120 kB from the route.
- **The image optimiser has a cold start per image (Performance).** `next start` resizes on demand and
  caches the result for 31 days, so the first visitor to a page pays the encode (measured at ~0.4–1.2 s
  for the larger photographs on this machine) and everyone after them gets the cached AVIF. On a
  deployment that matters, the images should be warmed after a release, or the catalogue moved behind a
  CDN that does the resizing at upload time. The optimiser also needs the image host to be reachable
  from the storefront server, which a private bucket behind a signed URL would not be.
- **The listing carries the search stack's cost (Performance).** InstantSearch plus its client is the
  largest thing on `/store` and most of its total blocking time — ~200–350 ms in the earlier pass and
  286–529 ms in the 23 October re-run; the rest of the site
  loads the same bundle only when the navbar search or the listing is opened. That is also what makes
  the listing's score the one that moves between passes, so a number taken while the machine is busy
  reads lower than the same build on an idle one — the passes above were run back to back and reported
  as a range for that reason.
- **The dependency tree still carries high advisories upstream (Dependencies).** After the Next.js and
  `proxy-addr` updates the production audit reads **18 high, 14 moderate, 2 low and no critical**, almost
  all inside Medusa's own transitive toolchain (`@graphql-tools/*` and friends) at versions Medusa pins.
  CI therefore fails only on a critical advisory, and Dependabot raises the rest as reviewable PRs rather
  than a build that has been red for a month. Fixing the highs means an upstream release or a Medusa
  upgrade, not a patch here.
- **A nightly dump is not point-in-time recovery (Backups).** `docs/BACKUP.md` gives a dump, its checksum
  and a restore drill, but up to a day of orders can still be lost between runs; continuous archiving is
  the database provider's feature, not this repository's. Nothing uploads the dump either — the offsite
  copy, its encryption and its retention are the deployment's job, and the runbook says so rather than
  pretending a local file is a backup.
- **Rate limits are per caller, not per account (Rate limiting).** Sign-in allows 60 attempts per five
  minutes from one address, which stops a script and a list but not a slow guess spread across hosts, and
  there is no per-address lockout because Medusa's auth module has none. The numbers are deliberately
  generous so a shop, an office or a phone network behind one address does not trip them. They are shared
  only when `REDIS_URL` is set; without it each instance counts its own, and the test scripts blank
  `REDIS_URL` on purpose so a run cannot inherit a previous suite's counters.
- **The emails are paper, not a mode (Dark mode).** Order confirmation, password reset, shipment and the
  low-stock digest are a fixed light layout (`ink` on `stock` in the notification provider's templates).
  A mail client that force-inverts a dark email inverts a light one just as readily, and the storefront's
  saved preference is not available to the person opening the message at all, so the emails stay light
  on purpose.
- **Product photographs are still photographs (Dark mode).** The demo imagery is shot on white, so on the
  dark sheet a plate reads as a light rectangle inside a hairline frame. The frame is what keeps it
  deliberate; no dark-photo treatment or blend is applied, and none is planned until there is real
  photography to treat.
- **The mode is a browser fact, not an account setting (Dark mode).** It lives in `localStorage` under
  `dc-theme`, so a signed-in customer on a second device starts at Auto until they choose there. Medusa's
  admin dashboard is untouched and keeps its own theme, and a visitor without JavaScript gets the light
  sheet the server sends.
