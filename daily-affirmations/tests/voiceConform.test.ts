import { describe, expect, it } from 'vitest';
import { computeVoiceConformFactor, rescaleWordTimings } from '@/server/video-engine/voiceConform';

describe('computeVoiceConformFactor', () => {
  it('computes originalDuration / targetDuration when within the atempo range', () => {
    expect(computeVoiceConformFactor(20, 25)).toBeCloseTo(0.8, 5);
    expect(computeVoiceConformFactor(25, 20)).toBeCloseTo(1.25, 5);
  });

  it('returns exactly 1 when the voice already matches the target duration', () => {
    expect(computeVoiceConformFactor(15, 15)).toBe(1);
  });

  it('clamps a wildly short voice track (needs stretching well past 0.5x) at the atempo floor', () => {
    // 5s of speech to fill 20s would need atempo=0.25 (much slower) — clamped to the 0.5 floor.
    expect(computeVoiceConformFactor(5, 20)).toBe(0.5);
  });

  it('clamps a wildly long voice track (needs compressing well past 2x) at the atempo ceiling', () => {
    // 50s of speech to fit into 10s would need atempo=5 (much faster) — clamped to the 2.0 ceiling.
    expect(computeVoiceConformFactor(50, 10)).toBe(2.0);
  });

  it('does not divide by zero for a zero target duration', () => {
    expect(computeVoiceConformFactor(10, 0)).toBe(1);
  });
});

describe('rescaleWordTimings', () => {
  it('divides every start/end by the stretch factor', () => {
    const timings = [{ start: 1, end: 2 }, { start: 2, end: 4 }];
    expect(rescaleWordTimings(timings, 2)).toEqual([{ start: 0.5, end: 1 }, { start: 1, end: 2 }]);
  });

  it('is a no-op when the stretch factor is 1', () => {
    const timings = [{ start: 1, end: 2 }];
    expect(rescaleWordTimings(timings, 1)).toBe(timings);
  });

  it('preserves any extra fields on each timing object', () => {
    const timings = [{ start: 1, end: 2, word: 'hello' }];
    expect(rescaleWordTimings(timings, 2)).toEqual([{ start: 0.5, end: 1, word: 'hello' }]);
  });
});
