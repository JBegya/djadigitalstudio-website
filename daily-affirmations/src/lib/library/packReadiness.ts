import { CONTENT_TYPES } from '@/server/config/contentTypes';
import type { AdCreation, ContentTypeSpec, MarketingPack, ProductId } from '@/types/domain';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves a product's required-for-readiness platforms from Settings. Unconfigured (empty/missing)
 * means "no requirement set yet" — readiness then reflects pure asset completion, never falsely
 * penalizing a product for platforms it was never meant to use. This is deliberately different from
 * Marketing Coverage's own resolver (`computeCoverage.ts`), which falls back to every registered
 * platform instead — coverage and readiness ask different questions and shouldn't share a fallback.
 */
export function resolveReadinessContentTypes(productId: ProductId, requiredPlatformKeysByProduct: Record<ProductId, string[]>): ContentTypeSpec[] {
  const keys = requiredPlatformKeysByProduct[productId] ?? [];
  return CONTENT_TYPES.filter((ct) => keys.includes(ct.key));
}

export interface PackReadiness {
  /** Assets with status 'ready' or 'published'. */
  readyCount: number;
  /** Every asset belonging to the pack, including archived ones — an archived asset is still
   * part of the pack's history. Only 'ready'/'published' assets contribute to readyCount. */
  totalCount: number;
  /** Clamped to [0, 100]; 0 when totalCount is 0. */
  completionPercent: number;
  /** This product's configured required platforms the pack has no asset for. */
  missingRequiredPlatformLabels: string[];
  /** Pure asset-completion capability — whether every asset is ready/published and no required
   * platform is missing. Deliberately not lifecycle-aware; the UI decides whether to show this as
   * "Ready to Publish" based on the pack's own current status (e.g. never for an Archived pack). */
  readyToPublish: boolean;
}

export function computePackReadiness(assets: AdCreation[], requiredContentTypes: ContentTypeSpec[]): PackReadiness {
  const readyCount = assets.filter((a) => a.status === 'ready' || a.status === 'published').length;
  const totalCount = assets.length;
  const completionPercent = totalCount > 0 ? Math.min(100, Math.max(0, Math.round((readyCount / totalCount) * 100))) : 0;

  const presentKeys = new Set(assets.map((a) => a.contentTypeKey));
  const missingRequiredPlatformLabels = requiredContentTypes.filter((ct) => !presentKeys.has(ct.key)).map((ct) => ct.label);

  return {
    readyCount,
    totalCount,
    completionPercent,
    missingRequiredPlatformLabels,
    readyToPublish: totalCount > 0 && readyCount === totalCount && missingRequiredPlatformLabels.length === 0,
  };
}

export type AttentionSeverity = 'action-required' | 'needs-review' | 'suggestion';

export const ATTENTION_SEVERITY_LABELS: Record<AttentionSeverity, string> = {
  'action-required': 'Action Required',
  'needs-review': 'Needs Review',
  suggestion: 'Suggestion',
};

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  'action-required': 3,
  'needs-review': 2,
  suggestion: 1,
};

export interface AttentionFlag {
  severity: AttentionSeverity;
  message: string;
}

export interface AttentionFlags {
  flags: AttentionFlag[];
  needsAttention: boolean;
  highestSeverity?: AttentionSeverity;
}

/**
 * Every check here reads only already-existing fields — nothing is stored. `nowMs` is always
 * passed in rather than read via Date.now() internally, keeping this a pure, directly-testable
 * function.
 */
export function computeAttentionFlags(
  pack: MarketingPack,
  assets: AdCreation[],
  readiness: PackReadiness,
  nowMs: number,
  draftReminderDays: number,
  refreshReminderDays: number,
): AttentionFlags {
  const flags: AttentionFlag[] = [];

  if (readiness.missingRequiredPlatformLabels.length > 0) {
    flags.push({ severity: 'action-required', message: `Missing required platform: ${readiness.missingRequiredPlatformLabels.join(', ')}` });
  }
  if (assets.some((a) => !a.thumbnailPath)) {
    flags.push({ severity: 'action-required', message: 'Missing thumbnail' });
  }

  const packStatus = pack.status ?? 'draft';
  const ageDays = (nowMs - new Date(pack.createdAt).getTime()) / MS_PER_DAY;
  if (packStatus === 'draft' && ageDays > draftReminderDays) {
    flags.push({ severity: 'needs-review', message: `Draft for ${Math.floor(ageDays)}+ days` });
  }
  if (packStatus === 'ready' && assets.some((a) => (a.status ?? 'draft') === 'draft')) {
    flags.push({ severity: 'needs-review', message: 'Marked Ready but contains a Draft asset' });
  }

  if (pack.publishedAt) {
    const daysSincePublished = (nowMs - new Date(pack.publishedAt).getTime()) / MS_PER_DAY;
    if (daysSincePublished > refreshReminderDays) {
      flags.push({ severity: 'suggestion', message: 'Published a while ago — consider refreshing' });
    }
  }

  const highestSeverity = flags.reduce<AttentionSeverity | undefined>(
    (highest, flag) => (!highest || SEVERITY_RANK[flag.severity] > SEVERITY_RANK[highest] ? flag.severity : highest),
    undefined,
  );

  return { flags, needsAttention: flags.length > 0, highestSeverity };
}
