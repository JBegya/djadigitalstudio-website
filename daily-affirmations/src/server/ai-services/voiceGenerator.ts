import fs from 'node:fs';
import type { BrandId, Settings, VoicePreset } from '@/types/domain';
import { MODELS, OPENAI_VOICE_MAP, supportsVoiceInstructions } from '@/server/config/models';
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
  brand: BrandId;
  text: string;
  voice: VoicePreset;
  settings: Settings;
  outputPath: string;
}

// Below this, the "successful" response is almost certainly an empty or truncated audio
// stream rather than real speech — catching it here gives a clear error instead of letting a
// near-empty file fail confusingly deep inside ffmpeg later in the pipeline.
const MIN_PLAUSIBLE_AUDIO_BYTES = 2_000;

// Shared delivery philosophy: unhurried, natural pauses, and — critically — never sounding like
// a narrator reading a script or a coach delivering a speech. The brand-specific framing below
// tells the model WHO is speaking (a fellow nurse / a fellow parent), which shapes warmth and
// restraint in a way a generic "sound friendly" instruction can't.
const SHARED_DELIVERY = [
  'Speak slowly and gently, at an unhurried pace — roughly 110 to 130 words per minute, the pace of someone who is not in a rush and wants every word to actually land.',
  'Take natural breaths at commas, dashes, and sentence endings. Let a short silence sit after an important line before continuing — the pause is part of what you are saying, not dead air to fill.',
  'Your tone is warm, calm, and emotionally sincere — never energetic, never cheerful, never like a performance or a motivational speech. Quiet conviction, not enthusiasm.',
  'This is one person who has genuinely lived this quietly comforting another person who is exhausted tonight — not a narrator, not a coach, not a therapist, not an ad.',
].join(' ');

const BRAND_VOICE_FRAMING: Record<BrandId, string> = {
  nurse: 'You are a nurse, off shift, talking quietly to another nurse who just finished a brutal one — like you are sitting next to her in an empty break room.',
  autism: 'You are the parent of an autistic child, talking quietly to another autism parent after a hard day — like you are sitting next to her once the kids are finally asleep.',
};

function buildVoiceInstructions(brand: BrandId): string {
  return `${BRAND_VOICE_FRAMING[brand]} ${SHARED_DELIVERY}`;
}

async function callOpenAiTts(brand: BrandId, text: string, voice: VoicePreset, settings: Settings, outputPath: string): Promise<void> {
  const client = getOpenAIClient(settings.openaiApiKey);
  const openAiVoice = OPENAI_VOICE_MAP[voice] ?? 'shimmer';
  const instructable = supportsVoiceInstructions(MODELS.tts);
  const response = await client.audio.speech.create({
    model: MODELS.tts,
    voice: openAiVoice as never,
    input: text,
    response_format: 'wav',
    // instructions and speed are mutually exclusive per model — gpt-4o-mini-tts only accepts
    // the former, tts-1/tts-1-hd only the latter (see supportsVoiceInstructions).
    ...(instructable ? { instructions: buildVoiceInstructions(brand) } : { speed: 0.92 }),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < MIN_PLAUSIBLE_AUDIO_BYTES) {
    throw new Error(`OpenAI TTS returned suspiciously little audio data (${buffer.byteLength} bytes)`);
  }
  fs.writeFileSync(outputPath, buffer);
}

export async function generateVoice(request: VoiceRequest): Promise<VoiceResult> {
  const { brand, text, voice, settings, outputPath } = request;

  if (!settings.openaiApiKey) {
    log.info('Test Mode: synthesizing placeholder voice track');
    const { durationSeconds } = await generateMockVoice(text, outputPath);
    return { audioPath: outputPath, durationSeconds, source: 'mock' };
  }

  await retryWithBackoff(() => callOpenAiTts(brand, text, voice, settings, outputPath), {
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
