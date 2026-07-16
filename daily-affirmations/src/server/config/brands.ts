import type { BrandDefinition } from '@/types/domain';

// Phrases the script writer is explicitly forbidden from producing. These are the
// clichés and toxic-positivity tells that make affirmation content feel generic,
// AI-generated, or dismissive of how hard the day actually was.
const UNIVERSAL_BANNED_PHRASES = [
  'everything happens for a reason',
  'good vibes only',
  "you got this",
  "self-care isn't selfish",
  'live laugh love',
  'when god closes a door',
  'what doesn’t kill you makes you stronger',
  'just breathe',
  'it is what it is',
  'positive vibes',
  'manifest your',
  'the universe has a plan',
  'everything will fall into place',
  'trust the process',
  'be grateful for what you have',
  'in the end it will all be worth it',
  'other people have it worse',
  'at least',
  'look on the bright side',
  'stay strong',
];

const NURSE_BANNED_PHRASES = [
  'heroes work here',
  'nurses are angels',
  'superhero',
  'you signed up for this',
  'it gets easier',
  'self-care sunday',
];

const AUTISM_BANNED_PHRASES = [
  'special needs',
  'differently abled',
  'suffers from autism',
  'battling autism',
  'high functioning',
  'low functioning',
  'everything happens for a reason',
  'god only gives special children to special parents',
  'normal kids',
  'cure',
  'overcome autism',
  'despite autism',
];

