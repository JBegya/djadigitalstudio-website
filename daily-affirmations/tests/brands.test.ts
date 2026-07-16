import { describe, expect, it } from 'vitest';
import { ALL_BRAND_IDS, BRANDS, getBrand } from '@/server/config/brands';

describe('brand configuration', () => {
  it('defines exactly nurse and autism brands', () => {
    expect(ALL_BRAND_IDS.sort()).toEqual(['autism', 'nurse']);
  });

  for (const brandId of ['nurse', 'autism'] as const) {
    describe(brandId, () => {
      const brand = getBrand(brandId);

      it('has a non-empty system prompt and at least 5 tone rules', () => {
        expect(brand.systemPrompt.length).toBeGreaterThan(50);
        expect(brand.toneRules.length).toBeGreaterThanOrEqual(5);
      });

      it('has at least 8 topics, each with a label and keywords', () => {
        expect(brand.topics.length).toBeGreaterThanOrEqual(8);
        for (const topic of brand.topics) {
          expect(topic.key.length).toBeGreaterThan(0);
          expect(topic.label.length).toBeGreaterThan(0);
          expect(topic.keywords.length).toBeGreaterThan(0);
        }
      });

      it('has unique topic keys', () => {
        const keys = brand.topics.map((t) => t.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      it('has a substantial banned-phrase list', () => {
        expect(brand.bannedPhrases.length).toBeGreaterThan(10);
      });
    });
  }

  it('autism brand explicitly bans deficit-framing language', () => {
    const banned = BRANDS.autism.bannedPhrases.join(' ').toLowerCase();
    expect(banned).toContain('special needs');
    expect(banned).toContain('cure');
  });
});
