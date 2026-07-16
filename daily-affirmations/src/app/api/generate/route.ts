import { NextResponse } from 'next/server';
import { settingsStore } from '@/server/config/settings';
import { dateStamp } from '@/server/config/paths';
import { getLatestRun } from '@/server/pipeline/progressStore';
import { startDailyGeneration } from '@/server/pipeline/orchestrator';

export const runtime = 'nodejs';

export async function POST() {
  const existing = getLatestRun();
  if (existing && existing.status === 'running') {
    return NextResponse.json({ runId: existing.runId, date: existing.date, alreadyRunning: true });
  }

  const settings = settingsStore.load();
  const date = dateStamp();
  const { runId } = startDailyGeneration(settings, date);
  return NextResponse.json({ runId, date, alreadyRunning: false });
}

export async function GET() {
  const run = getLatestRun();
  return NextResponse.json({ run: run ?? null });
}
