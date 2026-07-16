import { NextRequest, NextResponse } from 'next/server';
import { ALL_BRAND_IDS } from '@/server/config/brands';
import { VIDEOS_PER_BRAND } from '@/server/pipeline/orchestrator';
import { historyStore } from '@/server/history/historyStore';
import type { BrandId } from '@/types/domain';

export const runtime = 'nodejs';

function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && (ALL_BRAND_IDS as string[]).includes(value);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { date, brand, index, approved } = body as { date?: unknown; brand?: unknown; index?: unknown; approved?: unknown };

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be a YYYY-MM-DD string' }, { status: 400 });
  }
  if (!isBrandId(brand)) {
    return NextResponse.json({ error: `brand must be one of: ${ALL_BRAND_IDS.join(', ')}` }, { status: 400 });
  }
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 1 || index > VIDEOS_PER_BRAND) {
    return NextResponse.json({ error: `index must be an integer between 1 and ${VIDEOS_PER_BRAND}` }, { status: 400 });
  }
  if (typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'approved must be a boolean' }, { status: 400 });
  }

  const entry = historyStore.setVideoApproved(date, brand, index, approved);
  if (!entry) {
    return NextResponse.json({ error: `No video found for ${date} ${brand}/${index}` }, { status: 404 });
  }

  return NextResponse.json({ entry });
}
