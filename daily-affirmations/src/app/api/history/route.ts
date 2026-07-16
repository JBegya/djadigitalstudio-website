import { NextRequest, NextResponse } from 'next/server';
import { historyStore } from '@/server/history/historyStore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  if (date) {
    const entry = historyStore.getRunByDate(date);
    return NextResponse.json({ entry: entry ?? null });
  }
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '60');
  const runs = historyStore.listRuns(limit);
  return NextResponse.json({ runs });
}
