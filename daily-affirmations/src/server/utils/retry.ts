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

/** Reads an HTTP status off the shapes both the OpenAI SDK and plain `fetch` errors use. */
export function getErrorStatus(error: unknown): number | undefined {
  const err = error as { status?: number; statusCode?: number; response?: { status?: number } };
  return err?.status ?? err?.statusCode ?? err?.response?.status;
}

/** Reads a `Retry-After` header (seconds or HTTP-date form) off an SDK/fetch error, if present. */
export function getRetryAfterMs(error: unknown): number | null {
  const err = error as { headers?: unknown; response?: { headers?: unknown } };
  const headers = err?.headers ?? err?.response?.headers;
  if (!headers) return null;

  let raw: string | null | undefined;
  if (typeof (headers as Headers).get === 'function') {
    raw = (headers as Headers).get('retry-after');
  } else if (typeof headers === 'object') {
    raw = (headers as Record<string, string>)['retry-after'] ?? (headers as Record<string, string>)['Retry-After'];
  }
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

// Client errors that retrying will never fix: bad auth, malformed request, not found,
// unprocessable content. Everything else (429 rate limits, 5xx, network drops, timeouts) is
// worth retrying.
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 422]);

function defaultShouldRetry(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status && NON_RETRYABLE_STATUSES.has(status)) return false;
  return true;
}

// Cap how long we'll honor a server's requested Retry-After — a misbehaving upstream asking
// for a 10-minute wait shouldn't stall an entire video job.
const MAX_RETRY_AFTER_MS = 60_000;

/**
 * Exponential backoff with jitter, upgraded to respect a server's `Retry-After` header when
 * present (rate limits especially). Used to wrap every external call (OpenAI, Pexels, ffmpeg)
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
      const status = getErrorStatus(error);
      const message = error instanceof Error ? error.message : String(error);
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        log.error(`${label} failed permanently after ${attempt} attempt(s)${status ? ` (HTTP ${status})` : ''}: ${message}`);
        throw error;
      }

      const retryAfter = getRetryAfterMs(error);
      const backoff = Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * backoff * 0.25;
      const delay = retryAfter !== null ? Math.min(retryAfter, MAX_RETRY_AFTER_MS) : Math.round(backoff + jitter);

      log.warn(
        `${label} failed (attempt ${attempt}/${retries + 1}${status ? `, HTTP ${status}` : ''}): ${message}. Retrying in ${delay}ms${retryAfter !== null ? ' (server-requested)' : ''}.`,
      );
      onRetry?.(error, attempt);
      await sleep(delay);
    }
  }
  throw lastError;
}
