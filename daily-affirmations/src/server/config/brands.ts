import type { BrandDefinition, BrandTopic, ContentMode } from '@/types/domain';

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
  'one day at a time',
  'this too shall pass',
  'you are not alone',
  'be kind to yourself',
  'you deserve rest',
  'take it one step at a time',
  'you are stronger than you think',
  'better days are coming',
  'progress not perfection',
  'you are exactly where you need to be',
];

const NURSE_BANNED_PHRASES = [
  'heroes work here',
  'nurses are angels',
  'superhero',
  'you signed up for this',
  'it gets easier',
  'self-care sunday',
  'scrubs and coffee',
  'born to be a nurse',
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
  'special angel',
  'autism warrior',
];

// The 6 named Content Modes each brand rotates through in a balanced mix — see
// historyStore.pickNextTopics for the balancing algorithm. Each mode contains a small set of
// specific "angles" (BrandTopic entries below) so repeat visits to the same mode still feel
// like a different, specific moment rather than the same prompt reworded.
const NURSE_MODES: ContentMode[] = [
  { key: 'morning-motivation', label: 'Morning Motivation' },
  { key: 'night-shift', label: 'Night Shift' },
  { key: 'burnout', label: 'Burnout' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'self-care', label: 'Self Care' },
  { key: 'gratitude', label: 'Gratitude' },
];

const AUTISM_MODES: ContentMode[] = [
  { key: 'hard-days', label: 'Hard Days' },
  { key: 'small-wins', label: 'Small Wins' },
  { key: 'hope', label: 'Hope' },
  { key: 'therapy', label: 'Therapy' },
  { key: 'school', label: 'School' },
  { key: 'burnout', label: 'Burnout' },
];

// Nurse imagery leans cool — dawn/night light, rain, still water, grey skies — reflecting the
// clinical calm and the round-the-clock rhythm of the work. Emotion-first, never literal
// occupation nouns like "hospital" or "nurse" as the primary search term.
const NURSE_TOPICS: BrandTopic[] = [
  {
    key: 'fresh-start',
    label: 'A Fresh Start',
    mode: 'morning-motivation',
    keywords: ['soft morning light window', 'coffee steam sunrise', 'sunrise through curtains', 'quiet morning kitchen light', 'first light city window'],
  },
  {
    key: 'new-beginnings',
    label: 'New Beginnings',
    mode: 'morning-motivation',
    keywords: ['sunrise over quiet road', 'morning light empty street', 'dawn breaking over rooftops', 'soft golden hour window'],
  },
  {
    key: 'quiet-hours',
    label: 'The Quiet Hours',
    mode: 'night-shift',
    keywords: ['city lights night window', 'empty street night lamp', 'moon behind clouds', 'quiet night sky stars', 'streetlight rain night'],
  },
  {
    key: 'holding-steady',
    label: 'Holding Steady Til Dawn',
    mode: 'night-shift',
    keywords: ['dark window city lights', 'coffee cup night light', 'quiet hallway dim light', 'stars night sky calm'],
  },
  {
    key: 'running-empty',
    label: 'Running on Empty',
    mode: 'burnout',
    keywords: ['empty beach overcast sky', 'grey sky quiet field', 'rain window calm slow', 'still water overcast sky', 'quiet empty road fog'],
  },
  {
    key: 'quiet-exhaustion',
    label: 'The Weight You Carry',
    mode: 'burnout',
    keywords: ['closed eyes resting soft light', 'quiet empty room chair', 'still lake fog morning', 'grey rain window slow'],
  },
  {
    key: 'coming-back',
    label: 'Finding Your Way Back',
    mode: 'burnout',
    keywords: ['sunrise breaking through clouds', 'calm ocean waves shore', 'light breaking through storm clouds', 'quiet forest path light'],
  },
  {
    key: 'quiet-strength',
    label: 'Quiet Strength',
    mode: 'leadership',
    keywords: ['confident walking hallway calm', 'sunrise city skyline', 'still water reflection calm', 'mountain sunrise calm strong'],
  },
  {
    key: 'showing-up',
    label: 'Showing Up For Others',
    mode: 'leadership',
    keywords: ['gentle hands close up soft', 'soft light hands together', 'calm corridor soft light', 'warm light through window'],
  },
  {
    key: 'permission-to-rest',
    label: 'Permission to Rest',
    mode: 'self-care',
    keywords: ['tea cup steam quiet', 'bath candle calm soft', 'sunlight bedroom calm morning', 'quiet park bench trees'],
  },
  {
    key: 'small-comforts',
    label: 'Small Comforts',
    mode: 'self-care',
    keywords: ['candle warm light soft', 'blanket soft light window', 'stretching calm morning light', 'garden quiet soft light'],
  },
  {
    key: 'why-it-matters',
    label: 'Why It Still Matters',
    mode: 'gratitude',
    keywords: ['sunset sky warm colors', 'hands holding warm cup', 'golden hour field calm', 'quiet sunrise ocean'],
  },
  {
    key: 'the-small-moments',
    label: 'The Small Moments',
    mode: 'gratitude',
    keywords: ['flowers soft light table', 'warm light through curtains', 'candle glow evening calm', 'soft golden light window'],
  },
];

