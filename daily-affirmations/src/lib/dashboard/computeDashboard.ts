import { computeAllCoverage, type ProductCoverage } from '@/lib/coverage/computeCoverage';
import { computeAttentionFlags, computePackReadiness, resolveReadinessContentTypes, type AttentionSeverity } from '@/lib/library/packReadiness';
import type { AdCreation, AssetStatus, ContentTypeSpec, MarketingPack, ProductId, ProductProfile } from '@/types/domain';

export const RECENT_PACKS_LIMIT = 5;
export const ATTENTION_WORKLIST_LIMIT = 8;

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  'action-required': 3,
  'needs-review': 2,
  suggestion: 1,
};

export interface RecentPackEntry {
  packId: string;
  packName: string;
  version: number;
  productId: ProductId;
  productName: string;
  status: AssetStatus;
  recencyIso: string;
}

export interface ProductionSummary {
  totalProducts: number;
  totalPacks: number;
  totalCreations: number;
  creationsByStatus: Record<AssetStatus, number>;
  /** Up to RECENT_PACKS_LIMIT packs, newest (updatedAt ?? createdAt) first. */
  recentPacks: RecentPackEntry[];
}

export interface AttentionWorklistEntry {
  packId: string;
  packName: string;
  version: number;
  productId: ProductId;
  productName: string;
  severity: AttentionSeverity;
  messages: string[];
  recencyIso: string;
}

export interface PublishingSummary {
  readyToPublishCount: number;
  /** True total of flagged packs — never capped, unlike worklist. */
  packsNeedingAttentionCount: number;
  /** Each flagged pack is counted once, under its highestSeverity — matches the single badge a pack
   * already shows in the Marketing Library, so these tallies stay consistent with what clicking
   * through reveals. */
  attentionCountsBySeverity: Record<AttentionSeverity, number>;
  /** Up to ATTENTION_WORKLIST_LIMIT packs, sorted by severity (most severe first) then recency. */
  worklist: AttentionWorklistEntry[];
}

export interface LowestCoverageHighlight {
  productId: ProductId;
  productName: string;
  featureCoveragePercent: number;
}

export interface CoverageSummary {
  perProduct: ProductCoverage[];
  /** The product with the lowest feature coverage among products with at least one feature defined.
   * Undefined when no product has any features — a product with zero features has a trivial 0% that
   * means "nothing to cover," never "the biggest gap." Ties resolve to whichever product appears
   * first in the input array. */
  lowestCoverageProduct?: LowestCoverageHighlight;
}

export interface DashboardSummary {
  production: ProductionSummary;
  publishing: PublishingSummary;
  coverage: CoverageSummary;
}

const EMPTY_STATUS_COUNTS: Record<AssetStatus, number> = { draft: 0, ready: 0, published: 0, archived: 0 };
const EMPTY_SEVERITY_COUNTS: Record<AttentionSeverity, number> = { 'action-required': 0, 'needs-review': 0, suggestion: 0 };

function computeProduction(products: ProductProfile[], packs: MarketingPack[], creations: AdCreation[], productNameFor: (id: ProductId) => string): ProductionSummary {
  const creationsByStatus = { ...EMPTY_STATUS_COUNTS };
  for (const creation of creations) {
    creationsByStatus[creation.status ?? 'draft'] += 1;
  }

  const recentPacks = [...packs]
    .map((pack) => ({ pack, recencyIso: pack.updatedAt ?? pack.createdAt }))
    .sort((a, b) => (a.recencyIso < b.recencyIso ? 1 : a.recencyIso > b.recencyIso ? -1 : 0))
    .slice(0, RECENT_PACKS_LIMIT)
    .map(({ pack, recencyIso }) => ({
      packId: pack.id,
      packName: pack.name,
      version: pack.version,
      productId: pack.productId,
      productName: productNameFor(pack.productId),
      status: pack.status ?? 'draft',
      recencyIso,
    }));

  return {
    totalProducts: products.length,
    totalPacks: packs.length,
    totalCreations: creations.length,
    creationsByStatus,
    recentPacks,
  };
}

