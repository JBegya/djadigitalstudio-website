import { NextRequest, NextResponse } from 'next/server';
import { historyStore } from '@/server/history/historyStore';
import { parseDateBrandIndex } from '@/server/pipeline/requestValidation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { approved } = body as { approved?: unknown };

  const parsed = parseDateBrandIndex(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'approved must be a boolean' }, { status: 400 });
  }

  const { date, brand, index } = parsed;
  const entry = historyStore.setVideoApproved(date, brand, index, approved);
  if (!entry) {
    return NextResponse.json({ error: `No video found for ${date} ${brand}/${index}` }, { status: 404 });
  }

  return NextResponse.json({ entry });
}
