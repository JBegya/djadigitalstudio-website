import { NextRequest, NextResponse } from 'next/server';
import { productStore } from '@/server/config/products';
import { DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
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
    brandGuidelines: {
      cornerRadiusPx: body.brandGuidelines?.cornerRadiusPx ?? 16,
      buttonStyle: body.brandGuidelines?.buttonStyle ?? 'rounded',
      preferredBackground: body.brandGuidelines?.preferredBackground ?? 'solid',
      logoClearSpacePx: body.brandGuidelines?.logoClearSpacePx ?? 16,
      storeBadgeStyle: body.brandGuidelines?.storeBadgeStyle ?? 'black',
    },
    marketingIdentity: { ...DEFAULT_MARKETING_IDENTITY, ...body.marketingIdentity },
    fontFamily: body.fontFamily,
    status: body.status ?? 'draft',
    appStoreUrl: body.appStoreUrl ?? '',
    appStoreAvailability: body.appStoreAvailability ?? 'not-planned',
    googlePlayUrl: body.googlePlayUrl ?? '',
    googlePlayAvailability: body.googlePlayAvailability ?? 'not-planned',
    websiteUrl: body.websiteUrl ?? '',
    privacyUrl: body.privacyUrl ?? '',
    termsUrl: body.termsUrl ?? '',
    screenshots: [],
    features: body.features ?? [],
    personas: body.personas ?? [],
    keywords: body.keywords ?? [],
  };

  try {
    return NextResponse.json({ product: productStore.create(profile) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create product' }, { status: 409 });
  }
}
