import { Loader2 } from 'lucide-react';
import type { VideoJob, VideoJobStage } from '@/types/domain';

// Defined locally rather than imported from videoOrchestrator.ts — that file is server-only
// (child_process, fs) and must never reach the client bundle, the same lesson M9's flagScenes.ts
// was split out for.
const STAGE_LABELS: Record<VideoJobStage, string> = {
  keyframes: 'Rendering scene keyframes',
  animate: 'Animating scenes',
  voiceover: 'Generating voiceover',
  subtitles: 'Aligning subtitles',
  compose: 'Composing final video',
  done: 'Complete',
  failed: 'Failed',
};

export function VideoJobProgressCard({ job }: { job: VideoJob }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-6">
      <div className="flex items-center gap-2">
        {job.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        <p className="text-sm font-medium text-foreground">{STAGE_LABELS[job.progress.stage]}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${job.progress.percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{job.progress.message}</p>
    </div>
  );
}