export const BRANDS: Record<'nurse' | 'autism', BrandDefinition> = {
  nurse: {
    id: 'nurse',
    name: 'Nurse Affirmations',
    folderName: 'Nurse',
    audience: [
      'Registered Nurses',
      'Student Nurses',
      'ICU',
      'Emergency',
      'Theatre',
      'Mental Health',
      'Community',
      'Aged Care',
      'NICU',
    ],
    topics: [
      { key: 'burnout', label: 'Burnout', keywords: ['exhausted resting', 'empty hospital corridor', 'closed eyes leaning wall', 'quiet break room'] },
      { key: 'night-shift', label: 'Night Shift', keywords: ['hospital hallway night', 'city lights night window', 'moon night sky', 'empty street night lamp'] },
      { key: 'morning-motivation', label: 'Morning Motivation', keywords: ['sunrise window', 'coffee steam morning', 'morning light kitchen', 'sunrise city'] },
      { key: 'compassion', label: 'Compassion', keywords: ['holding hands comfort', 'gentle hands', 'hands care', 'nurse hands patient'] },
      { key: 'purpose', label: 'Purpose', keywords: ['sunrise ocean', 'walking hospital hallway', 'stethoscope light', 'quiet hospital window'] },
      { key: 'leadership', label: 'Leadership', keywords: ['hospital team walking', 'confident walking hallway', 'sunrise city skyline', 'nurse station'] },
      { key: 'self-care', label: 'Self Care', keywords: ['tea cup steam', 'bath candle calm', 'quiet park bench', 'stretching calm morning'] },
      { key: 'resilience', label: 'Resilience', keywords: ['ocean waves calm', 'mountain sunrise', 'storm clearing sky', 'tree wind strong'] },
      { key: 'gratitude', label: 'Gratitude', keywords: ['sunset sky', 'flowers soft light', 'candle warm light', 'hands holding cup'] },
      { key: 'weekend', label: 'Weekend', keywords: ['sunlight bedroom calm', 'coffee window relax', 'nature walk calm', 'garden flowers'] },
      { key: 'new-graduate', label: 'New Graduate', keywords: ['young nurse walking', 'hospital entrance morning', 'stethoscope new', 'sunrise hopeful'] },
    ],
    toneRules: [
      'Speak directly to one exhausted nurse, right after a hard shift — second person, intimate, quiet.',
      'Be emotionally authentic, warm, and compassionate — never performative.',
      'Acknowledge the specific weight of the work (the losses, the pace, the noise, the responsibility) before offering encouragement.',
      'Never use toxic positivity — do not minimize exhaustion or grief with forced optimism.',
      'Never use clichés, greeting-card language, or motivational-poster phrasing.',
      'Never quote famous people, never use a quotation format.',
      'Do not sound AI-generated — vary sentence rhythm, avoid list-like parallelism, avoid generic corporate warmth.',
      'No emojis. No literal quotation marks around the whole affirmation.',
    ],
    bannedPhrases: [...UNIVERSAL_BANNED_PHRASES, ...NURSE_BANNED_PHRASES],
    backgroundKeywordHints: [
      'hospital hallway',
      'nurse station',
      'coffee cup steam',
      'sunrise window',
      'quiet hospital corridor',
      'hands washing',
      'scrubs walking',
      'city dawn',
      'rain window',
      'empty waiting room',
      'stethoscope',
      'soft morning light',
    ],
    systemPrompt:
      'You are a compassionate writer-in-residence for DJ&A Digital Studio’s "Nurse Affirmations" — short spoken affirmations for nurses, written to be heard, not read. You write as if you are sitting quietly with one specific nurse who just finished a brutal shift. You know the real texture of the job: codes, short-staffing, families in the worst moment of their lives, thirteen hours on your feet, charting after the humans are gone. You never write like a corporate wellness poster.',
  },
  autism: {
    id: 'autism',
    name: 'Autism Parent Affirmations',
    folderName: 'Autism',
    audience: ['Parents', 'Grandparents', 'Caregivers'],
    topics: [
      { key: 'meltdowns', label: 'Meltdowns', keywords: ['quiet room calm', 'parent sitting floor', 'soft light bedroom', 'calm home interior'] },
      { key: 'school', label: 'School', keywords: ['child backpack walking', 'school hallway morning', 'parent child walking', 'morning school drop off'] },
      { key: 'therapy', label: 'Therapy', keywords: ['parent waiting room', 'child playing therapy', 'hands holding support', 'quiet clinic hallway'] },
      { key: 'hope', label: 'Hope', keywords: ['sunrise sky', 'sunlight through window', 'open field sky', 'sunrise ocean'] },
      { key: 'burnout', label: 'Burnout', keywords: ['parent resting eyes closed', 'tea cup table', 'quiet living room evening', 'parent sitting alone calm'] },
      { key: 'marriage', label: 'Marriage', keywords: ['couple holding hands', 'couple sitting together', 'hands together table', 'couple walking calm'] },
      { key: 'acceptance', label: 'Acceptance', keywords: ['child playing alone peaceful', 'parent watching child smile', 'family silhouette sunset', 'child hands close up'] },
      { key: 'small-wins', label: 'Small Wins', keywords: ['child smiling close up', 'parent child laughing', 'sunlight kitchen morning', 'family home warm'] },
      { key: 'self-care', label: 'Self Care', keywords: ['tea cup steam', 'quiet garden bench', 'parent walking outside calm', 'candle warm light'] },
      { key: 'encouragement', label: 'Encouragement', keywords: ['sunrise window', 'open road calm', 'forest path peaceful', 'ocean waves calm'] },
    ],
    toneRules: [
      'Speak directly to one exhausted parent, after one of the hardest days of their life — second person, intimate, quiet.',
      'Write with deep empathy for the parent’s exhaustion, grief, and love — hold all three at once.',
      'Never imply autism needs fixing, curing, or overcoming. Never frame the autistic child as a burden or a tragedy.',
      'Never make medical, developmental, or outcome claims ("he will speak by five", "she will grow out of it").',
      'Never promise a specific future outcome — offer presence and validation, not prediction.',
      'Never use toxic positivity — do not minimize a hard day with forced optimism.',
      'Never use clichés, inspiration-porn framing, or "special angel child" language.',
      'Center the parent’s experience and resilience, not inspiration about the child.',
      'No emojis. No literal quotation marks around the whole affirmation.',
    ],
    bannedPhrases: [...UNIVERSAL_BANNED_PHRASES, ...AUTISM_BANNED_PHRASES],
    backgroundKeywordHints: [
      'parent holding child hand',
      'quiet living room evening',
      'soft afternoon light home',
      'parent resting eyes closed',
      'tea cup on table',
      'child playing alone peaceful',
      'window rain cozy',
      'family silhouette sunset',
      'parent walking outside calm',
      'garden flowers',
      'ocean waves calm',
      'forest path peaceful',
    ],
    systemPrompt:
      'You are a compassionate writer-in-residence for DJ&A Digital Studio’s "Autism Parent Affirmations" — short spoken affirmations for parents, grandparents, and caregivers of autistic children, written to be heard, not read. You write as if you are sitting quietly with one specific exhausted parent at the end of one of the hardest days of their life. You honor the child exactly as they are, hold the parent’s exhaustion and love without judgment, and never write like a corporate wellness poster or an inspiration-porn caption.',
  },
};

export function getBrand(id: 'nurse' | 'autism'): BrandDefinition {
  const brand = BRANDS[id];
  if (!brand) throw new Error(`Unknown brand: ${id}`);
  return brand;
}

export const ALL_BRAND_IDS = Object.keys(BRANDS) as Array<'nurse' | 'autism'>;
