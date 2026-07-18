import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

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

const VALID_AFFIRMATION =
  'You have carried more than anyone realizes tonight, and still you kept moving through every ' +
  'quiet hour. The weight of this work does not erase your worth or your care for the people ' +
  'who depend on you. Rest is allowed. Tomorrow you begin again, steady and whole.';

function validResponse(text = VALID_AFFIRMATION) {
  const outputText = JSON.stringify({ affirmation: text });
  return {
    status: 'completed',
    output_text: outputText,
    output: [{ type: 'message', content: [{ type: 'output_text', text: outputText }] }],
  };
}

describe('writeAffirmationScript (mocked OpenAI transport)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the local mock generator in Test Mode (no API key) without touching the network', async () => {
    const { writeAffirmationScript } = await import('@/server/ai-services/scriptWriter');
    state.responsesCreateImpl = async () => {
      throw new Error('should never be called in Test Mode');
    };
    const settings = { openaiApiKey: '' } as never;
    const result = await writeAffirmationScript({ brand: 'nurse', topicKey: 'running-empty', settings, avoidExamples: [] });
    expect(result.source).toBe('mock');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('recovers from a transient 503 and returns the validated affirmation', async () => {
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      if (calls === 1) throw apiError(503, { 'retry-after': '0' });
      return validResponse();
    };
    const { writeAffirmationScript } = await import('@/server/ai-services/scriptWriter');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await writeAffirmationScript({ brand: 'nurse', topicKey: 'running-empty', settings, avoidExamples: [] });
    expect(result.source).toBe('openai');
    expect(result.text).toBe(VALID_AFFIRMATION);
    expect(calls).toBe(2);
  }, 15_000);

  it('fails fast on a 401 auth error without retrying', async () => {
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      throw apiError(401);
    };
    const { writeAffirmationScript } = await import('@/server/ai-services/scriptWriter');
    const settings = { openaiApiKey: 'sk-bad-key' } as never;
    await expect(
      writeAffirmationScript({ brand: 'nurse', topicKey: 'running-empty', settings, avoidExamples: [] }),
    ).rejects.toThrow('HTTP 401');
    // One content-attempt loop iteration, one underlying HTTP call — no retries, no repeat attempts.
    expect(calls).toBe(1);
  });

  it('fails fast on a 400 unsupported-parameter error without retrying', async () => {
    // Regression test for the real-world failure this migration fixed: a reasoning-tier model
    // (e.g. gpt-5.5) rejecting an unsupported sampling parameter with a 400. Retrying an
    // identically-malformed request would never succeed, so this must surface immediately.
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      throw apiError(400);
    };
    const { writeAffirmationScript } = await import('@/server/ai-services/scriptWriter');
    const settings = { openaiApiKey: 'sk-test' } as never;
    await expect(
      writeAffirmationScript({ brand: 'nurse', topicKey: 'running-empty', settings, avoidExamples: [] }),
    ).rejects.toThrow('HTTP 400');
    expect(calls).toBe(1);
  });

  it('rejects a response that violates content rules (banned phrase) and asks the model again', async () => {
    let calls = 0;
    state.responsesCreateImpl = async () => {
      calls += 1;
      // First reply uses a banned phrase; second is clean — proves the content-validation retry
      // loop (separate from the HTTP retry layer) actually re-requests instead of accepting it.
      return calls === 1 ? validResponse(`${VALID_AFFIRMATION} You got this.`) : validResponse();
    };
    const { writeAffirmationScript } = await import('@/server/ai-services/scriptWriter');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await writeAffirmationScript({ brand: 'nurse', topicKey: 'running-empty', settings, avoidExamples: [] });
    expect(result.text).toBe(VALID_AFFIRMATION);
    expect(result.attempts).toBe(2);
    expect(calls).toBe(2);
  });
});
