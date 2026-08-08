// Centralized model identifiers. If OpenAI renames or deprecates a model, this is the
// only file that needs to change.
export const MODELS = {
  /** Ad copy: headlines, captions, CTAs, hashtags, storyboard scene copy. */
  copy: process.env.DJA_COPY_MODEL || 'gpt-5.5',
} as const;

// Reasoning-tier models (the o-series, the gpt-5.x family) reject classic sampling knobs
// entirely — `temperature`, `presence_penalty`, `frequency_penalty` all 400 with "Unsupported
// parameter" rather than being silently ignored. Callers use this to decide whether it's safe
// to pass those params at all, rather than hardcoding them for every model.
const REASONING_MODEL_PATTERN = /^(o\d|gpt-5)/i;

export function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_PATTERN.test(model);
}
