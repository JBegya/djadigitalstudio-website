import { describe, expect, it } from 'vitest';
import { parseStructuredResponse } from '@/server/ai-services/openaiClient';

function response(opts: {
  outputText?: string;
  status?: string;
  incompleteReason?: string;
  refusal?: string;
}) {
  const content = opts.refusal ? [{ type: 'refusal', refusal: opts.refusal }] : [{ type: 'output_text', text: opts.outputText }];
  return {
    status: opts.status,
    incomplete_details: opts.incompleteReason ? { reason: opts.incompleteReason } : null,
    output_text: opts.outputText,
    output: [{ type: 'message', content }],
  };
}

describe('parseStructuredResponse', () => {
  it('parses valid JSON content into the expected shape', () => {
    const result = parseStructuredResponse<{ affirmation: string }>(
      response({ outputText: '{"affirmation":"You are enough."}', status: 'completed' }),
      'test',
    );
    expect(result).toEqual({ affirmation: 'You are enough.' });
  });

  it('throws when the model refused the request', () => {
    expect(() => parseStructuredResponse(response({ refusal: "I can't help with that." }), 'the autism script')).toThrow(
      /declined to generate the autism script.*can't help with that/,
    );
  });

  it('throws when the response was truncated (incomplete status)', () => {
    expect(() =>
      parseStructuredResponse(response({ outputText: '{"partial":', status: 'incomplete', incompleteReason: 'max_output_tokens' }), 'captions'),
    ).toThrow(/truncated \(max_output_tokens\)/);
  });

  it('throws when output_text is empty or missing', () => {
    expect(() => parseStructuredResponse(response({ outputText: '' }), 'x')).toThrow(/empty response for x/);
    expect(() => parseStructuredResponse(response({}), 'x')).toThrow(/empty response for x/);
  });

  it('throws a malformed-JSON error (not a raw JSON.parse SyntaxError) on invalid content', () => {
    expect(() => parseStructuredResponse(response({ outputText: '{not valid json' }), 'hashtags')).toThrow(/malformed JSON for hashtags/);
  });

  it('checks refusal and truncation before attempting to parse content as JSON', () => {
    // If content-parsing ran first here it would throw a generic JSON error instead of surfacing
    // the more useful truncation message — order of checks matters for a clear diagnosis.
    expect(() =>
      parseStructuredResponse(response({ outputText: 'not json at all', status: 'incomplete', incompleteReason: 'max_output_tokens' }), 'x'),
    ).toThrow(/truncated/);
  });
});
