import { execFile } from 'node:child_process';
import fs from 'node:fs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function openInFileManager(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    // execFile with an argv array — never goes through a shell, so the path can't be
    // interpreted as shell syntax no matter what characters it contains.
    execFile(command, [targetPath], (error) => {
      // Windows' `explorer` returns a non-zero exit code on success in some environments —
      // treat it as best-effort rather than a hard failure.
      if (error && process.platform !== 'win32') reject(error);
      else resolve();
    });
  });
}

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
