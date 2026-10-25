import { NextRequest, NextResponse } from 'next/server';
import { marketingPacksStore } from '@/server/config/marketingPacks';
import { nextPublishedAt } from '@/server/utils/publishing';
import type { MarketingPack } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const pack = marketingPacksStore.get(params.id);
  if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ pack });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const existing = marketingPacksStore.get(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const patch = (await request.json().catch(() => ({}))) as Partial<MarketingPack>;
  const now = new Date().toISOString();
  const next: MarketingPack = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
  next.publishedAt = nextPublishedAt(existing.publishedAt, patch.status, now);
  marketingPacksStore.upsert(next);
  return NextResponse.json({ pack: next });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  marketingPacksStore.remove(params.id);
  return NextResponse.json({ ok: true });
}
