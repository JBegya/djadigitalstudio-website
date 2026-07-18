import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const state = vi.hoisted(() => ({
  speechCreateImpl: async (..._args: unknown[]): Promise<unknown> => {
    throw new Error('speechCreateImpl not configured for this test');
  },
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = { speech: { create: (...args: unknown[]) => state.speechCreateImpl(...args) } };
  },
}));

function apiError(status: number, headers?: HeadersInit) {
  const err = new Error(`HTTP ${status}`) as Error & { status: number; headers?: Headers };
  err.status = status;
  if (headers) err.headers = new Headers(headers);
  return err;
}

function fakeAudioResponse(byteLength: number) {
  return { arrayBuffer: async () => new ArrayBuffer(byteLength) };
}

describe('generateVoice (mocked OpenAI transport)', () => {
  let outputPath: string;

  beforeEach(() => {
    vi.resetModules();
    outputPath = path.join(os.tmpdir(), `dja-voice-test-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(outputPath, { force: true });
  });

  it('fails fast on a 401 auth error without retrying', async () => {
    let calls = 0;
    state.speechCreateImpl = async () => {
      calls += 1;
      throw apiError(401);
    };
    const { generateVoice } = await import('@/server/ai-services/voiceGenerator');
    const settings = { openaiApiKey: 'sk-bad-key' } as never;
    await expect(
      generateVoice({ brand: 'nurse', text: 'hello', voice: 'warm-female', settings, outputPath }),
    ).rejects.toThrow('HTTP 401');
    expect(calls).toBe(1);
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it('exhausts retries and throws on a persistent 500', async () => {
    let calls = 0;
    state.speechCreateImpl = async () => {
      calls += 1;
      throw apiError(500);
    };
    const { generateVoice } = await import('@/server/ai-services/voiceGenerator');
    const settings = { openaiApiKey: 'sk-test' } as never;
    await expect(
      generateVoice({ brand: 'nurse', text: 'hello', voice: 'warm-female', settings, outputPath }),
    ).rejects.toThrow('HTTP 500');
    expect(calls).toBe(4); // initial attempt + 3 retries (the retries:3 hardcoded at this call site)
  }, 30_000);

  it('rejects a suspiciously small "successful" response instead of writing a near-empty file', async () => {
    state.speechCreateImpl = async () => fakeAudioResponse(100); // far below MIN_PLAUSIBLE_AUDIO_BYTES
    const { generateVoice } = await import('@/server/ai-services/voiceGenerator');
    const settings = { openaiApiKey: 'sk-test' } as never;
    await expect(
      generateVoice({ brand: 'nurse', text: 'hello', voice: 'warm-female', settings, outputPath }),
    ).rejects.toThrow(/suspiciously little audio data/);
    expect(fs.existsSync(outputPath)).toBe(false);
  }, 30_000);
});
