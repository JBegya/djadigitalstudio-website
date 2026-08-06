import type { ContentTypeSpec } from '@/types/domain';
import type { SlotContent } from './templateToCanvas';

// Placeholder-only, used until Product Management (M3) and the Advertisement Builder (M4) wire
// in a real ProductProfile, real screenshots, and a real ContentTypeSpec list.
export const SAMPLE_SLOT_CONTENT: SlotContent = {
  headline: 'Never miss a shift change again.',
  subheadline: 'Real-time alerts the moment your roster updates — no more surprises at the door.',
  cta: 'Download Free',
  featureBullets: ['Instant shift-change alerts', 'Short-change & callback pay detection', 'Works offline, syncs later'],
  accentColor: '#7c9cff',
};

export const SAMPLE_CONTENT_TYPES: ContentTypeSpec[] = [
  { key: 'instagram-post', label: 'Instagram Post', widthPx: 1080, heightPx: 1080, exportFormats: ['png', 'jpg'] },
  { key: 'instagram-story', label: 'Instagram Story', widthPx: 1080, heightPx: 1920, exportFormats: ['png', 'jpg'] },
  { key: 'facebook-feed', label: 'Facebook Feed', widthPx: 1200, heightPx: 1200, exportFormats: ['png', 'jpg'] },
  { key: 'app-store-screenshot', label: 'App Store Screenshot', widthPx: 1290, heightPx: 2796, exportFormats: ['png', 'jpg', 'pdf'] },
];

export function getSampleContentType(key: string): ContentTypeSpec {
  return SAMPLE_CONTENT_TYPES.find((c) => c.key === key) ?? (SAMPLE_CONTENT_TYPES[0] as ContentTypeSpec);
}
