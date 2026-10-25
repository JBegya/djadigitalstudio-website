import { describe, expect, it } from 'vitest';
import { findNearDuplicatePackName } from '@/lib/library/campaignNameMatch';
import type { MarketingPack } from '@/types/domain';

function samplePack(overrides: Partial<MarketingPack> = {}): MarketingPack {
  return {
    id: 'pack1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    name: 'Payroll Mistake Story',
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('findNearDuplicatePackName', () => {
  it('returns null when no packs exist yet for this product+feature', () => {
    expect(findNearDuplicatePackName('Payroll Mistake Story', 'shiftearn-pro', 'short-change-detection', [])).toBeNull();
  });

  it('returns null for an exact match — the correct, no-warning-needed versioning path', () => {
    const existing = samplePack();
    expect(findNearDuplicatePackName('Payroll Mistake Story', 'shiftearn-pro', 'short-change-detection', [existing])).toBeNull();
  });

  it('returns null for a blank or whitespace-only typed name', () => {
    const existing = samplePack();
    expect(findNearDuplicatePackName('   ', 'shiftearn-pro', 'short-change-detection', [existing])).toBeNull();
  });

  it('flags a pure case difference', () => {
    const existing = samplePack();
    const result = findNearDuplicatePackName('payroll mistake story', 'shiftearn-pro', 'short-change-detection', [existing]);
    expect(result?.existingPack.id).toBe('pack1');
  });

  it('flags a single inserted character', () => {
    const existing = samplePack({ name: 'Payroll Mistake Story' });
    const result = findNearDuplicatePackName('Payroll Mistakes Story', 'shiftearn-pro', 'short-change-detection', [existing]);
    expect(result?.existingPack.id).toBe('pack1');
  });

  it('flags a single adjacent-character transposition, which plain Levenshtein would miss at distance 1', () => {
    const existing = samplePack({ name: 'Payroll Mistake Story' });
    // "Mistake" -> "Mistkae": swaps 'a' and 'k'. Plain Levenshtein distance is 2 (two substitutions);
    // the restricted (Damerau-Levenshtein) distance used here is 1, since it treats an adjacent
    // transposition as a single edit.
    const result = findNearDuplicatePackName('Payroll Mistkae Story', 'shiftearn-pro', 'short-change-detection', [existing]);
    expect(result?.existingPack.id).toBe('pack1');
  });

  it('does not flag a deliberately-distinct suffixed name', () => {
    const existing = samplePack({ name: 'Payroll Mistake Story' });
    const result = findNearDuplicatePackName('Payroll Mistake Story 2.0', 'shiftearn-pro', 'short-change-detection', [existing]);
    expect(result).toBeNull();
  });

  it('does not flag a same-named pack on a different feature', () => {
    const existing = samplePack({ featureKey: 'callback-pay' });
    const result = findNearDuplicatePackName('Payroll Mistake Story', 'shiftearn-pro', 'short-change-detection', [existing]);
    expect(result).toBeNull();
  });

  it('does not flag a same-named pack on a different product', () => {
    const existing = samplePack({ productId: 'shifthydrate' });
    const result = findNearDuplicatePackName('Payroll Mistake Story', 'shiftearn-pro', 'short-change-detection', [existing]);
    expect(result).toBeNull();
  });

  it('when multiple near-duplicates exist, returns the highest-version one', () => {
    const v1 = samplePack({ id: 'p1', name: 'payroll mistake story', version: 1 });
    const v2 = samplePack({ id: 'p2', name: 'payroll mistake story', version: 2 });
    const result = findNearDuplicatePackName('Payroll Mistake Story', 'shiftearn-pro', 'short-change-detection', [v1, v2]);
    expect(result?.existingPack.id).toBe('p2');
  });

  it('breaks a version tie among near-duplicates via updatedAt, not array order', () => {
    const older = samplePack({ id: 'p1', name: 'payroll mistake story', version: 1, updatedAt: '2026-08-01T00:00:00.000Z' });
    const newer = samplePack({ id: 'p2', name: 'payroll mistake story', version: 1, updatedAt: '2026-08-05T00:00:00.000Z' });
    const result = findNearDuplicatePackName('Payroll Mistake Story', 'shiftearn-pro', 'short-change-detection', [older, newer]);
    expect(result?.existingPack.id).toBe('p2');
  });
});
