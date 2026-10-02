import { NextRequest, NextResponse } from 'next/server';
import { generateHookSuggestions } from '@/server/ai-services/copyAssistant';
import { productStore } from '@/server/config/products';
import { settingsStore } from '@/server/config/settings';
import { MARKETING_PACK_OBJECTIVE_OPTIONS } from '@/types/domain';
import type { MarketingPackObjective } from '@/types/domain';

export const runtime = 'nodejs';

interface HookSuggestionsBody {
  productId?: string;
  featureKey?: string;
  personaId?: string;
  currentHook?: string;
  objective?: MarketingPackObjective;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as HookSuggestionsBody;
  if (!body.productId || !body.featureKey || typeof body.currentHook !== 'string') {
    return NextResponse.json({ error: 'productId, featureKey, and currentHook are required' }, { status: 400 });
  }

  const product = productStore.get(body.productId);
  if (!product) return NextResponse.json({ error: `Product "${body.productId}" not found` }, { status: 400 });

  const feature = product.features.find((f) => f.key === body.featureKey);
  if (!feature) return NextResponse.json({ error: `Feature "${body.featureKey}" not found` }, { status: 400 });

  const persona = body.personaId ? product.personas.find((p) => p.id === body.personaId) : undefined;
  const objectiveLabel = body.objective ? MARKETING_PACK_OBJECTIVE_OPTIONS.find((o) => o.value === body.objective)?.label : undefined;

  try {
    const settings = settingsStore.load();
    const result = await generateHookSuggestions(settings, {
      currentHook: body.currentHook,
      marketingIdentity: product.marketingIdentity,
      feature: feature.marketing,
      persona,
      objectiveLabel,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not generate hook suggestions' }, { status: 500 });
  }
}
