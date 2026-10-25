'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { VideoJobProgressCard } from '@/components/videos/VideoJobProgressCard';
import { VideoPlayerCard } from '@/components/videos/VideoPlayerCard';
import { deleteVideoJob, getVideoJob, subscribeToVideoJob } from '@/lib/api';
import type { VideoJob } from '@/types/domain';

export function VideoJobDetailScreen({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getVideoJob(jobId)
      .then((res) => setJob(res.job))
      .catch(() => setNotFound(true));
  }, [jobId]);

  useEffect(() => {
    if (!job || job.status !== 'running') return;
    return subscribeToVideoJob(jobId, setJob);
  }, [jobId, job]);

  async function handleDelete() {
    try {
      await deleteVideoJob(jobId);
      toast.success('Video deleted.');
      router.push('/videos');
    } catch {
      toast.error('Could not delete that video.');
    }
  }

  if (notFound) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Video not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/videos" className="text-primary underline-offset-4 hover:underline">
            Back to Videos
          </Link>
        </p>
      </main>
    );
  }

  if (!job) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <Link href="/videos" className="text-xs text-primary underline-offset-4 hover:underline">
            ← Back to Videos
          </Link>
          <h1 className="mt-1 font-display text-xl font-semibold text-foreground">Video</h1>
        </div>
        {job.status === 'running' ? <VideoJobProgressCard job={job} /> : <VideoPlayerCard job={job} onDelete={handleDelete} />}
      </div>
    </main>
  );
}
