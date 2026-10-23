# AGENT SPEC: E-Commerce Store (MedusaJS v2 + Next.js)

> **AUDIENCE: AI coding agent.** Read this entire file before doing anything. This is your source of truth for what to build, in what order, and how to behave. Re-read the relevant section before starting each task.
Name of this ecommerce website: **DevCart**

---

## 0. PRIME DIRECTIVES

1. **Follow the phases in order (§9).** Do not start Phase N+1 until Phase N acceptance criteria all pass.
2. **Work on ONE task at a time.** Finish it, verify it, then report. Do not bundle unrelated changes.
3. **Never guess APIs.** For any Medusa or Stripe API, first look in (a) existing code in this repo, (b) installed package types in `node_modules`, (c) official docs (docs.medusajs.com). If unsure, say so and ask.
4. **Medusa v2 only.** Do NOT write Medusa v1 patterns (v1-style services/entities/repositories/loaders/`medusa-config.js` plugins). See §3.
5. **Reuse what the starter already has.** Before building any feature, check whether `medusajs/dtc-starter` already implements it. Extend, don't duplicate.
6. **Do not edit `node_modules` or Medusa core.** All custom logic goes in modules, workflows, subscribers, API routes, links, jobs, and admin extensions.
7. **Never commit secrets.** Use `.env`; keep `.env.template` updated with placeholder values for every new variable.
8. **After every change, run verification (§8.2).** If it fails, fix it. If it fails twice with the same cause, STOP and report the exact error plus your diagnosis. Do not rewrite large areas as a fix.
9. **Do not install a new dependency without stating the reason** and checking that no installed package already does the job.
10. **Keep changes minimal and scoped.** Do not refactor, rename, or reformat unrelated files.
11. **Ask when ambiguous.** If a requirement conflicts with the starter's structure or is unclear, ask one concise question rather than assuming.

---

## 1. PROJECT DEFINITION

- **What:** A complete headless e-commerce store: browse → cart → checkout (Stripe test mode) → order confirmation → account/order history, plus admin management.
- **Purpose:** Portfolio project. Quality, correctness, and cleanliness matter more than feature count.
- **Scope policy:** Ship MVP features (🟢) fully before any 🟡 or 🔵 feature.
- **Owner:** Non-expert in web dev. Write clear, conventional, well-commented code. Prefer simple, readable solutions over clever ones. Explain non-obvious decisions in short code comments or in your task report.

---

## 2. TECH STACK (authoritative)

| Layer | Technology |
|-------|-----------|
| Backend | MedusaJS v2, Node.js, TypeScript (strict) |
| DB | PostgreSQL |
| Cache / events | Redis |
| Storefront | Next.js (App Router), React, TypeScript, Tailwind CSS |
| API client | Medusa JS SDK |
| Payments | Stripe (test mode) via Medusa Stripe payment provider |
| Email | Resend (via a Medusa notification provider/module) |
| Search | Meilisearch (Phase 2) |
| Storage | S3-compatible (R2/S3/MinIO) for production; local file provider acceptable in dev |
| Validation | Zod |
| Tests | Jest (backend), Playwright (E2E) |
| CI | GitHub Actions |
| Local infra | Docker Compose (Postgres, Redis, Meilisearch) |
| Deploy | Vercel (storefront), Railway/Render/Medusa Cloud (backend), Neon/Supabase (DB), Upstash (Redis) |

**Step 0 of the project:** inspect the starter and write a short report listing which of the above it already includes (CMS, search, email, etc.). Treat the starter's existing choices as authoritative where they differ from this table, and flag the differences.

---

## 3. MEDUSA v2 RULES (MANDATORY)

Use these constructs for custom backend work:

| Need | Use |
|------|-----|
| New data model / domain logic | **Custom module** in `backend/src/modules/<name>/` (model, service, `index.ts`, migrations) |
| Multi-step business logic with rollback | **Workflow** in `backend/src/workflows/` (steps + `createWorkflow`) |
| Side effects on events (`order.placed`, etc.) | **Subscriber** in `backend/src/subscribers/` |
| New HTTP endpoints | **API route** in `backend/src/api/{store|admin}/.../route.ts` with Zod validation middleware |
| Relating data across modules | **Module Link** in `backend/src/links/` |
| Scheduled work | **Scheduled job** in `backend/src/jobs/` |
| Admin UI additions | **Admin widget/route** in `backend/src/admin/` |
| Third-party service integration | **Provider module** (payment, notification, file, search wrapper) |

