import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { normalizeHashtagCount } from '@/server/ai-services/socialCopyWriter';

describe('normalizeHashtagCount', () => {
  it('passes through exactly 30 clean, unique, #-prefixed hashtags unchanged', () => {
    const input = Array.from({ length: 30 }, (_, i) => `#tag${i}`);
    expect(normalizeHashtagCount('nurse', input)).toEqual(input);
  });

  it('adds a missing # prefix and strips internal whitespace', () => {
    const input = ['nurselife', '# night shift', ...Array.from({ length: 28 }, (_, i) => `#tag${i}`)];
    const result = normalizeHashtagCount('nurse', input);
    expect(result).toHaveLength(30);
    expect(result).toContain('#nurselife');
    expect(result).toContain('#nightshift');
  });

  it('truncates to 30 when the model returns more', () => {
    const input = Array.from({ length: 40 }, (_, i) => `#tag${i}`);
    const result = normalizeHashtagCount('nurse', input);
    expect(result).toHaveLength(30);
    expect(result).toEqual(input.slice(0, 30));
  });

  it('dedupes repeated hashtags before counting', () => {
    const input = [...Array.from({ length: 20 }, (_, i) => `#tag${i}`), ...Array.from({ length: 20 }, (_, i) => `#tag${i}`)];
    const result = normalizeHashtagCount('nurse', input);
    expect(result).toHaveLength(30); // 20 unique + 10 brand-fallback padding
    expect(new Set(result).size).toBe(30);
  });

  it('pads with brand-specific fallbacks (no duplicates) when the model returns too few', () => {
    const result = normalizeHashtagCount('autism', ['#onlyone']);
    expect(result).toHaveLength(30);
    expect(result[0]).toBe('#onlyone');
    expect(new Set(result).size).toBe(30);
  });

  it('drops empty/degenerate entries like a lone "#"', () => {
    const input = ['#', '', '#real', ...Array.from({ length: 28 }, (_, i) => `#tag${i}`)];
    const result = normalizeHashtagCount('nurse', input);
    expect(result).toContain('#real');
    expect(result).not.toContain('#');
    expect(result).toHaveLength(30);
  });
});

// --- End-to-end retry/error-classification behavior through the real OpenAI call site ---
// These use a hoisted, reassignable mock so the module-level OpenAI client cache in
// openaiClient.ts doesn't leak state between tests — see responsesCreateImpl below.
const state = vi.hoisted(() => ({
  responsesCreateImpl: async (..._args: unknown[]): Promise<unknown> => {
    throw new Error('responsesCreateImpl not configured for this test');
  },
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    responses = { create: (...args: unknown[]) => state.responsesCreateImpl(...args) };
  },
}));

function apiError(status: number, headers?: HeadersInit) {
  const err = new Error(`HTTP ${status}`) as Error & { status: number; headers?: Headers };
  err.status = status;
  if (headers) err.headers = new Headers(headers);
  return err;
}

function validResponse() {
  const outputText = JSON.stringify({
    facebook: 'A gentle reminder for your shift today.',
    instagram: 'You are doing better than you think.\n\nBreathe.',
    tiktok: 'POV: you needed to hear this today.',
    youtube_shorts: 'Part of our daily affirmations series for nurses.',
    hashtags: Array.from({ length: 30 }, (_, i) => `#tag${i}`),
    thumbnail_hook: 'You Are Doing Enough',
  });
  return {
    status: 'completed',
    output_text: outputText,
    output: [{ type: 'message', content: [{ type: 'output_text', text: outputText }] }],
  };
}

describe('writeSocialCopy (mocked OpenAI transport)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the local mock generator in Test Mode (no API key) without touching the network', async () => {
    const { writeSocialCopy } = await import('@/server/ai-services/socialCopyWriter');
    state.responsesCreateImpl = async () => {
      throw new Error('should never be called in Test Mode');
    };
    const settings = { openaiApiKey: '' } as never;
    const result = await writeSocialCopy({ brand: 'nurse', topicLabel: 'Burnout', affirmationText: 'x', settings });
    expect(result.source).toBe('mock');
    expect(result.hashtags).toHaveLength(30);
  });

  it('recovers from a transient 429 (with Retry-After) and returns the parsed captions', async () => {
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      if (calls === 1) throw apiError(429, { 'retry-after': '0' });
      return validResponse();
    };
    const { writeSocialCopy } = await import('@/server/ai-services/socialCopyWriter');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await writeSocialCopy({ brand: 'nurse', topicLabel: 'Burnout', affirmationText: 'x', settings });
    expect(result.source).toBe('openai');
    expect(calls).toBe(2);
    expect(result.captions.facebook).toContain('gentle reminder');
    expect(result.hashtags).toHaveLength(30);
    expect(result.thumbnailHook).toBe('You Are Doing Enough');
  }, 15_000);

  it('fails fast on a 401 auth error without retrying', async () => {
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      throw apiError(401);
    };
    const { writeSocialCopy } = await import('@/server/ai-services/socialCopyWriter');
    const settings = { openaiApiKey: 'sk-bad-key' } as never;
    await expect(writeSocialCopy({ brand: 'nurse', topicLabel: 'Burnout', affirmationText: 'x', settings })).rejects.toThrow('HTTP 401');
    expect(calls).toBe(1);
  });

  it('fails fast on a 400 unsupported-parameter error without retrying', async () => {
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      throw apiError(400);
    };
    const { writeSocialCopy } = await import('@/server/ai-services/socialCopyWriter');
    const settings = { openaiApiKey: 'sk-test' } as never;
    await expect(writeSocialCopy({ brand: 'nurse', topicLabel: 'Burnout', affirmationText: 'x', settings })).rejects.toThrow('HTTP 400');
    expect(calls).toBe(1);
  });

  it('surfaces a clear error when the model returns malformed JSON, after exhausting retries', async () => {
    state.responsesCreateImpl = async () => ({ status: 'completed', output_text: '{not valid', output: [] });
    const { writeSocialCopy } = await import('@/server/ai-services/socialCopyWriter');
    const settings = { openaiApiKey: 'sk-test' } as never;
    await expect(writeSocialCopy({ brand: 'nurse', topicLabel: 'Burnout', affirmationText: 'x', settings })).rejects.toThrow(
      /malformed JSON/,
    );
  }, 30_000);
});
