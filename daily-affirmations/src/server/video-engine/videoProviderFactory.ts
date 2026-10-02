import type { Settings } from '@/types/domain';
import { MockVideoProvider } from './mockVideoProvider';
import type { VideoProvider } from './videoProvider';

/**
 * The one place that knows which provider is active — this is what makes Runway/Veo/Kling/Pika/
 * Luma/OpenArt interchangeable without touching videoOrchestrator.ts. A real provider drops in as
 * one more case here (e.g. `case 'runway': return new RunwayVideoProvider(settings.videoProviderApiKey);`)
 * — nothing else in the app changes. None are implemented yet: none are reachable from this
 * environment to build/verify against, so every value other than 'none' currently falls back to
 * the Ken Burns renderer until a real adapter is added.
 */
export function getVideoProvider(settings: Settings): VideoProvider {
  switch (settings.videoProvider ?? 'none') {
    case 'none':
    default:
      return new MockVideoProvider();
  }
}
