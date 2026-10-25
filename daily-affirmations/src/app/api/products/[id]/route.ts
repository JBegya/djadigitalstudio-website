import { NextRequest, NextResponse } from 'next/server';
import { productStore } from '@/server/config/products';
import type { ProductProfile } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const product = productStore.get(params.id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const patch = (await request.json().catch(() => ({}))) as Partial<ProductProfile>;
  try {
    return NextResponse.json({ product: productStore.update(params.id, patch) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update product' }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  productStore.remove(params.id);
  return NextResponse.json({ ok: true });
}
