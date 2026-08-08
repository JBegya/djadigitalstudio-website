import { findBannedPhrase } from '@/server/utils/textStats';
import type { StoryboardScene } from '@/types/domain';

const FLAGGABLE_FIELDS = ['visualDescription', 'onScreenText', 'voiceover', 'cta'] as const;

/**
 * Anti-fabrication check for a whole storyboard: unlike the AI Copy Assistant's hook suggestions
 * (independent, droppable options), a storyboard's scenes are a sequential, interdependent
 * narrative — silently deleting or rewriting a flagged scene would break continuity. This only
 * ever reports which scene numbers need a human look; it never mutates or drops content. Computed
 * fresh every call (never stored) so it stays correct after a scene is hand-edited or the brand's
 * wordsWeAvoid list changes. `textStats.ts` has zero Node-only imports, so this stays safely
 * importable from client components — never import `storyboardGenerator.ts` itself from a
 * `'use client'` file, since it transitively pulls in the `openai` package via `openaiClient.ts`.
 */
export function flagScenes(scenes: StoryboardScene[], wordsToAvoid: string[]): number[] {
  if (wordsToAvoid.length === 0) return [];
  const flagged: number[] = [];
  for (const scene of scenes) {
    const hit = FLAGGABLE_FIELDS.some((field) => {
      const value = scene[field];
      return typeof value === 'string' && value.trim() && findBannedPhrase(value, wordsToAvoid);
    });
    if (hit) flagged.push(scene.number);
  }
  return flagged;
}