**Forbidden:**
- Medusa v1 APIs and patterns.
- Direct SQL against Medusa core tables from storefront or ad-hoc scripts (use services/query).
- Editing Medusa core packages.
- Business logic inside API route handlers beyond orchestration; put it in workflows/services.

**Always:** register new modules in `medusa-config.ts`; generate and run migrations (`npx medusa db:generate <module>` then `npx medusa db:migrate`); use the Query API / module services for reads.

---

## 4. STOREFRONT RULES (Next.js)

- App Router. **Server Components by default.** Add `"use client"` only for interactivity (cart drawer, forms, gallery, Stripe Elements).
- All Medusa calls go through a single SDK client in `storefront/src/lib/`. Do not scatter raw `fetch` calls.
- Every data-driven UI MUST implement: **loading state, empty state, error state.**
- Use `next/image` for images. Provide `alt` text.
- Fully responsive, mobile-first (breakpoints: 360 / 768 / 1280 verified).
- Accessibility baseline: semantic HTML, labelled form fields, visible focus, keyboard-operable controls, sufficient contrast.
- SEO baseline: per-page `generateMetadata`, Open Graph tags, `sitemap.ts`, `robots.ts`, JSON-LD `Product` on product pages.
- No hardcoded backend URLs, keys, or region IDs. Use env vars.
- Country/region handling: follow the starter's existing region approach; do not invent a parallel one.

---

## 5. FEATURE SPECIFICATION

Legend: 🟢 MVP · 🟡 Phase 2 · 🔵 Stretch. Each feature lists **acceptance criteria (AC)**. A feature is done only when all AC pass.

### 5.1 Catalog & Discovery

| ID | Pri | Feature | Acceptance criteria |
|----|-----|---------|---------------------|
| C1 | 🟢 | Homepage | Hero section, featured products, category links, collection section; data from Medusa (or CMS if the starter has one); responsive |
| C2 | 🟢 | Product listing | Grid with pagination or infinite scroll; shows image, title, price; empty + loading states |
| C3 | 🟢 | Category & collection pages | Routes resolve by handle; show only matching products; 404 for unknown handle |
| C4 | 🟢 | Product detail | Image gallery, variant selectors (options → variant), correct price per variant, stock state (in stock / out of stock), add-to-cart disabled when unavailable |
| C5 | 🟢 | Sort & filter | Sort by newest / price asc / price desc; filter by category and price range; state reflected in URL query params |
| C6 | 🟡 | Search | Meilisearch index of products; typo-tolerant instant results; reindex on product create/update/delete via subscribers |
| C7 | 🟡 | Related products | Product page shows ≥4 related items (same category/collection), excluding current |
| C8 | 🔵 | Reviews & ratings | See §5.5 |

### 5.2 Cart & Checkout

| ID | Pri | Feature | Acceptance criteria |
|----|-----|---------|---------------------|
| K1 | 🟢 | Cart | Add, remove, change quantity; persists across reload (cart ID cookie); totals update correctly; handles out-of-stock errors gracefully |
| K2 | 🟢 | Checkout steps | Email → shipping address → shipping method → payment → review; validation on every step; can go back without data loss |
| K3 | 🟢 | Guest + logged-in checkout | Both flows complete; logged-in users get saved address prefill |
| K4 | 🟢 | Stripe payment | PaymentIntent via Medusa payment session; Stripe Elements UI; success creates order; declined card shows a clear error and leaves cart intact |
| K5 | 🟢 | Order confirmation | Page shows order number, items, totals, address; accessible right after checkout |
| K6 | 🟡 | Promo codes | Apply/remove code in cart/checkout; totals reflect discount; invalid code shows error |
| K7 | 🟡 | Stripe webhook | Webhook endpoint verified; handles late/missed completion safely (idempotent) |
| K8 | 🔵 | Multi-region / multi-currency | Region switch changes currency and prices |

### 5.3 Customer Account

