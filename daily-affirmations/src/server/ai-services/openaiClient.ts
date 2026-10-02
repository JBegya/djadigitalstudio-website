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

interface StructuredResponseLike {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
}

/**
 * Extracts and parses the JSON payload from a Responses API call made with
 * `text.format: { type: 'json_schema', ... }`, with explicit handling for the ways a real call
 * can come back unusable that a bare `JSON.parse(output_text)` would surface as a confusing,
 * unrelated error: a safety refusal, a response truncated by hitting a token/output limit, or
 * content that isn't valid JSON at all.
 */
export function parseStructuredResponse<T>(response: StructuredResponseLike, context: string): T {
  const message = response.output?.find((item) => item.type === 'message');
  const refusal = message?.content?.find((part) => part.type === 'refusal')?.refusal;
  if (refusal) throw new Error(`OpenAI declined to generate ${context}: ${refusal}`);
  if (response.status === 'incomplete') {
    const reason = response.incomplete_details?.reason ?? 'hit a limit';
    throw new Error(`OpenAI response for ${context} was truncated (${reason})`);
  }

  const raw = response.output_text;
  if (!raw) throw new Error(`OpenAI returned an empty response for ${context}`);
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`OpenAI returned malformed JSON for ${context}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
