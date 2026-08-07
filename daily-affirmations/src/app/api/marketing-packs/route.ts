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
  if (!body.productId || !body.featureKey) {
    return NextResponse.json({ error: 'productId and featureKey are required' }, { status: 400 });
  }

  const pack: MarketingPack = {
    id: newId('pack'),
    productId: body.productId,
    featureKey: body.featureKey,
    version: marketingPacksStore.nextVersion(body.productId, body.featureKey),
    createdAt: new Date().toISOString(),
  };
  marketingPacksStore.upsert(pack);
  return NextResponse.json({ pack });
}
