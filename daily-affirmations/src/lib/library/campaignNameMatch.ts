import { compareByVersionThenRecency } from '@/lib/library/buildMarketingLibrary';
import { normalizeForComparison } from '@/server/utils/textStats';
import type { MarketingPack } from '@/types/domain';

export interface NearDuplicatePackNameMatch {
  /** The existing pack this typed name would probably fork off of instead of versioning. */
  existingPack: MarketingPack;
}

/**
 * Restricted edit distance (Damerau-Levenshtein / "optimal string alignment") — treats an
 * adjacent-character transposition as a single edit, not two, so it actually catches the most
 * common real typo shape ("Mistkae" vs "Mistake"), which plain Levenshtein would score as
 * distance 2 and miss.
 */
function restrictedEditDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + 1);
      }
    }
  }
  return dp[a.length]![b.length]!;
}

/**
 * Flags when `typedName` would silently fork an existing campaign instead of versioning it under
 * MarketingPacksStore.nextVersion's exact-string match rule. Scoped to the same productId+
 * featureKey — mirroring nextVersion's own scope, so this warning always agrees with what the
 * server would actually do. Returns null when: there is no existing pack for this product+feature
 * yet, the typed name is blank, or the typed name is an EXACT match to an existing pack's name
 * (the correct, no-warning-needed versioning path). Otherwise flags a candidate when its
 * normalized name equals the typed name's normalized form (case/whitespace/diacritic-only
 * difference), or when the restricted edit distance between the two normalized strings is <= 1
 * (a single inserted/deleted/substituted character, or a single transposed pair). This is
 * warning-only — it never changes nextVersion()'s own matching or the stored name.
 */
export function findNearDuplicatePackName(
  typedName: string,
  productId: string,
  featureKey: string,
  allPacks: MarketingPack[],
): NearDuplicatePackNameMatch | null {
  const trimmed = typedName.trim();
  if (!trimmed) return null;

  const candidates = allPacks.filter((p) => p.productId === productId && p.featureKey === featureKey);
  if (candidates.some((p) => p.name === trimmed)) return null;

  const normalizedTyped = normalizeForComparison(trimmed);
  const normalizedCandidates = candidates.map((p) => ({ pack: p, normalized: normalizeForComparison(p.name) }));
  const close = normalizedCandidates.filter(
    ({ normalized }) => normalized === normalizedTyped || restrictedEditDistance(normalizedTyped, normalized) <= 1,
  );
  if (close.length === 0) return null;

  const existingPack = close.map((c) => c.pack).sort(compareByVersionThenRecency).at(-1)!;
  return { existingPack };
}
