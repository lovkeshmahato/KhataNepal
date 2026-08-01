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
