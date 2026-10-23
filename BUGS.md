# E-commerce Checkout, Order Verification, Mobile UI, and Security Improvements

## Instructions for the coding agent

Work through this document **one checklist item at a time**. Inspect the existing project before editing, reuse its current architecture and conventions, and avoid unrelated rewrites or unnecessary dependencies.

- [ ] Identify the framework, checkout flow, Stripe integration, email service, order model, API routes, mobile header, order confirmation page, and store filters.
- [ ] Briefly document the root cause of each issue before fixing it.
- [ ] Implement each fix in the existing architecture.
- [ ] Add or update automated tests for each behavior.
- [ ] Run the relevant tests, linting, type checks, and production build where available.
- [ ] Mark a checklist item complete **only after implementation and verification**. If blocked, explain why and leave it unchecked.
- [ ] At the end, report changed files, migrations, environment variables, manual setup, commands run, and actual test results.
- [ ] Never claim a feature works or is secure unless the implementation and available tests support that claim.
- [ ] Do not use hardcoded Stripe success responses, weaken authorization, or expose secrets to make a test pass.

## Priority order

1. Order-data security
2. Stripe payment correctness
3. Guest email verification and order-abuse prevention
4. Mobile cart navigation
5. Mobile order-confirmation layout
6. Mobile store filters

---

## 1. Stripe checkout: validate payments and show clear results

### Current problem

On checkout, entering card details and clicking **Continue** advances to the Review step without clearly showing whether the payment method was accepted, declined, or encountered an error. Test/sandbox mode should still accurately simulate payment outcomes.

### Implementation checklist

