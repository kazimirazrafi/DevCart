# DevCart

A department store for people who build software. The shop sells electronics, apparel, beauty, home
goods and a small grocery range, and runs on Medusa v2 with a Next.js storefront.

The catalogue is a demo data set (194 products across 8 departments), so the storefront is populated
from the first run.

## What is in the box

- **Backend** (`apps/backend`): Medusa v2 application with the store API, admin dashboard, custom
  modules for reviews, wishlists, email verification, newsletters and stock alerts, plus a sales
  dashboard in the admin.
- **Storefront** (`apps/storefront`): Next.js App Router site with product search, filters,
  collections, categories, cart, guest and account checkout, order history, order transfer, reviews,
  wishlists and a dark mode.
- **Ops scripts** (`scripts/`): Postgres dump and restore helpers.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Medusa v2, Node 22, TypeScript |
| Storefront | Next.js 15 (App Router), React 19, Tailwind CSS |
| Database | PostgreSQL 15+ |
| Cache and events | Redis |
| Search | Medusa search API with an InstantSearch client |
| Payments | Stripe (card) and Medusa's manual provider (cash on delivery) |
| Email | Resend, with Medusa's notification module |
| Validation | Zod |
| Tests | Jest (backend), node:test (storefront), Playwright (end to end) |
| Local infrastructure | Docker Compose |

## Repository layout

```
apps/backend        Medusa application: API routes, workflows, modules, subscribers, jobs, admin
apps/storefront     Next.js storefront
docs                Setup, architecture, administration, decisions, testing and deployment
scripts             Database backup and restore
docker-compose.yml  Postgres and Redis for local development
```

## Quick start

```bash
pnpm install
docker compose up -d
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local

cd apps/backend && pnpm exec medusa db:migrate && pnpm exec medusa user -e admin@example.com -p changeme
cd ../.. && pnpm run backend:seed
```

Put a publishable key from the admin (Settings, Publishable API keys) into
`apps/storefront/.env.local`, then run both apps:

```bash
pnpm run dev
```

Backend on `http://localhost:9000` (admin at `/app`), storefront on `http://localhost:8000`.
[`docs/SETUP.md`](docs/SETUP.md) has the full walkthrough, including Stripe test mode and email.

## Commands

Run from the repository root unless stated otherwise. The package manager is pnpm.

```bash
pnpm run dev                 # backend and storefront
pnpm run backend:dev         # backend only
pnpm run storefront:dev      # storefront only
pnpm run build               # build both apps
pnpm run start               # run the built apps
pnpm run lint                # lint both apps
pnpm run typecheck           # typecheck both apps
pnpm run test                # backend suites
pnpm run backend:seed        # store, catalogue, reviews, sales channel
```

Backend only (`cd apps/backend`):

```bash
pnpm run test:unit                 # unit tests
pnpm run test:integration:modules  # module tests against Postgres
pnpm run test:integration:http     # HTTP suites against Postgres
pnpm run seed-catalogue            # catalogue only
pnpm run refresh-catalogue         # reattach products to the storefront channel and reindex
pnpm run reset-catalog             # empty the catalogue, keep the store setup
```

Storefront only (`cd apps/storefront`):

```bash
pnpm run test    # unit tests
pnpm run e2e     # Playwright, needs a seeded database
```

## Documentation

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Running the shop](docs/ADMIN.md)
- [Decisions](docs/DECISIONS.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Design system](docs/DESIGN.md)

## License

MIT.
