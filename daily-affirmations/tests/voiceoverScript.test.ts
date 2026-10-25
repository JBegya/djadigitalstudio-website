import { describe, expect, it } from 'vitest';
import { buildCombinedVoiceoverScript } from '@/lib/storyboards/voiceoverScript';

describe('buildCombinedVoiceoverScript', () => {
  it('joins every scene voiceover into one continuous script', () => {
    const script = buildCombinedVoiceoverScript([{ voiceover: 'You finished late.' }, { voiceover: 'You deserve better.' }]);
    expect(script).toBe('You finished late. You deserve better.');
  });

  it('adds a trailing period to a scene missing terminal punctuation', () => {
    const script = buildCombinedVoiceoverScript([{ voiceover: 'You finished late' }]);
    expect(script).toBe('You finished late.');
  });

  it('preserves existing question marks and exclamation points instead of double-punctuating', () => {
    const script = buildCombinedVoiceoverScript([{ voiceover: 'Ready to try it?' }, { voiceover: 'Get started!' }]);
    expect(script).toBe('Ready to try it? Get started!');
  });

  it('filters out blank/whitespace-only scene voiceovers', () => {
    const script = buildCombinedVoiceoverScript([{ voiceover: 'Real line.' }, { voiceover: '   ' }, { voiceover: '' }]);
    expect(script).toBe('Real line.');
  });

  it('returns an empty string when every scene has no voiceover', () => {
    expect(buildCombinedVoiceoverScript([{ voiceover: '' }])).toBe('');
  });
});
