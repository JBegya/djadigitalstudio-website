import { describe, expect, it } from 'vitest';
import { generateMockAffirmation } from '@/server/ai-services/scriptWriterMock';
import { wordCount } from '@/server/utils/textStats';

describe('generateMockAffirmation', () => {
  it('produces multi-sentence, reasonably-lengthed text for every brand/topic combination', () => {
    for (const brand of ['nurse', 'autism'] as const) {
      for (const topic of ['burnout', 'hope', 'self-care']) {
        const text = generateMockAffirmation(brand, topic);
        expect(text.length).toBeGreaterThan(20);
        expect(wordCount(text)).toBeGreaterThanOrEqual(20);
        expect(text.split('. ').length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('never includes emoji or literal quotation marks', () => {
    const text = generateMockAffirmation('nurse', 'burnout');
    expect(/[\u{1F300}-\u{1FAFF}]/u.test(text)).toBe(false);
    expect(text).not.toMatch(/["“”]/);
  });
});
