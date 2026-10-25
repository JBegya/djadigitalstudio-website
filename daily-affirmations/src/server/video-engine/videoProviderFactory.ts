import type { Settings } from '@/types/domain';
import { MockVideoProvider } from './mockVideoProvider';
import { RunwayVideoProvider } from './runwayVideoProvider';
import type { VideoProvider } from './videoProvider';

/**
 * The one place that knows which provider is active — this is what makes Runway/Veo/Kling/Pika/
 * Luma/OpenArt interchangeable without touching videoOrchestrator.ts. A real provider drops in as
 * one more case here — nothing else in the app changes. Runway is the first one implemented;
 * Veo/Kling/Pika/Luma/OpenArt still fall back to the Ken Burns renderer until each gets its own
 * adapter the same way.
 */
export function getVideoProvider(settings: Settings): VideoProvider {
  switch (settings.videoProvider ?? 'none') {
    case 'runway':
      if (!settings.videoProviderApiKey) {
        throw new Error('Runway is selected as the video provider, but no API key is configured in Settings.');
      }
      return new RunwayVideoProvider(settings.videoProviderApiKey);
    case 'none':
    default:
      return new MockVideoProvider();
  }
}
