import fs from 'node:fs';
import type { Settings } from '@/types/domain';
import { transcribeWordTimestamps } from '@/server/ai-services/transcription';
import { createLogger } from '@/server/utils/logger';
import { buildAssSubtitleFile } from './assSubtitles';
import { buildSubtitleCues, type SubtitleCue, type WordTiming } from './subtitleTiming';

const log = createLogger('subtitleService');

export interface SubtitleGenerationRequest {
  text: string;
  audioPath: string;
  durationSeconds: number;
  settings: Settings;
  canvasWidth: number;
  canvasHeight: number;
  outputAssPath: string;
}

export interface SubtitleGenerationResult {
  assPath: string;
  cues: SubtitleCue[];
  timingSource: 'whisper' | 'estimated';
}

export async function generateSubtitles(request: SubtitleGenerationRequest): Promise<SubtitleGenerationResult> {
  const { text, audioPath, durationSeconds, settings, canvasWidth, canvasHeight, outputAssPath } = request;

  const whisperWords = await transcribeWordTimestamps(audioPath, settings);
  const wordTimings: WordTiming[] | null = whisperWords
    ? whisperWords.map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })).filter((w) => w.word.length > 0)
    : null;

  const cues = buildSubtitleCues(text, wordTimings, durationSeconds);
  log.info(`Built ${cues.length} subtitle cues (${wordTimings ? 'Whisper-aligned' : 'estimated'} timing)`);

  const assContent = buildAssSubtitleFile(cues, {
    fontFamily: settings.subtitleFont || 'Inter',
    colorHex: settings.subtitleColor || '#FFFFFF',
    position: settings.subtitlePosition,
    canvasWidth,
    canvasHeight,
  });
  fs.writeFileSync(outputAssPath, assContent, 'utf-8');

  return { assPath: outputAssPath, cues, timingSource: wordTimings ? 'whisper' : 'estimated' };
}
