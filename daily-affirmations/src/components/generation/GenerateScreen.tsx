'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { listHistory, startGeneration, subscribeToRun } from '@/lib/api';
import { STAGE_LABELS } from '@/lib/pipelineStages';
import { cn, todayISO } from '@/lib/utils';
import type { GenerationHistoryEntry, GenerationRunProgress, VideoJobProgress } from '@/types/domain';

export function GenerateScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [run, setRun] = useState<GenerationRunProgress | null>(null);
  const [starting, setStarting] = useState(false);
  const [lastRun, setLastRun] = useState<GenerationHistoryEntry | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runId = searchParams.get('runId');

  useEffect(() => {
    if (!runId) return;
    const unsubscribe = subscribeToRun(runId, setRun);
    return unsubscribe;
  }, [runId]);

  useEffect(() => {
    if (runId) return; // only the fallback "no run in progress" start button needs this
    listHistory(1)
      .then(({ runs }) => setLastRun(runs[0] ?? null))
      .catch(() => {});
  }, [runId]);

  const summary = useMemo(() => {
    if (!run) return { done: 0, total: 0, overallPercent: 0 };
    const total = run.jobs.length;
    const done = run.jobs.filter((j) => j.stage === 'done').length;
    const overallPercent = total === 0 ? 0 : Math.round(run.jobs.reduce((sum, j) => sum + j.percent, 0) / total);
    return { done, total, overallPercent };
  }, [run]);

  const hasApprovedToday = lastRun?.date === todayISO() && lastRun.videos.some((v) => v.approved);

  function handleStartClick() {
    if (hasApprovedToday) {
      setConfirmOpen(true);
    } else {
      void handleStart();
    }
  }

  async function handleStart() {
    setConfirmOpen(false);
    setStarting(true);
    try {
      const { runId: newRunId } = await startGeneration();
      router.replace(`/generate?runId=${newRunId}`);
    } finally {
      setStarting(false);
    }
  }

  if (!runId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-semibold">No generation in progress</h1>
          <p className="mt-2 text-sm text-muted-foreground">Start today&apos;s six-video run from here or from the Home screen.</p>
          <Button size="lg" className="mt-6" onClick={handleStartClick} disabled={starting}>
            {starting ? 'Starting…' : "Generate Today's Videos"}
          </Button>
        </main>
        <ConfirmDialog
          open={confirmOpen}
          title="Regenerate today's videos?"
          description={'This will regenerate today\'s content and remove any existing approvals for this batch.\n\nContinue?'}
          confirmLabel="Regenerate All"
          cancelLabel="Cancel"
          destructive
          onConfirm={handleStart}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {run?.status === 'complete' ? 'Generation Complete' : run?.status === 'failed' ? 'Generation Finished With Errors' : "Generating Today's Videos"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {run ? `${summary.done} of ${summary.total} videos complete` : 'Connecting…'}
          </p>
          <Progress value={summary.overallPercent} className="mt-4 h-2.5" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {run?.jobs.map((job, i) => (
            <JobCard key={job.jobId} job={job} index={i} />
          ))}
        </div>

        {run && run.status !== 'running' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-10 flex justify-center gap-3">
            <Button size="lg" onClick={() => router.push('/preview')}>
              Preview Videos
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function JobCard({ job, index }: { job: VideoJobProgress; index: number }) {
  const isDone = job.stage === 'done';
  const isFailed = job.stage === 'failed';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className={cn('overflow-hidden', isFailed && 'border-destructive/40')}>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={job.brand === 'nurse' ? 'nurse' : 'autism'}>{job.brand === 'nurse' ? 'Nurse' : 'Autism Parent'}</Badge>
              <span className="text-xs text-muted-foreground">#{job.index}</span>
            </div>
            {isDone && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
            {!isDone && !isFailed && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <p className="text-sm font-medium text-foreground">{job.topic}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{isFailed ? job.message : STAGE_LABELS[job.stage]}</p>
          <Progress value={job.percent} className="mt-3 h-1.5" />
        </CardContent>
      </Card>
    </motion.div>
  );
}
