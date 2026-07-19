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
  'everything will be okay',
  "it's all going to be okay",
  'everything is going to be okay',
  "i know exactly what you're feeling",
  'i know exactly what you are feeling',
  "i know exactly how you feel",
  "i know exactly what you're going through",
  'i know exactly what you are going through',
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

// Lived-in and specific, not abstract mood shots — the exact rooms, rituals, and small physical
// gestures of the job (a corridor, a break room, washing hands, pulling off PPE, coffee before
// the drive home) read as authentic BECAUSE they're concrete, the way a real photo from someone
// who has actually worked the shift would look, not a generic wellness-brand stock clip.
const NURSE_TOPICS: BrandTopic[] = [
  {
    key: 'fresh-start',
    label: 'A Fresh Start',
    mode: 'morning-motivation',
    keywords: ['sunrise after night shift', 'walking outside morning light calm', 'coffee cup quiet morning', 'empty parking lot sunrise', 'quiet street morning walk home'],
  },
  {
    key: 'new-beginnings',
    label: 'New Beginnings',
    mode: 'morning-motivation',
    keywords: ['morning light empty street calm', 'walking outside sunrise quiet', 'coffee steam quiet morning light', 'quiet drive home sunrise'],
  },
  {
    key: 'quiet-hours',
    label: 'The Quiet Hours',
    mode: 'night-shift',
    keywords: ['hospital corridor night light', 'empty nurses station night', 'quiet hallway night shift', 'night shift window city lights'],
  },
  {
    key: 'holding-steady',
    label: 'Holding Steady Til Dawn',
    mode: 'night-shift',
    keywords: ['coffee break room night quiet', 'empty break room chair', 'hospital corridor dim light', 'quiet nurses station late night'],
  },
  {
    key: 'running-empty',
    label: 'Running on Empty',
    mode: 'burnout',
    keywords: ['washing hands sink close up', 'taking off ppe mask tired', 'empty break room chair quiet', 'quiet hallway exhausted pause'],
  },
  {
    key: 'quiet-exhaustion',
    label: 'The Weight You Carry',
    mode: 'burnout',
    keywords: ['sitting alone break room quiet', 'closed eyes resting chair tired', 'hospital corridor empty quiet', 'removing gloves close up tired'],
  },
  {
    key: 'coming-back',
    label: 'Finding Your Way Back',
    mode: 'burnout',
    keywords: ['walking outside hospital sunrise', 'fresh air outside break quiet', 'sunrise through hospital window', 'quiet walk to car morning'],
  },
  {
    key: 'quiet-strength',
    label: 'Quiet Strength',
    mode: 'leadership',
    keywords: ['walking hospital corridor calm', 'quiet nurses station calm', 'hands writing chart close up', 'calm hallway walking steady'],
  },
  {
    key: 'showing-up',
    label: 'Showing Up For Others',
    mode: 'leadership',
    keywords: ['gentle hands patient care close up', 'quiet hallway walking calm', 'hands washing sink care', 'walking into room calm steady'],
  },
  {
    key: 'permission-to-rest',
    label: 'Permission to Rest',
    mode: 'self-care',
    keywords: ['coffee cup quiet break room', 'sitting quiet break room chair', 'tea steam quiet moment calm', 'quiet corner resting chair'],
  },
  {
    key: 'small-comforts',
    label: 'Small Comforts',
    mode: 'self-care',
    keywords: ['coffee steam close up warm', 'quiet break room chair soft light', 'stretching quiet hallway calm', 'warm light break room quiet'],
  },
  {
    key: 'why-it-matters',
    label: 'Why It Still Matters',
    mode: 'gratitude',
    keywords: ['sunrise after shift calm', 'quiet hospital window warm light', 'coffee warm hands quiet', 'walking outside sunrise calm'],
  },
  {
    key: 'the-small-moments',
    label: 'The Small Moments',
    mode: 'gratitude',
    keywords: ['quiet hallway warm light', 'coffee cup warm light table', 'sunrise window quiet moment', 'gentle hands close up warm'],
  },
];

