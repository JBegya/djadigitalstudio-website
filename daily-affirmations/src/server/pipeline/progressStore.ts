import type { GenerationRunProgress, VideoJobProgress } from '@/types/domain';

// In-memory only — this is a single-user desktop app, and progress is meaningful only for
// the lifetime of the Node process actually running the render. Persisted results (the
// finished videos + GenerationHistoryEntry) live on disk via historyStore/exportService.
const runs = new Map<string, GenerationRunProgress>();
let latestRunId: string | null = null;

export function createRun(runId: string, date: string, jobs: VideoJobProgress[]): GenerationRunProgress {
  const run: GenerationRunProgress = { runId, date, startedAt: new Date().toISOString(), status: 'running', jobs };
  runs.set(runId, run);
  latestRunId = runId;
  return run;
}

export function updateJob(runId: string, jobId: string, patch: Partial<VideoJobProgress>): void {
  const run = runs.get(runId);
  if (!run) return;
  const job = run.jobs.find((j) => j.jobId === jobId);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

export function finishRun(runId: string, status: 'complete' | 'failed'): void {
  const run = runs.get(runId);
  if (!run) return;
  run.status = status;
  run.finishedAt = new Date().toISOString();
}

export function getRun(runId: string): GenerationRunProgress | undefined {
  return runs.get(runId);
}

export function getLatestRun(): GenerationRunProgress | undefined {
  return latestRunId ? runs.get(latestRunId) : undefined;
}
