import { NextResponse } from 'next/server';
import { getLogsDirectory } from '@/server/utils/logger';
import { openInFileManager } from '@/server/utils/systemOpen';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await openInFileManager(getLogsDirectory());
    return NextResponse.json({ ok: true, error: null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
