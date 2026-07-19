import fs from 'node:fs';
import type { Settings } from '@/types/domain';
import { MODELS } from '@/server/config/models';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';
import { getOpenAIClient } from './openaiClient';

const log = createLogger('transcription');

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface VerboseTranscription {
  words?: Array<{ word: string; start: number; end: number }>;
}

/**
 * Forced word-level alignment of the voiceover we just generated, via Whisper. This is what
 * gives subtitles "perfect timing" instead of an even-split estimate. Returns null (caller
 * falls back to duration-based estimation) when there's no key or the call ultimately fails —
 * subtitle generation must never block the rest of the pipeline.
 */
export async function transcribeWordTimestamps(audioPath: string, settings: Settings): Promise<WordTimestamp[] | null> {
  if (!settings.openaiApiKey) return null;

  try {
    const words = await retryWithBackoff(
      async () => {
        const client = getOpenAIClient(settings.openaiApiKey);
        const result = (await client.audio.transcriptions.create({
          file: fs.createReadStream(audioPath),
          model: MODELS.transcribe,
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        })) as unknown as VerboseTranscription;
        if (!result.words || result.words.length === 0) throw new Error('transcription returned no word timestamps');
        return result.words;
      },
      { label: 'Whisper word-timestamp alignment', retries: 2 },
    );
    return words.map((w) => ({ word: w.word, start: w.start, end: w.end }));
  } catch (error) {
    log.warn(`Falling back to estimated subtitle timing: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}
