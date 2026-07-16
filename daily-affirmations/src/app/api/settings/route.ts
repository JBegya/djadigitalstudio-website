import { NextRequest, NextResponse } from 'next/server';
import { settingsStore } from '@/server/config/settings';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(settingsStore.redacted());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Never let the client blank out a saved key by sending back the masked placeholder —
  // only accept a new key if it looks like a real, un-masked value.
  const patch: Record<string, unknown> = { ...body };
  for (const key of ['openaiApiKey', 'pexelsApiKey'] as const) {
    if (typeof patch[key] === 'string' && (patch[key] as string).includes('••••')) {
      delete patch[key];
    }
  }

  settingsStore.update(patch);
  return NextResponse.json(settingsStore.redacted());
}
