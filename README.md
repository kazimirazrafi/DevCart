# DevCart

Merchandise for people who build software. A direct-to-consumer store built on Medusa v2 and Next.js.

This is a portfolio project: correctness and clarity matter more than feature count. The build order,
feature list and acceptance criteria live in [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md), and
progress against them is tracked in [`ROADMAP.md`](ROADMAP.md).

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Medusa v2 (`@medusajs/medusa` 2.21.2), Node 22, TypeScript |
| Database | PostgreSQL 15+ |
| Cache / events | Redis |
| Storefront | Next.js 15 (App Router), React 19, Tailwind CSS |
| API client | Medusa JS SDK |
| Payments | Stripe (test mode) |
| Search | Medusa's built-in search API + InstantSearch adapter |
| Validation | Zod |
| Tests | Jest (backend) |
| Local infra | Docker Compose |

## Layout

```
apps/backend        Medusa application: API routes, workflows, modules, subscribers, jobs, admin
apps/storefront     Next.js storefront
docs/               Spec, setup guide, design system
docker-compose.yml  Postgres + Redis (Meilisearch behind an opt-in profile)
ROADMAP.md          Progress against the spec
```

Each app has its own `AGENTS.md` context and environment template. The storefront is optional to run if
you only need the API.

## Quick start

Full, verified instructions are in [`docs/SETUP.md`](docs/SETUP.md). The short version:

```bash
pnpm install
docker compose up -d                      # Postgres + Redis
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
pnpm dev                                  # backend on :9000, storefront on :8000
```

The backend serves the admin dashboard at `http://localhost:9000/app`. The storefront is at
`http://localhost:8000`.

To put it on the internet, [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) covers the free-tier combination
this project was deployed against: Vercel for the storefront, Render for the backend, Supabase for
Postgres and Upstash for Redis.

## Commands

Run from the repository root unless noted. The package manager is pnpm (see `packageManager` in
`package.json`).

```bash
pnpm run dev                 # both apps
pnpm run backend:dev         # backend only
pnpm run storefront:dev      # storefront only
pnpm run build               # build both apps
pnpm run lint                # lint both apps
pnpm run test                # backend test suites
```

Backend only:

```bash
cd apps/backend
pnpm exec medusa db:migrate              # apply migrations
pnpm exec medusa user -e admin@test.com -p supersecret
```

## Design

The visual system — palette, type scale, spacing and base components — is specified in
[`docs/DESIGN.md`](docs/DESIGN.md) and previewable at `/{country}/design`, for example
`http://localhost:8000/dk/design`.

## Status

Phases 0–2 (foundation, core store MVP and commerce completeness) are complete. Phase 3
(differentiators and polish) is in progress — product reviews and the wishlist ship today. See
[`ROADMAP.md`](ROADMAP.md) for the current state of every feature.

## License

MIT.
