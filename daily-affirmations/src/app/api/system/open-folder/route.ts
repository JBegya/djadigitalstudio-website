import fs from 'node:fs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { openInFileManager } from '@/server/utils/systemOpen';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const targetPath = typeof body.path === 'string' ? body.path : null;
  if (!targetPath) return NextResponse.json({ ok: false, error: 'Missing path' }, { status: 400 });

  fs.mkdirSync(targetPath, { recursive: true });

  try {
    await openInFileManager(targetPath);
    return NextResponse.json({ ok: true, error: null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
