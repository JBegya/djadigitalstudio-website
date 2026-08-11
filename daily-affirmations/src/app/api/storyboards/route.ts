import { NextResponse } from 'next/server';
import { storyboardsStore } from '@/server/config/storyboards';

export const runtime = 'nodejs';
// Every other collection route in this app (marketing-packs, creations, products) pairs GET with
// a mutating method in the same file, which Next.js never statically optimizes. This route is
// GET-only by design (see below), which — with no dynamic API usage — Next.js WOULD otherwise cache
// as a static response (confirmed via `next build`'s output marking it ○ Static while every other
// collection route is ƒ Dynamic), serving a stale snapshot after a storyboard is created or edited.
export const dynamic = 'force-dynamic';

// GET only, deliberately no POST here — a Storyboard can only be created via
// /api/storyboards/generate, since it always needs a resolved pack/hook.
export async function GET() {
  return NextResponse.json({ storyboards: storyboardsStore.list() });
}
