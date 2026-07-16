import fs from 'node:fs';
import path from 'node:path';
import type { BrandId, GenerationHistoryEntry, PipelineStage, Settings, VideoJobProgress, VideoResult } from '@/types/domain';
import { writeAffirmationScript, type ScriptResult } from '@/server/ai-services/scriptWriter';
import { generateVoice, type VoiceResult } from '@/server/ai-services/voiceGenerator';
import { writeSocialCopy, type SocialCopyResult } from '@/server/ai-services/socialCopyWriter';
import { ALL_BRAND_IDS, getBrand } from '@/server/config/brands';
import { getFontsDir, getRenderWorkDir } from '@/server/config/paths';
import { exportVideoAssets } from '@/server/export/exportService';
import { historyStore } from '@/server/history/historyStore';
import { fetchBackgroundVideo, type BackgroundResult } from '@/server/media-services/backgroundMediaService';
import { pickMusicTrack, type MusicPick } from '@/server/media-services/musicService';
import { runQualityChecks, type QualityReport } from '@/server/quality-engine';
import { createLogger } from '@/server/utils/logger';
import { newId } from '@/server/utils/id';
import { CANVAS_HEIGHT, CANVAS_WIDTH, composeVideo, type ComposeResult } from '@/server/video-engine/videoComposer';
import { generateSubtitles, type SubtitleGenerationResult } from '@/server/video-engine/subtitleService';
import { generateThumbnail, type ThumbnailResult } from '@/server/video-engine/thumbnailService';
import { createRun, finishRun, updateJob } from './progressStore';

const log = createLogger('orchestrator');
const MAX_QUALITY_CYCLES = 3;
const MAX_CONCURRENT_JOBS = 3;
export const VIDEOS_PER_BRAND = 3;

const STAGE_ORDER: PipelineStage[] = ['script', 'voice', 'background', 'subtitles', 'music', 'compose', 'captions', 'thumbnail'];

function atOrAfter(stage: PipelineStage, restartFrom: PipelineStage): boolean {
  const a = STAGE_ORDER.indexOf(stage);
  const b = STAGE_ORDER.indexOf(restartFrom);
  if (a === -1 || b === -1) return true;
  return a >= b;
}

interface JobSpec {
  brand: BrandId;
  index: number;
  topicKey: string;
}

interface JobState {
  script?: ScriptResult;
  voice?: VoiceResult;
  background?: BackgroundResult;
  subtitles?: SubtitleGenerationResult;
  music?: MusicPick | null;
  composed?: ComposeResult;
  social?: SocialCopyResult;
  thumbnail?: ThumbnailResult;
  targetDuration?: number;
  testMode?: boolean;
}

function isMusicConfigured(musicFolder: string): boolean {
  try {
    return fs.existsSync(musicFolder) && fs.readdirSync(musicFolder).some((f) => !f.startsWith('.') && !f.toLowerCase().endsWith('.md'));
  } catch {
    return false;
  }
}