| ID | Pri | Feature | Acceptance criteria |
|----|-----|---------|---------------------|
| A1 | 🟢 | Register / login / logout | Works with Medusa auth; errors shown for bad credentials/duplicate email; protected routes redirect to login |
| A2 | 🟢 | Order history | List + detail page for the logged-in customer only |
| A3 | 🟡 | Saved addresses | Add, edit, delete, set default |
| A4 | 🟡 | Profile & password reset | Edit name/phone; reset-password email flow end-to-end |
| A5 | 🔵 | Wishlist | See §5.5 |

### 5.4 Email (🟡 Phase 2)

| ID | Feature | AC |
|----|---------|----|
| E1 | Order confirmation email | Subscriber on `order.placed` sends email via Resend with order summary; failure is logged and does NOT break order creation |
| E2 | Password reset email | Link works and expires |
| E3 | Shipment notification | Sent when a fulfillment is created/shipped |

Emails: HTML + plain-text fallback; simple, consistent template; templates stored in `backend/src/modules/<notification>/templates/`.

### 5.5 Custom Backend Features (portfolio differentiators — implement 2 minimum, in Phase 3)

**Option A — Product Reviews (🟡 preferred)**
- Custom module `review`: fields `id`, `product_id`, `customer_id`, `rating` (1–5), `title`, `body`, `status` (`pending|approved|rejected`), timestamps.
- Link review ↔ product and review ↔ customer using Module Links.
- Store API: `GET /store/products/:id/reviews` (approved only, paginated), `POST /store/products/:id/reviews` (authenticated customer, Zod-validated, one review per customer per product).
- Admin API + widget: list, approve, reject reviews.
- Storefront: star summary, review list, review form (logged-in only).
- Tests: module service tests + API route tests.

**Option B — Wishlist (🔵)**
- Custom module `wishlist`, linked to customer and product variant/product.
- Store API: list/add/remove (authenticated).
- Storefront: heart toggle on product card/page; wishlist page.

**Option C — Low-stock alert (🔵)**
- Scheduled job checks inventory below a configurable threshold; sends email to admin address via the notification provider; avoids duplicate alerts within 24h.

**Option D — Admin sales dashboard widget (🔵)**
- Admin route showing revenue, order count, top products for a date range using Query API.

### 5.6 Admin (Medusa Admin — configuration tasks, not custom code unless noted)

