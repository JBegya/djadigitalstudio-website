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
  const durationSeconds = await probeDurationSeconds(outputPath);
  return { audioPath: outputPath, durationSeconds, source: 'openai' };
}
