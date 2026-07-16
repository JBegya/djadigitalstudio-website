import OpenAI from 'openai';

const clientCache = new Map<string, OpenAI>();

export function getOpenAIClient(apiKey: string): OpenAI {
  const cached = clientCache.get(apiKey);
  if (cached) return cached;
  const client = new OpenAI({ apiKey });
  clientCache.set(apiKey, client);
  return client;
}

export class MissingApiKeyError extends Error {
  constructor(service: string) {
    super(`${service} requires an OpenAI API key. Add one in Settings to leave Test Mode.`);
    this.name = 'MissingApiKeyError';
  }
}
