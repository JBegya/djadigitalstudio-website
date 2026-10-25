'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { listVideoJobs } from '@/lib/api';
import type { VideoJob } from '@/types/domain';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function statusBadge(job: VideoJob) {
  if (job.status === 'complete') return <Badge variant="success">Complete</Badge>;
  if (job.status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Generating…</Badge>;
}

export function VideosScreen() {
  const [jobs, setJobs] = useState<VideoJob[] | null>(null);

  useEffect(() => {
    listVideoJobs()
      .then((res) => setJobs(res.jobs))
      .catch(() => {
        toast.error('Could not load Videos.');
        setJobs([]);
      });
  }, []);

  if (!jobs) {
    return <div className="p-8 text-sm text-muted-foreground">Loading Videos…</div>;
  }

  if (jobs.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Videos</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          No videos yet. Head to{' '}
          <Link href="/storyboards" className="text-primary underline-offset-4 hover:underline">
            Storyboards
          </Link>{' '}
          and click &quot;Generate Video&quot; on any storyboard.
        </p>
      </main>
    );
  }

  const sorted = [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-foreground">Videos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every video rendered from a Storyboard, newest first.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((job) => (
          <Link
            key={job.id}
            href={`/videos/${job.id}`}
            className="block space-y-2 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:bg-secondary/40"
          >
            {statusBadge(job)}
            <p className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</p>
            {job.durationSeconds && <p className="text-xs text-muted-foreground">{job.durationSeconds}s</p>}
          </Link>
        ))}
      </div>
    </main>
  );
}
