import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { productStore } from '@/server/config/products';
import { getAssetCategoryDir } from '@/server/config/paths';
import { newId } from '@/server/utils/id';
import type { DeviceKind } from '@/types/domain';

export const runtime = 'nodejs';

const ALLOWED_KINDS = ['logo', 'icon', 'screenshot'] as const;
type Kind = (typeof ALLOWED_KINDS)[number];

function extensionFor(file: File): string {
  const fromName = path.extname(file.name);
  if (fromName) return fromName;
  if (file.type === 'image/svg+xml') return '.svg';
  if (file.type === 'image/png') return '.png';
  if (file.type === 'image/jpeg') return '.jpg';
  if (file.type === 'image/webp') return '.webp';
  return '';
}

async function writeUploadedFile(file: File, dir: string): Promise<string> {
  const fileName = `${newId('asset')}${extensionFor(file)}`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));
  return filePath;
}

/**
 * Uploads via `multipart/form-data`, not base64 JSON — real screenshots can be several MB, and
 * `request.formData()` avoids the ~33% base64 bloat and multi-MB `JSON.parse` that would come
 * with encoding them as a data URL (fine for M2's canvas-rendered exports, which stay small).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const product = productStore.get(params.id);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const form = await request.formData();
  const kind = form.get('kind');
  if (typeof kind !== 'string' || !ALLOWED_KINDS.includes(kind as Kind)) {
    return NextResponse.json({ error: `kind must be one of: ${ALLOWED_KINDS.join(', ')}` }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const dir = getAssetCategoryDir(product.name.replace(/[\\/]/g, '-'), kind as Kind);
  const filePath = await writeUploadedFile(file, dir);

  if (kind === 'logo') {
    return NextResponse.json({ product: productStore.setLogo(product.id, filePath) });
  }
  if (kind === 'icon') {
    return NextResponse.json({ product: productStore.setIcon(product.id, filePath) });
  }

  // screenshot — a client-generated thumbnail rides alongside the original (see
  // src/lib/assets/thumbnail.ts); SVG uploads skip this and use the file itself as its own thumbnail.
  const thumbnail = form.get('thumbnail');
  const thumbnailPath = thumbnail instanceof File ? await writeUploadedFile(thumbnail, dir) : undefined;
  const label = typeof form.get('label') === 'string' ? (form.get('label') as string) : file.name;
  const device = typeof form.get('device') === 'string' ? (form.get('device') as string) : 'iphone';

  const updated = productStore.addScreenshot(product.id, {
    id: newId('shot'),
    path: filePath,
    thumbnailPath,
    label,
    device: device as DeviceKind,
  });
  return NextResponse.json({ product: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const product = productStore.get(params.id);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const kind = request.nextUrl.searchParams.get('kind');
  if (kind === 'logo') {
    if (product.logoPath) fs.rmSync(product.logoPath, { force: true });
    return NextResponse.json({ product: productStore.setLogo(product.id, undefined) });
  }
  if (kind === 'icon') {
    if (product.appIconPath) fs.rmSync(product.appIconPath, { force: true });
    return NextResponse.json({ product: productStore.setIcon(product.id, undefined) });
  }
  if (kind === 'screenshot') {
    const assetId = request.nextUrl.searchParams.get('assetId');
    const shot = product.screenshots.find((s) => s.id === assetId);
    if (!shot) return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    fs.rmSync(shot.path, { force: true });
    if (shot.thumbnailPath) fs.rmSync(shot.thumbnailPath, { force: true });
    return NextResponse.json({ product: productStore.removeScreenshot(product.id, shot.id) });
  }
  return NextResponse.json({ error: 'kind must be logo, icon, or screenshot' }, { status: 400 });
}
