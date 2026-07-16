import { createLogger } from './logger';

const log = createLogger('retry');

export interface RetryOptions {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
  /** Return false to abort retrying immediately (e.g. on a 401 auth error). */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error: unknown): boolean {
  const status = (error as { status?: number; statusCode?: number })?.status ?? (error as { statusCode?: number })?.statusCode;
  if (status && [401, 403].includes(status)) return false;
  return true;
}

/**
 * Exponential backoff with jitter. Used to wrap every external call (OpenAI, Pexels, ffmpeg)
 * so a transient failure never crashes the app — per the "never crash" requirement.
 */
export async function retryWithBackoff<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, minDelayMs = 800, maxDelayMs = 12_000, label = 'operation', shouldRetry = defaultShouldRetry, onRetry } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries + 1;
      const message = error instanceof Error ? error.message : String(error);
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        log.error(`${label} failed permanently after ${attempt} attempt(s): ${message}`);
        throw error;
      }
      const backoff = Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * backoff * 0.25;
      const delay = Math.round(backoff + jitter);
      log.warn(`${label} failed (attempt ${attempt}/${retries + 1}): ${message}. Retrying in ${delay}ms.`);
      onRetry?.(error, attempt);
      await sleep(delay);
    }
  }
  throw lastError;
}
