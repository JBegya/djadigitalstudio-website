import { describe, expect, it } from 'vitest';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { TEMPLATES, getTemplatesForContentType } from '@/server/config/templates';

const SOCIAL_KEYS = CONTENT_TYPES.map((c) => c.key).filter((k) => k !== 'app-store-screenshot');
const UNIVERSAL_TEMPLATE_KEYS = TEMPLATES.filter((t) => !t.contentTypeKeys).map((t) => t.key);

describe('getTemplatesForContentType', () => {
  it('includes the App Store Screenshot template only for the app-store-screenshot content type', () => {
    const keys = getTemplatesForContentType('app-store-screenshot').map((t) => t.key);
    expect(keys).toContain('app-store-screenshot');
  });

  it('excludes the App Store Screenshot template for every social content type', () => {
    for (const key of SOCIAL_KEYS) {
      const keys = getTemplatesForContentType(key).map((t) => t.key);
      expect(keys).not.toContain('app-store-screenshot');
    }
  });

  it('includes every universal template for every content type, including app-store-screenshot', () => {
    for (const contentType of CONTENT_TYPES) {
      const keys = getTemplatesForContentType(contentType.key).map((t) => t.key);
      for (const universalKey of UNIVERSAL_TEMPLATE_KEYS) {
        expect(keys).toContain(universalKey);
      }
    }
  });
});
