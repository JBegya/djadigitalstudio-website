import type { BrandId, CaptionSet, Settings } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { MODELS } from '@/server/config/models';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';
import { getOpenAIClient } from './openaiClient';
import { generateMockCaptions, generateMockHashtags, generateMockThumbnailHook } from './socialCopyWriterMock';

const log = createLogger('socialCopyWriter');

export interface SocialCopyResult {
  captions: CaptionSet;
  hashtags: string[];
  thumbnailHook: string;
  source: 'openai' | 'mock';
}

export interface SocialCopyRequest {
  brand: BrandId;
  topicLabel: string;
  affirmationText: string;
  settings: Settings;
}

interface RawResponse {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube_shorts: string;
  hashtags: string[];
  thumbnail_hook: string;
}

function clampToSixWords(text: string): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, 6).join(' ');
}

function buildPrompt(brand: BrandId, topicLabel: string, affirmationText: string) {
  const brandDef = getBrand(brand);
  const system = [
    `You write social captions and hashtags for DJ&A Digital Studio's "${brandDef.name}" series — short faceless affirmation videos for ${brandDef.audience.join(', ')}.`,
    'Write four platform-native captions for the SAME video:',
    '- facebook: warm, a little longer, community-oriented, can invite a gentle response in the comments.',
    '- instagram: short, punchy, uses line breaks, light and tasteful emoji use is fine.',
    '- tiktok: casual, hook-first, feels native to the app, one or two sentences.',
    '- youtube_shorts: a short description-style caption, can mention this is part of a daily affirmations series.',
    'Then write exactly 30 hashtags relevant to the video: a mix of large broad tags, medium niche tags, and small very-specific tags. No irrelevant or unrelated hashtags.',
    'Finally write thumbnail_hook: a maximum-six-word on-screen thumbnail headline, punchy and readable at a glance, title case, no punctuation at the end.',
    'Never restate the full affirmation verbatim as the caption — write something complementary, not a duplicate.',
    'Respond as strict JSON matching the schema.',
  ].join('\n');

  const user = `Topic: ${topicLabel}\nAffirmation (for context only, do not repeat verbatim): "${affirmationText}"`;
  return { system, user };
}

async function callOpenAI(brand: BrandId, topicLabel: string, affirmationText: string, settings: Settings): Promise<SocialCopyResult> {
  const client = getOpenAIClient(settings.openaiApiKey);
  const { system, user } = buildPrompt(brand, topicLabel, affirmationText);

  const completion = await client.chat.completions.create({
    model: MODELS.script,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.9,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'social_copy',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            facebook: { type: 'string' },
            instagram: { type: 'string' },
            tiktok: { type: 'string' },
            youtube_shorts: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' }, minItems: 30, maxItems: 30 },
            thumbnail_hook: { type: 'string' },
          },
          required: ['facebook', 'instagram', 'tiktok', 'youtube_shorts', 'hashtags', 'thumbnail_hook'],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty social-copy response');
  const parsed = JSON.parse(raw) as RawResponse;
  const hashtags = parsed.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`).replace(/\s+/g, ''));

  return {
    captions: {
      facebook: parsed.facebook.trim(),
      instagram: parsed.instagram.trim(),
      tiktok: parsed.tiktok.trim(),
      youtubeShorts: parsed.youtube_shorts.trim(),
    },
    hashtags,
    thumbnailHook: clampToSixWords(parsed.thumbnail_hook),
    source: 'openai',
  };
}

export async function writeSocialCopy(request: SocialCopyRequest): Promise<SocialCopyResult> {
  const { brand, topicLabel, affirmationText, settings } = request;

  if (!settings.openaiApiKey) {
    log.info('Test Mode: generating placeholder captions and hashtags');
    return {
      captions: generateMockCaptions(brand, topicLabel),
      hashtags: generateMockHashtags(brand),
      thumbnailHook: generateMockThumbnailHook(topicLabel),
      source: 'mock',
    };
  }

  return retryWithBackoff(() => callOpenAI(brand, topicLabel, affirmationText, settings), {
    label: 'caption + hashtag writer',
    retries: 3,
  });
}
