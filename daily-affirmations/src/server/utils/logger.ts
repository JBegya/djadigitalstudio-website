type Level = 'info' | 'warn' | 'error' | 'debug';

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: Level, scope: string, message: string, meta?: unknown): void {
  const line = `[${timestamp()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) {
    fn(line, meta);
  } else {
    fn(line);
  }
}

/** Scoped logger. Every service gets its own scope so pipeline logs stay readable. */
export function createLogger(scope: string) {
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
