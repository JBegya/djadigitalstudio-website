import { describe, expect, it, vi } from 'vitest';
import { getErrorStatus, getRetryAfterMs, retryWithBackoff } from '@/server/utils/retry';

function httpError(status: number, headers?: HeadersInit): Error & { status: number; headers?: Headers } {
  const err = new Error(`HTTP ${status}`) as Error & { status: number; headers?: Headers };
  err.status = status;
  if (headers) err.headers = new Headers(headers);
  return err;
}

describe('getErrorStatus', () => {
  it('reads .status', () => {
    expect(getErrorStatus({ status: 429 })).toBe(429);
  });

  it('reads .statusCode', () => {
    expect(getErrorStatus({ statusCode: 500 })).toBe(500);
  });

  it('reads .response.status (fetch/axios-style)', () => {
    expect(getErrorStatus({ response: { status: 403 } })).toBe(403);
  });

  it('returns undefined when no status is present', () => {
    expect(getErrorStatus(new Error('network drop'))).toBeUndefined();
    expect(getErrorStatus(null)).toBeUndefined();
    expect(getErrorStatus('a string error')).toBeUndefined();
  });
});

describe('getRetryAfterMs', () => {
  it('parses a numeric seconds value from a Headers instance', () => {
    const err = { headers: new Headers({ 'retry-after': '2' }) };
    expect(getRetryAfterMs(err)).toBe(2000);
  });

  it('parses a numeric seconds value from a plain header object', () => {
    expect(getRetryAfterMs({ headers: { 'retry-after': '5' } })).toBe(5000);
    expect(getRetryAfterMs({ headers: { 'Retry-After': '5' } })).toBe(5000);
  });

  it('reads headers nested under .response.headers', () => {
    expect(getRetryAfterMs({ response: { headers: { 'retry-after': '3' } } })).toBe(3000);
  });

  it('parses an HTTP-date form and clamps to non-negative', () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const ms = getRetryAfterMs({ headers: { 'retry-after': future } });
    expect(ms).not.toBeNull();
    expect(ms as number).toBeGreaterThan(0);
    expect(ms as number).toBeLessThanOrEqual(10_100);
  });

  it('returns null when there is no header at all', () => {
    expect(getRetryAfterMs({})).toBeNull();
    expect(getRetryAfterMs(new Error('boom'))).toBeNull();
  });

  it('returns null for an unparseable value', () => {
    expect(getRetryAfterMs({ headers: { 'retry-after': 'not-a-number-or-date' } })).toBeNull();
  });
});

describe('retryWithBackoff', () => {
  it('returns the result immediately on first-attempt success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { label: 'test', retries: 3, minDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient 500 and succeeds on a later attempt', async () => {
    const fn = vi.fn().mockRejectedValueOnce(httpError(500)).mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce('recovered');
    const result = await retryWithBackoff(fn, { label: 'test', retries: 3, minDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 401 auth failure — fails on the first attempt', async () => {
    const fn = vi.fn().mockRejectedValue(httpError(401));
    await expect(retryWithBackoff(fn, { label: 'test', retries: 3, minDelayMs: 1, maxDelayMs: 2 })).rejects.toThrow('HTTP 401');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 400/403/404/422 either', async () => {
    for (const status of [400, 403, 404, 422]) {
      const fn = vi.fn().mockRejectedValue(httpError(status));
      await expect(retryWithBackoff(fn, { label: 'test', retries: 3, minDelayMs: 1, maxDelayMs: 2 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('exhausts all retries on a persistent 429 and throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(httpError(429));
    await expect(retryWithBackoff(fn, { label: 'test', retries: 2, minDelayMs: 1, maxDelayMs: 2 })).rejects.toThrow('HTTP 429');
    expect(fn).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
  });

  it('retries a network-level error with no status at all (e.g. a timeout)', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce('ok');
    const result = await retryWithBackoff(fn, { label: 'test', retries: 3, minDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('honors a Retry-After header by delaying roughly that long before the next attempt', async () => {
    const fn = vi.fn().mockRejectedValueOnce(httpError(429, { 'retry-after': '1' })).mockResolvedValueOnce('ok');
    const started = Date.now();
    const result = await retryWithBackoff(fn, { label: 'test', retries: 3, minDelayMs: 1, maxDelayMs: 2 });
    const elapsed = Date.now() - started;
    expect(result).toBe('ok');
    expect(elapsed).toBeGreaterThanOrEqual(950); // ~1000ms Retry-After, not the 1-2ms backoff config
  });

  it('caps an excessive Retry-After request at MAX_RETRY_AFTER_MS instead of waiting the full amount', async () => {
    // The header asks for a 10-minute wait; the real cap is 60s. Using fake timers proves the
    // cap actually applies (the retry fires once 60s of virtual time has passed, not 600s)
    // without the test itself waiting anywhere near that long in real time.
    vi.useFakeTimers();
    try {
      const fn = vi.fn().mockRejectedValueOnce(httpError(429, { 'retry-after': '600' })).mockResolvedValueOnce('ok');
      const promise = retryWithBackoff(fn, { label: 'test', retries: 1, minDelayMs: 1, maxDelayMs: 2 });
      await vi.advanceTimersByTimeAsync(60_001);
      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  }, 10_000);

  it('a custom shouldRetry can override the default classification', async () => {
    const fn = vi.fn().mockRejectedValue(httpError(200)); // pretend "200" is retryable-looking but we say no
    const shouldRetry = vi.fn().mockReturnValue(false);
    await expect(
      retryWithBackoff(fn, { label: 'test', retries: 5, minDelayMs: 1, maxDelayMs: 2, shouldRetry }),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });
});
