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

      it('has exactly 6 Content Modes with unique keys and non-empty labels', () => {
        expect(brand.contentModes.length).toBe(6);
        const keys = brand.contentModes.map((m) => m.key);
        expect(new Set(keys).size).toBe(6);
        for (const mode of brand.contentModes) {
          expect(mode.label.length).toBeGreaterThan(0);
        }
      });

      it('every topic belongs to one of the brand’s 6 Content Modes, and every mode has at least one topic', () => {
        const modeKeys = new Set(brand.contentModes.map((m) => m.key));
        for (const topic of brand.topics) {
          expect(modeKeys.has(topic.mode)).toBe(true);
        }
        for (const mode of brand.contentModes) {
          expect(brand.topics.some((t) => t.mode === mode.key)).toBe(true);
        }
      });

      it('has a valid accent color hex', () => {
        expect(brand.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  }

  it('autism brand explicitly bans deficit-framing language', () => {
    const banned = BRANDS.autism.bannedPhrases.join(' ').toLowerCase();
    expect(banned).toContain('special needs');
    expect(banned).toContain('cure');
  });

  it('the two brands use distinct accent colors matching the cooler/warmer brand direction', () => {
    expect(BRANDS.nurse.accentColor).not.toBe(BRANDS.autism.accentColor);
  });

  it('Content Mode labels match the exact category names the business specified', () => {
    expect(BRANDS.nurse.contentModes.map((m) => m.label).sort()).toEqual(
      ['Burnout', 'Gratitude', 'Leadership', 'Morning Motivation', 'Night Shift', 'Self Care'].sort(),
    );
    expect(BRANDS.autism.contentModes.map((m) => m.label).sort()).toEqual(
      ['Burnout', 'Hard Days', 'Hope', 'School', 'Small Wins', 'Therapy'].sort(),
    );
  });
});
