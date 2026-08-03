// `next build` with `output: "standalone"` traces a minimal server + node_modules
// into `.next/standalone/`, but deliberately does NOT copy `public/` or
// `.next/static/` into it (documented Next.js behavior — see
// https://nextjs.org/docs/pages/api-reference/config/next-config-js/output).
// Shared hosts like Hostinger's Node.js App Selector run a single traced
// `server.js` directly (no Docker build step to do this copy for them), so
// this postbuild step makes the standalone output self-contained: after
// `npm run build`, `.next/standalone/server.js` can be started as-is with
// all its static assets in place.
const fs = require("node:fs");
const path = require("node:path");

const webDir = path.join(__dirname, "..");
const standaloneDir = path.join(webDir, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
  console.warn(`[copy-standalone-assets] ${standaloneDir} not found — is "output: standalone" set in next.config.ts?`);
  process.exit(0);
}

function copy(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`[copy-standalone-assets] copied ${path.relative(webDir, src)} -> ${path.relative(webDir, dest)}`);
}

copy(path.join(webDir, "public"), path.join(standaloneDir, "public"));
copy(path.join(webDir, ".next", "static"), path.join(standaloneDir, ".next", "static"));
