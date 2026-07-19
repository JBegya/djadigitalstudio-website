import { NextRequest, NextResponse } from 'next/server';
import { settingsStore } from '@/server/config/settings';
import { getLatestRun } from '@/server/pipeline/progressStore';
import { startSingleVideoRegeneration } from '@/server/pipeline/orchestrator';
import { parseDateBrandIndex } from '@/server/pipeline/requestValidation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = parseDateBrandIndex(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { date, brand, index } = parsed;

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
