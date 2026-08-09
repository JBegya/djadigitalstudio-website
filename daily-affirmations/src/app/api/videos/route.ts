import { NextResponse } from 'next/server';
import { videoJobsStore } from '@/server/config/videoJobs';

export const runtime = 'nodejs';
// GET-only route with no mutating sibling method in this file — Next.js statically optimizes
// that combination at build time (confirmed for storyboards/route.ts earlier this session), which
// would serve a stale snapshot instead of live job status. Every new GET-only collection route in
// this app needs this from day one.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ jobs: videoJobsStore.list() });
}
