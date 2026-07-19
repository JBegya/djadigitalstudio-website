import { NextResponse } from 'next/server';
import { ALL_BRAND_IDS, getBrand } from '@/server/config/brands';

export const runtime = 'nodejs';

/** Non-secret brand metadata (name, Content Modes, accent color) for client-side UI — no API keys or prompts. */
export async function GET() {
  const brands = ALL_BRAND_IDS.map((id) => {
    const brand = getBrand(id);
    return { id: brand.id, name: brand.name, contentModes: brand.contentModes, accentColor: brand.accentColor };
  });
  return NextResponse.json({ brands });
}
