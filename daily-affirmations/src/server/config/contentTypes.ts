import type { ContentTypeSpec } from '@/types/domain';

// Hand-authored, not JSON-loaded — same reasoning as TEMPLATES: a fixed, small set of platform
// placements, not something a non-developer needs to add without touching code.
export const CONTENT_TYPES: ContentTypeSpec[] = [
  { key: 'facebook-feed', label: 'Facebook Feed', widthPx: 1080, heightPx: 1080, exportFormats: ['png', 'jpg'] },
  { key: 'instagram-post', label: 'Instagram Post', widthPx: 1080, heightPx: 1080, exportFormats: ['png', 'jpg'] },
  { key: 'linkedin-post', label: 'LinkedIn Post', widthPx: 1200, heightPx: 1200, exportFormats: ['png', 'jpg'] },
  { key: 'x-post', label: 'X Post', widthPx: 1600, heightPx: 900, exportFormats: ['png', 'jpg'] },
  { key: 'app-store-screenshot', label: 'App Store Screenshot', widthPx: 1290, heightPx: 2796, exportFormats: ['png', 'jpg', 'pdf'] },
];

export function getContentType(key: string): ContentTypeSpec | undefined {
  return CONTENT_TYPES.find((c) => c.key === key);
}
