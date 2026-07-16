import type { BrandId } from '@/types/domain';
import { getBrand } from '@/server/config/brands';

// Test Mode script generator — used only when no OpenAI key is configured, so the whole
// pipeline (voice, background, subtitles, mixing, export) can be exercised end-to-end
// without an API key. Output is clearly a placeholder and is never meant to be posted.

const OPENERS: Record<BrandId, string[]> = {
  nurse: [
    'You are still standing at the end of a shift that asked everything of you.',
    'The hallway is quiet now, and so is the part of you that was running on empty an hour ago.',
    'Nobody saw what that room cost you tonight, but I did.',
    'Your feet ache and your scrubs still smell like the unit, and you made it through anyway.',
  ],
  autism: [
    'The house is quiet now, and you are still the parent who stayed in the room.',
    'Today asked more of you than most people will ever understand.',
    'You spent the hard hour on the floor beside your child instead of walking away.',
    'Nobody clapped for what you did today, but it mattered.',
  ],
};

const BODIES: Record<BrandId, string[]> = {
  nurse: [
    'You carried other people through the worst hours of their lives, and you did it with steady hands even when your own were shaking.',
    'You do not have to feel strong right now to have been strong all shift — the two are not the same thing, and only one of them was required today.',
    'Every small kindness you gave today happened while you were exhausted, which makes it count for more, not less.',
  ],
  autism: [
    'You met the meltdown, the silence, the hard transition, with a patience that nobody hands out awards for, and it mattered anyway.',
    'Loving your child does not mean today was easy, and needing rest tonight does not mean you love them any less.',
    'You are learning your child in real time, with no manual, and you are doing it with more care than you are giving yourself credit for.',
  ],
};

const CLOSERS: Record<BrandId, string[]> = {
  nurse: [
    'Rest tonight. You have already given enough for one day.',
    'Let this shift end here — you do not owe the next one anything yet.',
    'You were exactly what someone needed today, and now it is your turn to be taken care of.',
  ],
  autism: [
    'Rest tonight. Tomorrow only needs you, not a perfect version of you.',
    'You are allowed to be tired and still be a good parent — both are true at once.',
    'This is enough. You are enough, even on the hard days.',
  ],
};

function pick<T>(arr: T[], seed: number): T {
  const item = arr[Math.abs(seed) % arr.length];
  if (item === undefined) throw new Error('pick() called on empty array');
  return item;
}

export function generateMockAffirmation(brand: BrandId, topicKey: string): string {
  const topic = getBrand(brand).topics.find((t) => t.key === topicKey)?.label ?? topicKey;
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const opener = pick(OPENERS[brand], seed);
  const body = pick(BODIES[brand], seed >> 2);
  const closer = pick(CLOSERS[brand], seed >> 4);
  void topic; // topic still drives which line pool a real (non-mock) run would use
  return `${opener} ${body} ${closer}`;
}
