# 🛒 DevCart — Production-Grade Headless E-Commerce Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![MedusaJS 2.0](https://img.shields.io/badge/MedusaJS-2.0-violet)](https://medusajs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-purple?logo=stripe)](https://stripe.com)
[![Lighthouse 90+](https://img.shields.io/badge/Lighthouse-90%2B-green?logo=lighthouse)](https://pagespeed.web.dev/)

> A department store web engine built for developers and Direct-to-Consumer (DTC) brands. DevCart delivers a full-stack, enterprise-grade headless storefront selling electronics, apparel, beauty, home goods, and grocery products. Powered by Medusa v2 backend, Next.js 15 App Router, micro-SaaS admin analytics, automated transactional notifications, shared Redis rate-limiting, and Stripe payment workflows.

🌐 **Live Demo Store:** [devcart.kazimirazrafi.dev](https://devcart.kazimirazrafi.dev)

🔐 **Admin Dashboard:** Available upon request (demo credentials provided for prospective clients)

---

## 🌟 Executive Summary & Key Capabilities

DevCart demonstrates modern e-commerce engineering practices—prioritizing **business impact, execution security, sub-second performance, and scalability**. Unlike generic boilerplates, it implements complete commerce workflows, real-time inventory safety, automated CRM communications, and robust data hygiene.

### 🛍️ Customer Experience & Storefront Architecture

* **Next.js 15 App Router & React 19:** Dynamic Server-Side Rendering (SSR) combined with InstantSearch client-side filtering.
* **Full Order Lifecycle:** Supports complex variant selections, multi-currency engines (EUR/USD), guest checkouts, and persistent cart state management across sessions.
* **Customer Accounts & Security:** Native Medusa authentication paired with Google OAuth (A1+), session recovery, profile management, and multi-address management (A3).
* **Interactive Business Modules:** Built-in customer review engine with admin moderation, real-time wishlist synchronization, and low-stock indicators.
* **SEO & Accessibility (WCAG Compliant):** Achieves **100/100 Accessibility & SEO Lighthouse scores**, dynamic OpenGraph card generation, and automated schema.org `Product` & `BreadcrumbList` JSON-LD structured data.

### 🔌 Backend Operations & Micro-SaaS Features (Medusa v2)

* **Custom Admin Dashboard Analytics:** Interactive Recharts dashboard featuring revenue streams per currency, comparative window metrics (7d/30d/90d), customer conversion metrics, and fulfillment tracking.
* **Payment Workflows & Webhooks:** Complete Stripe PaymentIntent integration with idempotent, HMAC-verified webhook processing handling asynchronous capture and abandoned-cart completion.
* **Automated Notification Engine:** Resend transactional provider integration dispatching responsive HTML/text emails for order confirmations, single-use 15-minute password resets, and dispatch notifications.
* **Stock & Inventory Automation:** Scheduled low-stock digest pipelines monitoring stock levels against configurable thresholds with automatic alerts.

### 🛡️ Hardening, Security & Infrastructure

* **Shared Redis Rate-Limiting:** Distributed Redis Lua rate-limit counters securing authorization, user creation, newsletter, and transaction routes.
* **Strict Security Headers & CSP:** Production-configured HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and report-only Content Security Policy (CSP).
* **Database Disaster Recovery Drill:** Automated backup shell scripts (`scripts/db-backup.sh`) with table checksums, retention policies, and verified restoration drills (`scripts/db-restore.sh`).
* **Automated CI/CD Quality Gates:** GitHub Actions orchestrating typechecks, linting, headless backend integration tests with live PostgreSQL containers, and automated Lighthouse CI performance budgets.

---

## 📐 Architecture Overview

```
 ┌───────────────────────────────────┐               ┌───────────────────────────────────┐
 │       Next.js 15 Storefront       │ ──Store API──▶│    Medusa v2 Engine Backend       │
 │  (Tailwind CSS, React 19, TS)     │               │   (Node.js 22, Express Framework) │
 └─────────────────┬─────────────────┘               └─────────────────┬─────────────────┘
                   │                                                   │
                   ▼                                                   ▼
 ┌───────────────────────────────────┐               ┌───────────────────────────────────┐
 │   Stripe / Resend / Google OAuth  │               │    PostgreSQL 15  &  Redis Store  │
 └───────────────────────────────────┘               └───────────────────────────────────┘
```

---

## 🛠️ Tech Stack & Key Technologies

| Layer | Technologies Used |
| ----- | ----- |
| **Backend Engine** | Medusa v2, Node.js 22, TypeScript, Express.js |
| **Storefront** | Next.js 15 (App Router), React 19, Tailwind CSS, InstantSearch |
| **Database & Cache** | PostgreSQL 15+, Redis (Upstash/Local), MikroORM |
| **Search & Validation** | Medusa Search API (Postgres), InstantSearch client, Zod |
| **Payments & CRM** | Stripe PaymentIntents API, Resend Transactional Email SDK, Google OAuth 2.0 |
| **Quality Assurance** | Jest (Backend), `node:test` (Storefront), Playwright (E2E), Lighthouse CI |
| **Infrastructure** | Docker Compose, GitHub Actions, Shell Scripts (`pg_dump`) |

---

## 📁 Repository Layout

```
apps/backend        Medusa application: API routes, workflows, modules, subscribers, jobs, admin
apps/storefront     Next.js storefront
docs                Setup, architecture, administration, decisions, testing, and deployment
scripts             Database backup and restore shell scripts
docker-compose.yml  Postgres and Redis services for local development
```

---

## 🧪 Quality Assurance & Hardening Benchmarks

```
Backend Test Suite Results:
✔ 97 Unit Tests (8 Suites) — Passed
✔ 37 Module Tests (5 Suites) — Passed
✔ 81 HTTP Integration Tests (7 Suites) — Passed

Lighthouse Benchmark Scores:
  • Accessibility: 100/100
  • Best Practices: 100/100
  • SEO:           100/100
  • Performance:   90+ (Sub-second LCP)
```

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites

Ensure you have Node.js (`>=20.x` or `22.x`), `pnpm`, and Docker installed on your machine.

### 2. Environment Setup & Database Initialization

```bash
# Clone the repository
git clone https://github.com/your-username/devcart-medusajs.git
cd devcart-medusajs

# Install root & workspace dependencies
pnpm install

# Start local PostgreSQL and Redis containers
docker compose up -d

# Copy environment templates
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local

# Run database migrations & create admin user
cd apps/backend && pnpm exec medusa db:migrate && pnpm exec medusa user -e admin@example.com -p changeme
cd ../..

# Seed full catalogue (194 products across 8 departments, reviews, sales channel)
pnpm run backend:seed
```

> **Note:** Copy your publishable key from the Medusa Admin (`http://localhost:9000/app` -> Settings -> Publishable API keys) into `apps/storefront/.env.local` under `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

### 3. Run Development Servers

```bash
pnpm run dev
```

* **Storefront:** `http://localhost:8000`
* **Backend Admin API & Dashboard:** `http://localhost:9000/app`

---

## 📜 Development & Operational Commands

Run from the repository root unless stated otherwise:

```bash
pnpm run dev                 # Backend and storefront in parallel
pnpm run backend:dev         # Backend engine only
pnpm run storefront:dev      # Storefront app only
pnpm run build               # Build production bundles for both apps
pnpm run start               # Run built production applications
pnpm run lint                # Lint both applications
pnpm run typecheck           # Run TypeScript checks for both apps
pnpm run test                # Run backend test suites
pnpm run backend:seed        # Seed store, catalogue, reviews, and sales channel
```

### Backend Commands (`cd apps/backend`)
```bash
pnpm run test:unit                 # Run unit tests
pnpm run test:integration:modules  # Run module tests against Postgres
pnpm run test:integration:http     # Run HTTP API suites against Postgres
pnpm run seed-catalogue            # Seed catalogue only
pnpm run refresh-catalogue         # Reattach products to channel & reindex search
pnpm run reset-catalog             # Clear catalogue, preserve store setup
```

### Storefront Commands (`cd apps/storefront`)
```bash
pnpm run test    # Run unit tests
pnpm run e2e     # Playwright E2E tests (requires running backend + database)
```

---

## 📚 Technical Documentation

Explore the detailed engineering documentation in the [`docs/`](./docs) directory:

- [Setup Guide](docs/SETUP.md) — Local environment configuration, Stripe test mode, and email stubs.
- [Architecture](docs/ARCHITECTURE.md) — System boundaries, data flow, and workflow design.
- [Store Administration](docs/ADMIN.md) — Merchant guidelines, inventory management, and moderation workflows.
- [Design Decisions](docs/DECISIONS.md) — Key technical and architectural tradeoffs.
- [Testing Strategy](docs/TESTING.md) — Unit, integration, and E2E test suite specs.
- [Deployment Guide](docs/DEPLOYMENT.md) — Hosting strategies for Vercel, Render, Supabase, and Upstash.
- [Design System](docs/DESIGN.md) — Typography, color tokens, and WCAG AA accessibility specs.

---

## 📄 License & Contact

Distributed under the MIT License. See `LICENSE` for details.

**Miraz Rafi** — Full-Stack E-Commerce & Web Applications Developer

🌐 Portfolio: [kazimirazrafi.dev](https://kazimirazrafi.dev)  
💼 Available for freelance contracts, custom MedusaJS builds, and technical consulting.