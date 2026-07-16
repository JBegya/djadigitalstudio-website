'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Copy, FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSettings, listHistory, mediaUrl, regenerateVideo, setVideoApproved, subscribeToRun } from '@/lib/api';
import { openFolderPath } from '@/lib/desktop';
import { STAGE_LABELS } from '@/lib/pipelineStages';
import { cn, formatDateLabel, formatDuration } from '@/lib/utils';
import type { CaptionSet, GenerationHistoryEntry, VideoJobProgress, VideoResult } from '@/types/domain';

const CAPTION_TABS: { key: keyof CaptionSet; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtubeShorts', label: 'YouTube Shorts' },
];

async function copyText(text: string, label: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export function PreviewScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allRuns, setAllRuns] = useState<GenerationHistoryEntry[]>([]);
  const [outputFolder, setOutputFolder] = useState('');
  const requestedDate = searchParams.get('date');

  useEffect(() => {
    listHistory(90).then(({ runs }) => setAllRuns(runs));
    getSettings().then((s) => setOutputFolder(s.outputFolder));
  }, []);

  const activeEntry = useMemo(() => {
    if (allRuns.length === 0) return null;
    if (requestedDate) return allRuns.find((r) => r.date === requestedDate) ?? null;
    return allRuns[0] ?? null;
  }, [allRuns, requestedDate]);

  // Two full-batch runs on the same date (re-generating an entire day) both carry that date —
  // dedupe by date, keeping the most recent (allRuns is already newest-first), so the date
  // picker never renders two options with the same value.
  const runsByDate = useMemo(() => {
    const seen = new Set<string>();
    return allRuns.filter((r) => (seen.has(r.date) ? false : (seen.add(r.date), true)));
  }, [allRuns]);

  const nurseVideos = activeEntry?.videos.filter((v) => v.brand === 'nurse') ?? [];
  const autismVideos = activeEntry?.videos.filter((v) => v.brand === 'autism') ?? [];

  function refreshHistory() {
    listHistory(90).then(({ runs }) => setAllRuns(runs));
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Today&apos;s Videos</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{activeEntry ? formatDateLabel(activeEntry.date) : 'No videos yet'}</p>
              {activeEntry && activeEntry.videos.length > 0 && (
                <Badge variant={activeEntry.videos.every((v) => v.approved) ? 'success' : 'secondary'}>
                  {activeEntry.videos.filter((v) => v.approved).length} of {activeEntry.videos.length} approved
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {runsByDate.length > 0 && (
              <Select value={activeEntry?.date} onValueChange={(date) => router.push(`/preview?date=${date}`)}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select a date" />
                </SelectTrigger>
                <SelectContent>
                  {runsByDate.map((r) => (
                    <SelectItem key={r.date} value={r.date}>
                      {formatDateLabel(r.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => openFolderPath(outputFolder)}>
              <FolderOpen className="h-4 w-4" />
              Export Folder
            </Button>
          </div>
        </div>

        {!activeEntry && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nothing generated yet — go to Home and click Generate Today&apos;s Videos.
            </CardContent>
          </Card>
        )}

        {activeEntry && (
          <div className="space-y-10">
            <BrandSection title="Nurse Affirmations" variant="nurse" videos={nurseVideos} date={activeEntry.date} onDataChanged={refreshHistory} />
            <BrandSection title="Autism Parent Affirmations" variant="autism" videos={autismVideos} date={activeEntry.date} onDataChanged={refreshHistory} />
          </div>
        )}
      </main>
    </div>
  );
}

function BrandSection({
  title,
  variant,
  videos,
  date,
  onDataChanged,
}: {
  title: string;
  variant: 'nurse' | 'autism';
  videos: VideoResult[];
  date: string;
  onDataChanged: () => void;
}) {
  if (videos.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Badge variant={variant}>{title}</Badge>
        <span className="text-xs text-muted-foreground">{videos.length} videos</span>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {videos.map((video) => (
          <VideoCard key={`${video.brand}-${video.index}`} video={video} date={date} onDataChanged={onDataChanged} />
        ))}
      </div>
    </section>
  );
}

function VideoCard({ video, date, onDataChanged }: { video: VideoResult; date: string; onDataChanged: () => void }) {
  const [regenJob, setRegenJob] = useState<VideoJobProgress | null>(null);
  const [approved, setApproved] = useState(video.approved);
  const [approving, setApproving] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => unsubscribeRef.current?.(), []);
  useEffect(() => setApproved(video.approved), [video.approved]);

  const isRegenerating = Boolean(regenJob && regenJob.stage !== 'done' && regenJob.stage !== 'failed');

  async function handleRegenerate() {
    if (isRegenerating) return;
    setRegenJob(null);
    try {
      const { runId } = await regenerateVideo(date, video.brand, video.index);
      unsubscribeRef.current = subscribeToRun(
        runId,
        (run) => setRegenJob(run.jobs[0] ?? null),
        () => onDataChanged(),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start regeneration');
    }
  }

  async function handleToggleApprove() {
    const next = !approved;
    setApproved(next); // optimistic — this is a lightweight, low-stakes toggle
    setApproving(true);
    try {
      await setVideoApproved(date, video.brand, video.index, next);
      if (next) toast.success(`Approved — ${video.brand === 'nurse' ? 'Nurse' : 'Autism Parent'} #${video.index}`);
      onDataChanged(); // also doubles as "refresh the day's data" — keeps the header's X-of-6 count in sync
    } catch (error) {
      setApproved(!next); // roll back on failure
      toast.error(error instanceof Error ? error.message : 'Could not update approval status');
    } finally {
      setApproving(false);
    }
  }

  useEffect(() => {
    if (regenJob?.stage === 'done') toast.success(`Video regenerated — ${video.brand === 'nurse' ? 'Nurse' : 'Autism Parent'} #${video.index}`);
    if (regenJob?.stage === 'failed') toast.error(`Regeneration failed: ${regenJob.message}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenJob?.stage]);

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[9/16] w-full bg-black">
        <video
          src={mediaUrl(video.videoPath)}
          poster={mediaUrl(video.thumbnailPath)}
          controls
          preload="metadata"
          className="h-full w-full object-cover"
        />
        {video.testMode && (
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">TEST MODE</span>
        )}
        {approved && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        )}
        {isRegenerating && regenJob && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-xs font-medium">{STAGE_LABELS[regenJob.stage]}</p>
            <Progress value={regenJob.percent} className="h-1.5 w-28" />
          </div>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{video.topic}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatDuration(video.durationSeconds)}</span>
            <Badge variant={video.qualityPassed ? 'success' : 'warning'}>{video.qualityPassed ? 'Passed QA' : 'Review'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>Emotional {video.qualityScore.emotionalImpact}/10</span>
          <span>Visual {video.qualityScore.visualQuality}/10</span>
          <span>Captions {video.qualityScore.captionReadability}/10</span>
          <span className="font-semibold text-foreground">Overall {video.qualityScore.overall}/10</span>
        </div>
        <p className="line-clamp-3 text-sm text-foreground">{video.affirmationText}</p>

        <Tabs defaultValue="facebook">
          <TabsList className="grid w-full grid-cols-4">
            {CAPTION_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="px-1 text-[11px]">
                {tab.label.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
          {CAPTION_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-2">
              <p className="line-clamp-4 text-xs text-muted-foreground">{video.captions[tab.key]}</p>
              <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={() => copyText(video.captions[tab.key], tab.label)}>
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">{video.hashtags.length} hashtags</span>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => copyText(video.hashtags.join(' '), 'Hashtags')}>
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleRegenerate} disabled={isRegenerating}>
            <RefreshCw className={cn('h-3 w-3', isRegenerating && 'animate-spin')} />
            Regenerate
          </Button>
          <Button
            size="sm"
            variant={approved ? 'default' : 'outline'}
            className={cn('h-7 px-2 text-xs', approved && 'bg-emerald-600 text-white hover:bg-emerald-700')}
            onClick={handleToggleApprove}
            disabled={approving || isRegenerating}
          >
            <CheckCircle2 className="h-3 w-3" />
            {approved ? 'Approved' : 'Approve'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
