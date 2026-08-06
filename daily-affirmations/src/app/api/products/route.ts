import { NextRequest, NextResponse } from 'next/server';
import { productStore } from '@/server/config/products';
import type { ProductProfile } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ products: productStore.list() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<ProductProfile>;
  if (!body.id || !body.name) {
    return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
  }
  const profile: ProductProfile = {
    id: body.id,
    name: body.name,
    tagline: body.tagline ?? '',
    description: body.description ?? '',
    appIconPath: body.appIconPath,
    logoPath: body.logoPath,
    brandColors: { primary: body.brandColors?.primary ?? '#7c9cff', secondary: body.brandColors?.secondary, accent: body.brandColors?.accent },
    fontFamily: body.fontFamily,
    appStoreUrl: body.appStoreUrl ?? '',
    googlePlayUrl: body.googlePlayUrl ?? '',
    websiteUrl: body.websiteUrl ?? '',
    privacyUrl: body.privacyUrl ?? '',
    termsUrl: body.termsUrl ?? '',
    screenshots: [],
    features: body.features ?? [],
    targetAudience: body.targetAudience ?? [],
    keywords: body.keywords ?? [],
  };

  try {
    return NextResponse.json({ product: productStore.create(profile) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create product' }, { status: 409 });
  }
}
