import { NextRequest, NextResponse } from 'next/server';
import { marketingPacksStore } from '@/server/config/marketingPacks';
import { newId } from '@/server/utils/id';
import type { MarketingPack } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ packs: marketingPacksStore.list() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<MarketingPack>;
  if (!body.productId || !body.featureKey || !body.name?.trim()) {
    return NextResponse.json({ error: 'productId, featureKey, and name are required' }, { status: 400 });
  }

  const pack: MarketingPack = {
    id: newId('pack'),
    productId: body.productId,
    featureKey: body.featureKey,
    name: body.name.trim(),
    version: marketingPacksStore.nextVersion(body.productId, body.featureKey, body.name.trim()),
    createdAt: new Date().toISOString(),
    objective: body.objective,
  };
  marketingPacksStore.upsert(pack);
  return NextResponse.json({ pack });
}
