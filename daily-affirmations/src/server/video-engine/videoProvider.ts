export interface AnimateImageParams {
  imagePath: string;
  /** Describes what motion the scene should have — derived from the storyboard scene's own
   * visualDescription. A real provider implementation would send this as its motion prompt; the
   * Ken Burns fallback ignores it entirely (it only pans/zooms the static image). */
  motionPrompt: string;
  durationSeconds: number;
  outputPath: string;
}

export type VideoProviderStatus = { status: 'pending' } | { status: 'complete'; videoPath: string } | { status: 'failed'; error: string };

/**
 * Every image-to-video vendor (Runway, Veo, Kling, Pika, Luma, OpenArt) implements this
 * identically — nothing else in the pipeline imports a vendor SDK directly. Swapping providers is
 * a one-line change in videoProviderFactory.ts, never a change to videoOrchestrator.ts.
 */
export interface VideoProvider {
  readonly name: string;
  animateImage(params: AnimateImageParams): Promise<{ jobId: string }>;
  checkStatus(handle: { jobId: string }): Promise<VideoProviderStatus>;
}
