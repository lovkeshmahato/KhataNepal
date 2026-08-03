# syntax=docker/dockerfile:1
# Self-contained build — this Dockerfile only ever looks inside apps/api.
# Build from the repo root with: docker build -f apps/api/Dockerfile apps/api

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the full node_modules from the build stage rather than reinstalling
# production-only deps here — this keeps the `prisma` CLI (a devDependency,
# needed at container startup for `prisma migrate deploy`) available
# without a network round-trip to npm at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://localhost:4000/api/v1/health || exit 1
CMD ["sh", "-c", "npm run prisma:deploy && node dist/main.js"]
