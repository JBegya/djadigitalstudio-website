import { describe, expect, it } from 'vitest';
import { MockVideoProvider } from '@/server/video-engine/mockVideoProvider';
import { RunwayVideoProvider } from '@/server/video-engine/runwayVideoProvider';
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

  it('falls back to the Ken Burns renderer for a provider that has no adapter implemented yet', () => {
    expect(getVideoProvider(sampleSettings({ videoProvider: 'veo' }))).toBeInstanceOf(MockVideoProvider);
    expect(getVideoProvider(sampleSettings({ videoProvider: 'kling' }))).toBeInstanceOf(MockVideoProvider);
  });

  it('returns a RunwayVideoProvider when videoProvider is "runway" and a key is configured', () => {
    expect(getVideoProvider(sampleSettings({ videoProvider: 'runway', videoProviderApiKey: 'rw-key' }))).toBeInstanceOf(RunwayVideoProvider);
  });

  it('throws a clear, actionable error when "runway" is selected but no key is configured', () => {
    expect(() => getVideoProvider(sampleSettings({ videoProvider: 'runway' }))).toThrow(/Runway.*no API key/i);
  });
});
