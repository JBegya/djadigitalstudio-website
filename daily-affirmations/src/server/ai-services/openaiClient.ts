import OpenAI from 'openai';

const clientCache = new Map<string, OpenAI>();

// A generous but bounded per-request timeout — long enough for chat completions, TTS, and
// Whisper transcription of a ~30s clip, short enough that a stalled connection doesn't hang a
// video job indefinitely. `maxRetries: 0` disables the SDK's own built-in retry loop: our
// retryWithBackoff (src/server/utils/retry.ts) is the single source of retry/backoff/logging
// for every OpenAI call, so the two mechanisms don't compound into an exponential-on-exponential
// retry storm.
const REQUEST_TIMEOUT_MS = 60_000;

export function getOpenAIClient(apiKey: string): OpenAI {
  const cached = clientCache.get(apiKey);
  if (cached) return cached;
  const client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });
  clientCache.set(apiKey, client);
  return client;
}

interface StructuredCompletionLike {
  choices: Array<{
    message?: { content?: string | null; refusal?: string | null };
    finish_reason?: string;
  }>;
}

/**
 * Extracts and parses the JSON payload from a `response_format: json_schema` completion,
 * with explicit handling for the ways a real call can come back unusable that a bare
 * `JSON.parse(content)` would surface as a confusing, unrelated error: a safety refusal, a
 * response truncated by hitting the token limit, or content that isn't valid JSON at all.
 */
export function parseStructuredCompletion<T>(completion: StructuredCompletionLike, context: string): T {
  const choice = completion.choices[0];
  if (!choice) throw new Error(`OpenAI returned no choices for ${context}`);
  if (choice.message?.refusal) throw new Error(`OpenAI declined to generate ${context}: ${choice.message.refusal}`);
  if (choice.finish_reason === 'length') throw new Error(`OpenAI response for ${context} was truncated (hit the token limit)`);

  const raw = choice.message?.content;
  if (!raw) throw new Error(`OpenAI returned an empty response for ${context}`);
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`OpenAI returned malformed JSON for ${context}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