- 🟢 Seed: regions, currencies, shipping options, stock location, sales channel, publishable API key, a shop-sized catalogue with real product photography (shipped with 53 products across 10 categories, so pagination, filters and rails have something to work with), 2–3 collections. Put in a re-runnable seed script `backend/src/scripts/seed.ts` (extend the starter's seed if it exists).
- 🟢 Verify admin can: create/edit products, manage inventory, view/fulfill/cancel/refund orders, view customers.
- 🟡 Promotions configured and testable.

---

## 6. REPOSITORY LAYOUT (target)

Adapt to the starter's actual structure; do not reorganize the starter without approval.

```
.
├── backend/
│   ├── src/
│   │   ├── api/{store,admin}/
│   │   ├── modules/
│   │   ├── workflows/
│   │   ├── subscribers/
│   │   ├── jobs/
│   │   ├── links/
│   │   ├── admin/
│   │   └── scripts/seed.ts
│   ├── medusa-config.ts
│   └── .env.template
├── storefront/
│   ├── src/{app,modules,lib,styles}
│   └── .env.template
├── docker-compose.yml
├── .github/workflows/ci.yml
├── docs/
└── README.md  (this file)
```

---

## 7. ENVIRONMENT VARIABLES

Maintain these in `.env.template` files (placeholders only). Add any new variable to the template in the same commit that introduces it.

**backend**
```
DATABASE_URL, REDIS_URL, STORE_CORS, ADMIN_CORS, AUTH_CORS,
JWT_SECRET, COOKIE_SECRET,
STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET,
RESEND_API_KEY, RESEND_FROM,
MEILISEARCH_HOST, MEILISEARCH_ADMIN_KEY,
S3_URL, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION
```

**storefront**
```
NEXT_PUBLIC_MEDUSA_BACKEND_URL, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
NEXT_PUBLIC_STRIPE_KEY, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_DEFAULT_REGION,
NEXT_PUBLIC_MEILISEARCH_HOST, NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY
```

Rules: use only the exact names the starter already uses where they exist; never expose secret keys via `NEXT_PUBLIC_*`.

---

## 8. WORKING PROTOCOL

### 8.1 Per-task loop
1. **Restate** the task in 1–2 lines and name the roadmap ID(s) (e.g., `C4`, `K2`).
2. **Inspect** the relevant existing files. List what you found.
3. **Plan** the change as a short list of files to create/modify. Wait for approval if the change touches >5 files or adds a dependency.
4. **Implement** minimally.
5. **Verify** (§8.2).
6. **Report** using §8.3.

### 8.2 Verification commands (run what exists; add missing scripts)
```
# backend
npm run build
npx tsc --noEmit
npm run lint            # if configured
npm run test:unit / test:integration:*   # relevant tests

# storefront
npm run lint
npx tsc --noEmit
npm run build
```
Plus a manual check list for the feature (exact steps for the owner to click through).

### 8.3 Task report format
```
TASK: <ID + name>
STATUS: done | blocked | partial
FILES CHANGED: <list>
NEW ENV VARS / DEPENDENCIES: <list or none>
HOW TO TEST: <numbered manual steps>
VERIFICATION RESULT: <commands run + pass/fail>
KNOWN ISSUES / DECISIONS: <short>
SUGGESTED COMMIT MESSAGE: <conventional commit>
```

### 8.4 Git conventions
- Work on a branch per feature: `feat/<id>-<slug>`, `fix/...`, `chore/...`.
- Conventional Commits: `feat(storefront): add variant selector (C4)`.
- Do not commit: `.env`, `node_modules`, build output, local DB dumps.
- Propose a commit after each verified task; do not squash unrelated work together.

### 8.5 Failure protocol
- Error → read full message → check docs/types/existing code → fix.
- Same error twice → STOP. Report: exact error, what you tried, your hypothesis, and the options you see.
- Never respond to a failure by deleting and regenerating large parts of working code.
- Never disable lint/type checks or tests to make something pass.

---

## 9. ROADMAP (execute in order)

### PHASE 0 — Foundation
**Tasks**
- P0.1 Inspect starter; produce report (structure, versions, included integrations, missing items vs this spec).
- P0.2 Make backend + storefront run locally from clean clone; document exact commands in `docs/SETUP.md`.
- P0.3 Add/verify `docker-compose.yml` (Postgres, Redis; Meilisearch optional now).
- P0.4 Add `.env.template` files; ensure `.gitignore` covers secrets.
- P0.5 Remove or rename starter placeholder branding; set store name/metadata via env/config.
- P0.6 Add CI skeleton: install, lint, typecheck, build for both apps.

**Exit criteria:** fresh clone + `docs/SETUP.md` → both apps run; CI green.

### PHASE 1 — Core Store MVP
**Tasks:** seed data (§5.6) → C1–C5 → K1–K5 → A1–A2 → responsive + states pass.

**Exit criteria:** In test mode, a new visitor can: browse, pick a variant, add to cart, check out as guest with `4242 4242 4242 4242`, see confirmation; register, buy again, see both orders in history; admin sees the orders and can fulfill one. No console errors; `npm run build` passes on both apps.

### PHASE 2 — Commerce Completeness
**Tasks:** E1–E3 → K6, K7 → A3, A4 → C6, C7 → SEO baseline (§4) → sitemap/robots/JSON-LD.

**Exit criteria:** emails delivered in test; promo code works; search returns typo-tolerant results; reset-password flow works; structured data validates.

### PHASE 3 — Differentiators & Polish
**Tasks:** implement ≥2 options from §5.5 (start with Reviews) → accessibility pass → performance pass (Lighthouse Performance/Accessibility/SEO ≥ 90 on home, listing, product) → dark mode (optional).

**Exit criteria:** custom modules have tests; admin extension works; Lighthouse targets met.

### PHASE 4 — Testing & Deployment
**Tasks:**
- P4.1 Backend tests for custom modules/workflows/routes.
- P4.2 Playwright E2E: (1) guest purchase, (2) register+login+order history, (3) search, (4) failed payment.
- P4.3 CI runs lint, types, tests, build; E2E on main or nightly.
- P4.4 Production config: backend (server + worker mode if applicable per Medusa docs), DB migrations on deploy, Redis, S3 storage, CORS, Stripe webhook URL, domains.
- P4.5 Deploy storefront to Vercel; backend to chosen host; run production seed; smoke-test full purchase.
- P4.6 Write `docs/DEPLOYMENT.md` with exact steps and a rollback note.

**Exit criteria:** live URLs work end-to-end in Stripe test mode.

### PHASE 5 — Documentation
**Tasks:** generate `docs/ARCHITECTURE.md` (diagram + module/workflow/subscriber inventory), `docs/DECISIONS.md` (key choices and why), `docs/TESTING.md`, and a **separate human-facing `README.human.md`** (pitch, screenshots placeholders, live links, setup, features). Do this only when asked.

---

## 10. ARCHITECTURE REFERENCE

```
Browser → Next.js Storefront (Vercel)
              │  Medusa JS SDK (Store API, publishable key)
              ▼
         Medusa Backend (Node) ──► PostgreSQL
              │                 ──► Redis (events, workflows, cache)
              │                 ──► Stripe (payments; webhook → backend)
              │                 ──► Resend (notifications)
              │                 ──► Meilisearch (search index)
              │                 ──► S3/R2 (files)
         Medusa Admin Dashboard (served by backend at /app)
```

**Checkout sequence (must be preserved):**
1. Create/retrieve cart (region-aware) → add line items.
2. Set email + shipping/billing address.
3. List and set shipping method.
4. Initiate payment session (Stripe) → get `client_secret`.
5. Confirm payment client-side with Stripe Elements.
6. Complete cart server-side → order created.
7. `order.placed` event → subscriber sends confirmation email.
8. Stripe webhook acts as an idempotent safety net.

**Event → handler map (target):**
| Event | Handler |
|-------|---------|
| `order.placed` | send confirmation email |
| `product.created/updated/deleted` | update Meilisearch index |
| `fulfillment.created` (or shipment event per docs) | send shipment email |
| `auth.password_reset` | send reset email |

(Verify exact event names against Medusa docs/installed version before implementing.)

---

## 11. CODE QUALITY STANDARDS

- TypeScript `strict`; no `any` unless justified in a comment.
- Validate all external input (API bodies, query params) with Zod.
- Small functions, descriptive names, no dead code, no commented-out blocks.
- Handle and log errors; never swallow them silently. Side-effect failures (email, search) must not break core commerce flows.
- No secrets, tokens, or personal data in logs.
- Prefer existing utilities/components over new ones. Keep UI components reusable and in the storefront's `modules/` convention.
- Comments explain *why*, not *what*.

---

## 12. SECURITY & PERFORMANCE CHECKLIST (apply continuously)

- CORS restricted to known origins in production.
- Secure cookies, strong `JWT_SECRET`/`COOKIE_SECRET` in production.
- Stripe webhook signature verified.
- Authenticated routes check customer ownership of resources (orders, addresses, reviews).
- `npm audit` clean of high/critical issues (or documented).
- Images optimized; product pages cached/revalidated sensibly; avoid N+1 API calls on listing pages.

---

## 13. DEFINITION OF DONE (project)

- [ ] All 🟢 features pass AC.
- [ ] Phase 1–4 exit criteria met.
- [ ] CI green; tests cover custom modules and the main purchase flow.
- [ ] Lighthouse ≥ 90 (Performance, Accessibility, SEO) on key pages.
- [ ] Deployed; live full purchase works in Stripe test mode.
- [ ] `.env.template`, `docs/SETUP.md`, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md` are accurate.
- [ ] No secrets in repo history.

---

## 14. FIRST ACTION

Begin with **P0.1**: 
Read the frontend-design skill. Propose a design plan for this store (subject and audience, 4–6 named hex colors, typefaces and roles, layout concept, principles). Save it as docs/DESIGN.md. Wait for my approval before building any page.
Inspect the repository, then output a report containing:
1. Directory structure (2 levels deep).
2. Medusa version and key package versions.
3. Which features/integrations from §2 and §5 already exist in the starter.
4. What is missing or differs from this spec.
5. Any risks or questions.

Do not write or modify code until the owner approves the report.