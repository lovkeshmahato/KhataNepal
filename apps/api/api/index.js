// Vercel serverless entry point. This file is intentionally plain
// CommonJS, not TypeScript — Vercel's default function bundler transpiles
// TS with esbuild, which does not emit TypeScript's decorator metadata
// (`emitDecoratorMetadata`). NestJS's dependency injection depends on that
// metadata at runtime, so bundling the Nest app itself through esbuild
// silently breaks DI. Requiring the already-compiled `dist/` output (built
// by `nest build`, which uses the TypeScript compiler and emits metadata
// correctly) sidesteps that entirely — this file has nothing for esbuild
// to transform.
const { createApp } = require("../dist/create-app");

// Reused across warm invocations of the same function instance so the
// Nest app (and its Prisma/Redis connections) isn't rebuilt per request.
let cachedServer;

async function getServer() {
  if (!cachedServer) {
    const app = await createApp();
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

module.exports = async (req, res) => {
  const server = await getServer();
  server(req, res);
};
