import { describe, expect, it } from 'vitest';
import { isReasoningModel } from '@/server/config/models';

describe('isReasoningModel', () => {
  it('flags o-series reasoning models', () => {
    expect(isReasoningModel('o1')).toBe(true);
    expect(isReasoningModel('o1-mini')).toBe(true);
    expect(isReasoningModel('o3')).toBe(true);
    expect(isReasoningModel('o3-mini')).toBe(true);
    expect(isReasoningModel('o4-mini')).toBe(true);
  });

  it('flags the gpt-5.x family', () => {
    expect(isReasoningModel('gpt-5')).toBe(true);
    expect(isReasoningModel('gpt-5-mini')).toBe(true);
    expect(isReasoningModel('gpt-5.5')).toBe(true);
  });

  it('does not flag classic chat-completions models', () => {
    expect(isReasoningModel('gpt-4o')).toBe(false);
    expect(isReasoningModel('gpt-4o-mini')).toBe(false);
    expect(isReasoningModel('gpt-4.1')).toBe(false);
    expect(isReasoningModel('gpt-3.5-turbo')).toBe(false);
  });

  it('does not flag non-chat models it would never be called with', () => {
    expect(isReasoningModel('tts-1-hd')).toBe(false);
    expect(isReasoningModel('whisper-1')).toBe(false);
  });
});
