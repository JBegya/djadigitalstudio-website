import { CONTENT_TYPES } from '@/server/config/contentTypes';
import type { AdCreation, ContentTypeSpec, MarketingPack, ProductId, ProductProfile } from '@/types/domain';

export interface FeatureCoverageEntry {
  featureKey: string;
  featureLabel: string;
  packCount: number;
  standaloneAssetCount: number;
  covered: boolean;
}

export interface PersonaCoverageEntry {
  personaId: string;
  personaLabel: string;
  packCount: number;
  covered: boolean;
}

export interface PlatformCoverageEntry {
  contentTypeKey: string;
  label: string;
  covered: boolean;
}

export interface ProductCoverage {
  productId: string;
  productName: string;
  features: FeatureCoverageEntry[];
  featureCoveragePercent: number;
  personas: PersonaCoverageEntry[];
  personaCoveragePercent: number;
  /** Packs generated with "No specific persona" (or predating this field) — tallied separately so
   * they're never silently dropped and never miscounted against a real persona. */
  packsWithNoPersonaCount: number;
  platforms: PlatformCoverageEntry[];
  platformCoveragePercent: number;
}

function percent(covered: number, total: number): number {
  return total > 0 ? Math.round((covered / total) * 100) : 0;
}

/**
 * Pure — everything here is derived from already-fetched packs/creations/products, nothing is
 * stored. Feature coverage counts standalone (packId-less) assets alongside packs, so promoting a
 * feature only through the single-ad editor still counts as marketed. Persona coverage only counts
 * packs (campaigns) — see MarketingPack.personaId's doc comment for why.
 */
export function computeProductCoverage(
  product: ProductProfile,
  packs: MarketingPack[],
  creations: AdCreation[],
  requiredContentTypes: ContentTypeSpec[],
): ProductCoverage {
  const productPacks = packs.filter((p) => p.productId === product.id);
  const productCreations = creations.filter((c) => c.productId === product.id);

  const features: FeatureCoverageEntry[] = product.features.map((feature) => {
    const packCount = productPacks.filter((p) => p.featureKey === feature.key).length;
    const standaloneAssetCount = productCreations.filter((c) => !c.packId && c.featureKey === feature.key).length;
    return { featureKey: feature.key, featureLabel: feature.label, packCount, standaloneAssetCount, covered: packCount > 0 || standaloneAssetCount > 0 };
  });

  const personas: PersonaCoverageEntry[] = product.personas.map((persona) => {
    const packCount = productPacks.filter((p) => p.personaId === persona.id).length;
    return { personaId: persona.id, personaLabel: persona.name, packCount, covered: packCount > 0 };
  });
  const packsWithNoPersonaCount = productPacks.filter((p) => !p.personaId).length;

  const platforms: PlatformCoverageEntry[] = requiredContentTypes.map((ct) => ({
    contentTypeKey: ct.key,
    label: ct.label,
    covered: productCreations.some((c) => c.contentTypeKey === ct.key),
  }));

  return {
    productId: product.id,
    productName: product.name,
    features,
    featureCoveragePercent: percent(features.filter((f) => f.covered).length, features.length),
    personas,
    personaCoveragePercent: percent(personas.filter((p) => p.covered).length, personas.length),
    packsWithNoPersonaCount,
    platforms,
    platformCoveragePercent: percent(platforms.filter((p) => p.covered).length, platforms.length),
  };
}

function resolveRequiredContentTypes(productId: ProductId, requiredPlatformKeysByProduct: Record<string, string[]>): ContentTypeSpec[] {
  const keys = requiredPlatformKeysByProduct[productId] ?? [];
  if (keys.length === 0) return CONTENT_TYPES;
  return CONTENT_TYPES.filter((ct) => keys.includes(ct.key));
}

export function computeAllCoverage(
  products: ProductProfile[],
  packs: MarketingPack[],
  creations: AdCreation[],
  requiredPlatformKeysByProduct: Record<string, string[]>,
): ProductCoverage[] {
  return products.map((product) => computeProductCoverage(product, packs, creations, resolveRequiredContentTypes(product.id, requiredPlatformKeysByProduct)));
}
