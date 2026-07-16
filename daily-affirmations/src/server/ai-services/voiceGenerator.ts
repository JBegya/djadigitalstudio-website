import fs from 'node:fs';
import type { Settings, VoicePreset } from '@/types/domain';
import { MODELS, OPENAI_VOICE_MAP } from '@/server/config/models';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';
import { probeDurationSeconds } from '@/server/video-engine/ffmpeg';
import { getOpenAIClient } from './openaiClient';
import { generateMockVoice } from './voiceGeneratorMock';

const log = createLogger('voiceGenerator');

export interface VoiceResult {
  audioPath: string;
  durationSeconds: number;
  source: 'openai' | 'mock';
}

export interface VoiceRequest {
  text: string;
  voice: VoicePreset;
  settings: Settings;
  outputPath: string;
}

// Below this, the "successful" response is almost certainly an empty or truncated audio
// stream rather than real speech — catching it here gives a clear error instead of letting a
// near-empty file fail confusingly deep inside ffmpeg later in the pipeline.
const MIN_PLAUSIBLE_AUDIO_BYTES = 2_000;

async function callOpenAiTts(text: string, voice: VoicePreset, settings: Settings, outputPath: string): Promise<void> {
  const client = getOpenAIClient(settings.openaiApiKey);
  const openAiVoice = OPENAI_VOICE_MAP[voice] ?? 'shimmer';
  const response = await client.audio.speech.create({
    model: MODELS.tts,
    voice: openAiVoice as never,
    input: text,
    response_format: 'wav',
    speed: 0.98,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < MIN_PLAUSIBLE_AUDIO_BYTES) {
    throw new Error(`OpenAI TTS returned suspiciously little audio data (${buffer.byteLength} bytes)`);
  }
  fs.writeFileSync(outputPath, buffer);
}

export async function generateVoice(request: VoiceRequest): Promise<VoiceResult> {
  const { text, voice, settings, outputPath } = request;

  if (!settings.openaiApiKey) {
    log.info('Test Mode: synthesizing placeholder voice track');
    const { durationSeconds } = await generateMockVoice(text, outputPath);
    return { audioPath: outputPath, durationSeconds, source: 'mock' };
  }

  await retryWithBackoff(() => callOpenAiTts(text, voice, settings, outputPath), {
    label: 'OpenAI text-to-speech',
    retries: 3,
  });

  let durationSeconds: number;
  try {
    durationSeconds = await probeDurationSeconds(outputPath);
  } catch (error) {
    throw new Error(
      `OpenAI TTS produced a file ffmpeg could not read (likely a corrupt or incomplete download): ${error instanceof Error ? error.message : error}`,
    );
  }
  return { audioPath: outputPath, durationSeconds, source: 'openai' };
}
