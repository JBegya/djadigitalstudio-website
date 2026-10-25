import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Next.js already loads .env/.env.local for anything served through `next dev`/`next start`.
// This is here so standalone scripts (scripts/smoke-test.ts, vitest) get the same values
// without needing Next's runtime. Safe to call more than once.
let loaded = false;
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

loadEnv();

export function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}
