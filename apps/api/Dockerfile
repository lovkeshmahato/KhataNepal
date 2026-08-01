# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo

# ─── Install dependencies (cached layer) ───────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @khatanepal/api...

# ─── Build ──────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /repo /repo
COPY packages/types packages/types
COPY apps/api apps/api
RUN pnpm --filter @khatanepal/api prisma:generate
RUN pnpm --filter @khatanepal/api build

# ─── Runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/packages/types packages/types
RUN pnpm install --frozen-lockfile --prod --filter @khatanepal/api...

COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/node_modules/.prisma apps/api/node_modules/.prisma

WORKDIR /repo/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://localhost:4000/api/v1/health || exit 1
CMD ["sh", "-c", "pnpm prisma:deploy && node dist/main.js"]
