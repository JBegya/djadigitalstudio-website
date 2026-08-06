import { NextRequest, NextResponse } from 'next/server';
import { creationsStore } from '@/server/config/creations';
import { newId } from '@/server/utils/id';
import type { AdCreation } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ creations: creationsStore.list() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<AdCreation>;
  if (!body.templateKey || !body.contentTypeKey || !body.canvasJson) {
    return NextResponse.json({ error: 'templateKey, contentTypeKey, and canvasJson are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const creation: AdCreation = {
    id: newId('ad'),
    productId: body.productId ?? 'sample',
    templateKey: body.templateKey,
    contentTypeKey: body.contentTypeKey,
    headline: body.headline ?? '',
    caption: body.caption ?? '',
    cta: body.cta ?? '',
    hashtags: body.hashtags ?? [],
    thumbnailPath: body.thumbnailPath ?? '',
    exportPaths: body.exportPaths ?? [],
    createdAt: now,
    updatedAt: now,
    favorite: body.favorite ?? false,
    canvasJson: body.canvasJson,
    canvasWidthPx: body.canvasWidthPx ?? 1080,
    canvasHeightPx: body.canvasHeightPx ?? 1080,
  };
  creationsStore.upsert(creation);
  return NextResponse.json({ creation });
}
