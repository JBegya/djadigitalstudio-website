import { describe, expect, it } from 'vitest';
import {
  containsEmoji,
  findBannedPhrase,
  hasRepeatedWordRun,
  hasRepetitiveSentenceOpenings,
  jaccardSimilarity,
  normalizeForComparison,
  splitSentences,
  wordCount,
} from '@/server/utils/textStats';

describe('wordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(wordCount('You are still standing after everything today.')).toBe(7);
  });
  it('ignores extra whitespace', () => {
    expect(wordCount('  hello   world  ')).toBe(2);
  });
  it('is zero for empty input', () => {
    expect(wordCount('')).toBe(0);
  });
});

describe('normalizeForComparison', () => {
  it('lowercases and strips punctuation, treating apostrophes as word breaks', () => {
    expect(normalizeForComparison("You're STILL here — and that matters.")).toBe('you re still here and that matters');
  });
});

describe('jaccardSimilarity', () => {
  it('is 1 for identical text', () => {
    const text = 'You are still standing after everything today';
    expect(jaccardSimilarity(text, text)).toBeCloseTo(1);
  });
  it('is 0 for completely different text', () => {
    expect(jaccardSimilarity('completely different words here', 'another unrelated sentence entirely')).toBe(0);
  });
  it('is high for near-duplicate affirmations', () => {
    const a = 'You are still standing after everything that happened today, and that matters more than you know.';
    const b = 'You are still standing after everything that happened today, and that matters more than you think.';
    expect(jaccardSimilarity(a, b)).toBeGreaterThan(0.7);
  });
});

describe('findBannedPhrase', () => {
  it('detects a banned phrase regardless of case/punctuation', () => {
    expect(findBannedPhrase('Just remember: Everything Happens For A Reason.', ['everything happens for a reason'])).toBe(
      'everything happens for a reason',
    );
  });
  it('returns null when nothing matches', () => {
    expect(findBannedPhrase('You did enough today.', ['everything happens for a reason'])).toBeNull();
  });
});

describe('hasRepeatedWordRun', () => {
  it('flags immediate word repetition', () => {
    expect(hasRepeatedWordRun('you you you are tired')).toBe(true);
  });
  it('does not flag normal prose', () => {
    expect(hasRepeatedWordRun('you are still standing after everything today')).toBe(false);
  });
});

describe('containsEmoji', () => {
  it('detects emoji', () => {
    expect(containsEmoji('You did it today 💜')).toBe(true);
  });
  it('does not false-positive on ampersands or punctuation', () => {
    expect(containsEmoji("DJ&A — you're doing great!")).toBe(false);
  });
});

describe('splitSentences', () => {
  it('splits on sentence-ending punctuation', () => {
    expect(splitSentences('You made it. Rest now! You earned it.')).toEqual(['You made it.', 'Rest now!', 'You earned it.']);
  });
});

describe('hasRepetitiveSentenceOpenings', () => {
  it('flags three or more sentences sharing the same two-word opening (list-like AI parallelism)', () => {
    expect(hasRepetitiveSentenceOpenings('You are enough. You are worthy. You are strong.')).toBe(true);
  });

  it('does not flag two sentences sharing an opening — ordinary second-person narration', () => {
    expect(hasRepetitiveSentenceOpenings('You held the floor together tonight. You do not have to carry it home too.')).toBe(false);
  });

  it('does not flag varied, natural sentence openings', () => {
    const text =
      'You held the whole unit together tonight. The weight of that shift does not erase your worth. Rest is allowed, and tomorrow you begin again.';
    expect(hasRepetitiveSentenceOpenings(text)).toBe(false);
  });

  it('is case- and punctuation-insensitive when matching openings', () => {
    expect(hasRepetitiveSentenceOpenings('you are enough. You Are worthy! YOU ARE strong.')).toBe(true);
  });
});
