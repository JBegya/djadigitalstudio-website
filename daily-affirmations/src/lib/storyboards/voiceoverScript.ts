/**
 * Combines every scene's voiceover text into one continuous script — a single TTS call produces
 * far more natural prosody than stitching 5-8 independently-recorded fragments, costs one API
 * call instead of up to eight, and lets the existing per-video (not per-scene) Whisper/subtitle
 * pipeline run unchanged. Scenes already read as one continuous narrative arc per the Storyboard
 * Generator's own instructions to the AI.
 */
export function buildCombinedVoiceoverScript(scenes: Array<{ voiceover: string }>): string {
  return scenes
    .map((s) => s.voiceover.trim())
    .filter(Boolean)
    .map((t) => (/[.!?]$/.test(t) ? t : `${t}.`))
    .join(' ');
}
