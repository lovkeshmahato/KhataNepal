# KhataNepal

An enterprise point-of-sale and retail management platform for Nepali supermarkets — multi-branch inventory, purchasing, POS checkout, CRM, double-entry accounting, VAT billing, and AI-assisted reordering, built as a Next.js 15 + NestJS monorepo.

## Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui-style components, Framer Motion, TanStack Query, Zustand |
| API | NestJS 11, Prisma 6, PostgreSQL, Redis (ioredis), Passport JWT |
| Shared | `@khatanepal/types` — zod schemas, RBAC vocabulary, BS↔AD date helpers, shared across both apps |
| Infra | pnpm workspaces + Turborepo, Docker / docker-compose |

## Monorepo layout

```
apps/
  api/     NestJS backend (REST API, Prisma schema, business logic)
  web/     Next.js frontend (App Router, POS terminal, back-office UI)
packages/
  types/   Shared zod schemas, RBAC permission map, Nepali date utilities
```

## Getting started

### Prerequisites
- Node.js ≥ 20, pnpm ≥ 10 (`corepack enable`)
- PostgreSQL 16 and Redis 7 (either locally or via `docker compose up -d postgres redis`)

### Setup

```bash
cp .env.example .env          # edit DATABASE_URL / JWT secrets / etc.
pnpm install
pnpm db:generate               # prisma generate
pnpm --filter @khatanepal/api prisma:migrate   # create schema (first run)
pnpm db:seed                   # demo org, branches, roles, users, catalog, opening stock
pnpm dev                       # runs api (:4000) and web (:3000) in parallel via turbo
```

Web app: http://localhost:3000 · API: http://localhost:4000/api/v1 · Swagger docs: http://localhost:4000/api/v1/docs

### Demo accounts

Seeded by `apps/api/prisma/seed.ts`, password `ChangeMe123!` for all:

| Role | Email |
|---|---|
| Owner | owner@khatanepal.demo |
| Branch Manager | manager@khatanepal.demo |
| Cashier | cashier@khatanepal.demo |
| Inventory Clerk | inventory@khatanepal.demo |
| Accountant | accountant@khatanepal.demo |

### Docker

```bash
docker compose up -d --build
```

Runs Postgres, Redis, the API (runs pending migrations on boot, then serves on :4000), and the web app (:3000).

### Deploying to shared hosting (Hostinger / cPanel-style Node.js App Selector)

This kind of hosting has no Docker step — it clones the repo, runs an install command, runs a build command, then runs one specific JS file as a persistent process (what the panel calls the "Application startup file"). Since this repo has **two separate deployable services**, you need **two Node.js app entries** in the panel (typically on two subdomains, e.g. `api.yourdomain.com` and `app.yourdomain.com`):

| | Application root | Install command | Build command | Application startup file |
|---|---|---|---|---|
| **API** | repo root | `pnpm install` | `npm run build` | `apps/api/dist/main.js` |
| **Web** | repo root | `pnpm install` | `npm run build` | `apps/web/.next/standalone/apps/web/server.js` |

