import type { MarketingPack, ProductProfile, Storyboard } from '@/types/domain';

export interface StoryboardPackGroup {
  packId: string;
  packName: string;
  storyboards: Storyboard[];
}

export interface StoryboardFeatureGroup {
  featureKey: string;
  featureLabel: string;
  packGroups: StoryboardPackGroup[];
}

export interface StoryboardProductGroup {
  productId: string;
  productName: string;
  features: StoryboardFeatureGroup[];
}

/** Product -> feature -> pack -> storyboard[], resolving display names via lookup against the
 * already-fetched products/packs lists rather than storing them on the Storyboard itself —
 * mirrors buildMarketingLibrary.ts's own resolve-at-render-time convention for MarketingPack. */
export function groupStoryboardsByProductFeature(storyboards: Storyboard[], packs: MarketingPack[], products: ProductProfile[]): StoryboardProductGroup[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const packById = new Map(packs.map((p) => [p.id, p]));
  const byPackId = new Map<string, Storyboard[]>();
  for (const sb of storyboards) byPackId.set(sb.packId, [...(byPackId.get(sb.packId) ?? []), sb]);

  const productIds = [...new Set(storyboards.map((s) => s.productId))];
  return productIds.map((productId) => {
    const product = productById.get(productId);
    const featureKeys = [...new Set(storyboards.filter((s) => s.productId === productId).map((s) => s.featureKey))];
    const features = featureKeys.map((featureKey) => {
      const feature = product?.features.find((f) => f.key === featureKey);
      const packIds = [...new Set(storyboards.filter((s) => s.productId === productId && s.featureKey === featureKey).map((s) => s.packId))];
      const packGroups = packIds.map((packId) => {
        const pack = packById.get(packId);
        return {
          packId,
          packName: pack ? `${pack.name} (V${pack.version})` : packId,
          storyboards: (byPackId.get(packId) ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        };
      });
      return { featureKey, featureLabel: feature?.label ?? featureKey, packGroups };
    });
    return { productId, productName: product?.name ?? productId, features };
  });
}
