import { describe, expect, it } from 'vitest';
import { buildSubtitleCues, estimateWordTimings, groupIntoCues } from '@/server/video-engine/subtitleTiming';

describe('estimateWordTimings', () => {
  it('produces monotonically increasing, non-overlapping word timings that fill the duration', () => {
    const text = 'You are still standing after everything that happened today, and that matters more than you know.';
    const timings = estimateWordTimings(text, 20);
    expect(timings.length).toBe(16);
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i]!.start).toBeCloseTo(timings[i - 1]!.end, 5);
    }
    expect(timings[0]!.start).toBe(0);
    expect(timings[timings.length - 1]!.end).toBeCloseTo(20, 5);
  });

  it('gives longer words more time than short ones', () => {
    const timings = estimateWordTimings('a extraordinarily', 10);
    const short = timings[0]!;
    const long = timings[1]!;
    expect(long.end - long.start).toBeGreaterThan(short.end - short.start);
  });

  it('returns an empty array for empty text', () => {
    expect(estimateWordTimings('', 10)).toEqual([]);
  });
});

describe('groupIntoCues', () => {
  it('never lets a cue exceed 5 words', () => {
    const timings = estimateWordTimings('one two three four five six seven eight nine ten', 10);
    const cues = groupIntoCues(timings);
    for (const cue of cues) {
      expect(cue.text.split(' ').length).toBeLessThanOrEqual(5);
    }
  });

  it('produces cues that do not overlap and stay in order', () => {
    const text = 'You are still standing after everything that happened today, and that matters more than you know.';
    const timings = estimateWordTimings(text, 22);
    const cues = groupIntoCues(timings);
    expect(cues.length).toBeGreaterThan(1);
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]!.start).toBeGreaterThanOrEqual(cues[i - 1]!.end - 0.001);
    }
  });

  it('breaks at sentence-ending punctuation', () => {
    // Hand-crafted timings (rather than estimateWordTimings) so the assertion isn't at the
    // mercy of the duration cap also wanting to split the same words.
    const timings = [
      { word: 'Rest', start: 0, end: 0.3 },
      { word: 'now.', start: 0.3, end: 0.6 },
      { word: 'You', start: 0.7, end: 0.9 },
      { word: 'earned', start: 0.9, end: 1.3 },
      { word: 'it.', start: 1.3, end: 1.6 },
    ];
    const cues = groupIntoCues(timings);
    expect(cues).toEqual([
      { text: 'Rest now.', start: 0, end: 0.6 },
      { text: 'You earned it.', start: 0.7, end: 1.6 },
    ]);
  });

  it('returns an empty array for no input', () => {
    expect(groupIntoCues([])).toEqual([]);
  });
});

describe('buildSubtitleCues', () => {
  it('falls back to estimation when no word timings are provided', () => {
    const cues = buildSubtitleCues('You are still standing after everything today.', null, 8);
    expect(cues.length).toBeGreaterThan(0);
    expect(cues[cues.length - 1]!.end).toBeLessThanOrEqual(8.01);
  });

  it('uses real word timings when provided', () => {
    const cues = buildSubtitleCues(
      'Rest now',
      [
        { word: 'Rest', start: 1, end: 1.4 },
        { word: 'now', start: 1.4, end: 2 },
      ],
      5,
    );
    expect(cues[0]!.start).toBe(1);
  });
});
