import { NextRequest, NextResponse } from 'next/server';
import { generateStoryboardScenes } from '@/server/ai-services/storyboardGenerator';
import { creationsStore } from '@/server/config/creations';
import { marketingPacksStore } from '@/server/config/marketingPacks';
import { productStore } from '@/server/config/products';
import { settingsStore } from '@/server/config/settings';
import { storyboardsStore } from '@/server/config/storyboards';
import { newId } from '@/server/utils/id';
import { MARKETING_PACK_OBJECTIVE_OPTIONS } from '@/types/domain';
import type { Storyboard } from '@/types/domain';

export const runtime = 'nodejs';

interface GenerateStoryboardBody {
  packId?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as GenerateStoryboardBody;
  if (!body.packId) return NextResponse.json({ error: 'packId is required' }, { status: 400 });

  const pack = marketingPacksStore.get(body.packId);
  if (!pack) return NextResponse.json({ error: `Marketing Pack "${body.packId}" not found` }, { status: 400 });

  const product = productStore.get(pack.productId);
  if (!product) return NextResponse.json({ error: `Product "${pack.productId}" not found` }, { status: 400 });

  const feature = product.features.find((f) => f.key === pack.featureKey);
  if (!feature) return NextResponse.json({ error: `Feature "${pack.featureKey}" not found` }, { status: 400 });

  const persona = pack.personaId ? product.personas.find((p) => p.id === pack.personaId) : undefined;
  const objectiveLabel = pack.objective ? MARKETING_PACK_OBJECTIVE_OPTIONS.find((o) => o.value === pack.objective)?.label : undefined;

  // Every AdCreation in a pack shares the same headline (generateMarketingPackVersion applies
  // headlineOverride uniformly) — the same fact NewVersionForm already relies on.
  const packHook = creationsStore.list().find((c) => c.packId === pack.id)?.headline ?? '';
  if (!packHook.trim()) {
    return NextResponse.json(
      { error: 'This Marketing Pack has no assets yet — generate at least one advertisement before creating a storyboard.' },
      { status: 400 },
    );
  }

  try {
    const settings = settingsStore.load();
    const result = await generateStoryboardScenes(settings, {
      packHook,
      marketingIdentity: product.marketingIdentity,
      feature: feature.marketing,
      persona,
      objectiveLabel,
    });

    const now = new Date().toISOString();
    const storyboard: Storyboard = {
      id: newId('storyboard'),
      productId: pack.productId,
      featureKey: pack.featureKey,
      personaId: pack.personaId,
      packId: pack.id,
      scenes: result.scenes,
      createdAt: now,
      updatedAt: now,
    };
    storyboardsStore.upsert(storyboard);
    return NextResponse.json({ storyboard, source: result.source, flaggedSceneNumbers: result.flaggedSceneNumbers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not generate storyboard' }, { status: 500 });
  }
}
