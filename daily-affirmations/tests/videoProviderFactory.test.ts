import { describe, expect, it } from 'vitest';
import { MockVideoProvider } from '@/server/video-engine/mockVideoProvider';
import { getVideoProvider } from '@/server/video-engine/videoProviderFactory';
import type { Settings } from '@/types/domain';

function sampleSettings(overrides: Partial<Settings> = {}): Settings {
  return { openaiApiKey: '', outputFolder: '/tmp/output', ...overrides };
}

describe('getVideoProvider', () => {
  it('returns the Ken Burns fallback when videoProvider is unset', () => {
    expect(getVideoProvider(sampleSettings())).toBeInstanceOf(MockVideoProvider);
  });

  it('returns the Ken Burns fallback when videoProvider is explicitly "none"', () => {
    expect(getVideoProvider(sampleSettings({ videoProvider: 'none' }))).toBeInstanceOf(MockVideoProvider);
  });

  it('falls back to the Ken Burns renderer for any provider without a concrete implementation yet', () => {
    expect(getVideoProvider(sampleSettings({ videoProvider: 'runway' }))).toBeInstanceOf(MockVideoProvider);
  });
});
