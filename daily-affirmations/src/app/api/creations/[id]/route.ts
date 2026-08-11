import { NextRequest, NextResponse } from 'next/server';
import { creationsStore } from '@/server/config/creations';
import { nextPublishedAt } from '@/server/utils/publishing';
import type { AdCreation } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const creation = creationsStore.get(params.id);
  if (!creation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ creation });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const existing = creationsStore.get(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const patch = (await request.json().catch(() => ({}))) as Partial<AdCreation>;
  const next: AdCreation = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
  next.publishedAt = nextPublishedAt(existing.publishedAt, patch.status, next.updatedAt);
  creationsStore.upsert(next);
  return NextResponse.json({ creation: next });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  creationsStore.remove(params.id);
  return NextResponse.json({ ok: true });
}