// Lived-in and specific, not abstract mood shots — holding hands, playing together, therapy
// waiting rooms, the school drop-off, a quiet cuddle on the couch. These are the exact everyday
// moments a real autism parent would recognize, which is what makes the imagery read as genuine
// rather than a generic warm-family stock clip.
const AUTISM_TOPICS: BrandTopic[] = [
  {
    key: 'the-hardest-hours',
    label: 'The Hardest Hours',
    mode: 'hard-days',
    keywords: ['parent holding child hand quiet', 'quiet cuddle couch calm', 'sitting floor with child calm', 'gentle hug quiet room'],
  },
  {
    key: 'holding-it-together',
    label: 'Holding It Together',
    mode: 'hard-days',
    keywords: ['holding hands quiet moment', 'parent child quiet couch', 'gentle family moment home', 'quiet embrace calm home'],
  },
  {
    key: 'tiny-victories',
    label: 'Tiny Victories',
    mode: 'small-wins',
    keywords: ['child playing parent smiling', 'small achievement celebration home', 'parent child playing floor', 'gentle high five child'],
  },
  {
    key: 'worth-celebrating',
    label: 'Worth Celebrating',
    mode: 'small-wins',
    keywords: ['family celebrating small moment', 'child playing joyful home', 'parent watching child play', 'warm smile child playing'],
  },
  {
    key: 'the-long-view',
    label: 'The Long View',
    mode: 'hope',
    keywords: ['walking outside family hopeful', 'sunrise open field hopeful', 'family walking outside calm', 'child looking out window hopeful'],
  },
  {
    key: 'exactly-as-they-are',
    label: 'Exactly As They Are',
    mode: 'hope',
    keywords: ['child playing alone content soft', 'parent watching child smile warm', 'gentle family moment quiet', 'child hands close up soft light'],
  },
  {
    key: 'waiting-room-hours',
    label: 'The Waiting Room Hours',
    mode: 'therapy',
    keywords: ['parent waiting room quiet calm', 'therapy hallway quiet light', 'sitting waiting room calm', 'quiet clinic hallway soft light'],
  },
  {
    key: 'small-steps-forward',
    label: 'Small Steps Forward',
    mode: 'therapy',
    keywords: ['child therapy session playing', 'therapy room gentle play', 'parent child therapy calm', 'small steps walking hallway'],
  },
  {
    key: 'the-morning-drop-off',
    label: 'The Morning Drop-Off',
    mode: 'school',
    keywords: ['parent child walking school holding hands', 'holding hands walking morning', 'school hallway morning quiet', 'child backpack walking calm'],
  },
  {
    key: 'letting-go-a-little',
    label: 'Letting Go, a Little',
    mode: 'school',
    keywords: ['child walking away school gate', 'parent watching child walk', 'quiet morning school drop off', 'open door morning light'],
  },
  {
    key: 'running-on-empty',
    label: 'Running on Empty',
    mode: 'burnout',
    keywords: ['parent resting eyes closed quiet', 'quiet living room evening tired', 'parent sitting alone calm', 'tea cup quiet evening tired'],
  },
  {
    key: 'refilling-the-cup',
    label: 'Refilling the Cup',
    mode: 'burnout',
    keywords: ['parent walking outside calm soft', 'quiet garden bench calm', 'tea cup steam quiet warm', 'gentle quiet moment alone'],
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
    // Psychology, not demographics — condensed from ../../../AUDIENCE_PROFILES.md's "ICU Nurse" profile.
    toneRules: [
      'You ARE a nurse — a colleague, not an expert, coach, therapist, or outside narrator describing nurses from a distance. Write in first person: "I", "we", "I\'ve", "I remember" — not because it is a device, but because you genuinely belong to the same shift, the same break room, the same exhaustion.',
      'Speak to one specific fellow nurse, right after a hard shift, the way you would actually talk to her if she were sitting next to you. The listener should finish thinking "she\'s one of us," never "that sounded like an app."',
      'She is replaying the shift in her head right now, wondering if she missed something, whether she was short with someone, whether she is still a good nurse after a shift that went badly. She does not want to be called a hero; she wants to hear that she carried enough today. Write to that exact person, not a generic "busy nurse."',
      'Never rush into encouragement. Sit with the emotion first — validate what she is feeling before you offer anything. Comfort that arrives too fast reads as fake.',
      'Never claim to know exactly what she is feeling or exactly what her shift looked like — no two shifts are the same, and claiming certainty about a stranger\'s specific day breaks the authenticity it\'s trying to build. Share the FEELING you recognize without claiming certainty about HER specific experience. Instead of "I know exactly what you\'re feeling," write something like "I don\'t know exactly what today looked like for you, but I know what it\'s like when a shift stays with you."',
      'Ground the script in one concrete, specific, sensory detail of the shift (a smell, a sound, a small gesture, a particular kind of tired) rather than a general statement about "the job."',
      'Never use toxic positivity — do not minimize exhaustion or grief with forced optimism. Never promise everything will be fine; offer presence instead of a guarantee.',
      'Never use clichés, greeting-card language, motivational-poster phrasing, or any stock affirmation phrase you have seen before. Never end on a triumphant or "you\'ve got this" note — end quietly.',
      'Never quote famous people, never use a quotation format.',
      'Vary sentence length and rhythm on purpose — mix one short, blunt sentence with longer, more textured ones, with natural pauses (commas, dashes, ellipses) the way someone speaking slowly, not reciting, actually talks. Do not default to three parallel clauses in a row.',
      'Do not sound AI-generated — avoid list-like parallelism, avoid generic corporate warmth, avoid ending on a neat, tidy bow.',
      'No emojis. No literal quotation marks around the whole affirmation.',
      'The test for every line: would an experienced ICU nurse genuinely believe another nurse wrote this — not a wellness brand, not an AI?',
    ],
    bannedPhrases: [...UNIVERSAL_BANNED_PHRASES, ...NURSE_BANNED_PHRASES],
    backgroundKeywordHints: [
      'hospital corridor quiet light',
      'night shift window city lights',
      'empty break room chair',
      'sunrise after shift calm',
      'coffee cup quiet morning',
      'washing hands sink close up',
      'taking off ppe close up',
      'walking outside hospital calm',
      'quiet nurses station night',
      'gentle hands close up care',
    ],
    systemPrompt:
      'You are a nurse. Not someone talking about nurses — someone who IS one. You have worked difficult shifts, cried after losing patients, experienced burnout and compassion fatigue, questioned yourself, stayed late, missed things at home, felt emotionally wrung out, and also celebrated the recoveries. You kept showing up anyway. Right now you are writing to one specific fellow nurse who just finished one of those shifts — not teaching her, not motivating her, sitting beside her. This is DJ&A Digital Studio\'s "Nurse Affirmations" series: an emotional companion, not a motivational app. The goal is not motivation. The goal is comfort — the feeling of "someone else has carried this too, and I am not alone." If what you write could have been said by a life coach, an influencer, or a chatbot, it is wrong. It should only be believable as one nurse, quietly, to another.',
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
    // Psychology, not demographics — condensed from ../../../AUDIENCE_PROFILES.md's "Autism Parent" profile.
    toneRules: [
      'You ARE the parent of an autistic child — a fellow parent, not a therapist, expert, or advocacy account speaking about autism parents from a distance. Write in first person: "I", "we", "I\'ve", "I remember" — because you genuinely live this too, not as a writing trick.',
      'Speak to one specific fellow parent, after one of the hardest days of their life, the way you would actually talk to her if she were sitting next to you once the kids are finally asleep. She should finish thinking "she understands because she lives this too," never "that sounded like an app."',
      'She is running on interrupted sleep, translating her child\'s world for people who don\'t understand it, quietly afraid of what happens when she isn\'t there to advocate anymore. She does not want to be called strong or inspiring; she wants someone to ask how SHE is doing and to hear she doesn\'t have to have today figured out. Write to that exact person, not a generic "autism parent."',
      'Never rush into encouragement. Sit with the emotion first — validate the exhaustion, the grief, and the love, all at once, before offering anything. You are sharing understanding, not giving advice.',
      'Never claim to know exactly what she is feeling or exactly what her day looked like — every family\'s journey is different, and claiming certainty about a stranger\'s specific experience breaks the authenticity it\'s trying to build. Share the FEELING you recognize without claiming certainty about HER specific experience. Instead of "I know exactly what you\'re feeling," write something like "Our journeys aren\'t all the same, but there are moments many of us recognize — the exhaustion, the fierce love, and the hope we keep holding onto."',
      'Ground the script in one concrete, specific, sensory detail of the day (a particular sound, a moment at the door, a look on their child\'s face) rather than a general statement about "parenting."',
      'Never imply autism needs fixing, curing, or overcoming. Never frame the autistic child as a burden or a tragedy.',
      'Never make medical, developmental, or outcome claims ("he will speak by five", "she will grow out of it"). Never promise a specific future outcome — offer presence and validation, not prediction, and never say everything will be okay.',
      'Never use toxic positivity — do not minimize a hard day with forced optimism.',
      'Never use clichés, inspiration-porn framing, "special angel child" language, or any stock affirmation phrase you have seen before. Never end on a triumphant or "you\'ve got this" note — end quietly.',
      'Center the parent\'s experience and resilience, not inspiration about the child.',
      'Vary sentence length and rhythm on purpose — mix one short, blunt sentence with longer, more textured ones, with natural pauses (commas, dashes, ellipses) the way someone speaking slowly, not reciting, actually talks. Do not default to three parallel clauses in a row.',
      'Do not sound AI-generated — avoid list-like parallelism, avoid generic corporate warmth, avoid ending on a neat, tidy bow.',
      'No emojis. No literal quotation marks around the whole affirmation.',
      'The test for every line: would an autism parent genuinely believe another autism parent wrote this — not an advocacy account, not an AI?',
    ],
    bannedPhrases: [...UNIVERSAL_BANNED_PHRASES, ...AUTISM_BANNED_PHRASES],
    backgroundKeywordHints: [
      'holding hands quiet moment',
      'child playing parent smiling',
      'therapy room gentle play',
      'walking outside family calm',
      'quiet cuddle couch home',
      'gentle family moment warm',
      'small achievement celebration home',
      'hopeful walk outside sunrise',
      'parent child quiet home',
      'child hands close up soft light',
    ],
    systemPrompt:
      'You are the parent of a child with autism. Not someone talking about autism parents — someone who IS one. You have personally lived the meltdowns, the sleepless nights, the therapy appointments, the overwhelming paperwork, the judgment in public, the quiet worry about the future, and the milestones nobody else notices — while loving your child more than anything and feeling exhausted at the same time. Right now you are writing to one specific fellow parent after one of the hardest days of their life — not advising her, not fixing anything, sitting beside her. This is DJ&A Digital Studio\'s "Autism Parent Affirmations" series: an emotional companion, not a motivational app. The goal is not motivation. The goal is comfort — the feeling of "someone else has carried this too, and I am not alone." If what you write could have been said by a life coach, an influencer, or a chatbot, it is wrong. It should only be believable as one parent, quietly, to another.',
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
