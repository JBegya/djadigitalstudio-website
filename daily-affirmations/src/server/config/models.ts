// Centralized model identifiers. If OpenAI renames or deprecates a model, this is the
// only file that needs to change.
export const MODELS = {
  /** Script writing, captions, hashtags, and the text-quality QA pass. */
  script: process.env.DJA_SCRIPT_MODEL || 'gpt-5.5',
  /** Text-to-speech voiceover. */
  tts: process.env.DJA_TTS_MODEL || 'tts-1-hd',
  /** Word-level timestamp alignment of the generated voiceover, for subtitle sync. */
  transcribe: process.env.DJA_TRANSCRIBE_MODEL || 'whisper-1',
} as const;

export const OPENAI_VOICE_MAP: Record<string, string> = {
  'warm-female': 'shimmer',
  'calm-female': 'nova',
  'warm-male': 'onyx',
  'calm-male': 'echo',
};

// Reasoning-tier models (the o-series, the gpt-5.x family) reject classic sampling knobs
// entirely — `temperature`, `presence_penalty`, `frequency_penalty` all 400 with "Unsupported
// parameter" rather than being silently ignored. Callers use this to decide whether it's safe
// to pass those params at all, rather than hardcoding them for every model.
const REASONING_MODEL_PATTERN = /^(o\d|gpt-5)/i;

export function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_PATTERN.test(model);
}
