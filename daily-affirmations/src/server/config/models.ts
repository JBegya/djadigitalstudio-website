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
