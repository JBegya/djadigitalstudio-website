import fs from 'node:fs';
import path from 'node:path';
import { getUserDataDir } from '@/server/config/paths';

type Level = 'info' | 'warn' | 'error' | 'debug';

// One file per day so a long-running install doesn't accumulate one unbounded log, with old
// files pruned automatically — this is the only place a packaged Electron app's logs live
// (there's no visible console once it's not launched from a terminal), so it needs to survive
// on its own without manual cleanup.
const LOG_RETENTION_DAYS = 14;
let prunedOldLogsOnce = false;

function getLogsDir(): string {
  const dir = path.join(getUserDataDir(), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function todayLogFilePath(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(getLogsDir(), `dja-${stamp}.log`);
}

function pruneOldLogsOnce(): void {
  if (prunedOldLogsOnce) return;
  prunedOldLogsOnce = true;
  try {
    const dir = getLogsDir();
    const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).mtimeMs < cutoff) fs.rmSync(fullPath, { force: true });
    }
  } catch {
    // Log housekeeping must never be why the app fails to start.
  }
}

function safeStringify(meta: unknown): string {
  if (typeof meta === 'string') return meta;
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function appendToFile(line: string): void {
  try {
    fs.appendFileSync(todayLogFilePath(), `${line}\n`, 'utf-8');
  } catch {
    // A failed log write must never crash — and must never itself get logged (avoid recursion).
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: Level, scope: string, message: string, meta?: unknown): void {
  const line = `[${timestamp()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) {
    fn(line, meta);
    appendToFile(`${line} ${safeStringify(meta)}`);
  } else {
    fn(line);
    appendToFile(line);
  }
}

/** Scoped logger. Every service gets its own scope so pipeline logs stay readable. */
export function createLogger(scope: string) {
  pruneOldLogsOnce();
  return {
    info: (message: string, meta?: unknown) => write('info', scope, message, meta),
    warn: (message: string, meta?: unknown) => write('warn', scope, message, meta),
    error: (message: string, meta?: unknown) => write('error', scope, message, meta),
    debug: (message: string, meta?: unknown) => {
      if (process.env.DJA_DEBUG) write('debug', scope, message, meta);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

/** Absolute path to today's log file — used by the "Open Logs Folder" affordance in Settings. */
export function getLogsDirectory(): string {
  return getLogsDir();
}
