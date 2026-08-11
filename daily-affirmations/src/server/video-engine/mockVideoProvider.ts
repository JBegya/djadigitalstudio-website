import { hashToSeed, renderKenBurnsClip } from './kenBurnsRenderer';
import type { AnimateImageParams, VideoProvider, VideoProviderStatus } from './videoProvider';

/**
 * Test Mode / no-provider-configured fallback — a real, complete, deterministic local render
 * (Ken Burns pan/zoom over the keyframe), never a stub. Implements the SAME interface a real
 * remote provider would, including the pending/complete polling shape, even though this
 * particular implementation finishes synchronously inside animateImage() itself — that's what
 * lets the orchestrator poll checkStatus() identically regardless of which provider is active,
 * with zero branching in the pipeline itself.
 */
export class MockVideoProvider implements VideoProvider {
  readonly name = 'ken-burns';

  async animateImage(params: AnimateImageParams): Promise<{ jobId: string }> {
    await renderKenBurnsClip({
      imagePath: params.imagePath,
      durationSeconds: params.durationSeconds,
      outputPath: params.outputPath,
      seed: hashToSeed(params.imagePath),
    });
    return { jobId: params.outputPath };
  }

  async checkStatus(handle: { jobId: string }): Promise<VideoProviderStatus> {
    return { status: 'complete', videoPath: handle.jobId };
  }
}
