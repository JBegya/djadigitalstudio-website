import fs from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';
import { videoJobsStore } from '@/server/config/videoJobs';
import { getVideoWorkDir } from '@/server/config/paths';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const job = videoJobsStore.get(params.id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const job = videoJobsStore.get(params.id);
  if (job?.videoPath && fs.existsSync(job.videoPath)) fs.unlinkSync(job.videoPath);
  const workDir = getVideoWorkDir(params.id);
  if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
  videoJobsStore.remove(params.id);
  return NextResponse.json({ ok: true });
}
