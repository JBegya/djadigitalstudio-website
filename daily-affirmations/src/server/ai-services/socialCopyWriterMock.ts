import type { BrandId, CaptionSet } from '@/types/domain';

const GENERIC_LARGE = ['#affirmations', '#mentalhealth', '#selfcare', '#motivation', '#healing', '#mindfulness'];
const NURSE_MEDIUM = ['#nurselife', '#nursesofinstagram', '#nurseappreciation', '#rn', '#healthcareheroes', '#nursingschool'];
const NURSE_SMALL = ['#nurseburnout', '#nightshiftnurse', '#icunurse', '#ernurse', '#newgradnurse', '#nursesupport'];
const AUTISM_MEDIUM = ['#autismparent', '#autismawareness', '#autismacceptance', '#specialneedsparenting', '#neurodivergent', '#autismmom'];
const AUTISM_SMALL = ['#autismdad', '#autismfamily', '#autismjourney', '#sensoryprocessing', '#autismsupport', '#autismlife'];

export function generateMockCaptions(brand: BrandId, topicLabel: string): CaptionSet {
  const who = brand === 'nurse' ? 'nurse' : 'parent';
  return {
    facebook: `A quiet reminder for every ${who} navigating ${topicLabel.toLowerCase()} today — you are doing better than you think. (Test Mode caption)`,
    instagram: `For every ${who} in the ${topicLabel.toLowerCase()} season. You're not alone. (Test Mode caption)`,
    tiktok: `POV: you needed to hear this today. (Test Mode caption)`,
    youtubeShorts: `A daily affirmation for ${who}s on the topic of ${topicLabel.toLowerCase()}. Part of DJ&A Digital Studio's daily affirmations series. (Test Mode caption)`,
  };
}

// Short, punchy standalone hooks — deliberately NOT built by concatenating the topic label,
// which produces long, thumbnail-unfriendly strings like "You Are Not Alone: Morning
// Motivation" (37 characters is too wide to render legibly even at 2 lines).
const HOOKS = ['You Are Not Alone', 'Rest Is Not Weak', 'You Did Enough Today', 'This Is Enough', 'You Are Still Here', 'One Day At A Time'];

export function generateMockThumbnailHook(topicLabel: string): string {
  const seed = topicLabel.length + topicLabel.charCodeAt(0);
  return HOOKS[seed % HOOKS.length] ?? HOOKS[0]!;
}

export function generateMockHashtags(brand: BrandId): string[] {
  const brandTags = brand === 'nurse' ? [...NURSE_MEDIUM, ...NURSE_SMALL] : [...AUTISM_MEDIUM, ...AUTISM_SMALL];
  const pool = [...GENERIC_LARGE, ...brandTags, '#dailyaffirmations', '#youarenotalone', '#onedayatatime', '#gentlereminder'];
  const tags = [...pool];
  while (tags.length < 30) tags.push(`#affirmation${tags.length}`);
  return tags.slice(0, 30);
}
