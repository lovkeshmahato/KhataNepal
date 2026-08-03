# KhataNepal

An enterprise point-of-sale and retail management platform for Nepali supermarkets — multi-branch inventory, purchasing, POS checkout, CRM, double-entry accounting, VAT billing, and AI-assisted reordering.

This repo contains **two completely independent applications** — they don't share a package manager, a build step, or any code at install time. Each one can be installed, built, and deployed entirely on its own with plain `npm`.

```
apps/
  api/   NestJS backend  — REST API, Prisma schema, business logic
  web/   Next.js frontend — the site people actually browse to (POS terminal, dashboard, etc.)
```

## Stack

| | Technology |
|---|---|
| **apps/web** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui-style components, Framer Motion, TanStack Query, Zustand |
| **apps/api** | NestJS 11, Prisma 6, PostgreSQL, Redis (ioredis), Passport JWT |

## Running locally

Each app has its own `.env` — copy the example, fill in real values, then install and run:

```bash
# Terminal 1 — API
cd apps/api
cp .env.example .env          # edit DATABASE_URL / JWT secrets
npm install
npm run prisma:migrate        # creates the database schema (first run only)
npm run prisma:seed           # demo org, branches, roles, users, catalog, opening stock
npm run dev                   # http://localhost:4000/api/v1 (docs at /api/v1/docs)

# Terminal 2 — Web
cd apps/web
cp .env.example .env          # edit NEXT_PUBLIC_API_URL if the API isn't on localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

You need PostgreSQL and Redis running (locally, or via `docker compose up -d postgres redis` from the repo root).

### Demo accounts

Seeded by `apps/api/prisma/seed.ts`, password `ChangeMe123!` for all:

| Role | Email |
|---|---|
| Owner | owner@khatanepal.demo |
| Branch Manager | manager@khatanepal.demo |
| Cashier | cashier@khatanepal.demo |
| Inventory Clerk | inventory@khatanepal.demo |
| Accountant | accountant@khatanepal.demo |

## Deploying on Hostinger with auto-deploy from GitHub

This is the intended, "no hassle" path for this project. It has two pieces that are easy to mix up, so here's the mental model first:

- **GitHub** always has the latest code (Claude/your developer pushes here).
- **Hostinger** has a "Git" feature that watches a GitHub repo and automatically pulls + redeploys every time new code is pushed to a chosen branch. You turn this on once, per app, in hPanel — after that, deployment really is automatic.

Because this is a two-service app, you need **two separate things in Hostinger**, each pointed at a different subfolder of the same GitHub repo: one for the API, one for the website.

### Step 1 — Connect the repo to Hostinger (once per app)

In **hPanel → Websites → Git** (or **Advanced → Git**, depending on your plan):

1. Click **Create a new repository** / **Connect repository**.
2. Choose **GitHub**, authorize Hostinger to access your account if asked, and select this repository.
3. Set the **branch** to deploy from (e.g. `main` or whichever branch you want live).
4. Turn on **auto-deploy** (sometimes called "Automatic deployment" or a webhook toggle) so it redeploys on every push — this is the setting that makes it "automatic."

Do this **twice** — once for the API, once for the website — since they run as two separate apps (see Step 2). If Hostinger's Git tool only lets you deploy a whole repo into one folder, that's fine: point both app entries in Step 2 at that same cloned folder and use the **Application Root** setting there to tell each one which subfolder (`apps/api` or `apps/web`) it should actually run from.

### Step 2 — Create the two Node.js apps

In **hPanel → Advanced → Node.js**, create an app for each service:

| | Application root | Install command | Build command | Application startup file |
|---|---|---|---|---|
| **API** | `apps/api` | `npm install` | `npm run build` | `apps/api/dist/main.js` (relative to Application root: `dist/main.js`) |
| **Website** | `apps/web` | `npm install` | `npm run build` | `apps/web/.next/standalone/server.js` (relative to Application root: `.next/standalone/server.js`) |

For each app, set its environment variables (see `.env.example` in that app's folder) — at minimum:

**API**: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` (the website's URL, e.g. `https://app.yourdomain.com`)

**Website**: `NEXT_PUBLIC_API_URL` (the API's URL + `/api/v1`, e.g. `https://api.yourdomain.com/api/v1`)

After saving, hit **Restart**/**Start** on each app — a finished build does not automatically mean the app is running.

### Troubleshooting

- **A 403 page saying "Access to this resource on the server is denied!"** — that's the web server's own error page, not this app's. It means no Node process is bound to that domain yet. Double-check the startup file path and hit Restart.
- **Build fails with a pnpm/turbo error** — shouldn't happen anymore; both apps only use `npm`, nothing else. If you see `pnpm` or `turbo` mentioned in an error, you're likely looking at build settings left over from an older deploy attempt — recheck the install/build commands above.
- **Login "succeeds" but you're logged out again right away** — means the API's `CORS_ORIGIN` doesn't exactly match the website's URL, or the API isn't being served over HTTPS. Both are required for the login cookie to work once the site and API are on different domains.

## Docker (self-hosting anywhere else)

```bash
cp .env.example .env                  # Postgres/Redis container settings
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d --build
```

Runs Postgres, Redis, the API (:4000, runs pending migrations on boot), and the website (:3000). Each Dockerfile only looks inside its own `apps/api` or `apps/web` folder — same npm-only build as above.

## What's implemented

**Backend (`apps/api`)** — full REST API with global JWT auth guard, permission-based RBAC guard, Prisma-backed audit log on every mutating request, and Redis-cached report endpoints:

- **Auth** — access/refresh JWT pair, refresh token rotation + revocation, bcrypt password hashing, httpOnly refresh cookie
- **RBAC** — six system roles (Owner, Admin, Branch Manager, Cashier, Inventory Clerk, Accountant, Auditor) with a granular permission map (`apps/api/src/shared-types/rbac.ts`), enforced per-route via `@RequirePermissions`
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
- Bikram Sambat (BS) date support throughout via `apps/web/src/lib/shared-types/nepali-date.ts` (wraps `nepali-date-converter`)
- Currency/date formatting localized to `en-NP` / NPR

### A note on the duplicated `shared-types` folder

`apps/api/src/shared-types/` and `apps/web/src/lib/shared-types/` contain the same RBAC permission map, zod validation schemas, and enum definitions — deliberately copy-pasted rather than shared via an internal package. That's a trade-off made specifically for this deployment: a shared internal package needs a monorepo tool (pnpm workspaces, Turborepo, etc.) to build and link it, which is exactly the extra moving part that kept breaking on Hostinger's build environment (pnpm version pinning, native binary permissions, `pnpm` not being on `PATH` during the build phase). Duplicating a few hundred lines of type definitions is a small, honest cost for "each app is 100% standalone and only needs `npm install && npm run build`."

If you change a permission name, a zod schema, or an enum, update it in **both** copies.

## Design notes & known gaps

This is a from-scratch build covering the full breadth of the brief; a few areas are intentionally scoped as solid foundations rather than fully hardened for production:

- **Payment gateway credentials** are sandbox placeholders (`.env.example`) — swap in real eSewa/Khalti merchant credentials before going live, and verify the callback/return-URL flow end-to-end against their sandbox.
- **Multi-tenant email uniqueness**: login resolves by email globally (not scoped to an org first) — fine for a single-organization deployment; a true multi-tenant SaaS would need a tenant-resolution step (subdomain/slug) ahead of login.
- **Offline queue** currently covers POS sale submission only; a full offline-first experience (product catalog caching, service worker asset precache) is a natural next iteration.
- **Testing**: the business logic was verified end-to-end manually against a real Postgres/Redis instance (auth → RBAC → POS checkout → stock deduction → double-entry accounting → void/reversal → purchasing → goods receipt), but there is no automated test suite yet — a good next step before production use.
- **Receipt/barcode printing**: the POS captures everything needed (line items, VAT breakdown, payments) to render a receipt; a dedicated print-formatted receipt view and barcode label generation are not yet wired up.
- **Accessibility**: components follow shadcn/ui/Radix primitives (which ship with correct ARIA semantics), and the app is keyboard-navigable, but a full WCAG audit hasn't been run.

## Scripts

Each app has its own scripts — run them from inside `apps/api` or `apps/web`:

```bash
npm run dev             # local dev server
npm run build            # production build
npm run typecheck         # TypeScript check, no emit
npm run start             # run the production build (apps/api only; apps/web use start:standalone on a host)
```

`apps/api` additionally has: `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:seed`, `prisma:studio`.
