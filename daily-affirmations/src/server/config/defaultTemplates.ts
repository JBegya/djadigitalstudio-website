import type { TemplateDefinition } from '@/types/domain';
import { getTemplatesForContentType } from './templates';

/**
 * Plain data, not logic — which template each platform defaults to when a Marketing Pack is
 * generated with one click. Change these values (or let a future settings screen expose them) to
 * change the defaults without touching the generation code that reads this map.
 */
export const DEFAULT_TEMPLATE_BY_CONTENT_TYPE: Record<string, string> = {
  'facebook-feed': 'apple-hero',
  'instagram-post': 'problem-solution',
  'linkedin-post': 'feature-highlight',
  'x-post': 'comparison',
  'app-store-screenshot': 'app-store-screenshot',
};

/** Falls back to the first template available for the platform if the configured default has
 * been removed or was never set for this content type — never a dead end. */
export function getDefaultTemplateForContentType(contentTypeKey: string): TemplateDefinition | undefined {
  const available = getTemplatesForContentType(contentTypeKey);
  const mappedKey = DEFAULT_TEMPLATE_BY_CONTENT_TYPE[contentTypeKey];
  return available.find((t) => t.key === mappedKey) ?? available[0];
}