Notes:
- `npm run build` (not `pnpm build`) is intentional — see the `build` script in the root `package.json`; it doesn't require `pnpm` to be on `PATH` during the build phase, only during install.
- The web app's `postbuild` script (`apps/web/scripts/copy-standalone-assets.js`) copies `public/` and `.next/static/` into the traced standalone output automatically, so `apps/web/.next/standalone/apps/web/server.js` is a fully self-contained server as soon as the build finishes — no extra manual copy step.
- Set `PORT` for each app in the panel's environment variables if it doesn't inject one automatically (both the Nest API and the Next.js standalone server read `process.env.PORT`).
- Set the required env vars from `.env.example` (`DATABASE_URL`, `REDIS_URL`, `JWT_*_SECRET`, `NEXT_PUBLIC_API_URL` pointed at the API's public URL, etc.) on **both** app entries before starting them.
- After the build finishes, the panel needs an explicit "Restart"/"Start" action to actually launch the process — a successful build does not by itself mean the app is running. A 403 with the exact text "Access to this resource on the server is denied!" from the web server (not from this app) almost always means no Node process is bound to that domain yet — double check the startup file path and restart.

### Deploying the frontend and API on different domains (e.g. web on Vercel)

Serving `apps/web` from one host (Vercel, Netlify, ...) and `apps/api` from another makes every request **cross-site**, which needs three things set correctly or login will silently fail:

1. **`NEXT_PUBLIC_API_URL`** on the frontend host, set to the API's public HTTPS URL (e.g. `https://api.yourdomain.com/api/v1`). This is a build-time env var in Next.js — after adding/changing it you must trigger a new deployment, not just save it in the dashboard.
2. **`CORS_ORIGIN`** on the API, set to the frontend's exact URL (comma-separate multiple, e.g. a Vercel production URL plus its preview URLs). Without this the browser blocks every request with a CORS error before it even reaches this app.
3. **`COOKIE_SAME_SITE=none`** on the API. The login/refresh flow uses an httpOnly cookie; browsers only send `SameSite=Lax` (the default) cookies on same-site requests, so a split-domain deployment needs `SameSite=None` — which in turn requires the API to be served over real HTTPS (a bare IP or self-signed cert won't work; the browser silently drops the cookie).

All three live in `.env.example`. If login returns a 200 with a user object but you're logged out again on refresh, that's #3 — the cookie isn't being accepted cross-site.

### Deploying the API itself on Vercel

Vercel doesn't run persistent servers — `main.ts`'s `app.listen(port)` never gets called there. `apps/api` ships a serverless entry point for this (`apps/api/api/index.js`) that boots the same Nest app on demand and reuses it across warm invocations, so behavior is otherwise identical to the Docker/Hostinger deployment.

Import the repo into a **separate** Vercel project with **Root Directory set to `apps/api`** (it needs its own project from `apps/web`, since they're different services). `apps/api/vercel.json` handles install/build/routing automatically — nothing to configure there. Set these environment variables on that project, then deploy:

- `DATABASE_URL`, `REDIS_URL` — must be reachable from Vercel's network, so `localhost` only works if the DB/Redis are also on Vercel-reachable infrastructure (a managed Postgres/Redis with a public or VPC-peered endpoint).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_SALT_ROUNDS`
- `CORS_ORIGIN` — the web app's Vercel URL (or your custom domain)
- `COOKIE_SAME_SITE=none` — required whenever the web app is on a different domain (see above); Vercel always serves over HTTPS, so this is safe to set unconditionally here
- Everything else from `.env.example` you actually use (payment gateway keys, `AI_INSIGHTS_PROVIDER`, etc.)

One thing serverless genuinely changes here, worth knowing rather than discovering under load: each cold-started function instance opens its own Postgres connection via Prisma, and unlike a persistent server there can be many instances running concurrently — a burst of traffic can exhaust your database's connection limit. If you hit `too many connections` errors, put a connection pooler in front of Postgres (e.g. your provider's built-in pooler/PgBouncer, or [Prisma Accelerate](https://www.prisma.io/accelerate)) and point `DATABASE_URL` at the pooled endpoint instead of the direct one.

## What's implemented

**Backend (`apps/api`)** — full REST API with global JWT auth guard, permission-based RBAC guard, Prisma-backed audit log on every mutating request, and Redis-cached report endpoints:

- **Auth** — access/refresh JWT pair, refresh token rotation + revocation, bcrypt password hashing, httpOnly refresh cookie
- **RBAC** — six system roles (Owner, Admin, Branch Manager, Cashier, Inventory Clerk, Accountant, Auditor) with a granular permission map (`packages/types/src/rbac.ts`), enforced per-route via `@RequirePermissions`
- **Organizations & branches** — multi-branch, users scoped to specific branches
- **Catalog & inventory** — categories, units, VAT rates, products, per-branch stock levels, full stock movement ledger, manual stock adjustments
- **Purchasing** — suppliers, purchase orders, partial/full goods receipt (auto stock-in + auto journal entry)
- **Sales / POS** — cash register sessions (open/close with cash reconciliation), cart checkout with per-line and order-level discounts, accurate VAT computation across mixed VAT-rate carts, multi-method split payments, sale void with full stock and accounting reversal
- **Accounting** — chart of accounts, double-entry journal auto-posted from every sale (revenue/VAT/COGS/inventory) and goods receipt (inventory/payables), per-account ledger with running balance
- **CRM** — customers, loyalty points, purchase history
- **Reports** — sales summary, VAT report, top products, inventory valuation, dashboard aggregate (cached)
- **AI insights** — heuristic reorder suggestions (sales-velocity based) and a 7-day sales forecast; if `ANTHROPIC_API_KEY` is set, a narrative summary is generated over the same computed numbers via the Claude API — the figures themselves always come from real transaction data, never from the model
- **Payments** — eSewa (ePay v2) and Khalti (ePayment v2) integration services, sandbox by default; wraps their real signed-form / initiate-lookup flows

**Frontend (`apps/web`)**:

- App shell with collapsible sidebar, branch switcher, dark/light theme (`next-themes`), ⌘K command palette, toast notifications
- **Dashboard** — KPI cards, sales trend + forecast chart, recent sales, low-stock count
- **POS terminal** — barcode-scan input, keyboard-first checkout (Ctrl/⌘+Enter), split payments, customer lookup, **offline-first**: failed network requests are queued in IndexedDB and auto-synced on reconnect
- **Inventory, Purchasing, Customers, Accounting, Reports, Settings** — full CRUD flows against the API above
- Bikram Sambat (BS) date support throughout via `packages/types/src/nepali-date.ts` (wraps `nepali-date-converter`)
- Currency/date formatting localized to `en-NP` / NPR

## Design notes & known gaps

This is a from-scratch build covering the full breadth of the brief; a few areas are intentionally scoped as solid foundations rather than fully hardened for production:

- **Payment gateway credentials** are sandbox placeholders (`.env.example`) — swap in real eSewa/Khalti merchant credentials before going live, and verify the callback/return-URL flow end-to-end against their sandbox.
- **Multi-tenant email uniqueness**: login resolves by email globally (not scoped to an org first) — fine for a single-organization deployment; a true multi-tenant SaaS would need a tenant-resolution step (subdomain/slug) ahead of login.
- **Offline queue** currently covers POS sale submission only; a full offline-first experience (product catalog caching, service worker asset precache) is a natural next iteration.
- **Testing**: the business logic was verified end-to-end manually against a real Postgres/Redis instance (auth → RBAC → POS checkout → stock deduction → double-entry accounting → void/reversal → purchasing → goods receipt), but there is no automated test suite yet — a good next step before production use.
- **Receipt/barcode printing**: the POS captures everything needed (line items, VAT breakdown, payments) to render a receipt; a dedicated print-formatted receipt view and barcode label generation are not yet wired up.
- **Accessibility**: components follow shadcn/ui/Radix primitives (which ship with correct ARIA semantics), and the app is keyboard-navigable, but a full WCAG audit hasn't been run.

## Scripts

```bash
pnpm dev             # run api + web in parallel
pnpm build            # build all workspaces
pnpm typecheck         # typecheck all workspaces
pnpm db:generate       # prisma generate
pnpm db:migrate        # prisma migrate dev
pnpm db:seed           # seed demo data
pnpm db:studio         # Prisma Studio
```
