import type { PipelineStage } from '@/types/domain';

export const STAGE_LABELS: Record<PipelineStage, string> = {
  queued: 'Queued',
  script: 'Writing script',
  voice: 'Recording voice',
  background: 'Selecting background',
  subtitles: 'Timing subtitles',
  music: 'Choosing music',
  compose: 'Composing video',
  thumbnail: 'Generating thumbnail',
  captions: 'Writing captions',
  quality: 'Quality check',
  export: 'Exporting',
  done: 'Done',
  failed: 'Failed',
};
