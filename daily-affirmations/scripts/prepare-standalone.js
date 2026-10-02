#!/usr/bin/env node
// Next.js's `output: 'standalone'` build doesn't include the static asset bundle (.next/static)
// in .next/standalone/ — the docs call for copying it in manually before deploying/packaging.
// Runs between `next build` and `electron-builder` in the `electron:build` script.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, '.next', 'static');
const dest = path.join(root, '.next', 'standalone', '.next', 'static');

if (!fs.existsSync(src)) {
  console.error(`Expected ${src} to exist — run "next build" first.`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);

// `next build` copies .env into .next/standalone/.env — real installs are configured via the
// in-app Settings screen (stored outside the app entirely), not .env, so this should never
// ship. electron-builder.yml also excludes it; this is a second, packaging-tool-independent
// guarantee in case the standalone folder is ever packaged/zipped some other way.
const standaloneDir = path.join(root, '.next', 'standalone');
for (const envFile of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  const envPath = path.join(standaloneDir, envFile);
  if (fs.existsSync(envPath)) {
    fs.rmSync(envPath, { force: true });
    console.log(`Removed ${path.relative(root, envPath)} (dev secrets must never ship in the packaged app)`);
  }
}