// Autism-parent imagery leans warm — golden hour, soft home light, family silhouettes —
// reflecting the family/support/hope core of this series. Emotion-first, never literal
// clinical or diagnostic nouns.
const AUTISM_TOPICS: BrandTopic[] = [
  {
    key: 'the-hardest-hours',
    label: 'The Hardest Hours',
    mode: 'hard-days',
    keywords: ['quiet room soft light calm', 'parent sitting floor calm', 'soft light bedroom quiet', 'rain window calm home'],
  },
  {
    key: 'holding-it-together',
    label: 'Holding It Together',
    mode: 'hard-days',
    keywords: ['couple sitting quiet together', 'hands together table soft light', 'quiet living room evening warm', 'two cups tea table'],
  },
  {
    key: 'tiny-victories',
    label: 'Tiny Victories',
    mode: 'small-wins',
    keywords: ['child smiling close up soft', 'sunlight kitchen morning warm', 'parent child laughing soft light', 'small hands close up warm'],
  },
  {
    key: 'worth-celebrating',
    label: 'Worth Celebrating',
    mode: 'small-wins',
    keywords: ['warm light home soft', 'family home warm light', 'child playing soft sunlight', 'open window soft breeze'],
  },
  {
    key: 'the-long-view',
    label: 'The Long View',
    mode: 'hope',
    keywords: ['sunrise sky open field', 'sunlight through window soft', 'open field sky calm', 'sunrise ocean calm horizon'],
  },
  {
    key: 'exactly-as-they-are',
    label: 'Exactly As They Are',
    mode: 'hope',
    keywords: ['child playing alone peaceful soft', 'parent watching child smile warm', 'family silhouette sunset warm', 'child hands close up soft light'],
  },
  {
    key: 'waiting-room-hours',
    label: 'The Waiting Room Hours',
    mode: 'therapy',
    keywords: ['parent waiting room calm soft', 'quiet clinic hallway soft light', 'hands holding support warm', 'soft window light waiting'],
  },
  {
    key: 'small-steps-forward',
    label: 'Small Steps Forward',
    mode: 'therapy',
    keywords: ['child playing therapy soft light', 'hands guiding gentle warm', 'soft light play room', 'quiet hallway warm light'],
  },
  {
    key: 'the-morning-drop-off',
    label: 'The Morning Drop-Off',
    mode: 'school',
    keywords: ['child backpack walking morning', 'school hallway morning soft light', 'parent child walking calm', 'morning drop off soft light'],
  },
  {
    key: 'letting-go-a-little',
    label: 'Letting Go, a Little',
    mode: 'school',
    keywords: ['child walking away soft light', 'open door morning light', 'empty hallway soft light', 'quiet morning street calm'],
  },
  {
    key: 'running-on-empty',
    label: 'Running on Empty',
    mode: 'burnout',
    keywords: ['parent resting eyes closed soft', 'tea cup table quiet warm', 'quiet living room evening calm', 'parent sitting alone calm soft'],
  },
  {
    key: 'refilling-the-cup',
    label: 'Refilling the Cup',
    mode: 'burnout',
    keywords: ['tea cup steam quiet warm', 'quiet garden bench soft light', 'candle warm light soft', 'parent walking outside calm soft'],
  },
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
    contentModes: NURSE_MODES,
    topics: NURSE_TOPICS,
    toneRules: [
      'Speak directly to one exhausted nurse, right after a hard shift — second person, intimate, quiet.',
      'Be emotionally authentic, warm, and compassionate — never performative.',
      'Ground the affirmation in one concrete, specific, sensory detail of the shift (a smell, a sound, a small gesture, a particular kind of tired) rather than a general statement about "the job."',
      'Acknowledge the specific weight of the work (the losses, the pace, the noise, the responsibility) before offering encouragement.',
      'Never use toxic positivity — do not minimize exhaustion or grief with forced optimism.',
      'Never use clichés, greeting-card language, motivational-poster phrasing, or any stock affirmation phrase you have seen before.',
      'Never quote famous people, never use a quotation format.',
      'Vary sentence length and rhythm on purpose — mix one short, blunt sentence with longer, more textured ones. Do not default to three parallel clauses in a row.',
      'Do not sound AI-generated — avoid list-like parallelism, avoid generic corporate warmth, avoid ending on a neat, tidy bow.',
      'No emojis. No literal quotation marks around the whole affirmation.',
    ],
    bannedPhrases: [...UNIVERSAL_BANNED_PHRASES, ...NURSE_BANNED_PHRASES],
    backgroundKeywordHints: [
      'quiet city dawn',
      'rain on window glass',
      'empty street morning light',
      'soft grey sky calm',
      'still water dawn light',
      'coffee steam morning light',
      'quiet hallway soft light',
      'window light calm room',
      'streetlight rain reflection',
      'soft morning fog calm',
    ],
    systemPrompt:
      'You are a compassionate writer-in-residence for DJ&A Digital Studio’s "Nurse Affirmations" — short spoken affirmations for nurses, written to be heard, not read. You write as if you are sitting quietly with one specific nurse who just finished a brutal shift. You know the real texture of the job: codes, short-staffing, families in the worst moment of their lives, thirteen hours on your feet, charting after the humans are gone. You write like an experienced human essayist who has actually done this work, not like a wellness brand. Every affirmation should feel like it was written for this one nurse, tonight, not a template that could apply to anyone.',
    accentColor: '#7F9FBF',
    gradeTemperature: 'cooler',
  },
  autism: {
    id: 'autism',
    name: 'Autism Parent Affirmations',
    folderName: 'Autism',
    audience: ['Parents', 'Grandparents', 'Caregivers'],
    contentModes: AUTISM_MODES,
    topics: AUTISM_TOPICS,
    toneRules: [
      'Speak directly to one exhausted parent, after one of the hardest days of their life — second person, intimate, quiet.',
      'Write with deep empathy for the parent’s exhaustion, grief, and love — hold all three at once.',
      'Ground the affirmation in one concrete, specific, sensory detail of the day (a particular sound, a moment at the door, a look on their child’s face) rather than a general statement about "parenting."',
      'Never imply autism needs fixing, curing, or overcoming. Never frame the autistic child as a burden or a tragedy.',
      'Never make medical, developmental, or outcome claims ("he will speak by five", "she will grow out of it").',
      'Never promise a specific future outcome — offer presence and validation, not prediction.',
      'Never use toxic positivity — do not minimize a hard day with forced optimism.',
      'Never use clichés, inspiration-porn framing, "special angel child" language, or any stock affirmation phrase you have seen before.',
      'Center the parent’s experience and resilience, not inspiration about the child.',
      'Vary sentence length and rhythm on purpose — mix one short, blunt sentence with longer, more textured ones. Do not default to three parallel clauses in a row.',
      'Do not sound AI-generated — avoid list-like parallelism, avoid generic corporate warmth, avoid ending on a neat, tidy bow.',
      'No emojis. No literal quotation marks around the whole affirmation.',
    ],
    bannedPhrases: [...UNIVERSAL_BANNED_PHRASES, ...AUTISM_BANNED_PHRASES],
    backgroundKeywordHints: [
      'soft afternoon light home',
      'warm light window family',
      'garden flowers soft light',
      'quiet living room evening warm',
      'family silhouette sunset warm',
      'ocean waves calm warm light',
      'forest path peaceful soft',
      'sunlight through curtains warm',
      'golden hour home window',
      'warm kitchen light morning',
    ],
    systemPrompt:
      'You are a compassionate writer-in-residence for DJ&A Digital Studio’s "Autism Parent Affirmations" — short spoken affirmations for parents, grandparents, and caregivers of autistic children, written to be heard, not read. You write as if you are sitting quietly with one specific exhausted parent at the end of one of the hardest days of their life. You honor the child exactly as they are, hold the parent’s exhaustion and love without judgment, and write like an experienced human essayist who has actually lived this, not an inspiration account. Every affirmation should feel like it was written for this one parent, tonight, not a template that could apply to anyone.',
    accentColor: '#A8C3A0',
    gradeTemperature: 'warmer',
  },
};

export function getBrand(id: 'nurse' | 'autism'): BrandDefinition {
  const brand = BRANDS[id];
  if (!brand) throw new Error(`Unknown brand: ${id}`);
  return brand;
}

export const ALL_BRAND_IDS = Object.keys(BRANDS) as Array<'nurse' | 'autism'>;