async function runVideoJob(runId: string, jobId: string, spec: JobSpec, settings: Settings, date: string): Promise<VideoResult> {
  const workDir = getRenderWorkDir(runId, jobId);
  const fontsDir = getFontsDir();
  const brandDef = getBrand(spec.brand);
  const topicLabel = brandDef.topics.find((t) => t.key === spec.topicKey)?.label ?? spec.topicKey;

  const emit = (stage: PipelineStage, percent: number, message: string, attempt: number) =>
    updateJob(runId, jobId, { stage, percent, message, attempt });

  const state: JobState = {};
  let quality: QualityReport | null = null;
  let restartFrom: PipelineStage = 'script';
  let cycle = 1;

  try {
    while (cycle <= MAX_QUALITY_CYCLES) {
      if (atOrAfter('script', restartFrom)) {
        emit('script', 5, 'Writing affirmation script…', cycle);
        state.script = await writeAffirmationScript({
          brand: spec.brand,
          topicKey: spec.topicKey,
          settings,
          avoidExamples: historyStore.getRecentTexts(spec.brand, 10),
        });
      }

      if (atOrAfter('voice', restartFrom)) {
        emit('voice', 20, 'Recording voiceover…', cycle);
        state.voice = await generateVoice({
          text: state.script!.text,
          voice: settings.voice,
          settings,
          outputPath: path.join(workDir, 'voice.wav'),
        });
        state.targetDuration = Math.min(30, Math.max(15, state.voice.durationSeconds + 1.2));
      }

      if (atOrAfter('background', restartFrom)) {
        emit('background', 35, 'Selecting background footage…', cycle);
        state.background = await fetchBackgroundVideo({
          brand: spec.brand,
          topicKey: spec.topicKey,
          durationSeconds: state.targetDuration!,
          settings,
          outputPath: path.join(workDir, 'background.mp4'),
        });
      }

      if (atOrAfter('subtitles', restartFrom)) {
        emit('subtitles', 50, 'Timing subtitles…', cycle);
        state.subtitles = await generateSubtitles({
          text: state.script!.text,
          audioPath: state.voice!.audioPath,
          durationSeconds: state.targetDuration!,
          settings,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          outputAssPath: path.join(workDir, 'subs.ass'),
        });
      }

      if (atOrAfter('music', restartFrom)) {
        emit('music', 58, 'Choosing background music…', cycle);
        state.music = pickMusicTrack(settings.musicFolder);
      }

      if (atOrAfter('compose', restartFrom)) {
        emit('compose', 65, 'Composing final video…', cycle);
        const testMode = state.script!.source === 'mock' || state.voice!.source === 'mock' || state.background!.source === 'mock';
        state.composed = await composeVideo({
          backgroundVideoPath: state.background!.videoPath,
          voiceAudioPath: state.voice!.audioPath,
          musicAudioPath: state.music?.path ?? null,
          assSubtitlePath: state.subtitles!.assPath,
          logoPath: settings.logoPath || null,
          fontsDir,
          durationSeconds: state.targetDuration!,
          outputPath: path.join(workDir, 'final.mp4'),
          testModeWatermark: testMode,
        });
        state.testMode = testMode;
      }

      if (atOrAfter('captions', restartFrom)) {
        emit('captions', 80, 'Writing captions and hashtags…', cycle);
        state.social = await writeSocialCopy({
          brand: spec.brand,
          topicLabel: state.script!.topicLabel,
          affirmationText: state.script!.text,
          settings,
        });
      }

      if (atOrAfter('thumbnail', restartFrom)) {
        emit('thumbnail', 88, 'Generating thumbnail…', cycle);
        state.thumbnail = await generateThumbnail({
          backgroundVideoPath: state.background!.videoPath,
          hookText: state.social!.thumbnailHook,
          logoPath: settings.logoPath || null,
          fontsDir,
          outputPath: path.join(workDir, 'thumbnail.png'),
        });
      }

      emit('quality', 93, 'Running quality checks…', cycle);
      quality = await runQualityChecks({
        brand: spec.brand,
        affirmationText: state.script!.text,
        voiceAudioPath: state.voice!.audioPath,
        finalVideoPath: state.composed!.outputPath,
        cues: state.subtitles!.cues,
        backgroundSource: state.background!.source,
        pexelsConfigured: Boolean(settings.pexelsApiKey),
        musicUsed: Boolean(state.music),
        musicConfigured: isMusicConfigured(settings.musicFolder),
      });

      if (quality.passed || !quality.regenerateComponent) break;
      if (cycle >= MAX_QUALITY_CYCLES) {
        log.warn(`${spec.brand}/${spec.index}: quality checks still failing after ${cycle} cycles — exporting best effort`);
        break;
      }
      restartFrom = quality.regenerateComponent;
      cycle++;
    }

    emit('export', 97, 'Exporting files…', cycle);
    historyStore.recordAffirmation(spec.brand, spec.topicKey, state.script!.text, date);
    const exported = exportVideoAssets({
      outputFolder: settings.outputFolder,
      date,
      brand: spec.brand,
      index: spec.index,
      videoPath: state.composed!.outputPath,
      thumbnailPath: state.thumbnail!.outputPath,
      captions: state.social!.captions,
      hashtags: state.social!.hashtags,
    });

    emit('done', 100, 'Complete', cycle);

    return {
      jobId,
      brand: spec.brand,
      index: spec.index,
      topic: topicLabel,
      affirmationText: state.script!.text,
      videoPath: exported.videoPath,
      thumbnailPath: exported.thumbnailPath,
      captionPath: exported.captionPath,
      hashtagsPath: exported.hashtagsPath,
      hashtags: state.social!.hashtags,
      captions: state.social!.captions,
      durationSeconds: state.composed!.durationSeconds,
      createdAt: new Date().toISOString(),
      qualityPassed: quality?.passed ?? false,
      qualityIssues: quality ? quality.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.message}`) : [],
      testMode: state.testMode ?? false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`${spec.brand}/${spec.index} failed: ${message}`);
    updateJob(runId, jobId, { stage: 'failed', percent: 0, message, attempt: cycle });
    throw error;
  } finally {
    // Working files are intentionally left on disk for debugging until the next run cleans
    // its own workDir — Exports/ already has the copies that matter.
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    const item = items[i] as T;
    try {
      const value = await worker(item, i);
      results[i] = { status: 'fulfilled', value };
    } catch (reason) {
      results[i] = { status: 'rejected', reason };
    }
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

const EXPECTED_VIDEOS_PER_DAY = ALL_BRAND_IDS.length * VIDEOS_PER_BRAND;

function computeRunStatus(videoCount: number): GenerationHistoryEntry['status'] {
  if (videoCount <= 0) return 'failed';
  return videoCount >= EXPECTED_VIDEOS_PER_DAY ? 'complete' : 'partial';
}

async function executeDailyGeneration(runId: string, specs: JobSpec[], jobIds: string[], settings: Settings, date: string): Promise<void> {
  try {
    const settled = await runWithConcurrency(specs, MAX_CONCURRENT_JOBS, (spec, i) =>
      runVideoJob(runId, jobIds[i] as string, spec, settings, date),
    );

    const videos: VideoResult[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') videos.push(result.value);
    }

    const status = computeRunStatus(videos.length);
    finishRun(runId, status === 'failed' ? 'failed' : 'complete');

    const entry: GenerationHistoryEntry = {
      date,
      runId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status,
      videos,
    };
    historyStore.recordRun(entry);
    log.info(`Finished daily generation ${runId}: ${videos.length}/${specs.length} videos, status=${status}`);
  } catch (error) {
    // Every per-job failure is already caught inside runVideoJob/runWithConcurrency — this
    // only fires for a genuinely unexpected orchestration bug, and it must never crash the
    // server process (per the "never crash" requirement).
    log.error(`Daily generation ${runId} crashed unexpectedly: ${error instanceof Error ? error.message : error}`);
    finishRun(runId, 'failed');
  }
}

/**
 * Kicks off the six-video daily run and returns immediately with a runId — the actual
 * rendering happens in the background. Callers (the /api/generate route) poll or stream
 * /api/generate/stream?runId=... via progressStore for live status.
 */
export function startDailyGeneration(settings: Settings, date: string): { runId: string; date: string } {
  const runId = newId('run');
  log.info(`Starting daily generation ${runId} for ${date}`);

  const specs: JobSpec[] = [];
  for (const brand of ALL_BRAND_IDS) {
    const topics = historyStore.pickNextTopics(brand, VIDEOS_PER_BRAND);
    topics.forEach((topicKey, i) => specs.push({ brand, index: i + 1, topicKey }));
  }

  const jobIds = specs.map(() => newId('job'));
  const initialJobs: VideoJobProgress[] = specs.map((spec, i) => ({
    jobId: jobIds[i] as string,
    brand: spec.brand,
    index: spec.index,
    topic: getBrand(spec.brand).topics.find((t) => t.key === spec.topicKey)?.label ?? spec.topicKey,
    stage: 'queued',
    percent: 0,
    message: 'Waiting to start',
    attempt: 1,
    updatedAt: new Date().toISOString(),
  }));
  createRun(runId, date, initialJobs);

  void executeDailyGeneration(runId, specs, jobIds, settings, date);

  return { runId, date };
}

/** Merges a freshly-regenerated video into the day's existing history entry, replacing whatever
 * previously occupied that brand+index slot (whether it succeeded or failed last time). Reuses
 * the ORIGINAL day's runId (not the regenerate job's own ephemeral runId) so this stays the same
 * persisted history row rather than forking a second entry for the same date. */
function mergeVideoIntoHistory(date: string, result: VideoResult): void {
  const existing = historyStore.getRunByDate(date);
  if (!existing) {
    historyStore.recordRun({
      date,
      runId: newId('run'),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: computeRunStatus(1),
      videos: [result],
    });
    return;
  }

  const videos = existing.videos.filter((v) => !(v.brand === result.brand && v.index === result.index));
  videos.push(result);
  historyStore.recordRun({
    ...existing,
    finishedAt: new Date().toISOString(),
    status: computeRunStatus(videos.length),
    videos,
  });
}

async function executeSingleVideoRegeneration(runId: string, jobId: string, spec: JobSpec, settings: Settings, date: string): Promise<void> {
  try {
    const result = await runVideoJob(runId, jobId, spec, settings, date);
    finishRun(runId, 'complete');
    mergeVideoIntoHistory(date, result);
    log.info(`Finished regeneration ${runId}: ${spec.brand}/${spec.index}`);
  } catch (error) {
    // runVideoJob already logs the failure and marks the job 'failed' in progressStore — nothing
    // further to persist here, the previous history entry for this slot is left untouched.
    log.error(`Regeneration ${runId} for ${spec.brand}/${spec.index} crashed: ${error instanceof Error ? error.message : error}`);
    finishRun(runId, 'failed');
  }
}

/**
 * Regenerates a single video (one brand + slot index) without re-running the other five —
 * used from Preview when one video needs a redo (bad take, failed QA, wrong topic) rather than
 * burning API calls and render time on a full daily batch. Picks a fresh topic the same way the
 * daily batch does, then merges the result back into that date's existing history entry.
 */
export function startSingleVideoRegeneration(settings: Settings, date: string, brand: BrandId, index: number): { runId: string; date: string; jobId: string } {
  const runId = newId('run');
  const jobId = newId('job');
  log.info(`Starting single-video regeneration ${runId} for ${date} ${brand}/${index}`);

  const [topicKey] = historyStore.pickNextTopics(brand, 1);
  const spec: JobSpec = { brand, index, topicKey: topicKey ?? getBrand(brand).topics[0]?.key ?? 'gratitude' };

  const initialJob: VideoJobProgress = {
    jobId,
    brand: spec.brand,
    index: spec.index,
    topic: getBrand(spec.brand).topics.find((t) => t.key === spec.topicKey)?.label ?? spec.topicKey,
    stage: 'queued',
    percent: 0,
    message: 'Waiting to start',
    attempt: 1,
    updatedAt: new Date().toISOString(),
  };
  createRun(runId, date, [initialJob]);

  void executeSingleVideoRegeneration(runId, jobId, spec, settings, date);

  return { runId, date, jobId };
}