function computePublishing(
  packs: MarketingPack[],
  creations: AdCreation[],
  requiredPlatformKeysByProduct: Record<ProductId, string[]>,
  draftReminderDays: number,
  refreshReminderDays: number,
  nowMs: number,
  productNameFor: (id: ProductId) => string,
): PublishingSummary {
  const requiredContentTypesCache = new Map<ProductId, ContentTypeSpec[]>();
  function requiredContentTypesFor(productId: ProductId): ContentTypeSpec[] {
    const cached = requiredContentTypesCache.get(productId);
    if (cached) return cached;
    const resolved = resolveReadinessContentTypes(productId, requiredPlatformKeysByProduct);
    requiredContentTypesCache.set(productId, resolved);
    return resolved;
  }

  let readyToPublishCount = 0;
  const attentionCountsBySeverity = { ...EMPTY_SEVERITY_COUNTS };
  const worklistCandidates: AttentionWorklistEntry[] = [];

  for (const pack of packs) {
    const assets = creations.filter((c) => c.packId === pack.id);
    const readiness = computePackReadiness(assets, requiredContentTypesFor(pack.productId));
    const attention = computeAttentionFlags(pack, assets, readiness, nowMs, draftReminderDays, refreshReminderDays);

    if (readiness.readyToPublish && (pack.status ?? 'draft') === 'ready') {
      readyToPublishCount += 1;
    }

    if (attention.needsAttention && attention.highestSeverity) {
      attentionCountsBySeverity[attention.highestSeverity] += 1;
      worklistCandidates.push({
        packId: pack.id,
        packName: pack.name,
        version: pack.version,
        productId: pack.productId,
        productName: productNameFor(pack.productId),
        severity: attention.highestSeverity,
        messages: attention.flags.map((f) => f.message),
        recencyIso: pack.updatedAt ?? pack.createdAt,
      });
    }
  }

  const worklist = [...worklistCandidates]
    .sort((a, b) => {
      const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (rankDiff !== 0) return rankDiff;
      return a.recencyIso < b.recencyIso ? 1 : a.recencyIso > b.recencyIso ? -1 : 0;
    })
    .slice(0, ATTENTION_WORKLIST_LIMIT);

  return {
    readyToPublishCount,
    packsNeedingAttentionCount: worklistCandidates.length,
    attentionCountsBySeverity,
    worklist,
  };
}

function computeCoverageSummary(products: ProductProfile[], packs: MarketingPack[], creations: AdCreation[], requiredPlatformKeysByProduct: Record<ProductId, string[]>): CoverageSummary {
  const perProduct = computeAllCoverage(products, packs, creations, requiredPlatformKeysByProduct);
  const eligible = perProduct.filter((c) => c.features.length > 0);

  let lowestCoverageProduct: LowestCoverageHighlight | undefined;
  for (const candidate of eligible) {
    if (!lowestCoverageProduct || candidate.featureCoveragePercent < lowestCoverageProduct.featureCoveragePercent) {
      lowestCoverageProduct = { productId: candidate.productId, productName: candidate.productName, featureCoveragePercent: candidate.featureCoveragePercent };
    }
  }

  return { perProduct, lowestCoverageProduct };
}

/**
 * Pure — everything here is derived from already-fetched products/packs/creations/settings,
 * nothing is stored. nowMs is always passed in rather than read via Date.now() internally, keeping
 * this a pure, directly-testable function (same convention as packReadiness.ts/computeCoverage.ts).
 */
export function computeDashboardSummary(
  products: ProductProfile[],
  packs: MarketingPack[],
  creations: AdCreation[],
  requiredPlatformKeysByProduct: Record<ProductId, string[]>,
  draftReminderDays: number,
  refreshReminderDays: number,
  nowMs: number,
): DashboardSummary {
  function productNameFor(productId: ProductId): string {
    return products.find((p) => p.id === productId)?.name ?? productId;
  }

  return {
    production: computeProduction(products, packs, creations, productNameFor),
    publishing: computePublishing(packs, creations, requiredPlatformKeysByProduct, draftReminderDays, refreshReminderDays, nowMs, productNameFor),
    coverage: computeCoverageSummary(products, packs, creations, requiredPlatformKeysByProduct),
  };
}
