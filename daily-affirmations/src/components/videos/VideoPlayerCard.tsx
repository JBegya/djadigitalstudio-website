'use client';

import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mediaUrl } from '@/lib/api';
import type { VideoJob } from '@/types/domain';

export function VideoPlayerCard({ job, onDelete }: { job: VideoJob; onDelete?: () => void }) {
  if (job.status === 'failed') {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-foreground">Video generation failed</p>
        <p className="text-xs text-muted-foreground">{job.error}</p>
        {onDelete && (
          <Button type="button" size="sm" variant="outline" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    );
  }

  if (!job.videoPath) return null;
  const src = mediaUrl(job.videoPath);

  return (
    <div className="space-y-3">
      <video controls playsInline className="mx-auto max-h-[70vh] rounded-xl border border-border bg-black" src={src} />
      <div className="flex justify-center gap-2">
        <a href={src} download>
          <Button type="button" size="sm" variant="outline">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </a>
        {onDelete && (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