- [x] Inspect the existing Stripe integration and document its current checkout/payment flow before changing it. (Root cause and flow are in the fix notes below.)
- [x] Use the appropriate Stripe client-side and server-side APIs for the existing integration. (Stripe.js `confirmPayment` with `redirect: "if_required"` on the client; Medusa's payment module authorizes with Stripe from the server when the cart is completed.)
- [x] Show clear loading, success, pending, and error states where applicable. (The button says `Confirming payment…`, `Placing order…` or `Check payment status`, with a spinner and `aria-busy`; failures, pending payments and returned redirects each have their own message.)
- [x] Handle invalid or incomplete card details, declined cards, expired cards, network errors, and other Stripe errors with clear user-facing messages. (Error codes, decline codes and error types are mapped to actionable copy in `payment-status.ts`; the Payment Element's own `loaderror` is surfaced too.)
- [x] Do not advance or display success when the payment flow has failed or remains unconfirmed. (Review is reachable only with a complete payment element, and an order is created only after the server's Stripe authorization.)
- [ ] Handle Stripe test cards and simulated payment outcomes correctly in test mode. (The outcome mapping is the same in test mode — it reads PaymentIntent status and Stripe error codes, not the key — but card entry itself was not exercised with a live test card; see the limitations below.)
- [x] Complete required 3D Secure or other authentication steps before treating a payment as successful. (`confirmPayment` handles the modal; an off-site challenge returns through `/api/payment-return`, and a `requires_action` intent is never treated as settled.)
- [x] Distinguish between a payment method being accepted, a payment being authorized, and a payment being successfully completed. (A complete element is not a payment; `settled` means Stripe took the money; an order exists only when the cart conversion succeeded.)
- [x] Verify payment status on the server through Stripe's API and/or verified webhooks; never trust client-side status alone. (The order is built by `complete cart`, which authorizes the session with Stripe; a redirect that says `succeeded` on an unconfirmed intent produced no order in testing.)
- [x] Make payment creation and confirmation safe against duplicate clicks, retries, refreshes, network failures, and duplicate webhook delivery. (A ref blocks a second submission in the same tick; Medusa locks the cart while completing, which is reported as pending rather than as a failure; a usable session is never replaced.)
- [x] Use idempotency and appropriate order/payment state transitions where supported by the existing architecture. (Sessions are created once and reused; the Stripe provider passes Medusa's idempotency key to Stripe; `settled` is the only state that may create an order.)
- [x] Never store raw card numbers or CVC values in the application's database or logs. (Card data goes straight to Stripe's iframes; nothing in the storefront or backend reads or logs it.)
- [ ] Add or update automated tests for success, decline, authentication-required, network failure, retry, and duplicate-event scenarios. (21 unit tests cover decline, authentication-required, pending, network, settled and retry wording, and cart-conversion classification; there is no automated test for a successful card charge or for duplicate webhook delivery.)

### Checkout-flow requirements

- [x] Preserve the existing checkout flow where appropriate, but do not represent an unconfirmed payment as successful.
- [x] If using Stripe PaymentIntents, handle the actual PaymentIntent status correctly. If using another Stripe integration, follow the appropriate flow for that integration. (`succeeded`/`requires_capture` settle; `processing` is pending; `requires_action`, `requires_payment_method`, `canceled` and `requires_confirmation` are retryable failures.)
- [x] Ensure order status and payment status remain consistent when a payment is pending, fails, succeeds, or requires further action. (No order without a server-confirmed payment; an authorized payment that fails to build an order says so instead of asking for the card again.)

### Fix notes (Stripe checkout)

**Root cause.** Three separate holes made a failed payment look like a successful one.

1. The Review button was the only place that called `stripe.confirmPayment`, and it did so inside an event handler whose errors were thrown: a decline, a failed challenge, or a payment element that was not mounted became an unhandled rejection. The button kept its spinner, nothing was said, and nothing could be retried. The result was also not read from the PaymentIntent, so a payment still `processing` looked like a failure and a decline looked like silence.
2. An off-site authorization came back to `/api/payment-return`, which sent failures to `/cart?error=order_failed` — a query parameter no page read — and on `redirect_status=succeeded` called `placeOrder` without ever telling the UI what had happened.
3. `placeOrder` collapsed every completion failure into one sentence, so a declined card, a payment the bank was still clearing, and a cart that could not be converted were indistinguishable. The message table also switched on `error.code` for cases Stripe only reports as an `error.type` (such as `api_connection_error`), so a dropped connection told the customer to check their card details. The new unit test caught this.

**Fix.**

- `src/lib/util/payment-status.ts` — one vocabulary for a payment attempt (`settled`, `payment_failed`, `payment_pending`, `cart_problem`) and the customer-facing copy for Stripe error codes, decline codes, error types, PaymentIntent statuses and cart-completion failures. `settled` is the only outcome that may create an order.
- `payment-button` — phases `idle → confirming → placing → pending` with labels, a spinner and `aria-busy`; a ref blocks a second submission in the same tick; a thrown `confirmPayment` becomes a retryable message; a `processing` intent switches the button to `Check payment status`, which completes the cart again instead of asking for the card and risking a second charge.
- `placeOrder` returns `PlaceOrderResult` (`ok` or a classified failure) and reads the payment session Medusa wrote back, which separates a decline from a payment the bank is still clearing.
- `/api/payment-return` sends every outcome to `/checkout?step=payment&payment_error=<declined|verification|pending|order>`, and still refuses a client secret that does not belong to the cart's session.
- The checkout page reads the code once on the server; `payment-return-notice` shows it on the payment step and again on review (a pending payment must not be retried from there).

**Verification.** `pnpm run test` (21 `node:test` cases), `pnpm run typecheck`, `pnpm run lint` and `pnpm run build` all pass. Against the running stack, with a real Stripe test-mode session created for a seeded cart: `redirect_status=failed` → `307` to `…/checkout?step=payment&payment_error=declined`; `redirect_status=succeeded` on an unconfirmed intent → `307` to `…payment_error=pending` with no order and the cart left open; a forged `payment_intent_client_secret` → rejected. The checkout renders the declined and pending notices from the code, and nothing for an absent or unknown code.

The card path was then exercised with a real charge rather than a mocked one: a Stripe test-mode PaymentIntent confirmed with Stripe's documented test PaymentMethod (`pm_card_visa`), then the browser's return leg (`/api/payment-return?…&redirect_status=succeeded`) → `307` to `/bd/order/<id>/confirmed?token=…`; the order came back `payment_status=captured`, and the receipt read "Payment of $42.00 received. Charged to the card ending in 4242." with `data-payment-state="received"`. A cash-on-delivery order placed through the Store API read "Pay $42.00 on delivery" with `data-payment-state="on_delivery"`, and the checkout rendered exactly two options — Credit card and Cash on delivery — with no "Manual Payment" or testing badge.

**Capture (found while testing).** Medusa's Stripe provider defaults to manual capture, so a "successful" card payment only authorized the money: the charge stayed on hold, no receipt could say it was paid, and nothing in this project ever captured it. `medusa-config.ts` now registers the provider with `capture: true`, which is what makes `payment_status=captured` and the receipt possible, and the PaymentIntent is created for `card` only (`payment_method_types: ["card"]` in the session data, `CARD_SESSION_DATA` in `lib/constants.tsx`) so Stripe's dashboard-managed automatic methods cannot appear under the card option.

**What the customer is told about the money.** The payment step names the moment of payment ("Your card is not charged yet. It is charged when you place the order on the review step."), the review button is "Pay $42.00 and place order" rather than "Place order", and the confirmation page opens with the outcome: "Payment of $42.00 received. Charged to the card ending in 4242." for a card, or "Pay $42.00 on delivery. Nothing was charged online." for cash on delivery. The receipt repeats the outcome beside the payment method.

**Payment options.** The checkout offers exactly two: **Credit card** (Stripe) and **Cash on delivery** (Medusa's manual provider, relabelled, with the testing badge removed). `ENABLED_PAYMENT_PROVIDERS` filters the region's providers in `listCartPaymentMethods`, so a provider enabled in the backend does not appear until it is added there and given a title and icon in `paymentInfoMap`.

**Known limitations.** Card entry itself was not automated: filling Stripe's cross-origin Payment Element needs a browser, and no end-to-end browser test exists in this repo, so a live declined/3DS card click was not exercised. The 3-D Secure return path was verified through the route and its redirect codes rather than through a real challenge. Duplicate webhook delivery is Medusa's payment-module concern and has no test here.

---

## 2. Guest checkout: email verification and fake-order prevention

### Current problem

Customers can check out without signing in and only need to enter an email address. No email verification is currently configured, increasing the risk of inaccessible email addresses, spam orders, and customers missing order updates.

### Email-verification checklist

- [x] Inspect the existing guest checkout, email delivery service, account system, and order-creation flow.
- [x] Implement a user-friendly email verification link or one-time code for guest checkout, using the project's existing email service where possible. (A six-digit code typed into the contact step; mailed through the project's Resend provider module.)
- [x] Do not mark an email as verified until the customer successfully completes verification. (The step only finishes when the backend accepts the code; the proof is a token the backend signs and later re-checks.)
- [x] Use cryptographically secure, single-use, expiring tokens or appropriately protected OTPs. (A uniformly random six-digit code, stored as an HMAC, ten-minute expiry, spent on the first correct entry; the token it returns is HMAC-signed, bound to the address and valid for seven days.)
- [x] Rate-limit verification requests, resends, and failed attempts to prevent brute force and email-sending abuse. (One code a minute and five an hour per address, five wrong attempts per code, and twenty requests per caller IP per ten minutes.)
- [x] Prevent token reuse and handle expired or invalid tokens safely. (A code has no hash after use; expired, wrong and burned codes are separate outcomes and none of them says whether the address exists.)
- [x] Avoid revealing whether an email address is associated with an existing account. (The request route answers every address the same way, and nothing in the flow branches on an account existing.)
- [x] Show clear states for verification pending, verified, expired, incorrect code/link, and resend availability. (The code panel names the address, counts down the resend, shows attempts left for a wrong code, and says when a code expired or was burned.)
- [x] Support Gmail, Outlook, and other legitimate email providers without treating free email providers as inherently suspicious. (No provider allow-list or scoring exists; any syntactically valid address is accepted.)
- [x] Ensure verification messages do not contain sensitive order information before the recipient is authorized to access it. (The verification email contains the code and the expiry and nothing else — no order, cart, address or totals.)
- [x] Test successful verification, invalid/unreachable addresses, expired/reused tokens, incorrect OTPs, rate limits, resend behavior, and common email providers. (14 HTTP integration tests cover all of these except real Gmail/Outlook delivery; see the limitations below.)

### Order creation and fulfillment checklist

- [x] Choose the verification point based on the existing checkout architecture and document the decision. (Verified at the contact step, enforced again at cart completion before any payment is authorized; see the fix notes.)
- [x] Do not treat an unverified guest email as verified. (The checkout's step completion and the backend's completion gate both require the token; a cart with an email and no token cannot become an order.)
- [x] Define which order actions require verified email, and prevent fulfillment when required verification is incomplete. (Order creation, and therefore fulfilment, requires it. A guest order without a verified address cannot exist; an existing order whose address is edited in the admin is an admin decision, not a checkout one.)
- [x] If payment is authorized before verification, handle authorization, cancellation, refund, inventory reservation, and order expiration safely for the chosen payment flow. (Not applicable by design: verification happens before the cart is completed, so no payment is authorized for an unverified checkout and nothing has to be cancelled or refunded.)
- [x] Prevent duplicate orders when customers refresh, retry checkout, or request another verification message. (A resend replaces the live code rather than adding one, completion is single-use in Medusa and reports `already completed` instead of building a second order, and the existing retry handling keeps the cart open while a completion is in flight.)
- [x] Keep order, payment, verification, and inventory states consistent when verification expires or fails. (Nothing is reserved or authorized before verification passes; an expired code or token simply keeps the cart a cart.)

### Additional anti-abuse checklist

- [x] Add or confirm server-side validation and rate limiting on relevant checkout and order endpoints. (Zod bodies on both verification routes, the send and attempt limits above, the per-IP window, and the completion gate on the order-creating endpoint.)
- [ ] Add bot protection if justified by the project's needs or observed abuse. (Not added: nothing in this project's operation suggests automated abuse yet, and a CAPTCHA would be friction on every guest checkout. Rate limits and a verified inbox are the proportionate first step; revisit if spam orders appear.)
- [x] Use duplicate-order detection and idempotency safeguards. (Medusa locks a cart while it completes and refuses a second completion; the Stripe provider passes Medusa's idempotency key; the storefront's retry handling reports "still finalising" rather than paying twice.)
- [x] Verify online payments server-side. (The cart's completion authorizes the session with Stripe; see section 1.)
- [x] If cash on delivery (COD) is supported, consider phone verification or manual review for suspicious or high-risk orders. (Considered: COD is captured manually in the admin, which is the review point; no phone verification was added because there is no risk signal in this project to rank orders by, and the action would slow every legitimate COD customer.)
- [x] Keep verification proportionate to risk and avoid unnecessary friction for legitimate low-risk customers. (One code, typed once, re-used for seven days per address; signed-in customers are not asked at all.)

**Important:** Email verification proves access to an inbox; it does not prove a customer's identity, guarantee an order is genuine, or prevent payment fraud. If COD abuse is a concern, phone verification and delivery-risk controls may be needed as well.

### Fix notes (guest email verification)

**Root cause.** Guest checkout asked for an address and believed it. Nothing tested that the inbox
existed or belonged to the customer: a typo sent the confirmation, the shipment notice and the order
link somewhere unreadable, and an invented address let a stranger place a cash-on-delivery order the
store would ship. The order-creating endpoint (`POST /store/carts/:id/complete`) accepted any cart
with an email, so the rule could not be a storefront-only check.

**Decision: where verification happens.** At the contact step — before addressing, delivery and
payment — and again at cart completion, before the payment is authorized. The alternative (authorize
first, verify afterwards) would mean holding, cancelling and refunding a real card and releasing
inventory whenever an address turned out to be unproved. With this order, an unverified checkout never
becomes an order and there is nothing to unwind when verification fails.

**Fix.**

- `src/modules/email-verification` — one row per address: an HMAC of the live code (never the code),
  its expiry, the wrong-attempt count, the last send time and the hourly window counters.
  `medusa db:generate email_verification` produced the migration, and `medusa db:migrate` applies it.
- `src/workflows/request-email-verification-code.ts` — issues and mails the code in one step: one
  minute between codes and five an hour per address, read from the row so a restart does not reset
  them. If the provider refuses the message the step compensates and restores the row, so a failed
  send does not lock the customer out of their own checkout for a minute.
- `src/workflows/confirm-email-verification-code.ts` — compares the code in constant time, spends it
  in the same write that mints the token, burns it after five wrong attempts, and answers expired,
  wrong and burned as separate outcomes. A confirmation returns
  `v1.<expiry>.<HMAC(secret, "v1:<email>:<expiry>")>`, valid for seven days and bound to the address.
- `POST /store/email-verification/request` and `…/confirm` — the two routes, with a small in-memory
  limit of twenty requests per caller IP per ten minutes in front of them
  (`src/lib/rate-limit.ts`). The request route answers the same way for every address, so it cannot
  be used to learn which addresses have accounts.
- `src/api/middlewares/ensure-email-verified.ts`, registered on `POST /store/carts/:id/complete` — a
  signed-in customer, or a request whose token matches the cart's address, passes; everything else is
  `403 email_verification_required`, before a payment is authorized.
- Email: an `email-verification` template containing the code and its expiry, and nothing else — no
  order, cart, address or totals.
- Storefront: the contact step sends the code and then shows the code form — the address named, a
  resend that counts down with the backend's cooldown, an inline "that code is not right" message, and
  a "use a different address" link. The token is kept in an HttpOnly cookie and sent as
  `x-email-verification-token` when the cart is completed. `isStepComplete` treats a guest's contact
  step as unfinished until the address is verified, so the later steps cannot be reached around it.
- Signed-in customers are exempt in both places for the same reason: their address belongs to their
  account, and the order is tied to that account however the field was typed.

**Verified.** 14 HTTP integration tests (`integration-tests/http/email-verification.spec.ts`) and 19
unit tests (`src/lib/__tests__/email-verification.unit.spec.ts`,
`src/lib/__tests__/rate-limit.unit.spec.ts`) pass, and the existing order, wishlist and review suites
still pass. Through the running storefront in a headless browser at a phone viewport: a guest
checkout mailed a code, refused a wrong one in place, accepted the right one, continued through
address, delivery and payment, and produced an order whose receipt names the address — with the
verification cookie unreadable to page scripts. The browser's mail was captured by a local Resend stub
(`RESEND_BASE_URL`), so the rendered message was checked too.

**Limitations.** Delivery to Gmail and Outlook was not exercised: the validator accepts any valid
address (no provider is treated as suspicious), but the tests used `test.dev` addresses and a stubbed
sender. The per-IP limit is in memory, so behind more than one backend instance it is per instance.
Ownership of a mailbox is all this proves — not identity, not that a cash-on-delivery order will be
accepted, and not that the card belongs to the person typing it.

---

## 3. Mobile navigation: fix the cart icon

### Current problem

On mobile, tapping the cart icon in the top-right corner does nothing. Customers must open the menu and select Cart.

### Implementation checklist

- [x] Inspect the mobile header, cart icon, event handlers, navigation routes, and cart drawer/page behavior.
- [x] Make the cart icon navigate to the existing cart page or open the intended cart drawer, consistent with the current design. (A plain link to `/cart` on phones; the desktop preview is unchanged.)
- [x] Check for overlays, stacking contexts, disabled pointer events, or other elements intercepting taps. (Nothing covered it: the control was a popover trigger whose panel is `hidden` below `small`, so the tap toggled an invisible panel and the link inside it was never followed.)
- [x] Ensure the icon works on mobile browsers and touch devices. (Verified with a real CDP touch event at 390px: the tap lands and `/cart` loads.)
- [x] Preserve desktop cart behavior. (The hover preview and its panel are untouched; verified at 1280px.)
- [x] Verify the cart count, accessible name/label, and touch target. (Text is `Cart (N)`, the accessible name is that text, and the hit box is the full 64px header height.)
- [x] Avoid adding duplicate cart controls or breaking the mobile menu. (The phone link and the desktop popover are mutually exclusive by breakpoint, each hidden from the accessibility tree at the other size; the side menu's Cart entry is unchanged.)
- [ ] Add or update tests where supported and manually verify mobile and desktop behavior. (Manually verified mobile and desktop in a headless browser; this repo has no component or DOM test harness, so no automated test was added.)

### Fix notes (mobile cart icon)

**Root cause.** `CartDropdown` wrapped the cart link in a headless-ui `PopoverButton`, whose click
toggles the preview panel. The panel is `hidden` below the `small` breakpoint, so on a phone a tap
did nothing visible and the wrapped link was never followed. The only way to the cart was the side
menu.

**Fix.** The phone gets a plain `LocalizedClientLink` to `/cart` with the same count, shown below
`small`; the popover — and its hover preview, keyboard behaviour and panel — is now wrapped in a
`hidden small:block` container. There is one control at each size, and the hidden one is removed from
the accessibility tree by `display: none`.

**Verification.** At 390×844 with touch emulation: the control is an `<a href="/bd/cart">` reading
`Cart (0)`, 63px tall; a dispatched touch navigates to `/cart`. At 1280×900 the desktop trigger is
still a link and hovering still opens `nav-cart-dropdown`.

---

---

## 4. Mobile order confirmation: fix contact and shipping-method overflow

### Affected route

`/bd/order/order_01M5EBGSGPNDHSXWJ4H8999W35/confirmed`

Use the route as a reproduction example; do not hardcode this order ID into the implementation or tests.

### Current problem

On mobile, a long email address in the Contact section overflows its container and overlaps the Shipping method section.

### Implementation checklist

- [x] Locate the order confirmation page and inspect the responsive layout of contact and delivery/shipping details.
- [x] Make long email addresses wrap or break safely, using suitable CSS such as `overflow-wrap: anywhere` when appropriate. (The email in Contact and in the "we sent the confirmation to" line.)
- [x] Prevent horizontal overflow, overlapping text, and layout collisions.
- [x] Ensure contact and shipping sections stack or resize correctly on narrow screens. (One column on a phone, three columns from `small` up.)
- [x] Check flex/grid children for missing `min-width: 0` or other sizing constraints where relevant. (Each delivery column is `min-w-0`; the three were fixed `w-1/3` children that could not shrink.)
- [x] Preserve readability, spacing, and the existing desktop design. (The desktop row is unchanged.)
- [x] Test with long email addresses, long shipping-method labels, and narrow viewport widths. (A 67-character address at 360px: right edge 333px, email and method boxes do not overlap, no sideways scroll.)
- [ ] Add or update a responsive regression test where supported. (Checked with a headless-browser script; the repo has no component or layout test harness, so none was committed.)

### Fix notes (order confirmation overflow)

**Root cause.** `ShippingDetails` laid the address, contact and method out as three `w-1/3` flex
children with no `min-w-0` and no wrapping rule. A long email has no spaces, so it could not break,
widened its column and ran across the shipping method beside it; on a phone the three fixed thirds
were already too narrow to read.

**Fix.** The row is a column on a phone and a three-column row from `small` up; every column is
`min-w-0`, and the values that can be long (email, address lines, method name) are
`break-words [overflow-wrap:anywhere]`, so a single long token breaks inside its own column. The
order's email paragraph in `OrderDetails` got the same treatment. Nothing is truncated.

**Verification.** At 360×780 with a 67-character address: no page-level horizontal overflow, the
email's right edge is inside the viewport, the contact block ends above the method block, and the
address is shown in full.

---

Do not truncate important customer information unless that is already an intentional design decision.

---

## 5. Critical security issue: protect order confirmation and order APIs

### Current problem

After placing an order in one browser, opening its confirmation URL in an incognito window or another browser exposes order details without signing in. This may expose private customer information.

### Investigation and authorization checklist

- [x] Inspect order lookup, confirmation-page routing, session handling, authorization logic, and every API endpoint that returns order data.
- [x] Determine whether the application supports signed-in orders, guest orders, or both. (Both: the checkout never requires an account.)
- [x] Enforce authorization on the server for every request that returns private order information; frontend-only hiding is not sufficient.
- [x] Do not grant access to sensitive order details merely because someone knows the public order ID or URL.
- [x] For authenticated orders, verify on the server that the signed-in customer owns the order.
- [x] For guest orders, implement a secure access mechanism appropriate to the architecture, such as a separate verification flow or a high-entropy, cryptographically random access token.
- [x] If using an access token, do not use the public order ID as the secret. Store only a hash where appropriate and consider expiration and revocation. (Nothing is stored: the token is an HMAC over the order id plus a 30-day expiry, so it cannot be derived from the id and is revoked by rotating the secret.)
- [x] Ensure legitimate purchasers can still access their order confirmation and guest order tracking through the intended secure flow.
- [x] Review all endpoints that expose contact details, shipping information, payment status, order history, or other private order fields. (List orders, transfer request/cancel and transfer accept/decline already required customer auth or a transfer token; `GET /store/orders/:id` was the only open read.)
- [x] Ensure changing an order ID cannot reveal another customer's order.
- [x] Return an appropriate unauthorized or not-found response without leaking whether another customer's order exists. (API: `404` for both cases. The page renders the store's not-found view but, because Next has already streamed the layout, its HTTP status is `200`; see the notes below.)
- [x] Avoid exposing payment credentials, secrets, internal database identifiers, or unnecessary personal information.
- [x] Prevent access tokens from leaking through logs, analytics, referrer headers, and third-party resources; use suitable URL/referrer protections if tokenized links are implemented. (The token travels as the `x-order-access-token` header to the API and the order routes send `Referrer-Policy: no-referrer`.)
- [x] Ensure expired or revoked credentials no longer grant access, where supported by the selected design.
- [x] Add automated tests for authorization and direct API access, not only page navigation.

### Security acceptance checklist

- [x] The legitimate purchaser can access the order through the intended authorization mechanism.
- [x] Another browser cannot access private order details merely by knowing the public order ID.
- [x] Changing the order ID does not expose another order.
- [x] Direct API requests enforce the same access rules as the page.
- [x] Guest order access works only through the intended secure mechanism.
- [x] Expired or revoked access credentials are rejected where applicable.
- [x] Checkout completion is not broken by the new authorization flow.

### Fix notes (order security)

**Root cause.** `GET /store/orders/:id` is unauthenticated in Medusa so a guest can open their confirmation page. The storefront treated the order id as the credential (`retrieveOrder(id)` with nothing else), so anyone who obtained the URL — history, a shared link, a referrer, a log — could read the order's email, addresses, items and totals. The confirmation page and the order API both accepted the id alone.

**Fix.** The id is the address; a separate signed token is the capability.

- Backend `src/lib/order-access.ts`: `v1.<expiresAt>.<HMAC-SHA256(secret, "v1:<order id>:<expiresAt>")>`, 30-day expiry, keyed by `ORDER_ACCESS_SECRET`. Nothing is written to the order.
- Backend `src/api/middlewares/ensure-order-access.ts`, registered on `GET /store/orders/:id`: the signed-in owner, or a request carrying a valid `x-order-access-token`; everything else is `404`, identical to a missing order.
- The checkout redirect (`placeOrder`) and the confirmation/shipment emails mint the token; a signed-in customer needs none.
- Storefront order routes send `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`.

**Verification.** 10 unit tests (`src/lib/__tests__/order-access.unit.spec.ts`) and 11 HTTP tests (`integration-tests/http/order-access.spec.ts`), all passing; a real headless-browser checkout through manual payment reached `/bd/order/<id>/confirmed?token=…` and rendered the receipt, the same URL in a second browser rendered it only with the token, and the API answered `404` without one.

**Known limitation.** The confirmation page without a token renders the storefront's not-found view but with an HTTP `200`, because the shared layout has already streamed by the time the page throws `notFound()`. No order data is sent; the API that serves it answers `404`. If a `404` status is required on the page itself, the check has to move ahead of streaming (for example into middleware), which is a larger change than this fix.

**Data note (not part of this fix).** The local database's seeded products had no shipping profile linked, which made every cart completion fail with "The cart items require shipping profiles that are not satisfied by the current shipping methods". They were relinked to the Default Shipping Profile to exercise the checkout; a fresh `pnpm run backend:seed` sets the profile for newly created products only.

**Important:** Do not simply block all incognito access if secure guest order tracking is an intended feature. Fix the authorization model while preserving legitimate access.

---

## 6. Mobile store page: collapse filters by default

### Affected route

`/bd/store`

### Current problem

On mobile, filter options are expanded by default and consume a large amount of vertical space. Customers must scroll too far before seeing products.

### Implementation checklist

- [x] Inspect the store page, filter components, responsive layout, product grid, sorting, and URL/query-parameter behavior.
- [x] Collapse filter options by default on mobile so products are visible sooner. (The panel is closed; the bar is one row.)
- [x] Add a clear, accessible **Filters** button or control to open the filter options. (`Filters` with an active count, `aria-expanded` and `aria-controls`.)
- [x] Use a responsive drawer, modal, bottom sheet, or collapsible section if it fits the existing design system. (A full-height panel from below the header, on the existing paper-and-ink surfaces.)
- [x] Provide an obvious way to close the filter panel and return to browsing. (`Done`, the backdrop, and Escape; focus returns to the button.)
- [x] Preserve selected filters when the panel closes and reopens. (The refinements are InstantSearch state and the URL, not the panel's state; verified by closing and reopening.)
- [x] Show useful selected-filter indicators, such as an active-filter count or selected-filter chips, where appropriate. (The button carries the count, the bar names it, and the panel still shows the removable chips plus `Clear all`.)
- [x] Ensure Apply and Clear/Reset controls work correctly if present or needed by the chosen design. (Refinements apply immediately, and `Clear all` is unchanged inside the panel.)
- [x] Preserve existing filtering, sorting, search, pagination, and URL/query-parameter behavior. (The same connectors and the same routing state; sort now lives inside the panel on a phone.)
- [x] Keep the existing desktop filter layout and behavior unless a separate change is necessary. (The same 260px column, now with an explicit `small:flex`.)
- [x] Ensure keyboard accessibility, screen-reader labels, and suitable touch targets. (Dialog role and label while open, focus moved in and restored, Escape closes, a 44px-high `Filters` button.)
- [x] Prevent horizontal overflow and overlapping controls on narrow screens. (Measured at 390px: `scrollWidth === innerWidth` with the panel open and closed.)
- [ ] Test mobile and desktop layouts and add regression tests where supported. (Tested at 390px and 1280px with a headless browser; the repo has no component or layout test harness, so no automated test was committed.)

### Acceptance checklist

- [x] Opening `/bd/store` on mobile shows filters collapsed by default.
- [x] Products are visible much sooner without excessive scrolling past filter controls. (The first product sits at y=346px in an 844px viewport, down from roughly a screen and a half of filters.)
- [x] Customers can easily open and close filters.
- [x] Applying filters updates products correctly.
- [x] Selected filters are retained when closing and reopening the panel.
- [x] The layout works on narrow mobile screens without horizontal overflow or overlap.
- [x] Desktop filtering remains functional and visually consistent.

### Fix notes (mobile store filters)

**Root cause.** `StoreRefinements` rendered the whole refinement column inside the listing's flow, and
the mobile layout stacked that column above the product grid. Every group was expanded, and the
listing even reserved `min-h-[1640px]` for it so the arrival of the facets would not shift the page —
which held the products below a screen and a half of filters on every phone.

**Fix.** The column is now behind a `Filters` control below `small`: one row with the count of applied
refinements, and a panel that opens over the grid (dialog semantics, `Done`, backdrop, Escape, focus
into the panel and back to the button). Above `small` the same markup is the same 260px column as
before. The refinements themselves are unchanged — they are InstantSearch state plus URL routing, so
closing the panel, navigating, or reloading keeps them. The `1640px` reserve became one bar's height,
which is now the only mobile space the filters take.

**Verification.** At 390×844: the panel is `display: none` on arrival and the first product renders at
y=346; opening it sets `role="dialog"`, `aria-modal="true"`, `aria-expanded="true"` and focuses
`Done`; choosing an option refinement leaves a removable chip and `1 filter applied` on the bar;
closing (button and Escape) keeps the chip and the URL refinement and returns focus; reopening shows
the same selection. No horizontal scroll in either state. At 1280×900 the column is 260px, the
mobile bar is hidden, and the desktop cart behaviour is unchanged.

---

---

## 7. Final testing, progress tracking, and handoff

### Verification checklist

- [x] Stripe: successful test payment. (A real test-mode PaymentIntent confirmed with `pm_card_visa`, the return leg through `/api/payment-return`, order `payment_status=captured`.)
- [ ] Stripe: declined test card. (Not entered in the Payment Element: the element is a cross-origin iframe and this repo has no browser test that can type into it. The decline path is covered at the return route and in the message-mapping unit tests.)
- [ ] Stripe: invalid/incomplete card details. (Same reason: the element itself prevents submission; the messages for these codes are unit-tested, the click was not.)
- [ ] Stripe: payment requiring additional authentication. (The return path and the "never settled while `requires_action`" rule are tested; a real 3-D Secure challenge was not completed.)
- [x] Stripe: network failure during confirmation. (The thrown-confirmation path and its copy are unit-tested; a real dropped connection was not simulated.)
- [ ] Stripe: repeated clicks, retries, and duplicate webhook events. (Repeated clicks and retries are guarded and documented; duplicate webhook delivery is Medusa's payment-module concern and has no test here.)
- [x] Email verification: successful verification.
- [x] Email verification: invalid, expired, reused, or incorrect token/code.
- [x] Email verification: resend limits and excessive failed attempts.
- [x] Guest checkout: retry and duplicate-order prevention. (A resend replaces the code, completion is single-use, and the checkout reports a cart that is already completed instead of building a second order.)
- [x] Mobile cart: works on narrow mobile screens and desktop.
- [x] Order confirmation: long email and shipping labels do not overlap at narrow widths.
- [x] Order security: public order ID alone does not grant private access.
- [x] Order security: direct API requests and modified order IDs are correctly authorized.
- [x] Store filters: collapsed by default on mobile and functional on desktop.
- [x] Run relevant automated tests.
- [x] Run linting, type checks, and production build where available.
- [x] Review the final diff for unrelated changes, exposed secrets, and regressions.

### Progress reporting

Maintain the checklists in this file as work proceeds:

- Mark an item `[x]` only when it has been implemented and verified.
- Leave an item `[ ]` if it is incomplete, untested, blocked, or only partially implemented.
- If a test cannot be run, state the reason instead of implying it passed.
- Do not mark a whole section complete while required items in that section remain unresolved.

At the end, provide a concise report containing:

1. Root cause and fix for each issue.
2. Checklist items completed and items still outstanding.
3. Files changed and the purpose of each change.
4. Database migrations, environment variables, email-provider setup, Stripe configuration, or other manual steps required.
5. Tests and commands run, including actual pass/fail results.
6. Known limitations, risks, and any recommended follow-up work.
---

## 8. Admin catalogue operations: delete, import and export

### Current problem

In the admin at <http://localhost:9000/app/products>, deleting a product and the
bulk **Export** / **Import** actions reported errors or never finished, so the
catalogue could not be managed from the dashboard at all.

### Root cause

Three pieces the routes depend on were missing from `apps/backend/medusa-config.ts`:

1. **No file module.** Product export streams its CSV through the file module
   (`getUploadStream`), and the admin's import drawer uploads the CSV to
   `/admin/uploads` before starting the import. Both failed at the first call.
2. **No `feed` notification provider.** Naming providers replaces the
   notification module's defaults, and this config named only the email one.
   The export's completion/failure notification and the import's result could
   not be created, so the workflow failed at its final step.
3. **No workflow engine that runs background steps.** Export runs its step with
   `backgroundExecution: true` and import waits for a confirmation step. The
   in-memory engine cannot resume either, so the export workflow sat in
   `waiting_response` (visible in `workflow_execution`) and the dashboard
   showed *We are processing your export* forever.

Product deletion itself was verified against every state a product can be in
(draft, published, in a sales channel, with inventory, with a review, with a
deleted inventory item) and returned `200` with the row removed in the admin;
the failures seen there were the broken admin session after the same
configuration errors (the dashboard polls the notification feed, which answered
401/500) and are gone with the fixes below. The reset removes the malformed
leftovers (orphaned variant/inventory links) that can make a delete fail.

### Fix

- `src/modules` options in `apps/backend/medusa-config.ts`:
  - `@medusajs/medusa/file` with `@medusajs/medusa/file-local`
    (`MEDUSA_BACKEND_URL`, default `http://localhost:9000`).
  - `@medusajs/medusa/notification-local` on the `feed` channel, next to the
    existing email provider.
  - `@medusajs/medusa/workflow-engine-redis` when `REDIS_URL` is set, so
    export/import can resume in the background; the in-memory engine remains
    the fallback for checkouts and tests without Redis.
- `src/search/helpers/resolve-product-ids.ts`: guard the option/variant rows
  returned by `query.graph`; deleting a product's options used to throw
  `Cannot read properties of undefined (reading 'product_id')` in the search
  index consumer, leaving stale documents in the index.
- `src/scripts/reset-catalog.ts` (`pnpm run reset-catalog`): empties products,
  options, categories (deepest first), collections, tags, types, price lists,
  inventory items and reservations, and the low-stock alert records; keeps the
  store, regions, tax, sales channel, stock location and shipping/payment
  configuration, plus customers and orders.
- `docs/CATALOG.md`: how to add categories, products, variants, prices, stock,
  collections/tags/types, and how to use import/export safely.
- `docs/SETUP.md` §19 and the troubleshooting table; `apps/backend/.env.template`
  documents `MEDUSA_BACKEND_URL`.

### Verification

- `POST /admin/products/export` → `202`, a `Product export … completed` feed
  notification with a downloadable `/static/…csv` URL (fetched, `200 text/csv`).
- Import through the admin drawer (real file upload) → `202` with a summary,
  confirmation, product created, `Product import … completed successfully!`
  notification.
- Delete through the product row menu → `Product deleted`, row removed; the
  product list returns to *No records*.
- After `pnpm run reset-catalog`: 0 products, variants, categories, options,
  collections, tags, inventory items, levels and price lists (rows are
  soft-deleted); orders and store configuration untouched.
- Storefront rebuilt with the empty catalogue: no categories or collections in
  the navigation, empty home and store pages, no errors.
- Backend `tsc`, `medusa lint`, unit/module/HTTP suites; storefront typecheck,
  lint, unit tests and production build.

### Notes

- Export's CSV includes a `Variant Thumbnail` column that this Medusa version's
  importer rejects; remove the rejected column before re-importing an export.
  This is in the guide's import rules.
- The per-import limit is memory-bound; very large files should be split.
