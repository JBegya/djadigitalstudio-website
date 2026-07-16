import { NextRequest, NextResponse } from 'next/server';
import { settingsStore } from '@/server/config/settings';
import { ALL_BRAND_IDS } from '@/server/config/brands';
import { getLatestRun } from '@/server/pipeline/progressStore';
import { startSingleVideoRegeneration, VIDEOS_PER_BRAND } from '@/server/pipeline/orchestrator';
import type { BrandId } from '@/types/domain';

export const runtime = 'nodejs';

function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && (ALL_BRAND_IDS as string[]).includes(value);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { date, brand, index } = body as { date?: unknown; brand?: unknown; index?: unknown };

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be a YYYY-MM-DD string' }, { status: 400 });
  }
  if (!isBrandId(brand)) {
    return NextResponse.json({ error: `brand must be one of: ${ALL_BRAND_IDS.join(', ')}` }, { status: 400 });
  }
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 1 || index > VIDEOS_PER_BRAND) {
    return NextResponse.json({ error: `index must be an integer between 1 and ${VIDEOS_PER_BRAND}` }, { status: 400 });
  }

  const existing = getLatestRun();
  if (existing && existing.status === 'running') {
    return NextResponse.json(
      { error: 'A generation run is already in progress — wait for it to finish before regenerating a video.' },
      { status: 409 },
    );
  }

  const settings = settingsStore.load();
  const { runId, jobId } = startSingleVideoRegeneration(settings, date, brand, index);
  return NextResponse.json({ runId, jobId, date, brand, index });
}
