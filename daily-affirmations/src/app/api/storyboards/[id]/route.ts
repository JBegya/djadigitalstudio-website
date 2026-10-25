import { NextRequest, NextResponse } from 'next/server';
import { storyboardsStore } from '@/server/config/storyboards';
import type { Storyboard } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const storyboard = storyboardsStore.get(params.id);
  if (!storyboard) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ storyboard });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const existing = storyboardsStore.get(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const patch = (await request.json().catch(() => ({}))) as Partial<Storyboard>;
  const now = new Date().toISOString();
  const next: Storyboard = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
  storyboardsStore.upsert(next);
  return NextResponse.json({ storyboard: next });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  storyboardsStore.remove(params.id);
  return NextResponse.json({ ok: true });
}
