import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VideoJobsStore } from '@/server/config/videoJobs';
import type { VideoJob } from '@/types/domain';

function sampleJob(overrides: Partial<VideoJob> = {}): VideoJob {
  return {
    id: 'video_test1',
    storyboardId: 'storyboard_test1',
    status: 'running',
    progress: { stage: 'keyframes', percent: 5, message: 'Saved scene keyframes' },
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    ...overrides,
  };
}

describe('VideoJobsStore', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `dja-video-jobs-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('starts empty when the file does not exist yet', () => {
    const store = new VideoJobsStore(filePath);
    expect(store.list()).toEqual([]);
  });

  it('round-trips a job through upsert, list, and get', () => {
    const store = new VideoJobsStore(filePath);
    const job = sampleJob();
    store.upsert(job);

    expect(store.list()).toEqual([job]);
    expect(store.get('video_test1')).toEqual(job);

    const reloaded = new VideoJobsStore(filePath);
    expect(reloaded.get('video_test1')).toEqual(job);
  });

  it('upsert updates progress in place rather than duplicating the job', () => {
    const store = new VideoJobsStore(filePath);
    store.upsert(sampleJob());
    store.upsert(sampleJob({ progress: { stage: 'compose', percent: 80, message: 'Composing final video' } }));

    expect(store.list()).toHaveLength(1);
    expect(store.get('video_test1')?.progress.stage).toBe('compose');
  });

  it('remove deletes a job by id', () => {
    const store = new VideoJobsStore(filePath);
    store.upsert(sampleJob());
    store.remove('video_test1');

    expect(store.list()).toEqual([]);
    expect(store.get('video_test1')).toBeNull();
  });

  it('tolerates a corrupt file instead of throwing', () => {
    fs.writeFileSync(filePath, 'not valid json{{{', 'utf-8');
    const store = new VideoJobsStore(filePath);
    expect(store.list()).toEqual([]);
  });
});
