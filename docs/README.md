# Documentation

Guides for running, extending and deploying DevCart.

| Document | What it covers |
| --- | --- |
| [SETUP.md](SETUP.md) | Local prerequisites, environment variables, seeding, Stripe, Google sign-in, Resend |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the backend and storefront are put together, module by module |
| [ADMIN.md](ADMIN.md) | Day-to-day use of the Medusa admin: products, orders, reviews, alerts |
| [DECISIONS.md](DECISIONS.md) | Why the code is shaped the way it is |
| [TESTING.md](TESTING.md) | Test layers, commands, and what runs in CI |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Building and hosting both apps in production |
| [DESIGN.md](DESIGN.md) | Palette, type, spacing and the base components |

Two more things are worth knowing before reading on:

- **Routing is file-based.** A store endpoint lives at `apps/backend/src/api/store/<path>/route.ts`. There is no router to register.
- **Business logic lives in workflows.** Route handlers resolve input and run a workflow; workflow steps do the work. Anything that spans more than one module belongs in a workflow.
