/** Shared with storyboardGenerator.ts (server-only) so the AI Copy/Storyboard side's default
 * assignment and the Video Generator's duration-sum derivation use one constant, not two
 * independently-maintained copies. This file itself must stay free of Node-only imports so it's
 * safely importable from client components, matching the sibling flagScenes.ts convention. */
export const DEFAULT_SCENE_DURATION_SECONDS = 4;

/** The single source of truth for a video's total runtime — never persisted separately, always
 * re-derived from the live Storyboard so it can't drift out of sync with hand-edited scenes. */
export function sumSceneDurations(scenes: Array<{ durationSeconds?: number }>): number {
  return scenes.reduce((sum, s) => sum + (s.durationSeconds ?? DEFAULT_SCENE_DURATION_SECONDS), 0);
}
