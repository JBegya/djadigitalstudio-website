import type { AdCreation, MarketingPack, ProductProfile } from '@/types/domain';

const UNGROUPED_FEATURE_KEY = '__ungrouped__';

export interface AssetEntry {
  creation: AdCreation;
}

export interface PackGroup {
  pack: MarketingPack;
  assets: AssetEntry[];
}

export interface FeatureLibraryGroup {
  featureKey: string;
  featureLabel: string;
  /** Ordered oldest-first by pack version — "Pack V1", "Pack V2", ... */
  packs: PackGroup[];
  /** Ads saved one at a time through the single-ad wizard/editor flow, which never creates a
   * pack — never dropped, just shown outside the pack hierarchy. */
  standaloneAssets: AssetEntry[];
}

export interface ProductLibraryGroup {
  productId: string;
  productName: string;
  features: FeatureLibraryGroup[];
}

/**
 * Pure grouping over already-saved packs/creations — no Fabric, no DOM, fully unit-testable.
 * Packs carry their own version number (assigned at creation time), so this never needs to infer
 * ordering from timestamps the way per-asset versioning would.
 */
export function buildMarketingLibrary(packs: MarketingPack[], creations: AdCreation[], products: ProductProfile[]): ProductLibraryGroup[] {
  const productById = new Map(products.map((p) => [p.id, p]));

  const assetsByPackId = new Map<string, AdCreation[]>();
  const standaloneByProductFeature = new Map<string, AdCreation[]>();
  for (const creation of creations) {
    if (creation.packId) {
      const list = assetsByPackId.get(creation.packId) ?? [];
      list.push(creation);
      assetsByPackId.set(creation.packId, list);
    } else {
      const key = `${creation.productId}::${creation.featureKey ?? UNGROUPED_FEATURE_KEY}`;
      const list = standaloneByProductFeature.get(key) ?? [];
      list.push(creation);
      standaloneByProductFeature.set(key, list);
    }
  }

  const productIds = new Set<string>([...packs.map((p) => p.productId), ...creations.map((c) => c.productId)]);

  const productGroups: ProductLibraryGroup[] = [];
  for (const productId of productIds) {
    const product = productById.get(productId);

    const featureKeys = new Set<string>([
      ...packs.filter((p) => p.productId === productId).map((p) => p.featureKey),
      ...creations.filter((c) => c.productId === productId && !c.packId).map((c) => c.featureKey ?? UNGROUPED_FEATURE_KEY),
    ]);

    const features: FeatureLibraryGroup[] = [];
    for (const featureKey of featureKeys) {
      const feature = product?.features.find((f) => f.key === featureKey);

      const featurePacks = packs
        .filter((p) => p.productId === productId && p.featureKey === featureKey)
        .sort((a, b) => a.version - b.version)
        .map((pack) => ({ pack, assets: (assetsByPackId.get(pack.id) ?? []).map((creation) => ({ creation })) }));

      const standaloneAssets = (standaloneByProductFeature.get(`${productId}::${featureKey}`) ?? []).map((creation) => ({ creation }));

      features.push({
        featureKey,
        featureLabel: featureKey === UNGROUPED_FEATURE_KEY ? 'Ungrouped' : (feature?.label ?? featureKey),
        packs: featurePacks,
        standaloneAssets,
      });
    }

    productGroups.push({ productId, productName: product?.name ?? productId, features });
  }

  return productGroups;
}
