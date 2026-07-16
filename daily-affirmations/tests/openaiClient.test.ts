import { describe, expect, it } from 'vitest';
import { parseStructuredCompletion } from '@/server/ai-services/openaiClient';

function completion(choices: Array<{ message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }>) {
  return { choices };
}

describe('parseStructuredCompletion', () => {
  it('parses valid JSON content into the expected shape', () => {
    const result = parseStructuredCompletion<{ affirmation: string }>(
      completion([{ message: { content: '{"affirmation":"You are enough."}' } }]),
      'test',
    );
    expect(result).toEqual({ affirmation: 'You are enough.' });
  });

  it('throws a clear error when there are no choices at all', () => {
    expect(() => parseStructuredCompletion(completion([]), 'the nurse script')).toThrow(/no choices for the nurse script/);
  });

  it('throws when the model refused the request', () => {
    expect(() =>
      parseStructuredCompletion(completion([{ message: { refusal: "I can't help with that." } }]), 'the autism script'),
    ).toThrow(/declined to generate the autism script.*can't help with that/);
  });

  it('throws when the response was truncated by the token limit', () => {
    expect(() =>
      parseStructuredCompletion(completion([{ message: { content: '{"partial":' }, finish_reason: 'length' }]), 'captions'),
    ).toThrow(/truncated \(hit the token limit\)/);
  });

  it('throws when content is empty or missing', () => {
    expect(() => parseStructuredCompletion(completion([{ message: { content: '' } }]), 'x')).toThrow(/empty response for x/);
    expect(() => parseStructuredCompletion(completion([{ message: {} }]), 'x')).toThrow(/empty response for x/);
    expect(() => parseStructuredCompletion(completion([{}]), 'x')).toThrow(/empty response for x/);
  });

  it('throws a malformed-JSON error (not a raw JSON.parse SyntaxError) on invalid content', () => {
    expect(() => parseStructuredCompletion(completion([{ message: { content: '{not valid json' } }]), 'hashtags')).toThrow(
      /malformed JSON for hashtags/,
    );
  });

  it('checks refusal and truncation before attempting to parse content as JSON', () => {
    // If content-parsing ran first here it would throw a generic JSON error instead of surfacing
    // the more useful truncation message — order of checks matters for a clear diagnosis.
    expect(() =>
      parseStructuredCompletion(completion([{ message: { content: 'not json at all' }, finish_reason: 'length' }]), 'x'),
    ).toThrow(/truncated/);
  });
});
