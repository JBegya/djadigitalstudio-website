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

function apiError(status: number) {
  const err = new Error(`HTTP ${status}`) as Error & { status: number };
  err.status = status;
  return err;
}

function judgeResponse(overrides: Partial<Record<string, unknown>> = {}) {
  const payload = {
    emotionalAuthenticity: 9,
    humanWarmth: 9,
    comfort: 9,
    emotionalImpact: 9,
    shareability: 8,
    believable: true,
    reasoning: 'Reads like a real nurse talking to another nurse.',
    ...overrides,
  };
  const outputText = JSON.stringify(payload);
  return {
    status: 'completed',
    output_text: outputText,
    output: [{ type: 'message', content: [{ type: 'output_text', text: outputText }] }],
  };
}

describe('judgeEmotionalAuthenticity (mocked OpenAI transport)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the heuristic judge in Test Mode (no API key) without touching the network, and never gates on believability', async () => {
    const { judgeEmotionalAuthenticity } = await import('@/server/ai-services/emotionalJudge');
    state.responsesCreateImpl = async () => {
      throw new Error('should never be called in Test Mode');
    };
    const settings = { openaiApiKey: '' } as never;
    const result = await judgeEmotionalAuthenticity('nurse', 'placeholder script', settings);
    expect(result.source).toBe('heuristic');
    expect(result.believable).toBe(true);
  });

  it('returns the real judgment when the model finds the script believable', async () => {
    state.responsesCreateImpl = async () => judgeResponse({ believable: true });
    const { judgeEmotionalAuthenticity } = await import('@/server/ai-services/emotionalJudge');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await judgeEmotionalAuthenticity('nurse', 'a real script', settings);
    expect(result.source).toBe('openai');
    expect(result.believable).toBe(true);
    expect(result.emotionalAuthenticity).toBe(9);
    expect(result.shareability).toBe(8);
  });

  it('surfaces believable:false so the quality engine can gate on it', async () => {
    state.responsesCreateImpl = async () =>
      judgeResponse({ believable: false, reasoning: 'Reads like a generic wellness brand, not a real nurse.' });
    const { judgeEmotionalAuthenticity } = await import('@/server/ai-services/emotionalJudge');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await judgeEmotionalAuthenticity('nurse', 'a generic script', settings);
    expect(result.believable).toBe(false);
    expect(result.reasoning).toContain('generic wellness brand');
  });

  it('falls back to the heuristic (and never throws) if the judge call fails after retries', async () => {
    state.responsesCreateImpl = async () => {
      throw apiError(500);
    };
    const { judgeEmotionalAuthenticity } = await import('@/server/ai-services/emotionalJudge');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await judgeEmotionalAuthenticity('autism', 'a script', settings);
    expect(result.source).toBe('heuristic');
    expect(result.believable).toBe(true);
  }, 30_000);

  it('clamps out-of-range scores into 0-10', async () => {
    state.responsesCreateImpl = async () => judgeResponse({ emotionalAuthenticity: 15, shareability: -3 });
    const { judgeEmotionalAuthenticity } = await import('@/server/ai-services/emotionalJudge');
    const settings = { openaiApiKey: 'sk-test' } as never;
    const result = await judgeEmotionalAuthenticity('nurse', 'a script', settings);
    expect(result.emotionalAuthenticity).toBe(10);
    expect(result.shareability).toBe(0);
  });
});
