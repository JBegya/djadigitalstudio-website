import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  renderCalls: [] as Array<{ imagePath: string; durationSeconds: number; outputPath: string; seed: number }>,
}));

vi.mock('@/server/video-engine/kenBurnsRenderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/video-engine/kenBurnsRenderer')>();
  return {
    ...actual,
    renderKenBurnsClip: async (params: { imagePath: string; durationSeconds: number; outputPath: string; seed: number }) => {
      state.renderCalls.push(params);
    },
  };
});

describe('MockVideoProvider (Ken Burns fallback, ffmpeg mocked out)', () => {
  it('animateImage renders a Ken Burns clip and returns a jobId equal to the output path', async () => {
    const { MockVideoProvider } = await import('@/server/video-engine/mockVideoProvider');
    const provider = new MockVideoProvider();
    const { jobId } = await provider.animateImage({
      imagePath: '/tmp/scene-1.png',
      motionPrompt: 'ignored by this provider',
      durationSeconds: 4,
      outputPath: '/tmp/scene-1-clip.mp4',
    });
    expect(jobId).toBe('/tmp/scene-1-clip.mp4');
    expect(state.renderCalls).toHaveLength(1);
    expect(state.renderCalls[0]).toMatchObject({ imagePath: '/tmp/scene-1.png', durationSeconds: 4, outputPath: '/tmp/scene-1-clip.mp4' });
  });

  it('checkStatus always reports complete with the jobId as the video path — this provider never needs polling', async () => {
    const { MockVideoProvider } = await import('@/server/video-engine/mockVideoProvider');
    const provider = new MockVideoProvider();
    const status = await provider.checkStatus({ jobId: '/tmp/scene-1-clip.mp4' });
    expect(status).toEqual({ status: 'complete', videoPath: '/tmp/scene-1-clip.mp4' });
  });

  it('exposes a stable, descriptive provider name', async () => {
    const { MockVideoProvider } = await import('@/server/video-engine/mockVideoProvider');
    expect(new MockVideoProvider().name).toBe('ken-burns');
  });
});
