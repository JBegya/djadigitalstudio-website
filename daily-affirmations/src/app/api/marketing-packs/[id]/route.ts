import { NextRequest, NextResponse } from 'next/server';
import { marketingPacksStore } from '@/server/config/marketingPacks';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const pack = marketingPacksStore.get(params.id);
  if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ pack });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  marketingPacksStore.remove(params.id);
  return NextResponse.json({ ok: true });
}
