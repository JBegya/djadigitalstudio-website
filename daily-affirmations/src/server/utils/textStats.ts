export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(normalizeForComparison(text).split(' ').filter((w) => w.length > 2));
}

/** Jaccard similarity of the two texts' significant-word sets. 1 = identical vocabulary, 0 = nothing shared. */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function findBannedPhrase(text: string, bannedPhrases: string[]): string | null {
  const normalized = normalizeForComparison(text);
  for (const phrase of bannedPhrases) {
    if (normalized.includes(normalizeForComparison(phrase))) return phrase;
  }
  return null;
}

/** Rough sentence splitter — good enough for structure checks (opening / body / closing). */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasRepeatedWordRun(text: string, minRun = 3): boolean {
  const words = normalizeForComparison(text).split(' ');
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    if (words[i] && words[i] === words[i - 1]) {
      run++;
      if (run >= minRun) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

export function containsEmoji(text: string): boolean {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
}

/**
 * Flags the "list-like parallelism" AI-tell — three or more sentences opening with the exact
 * same two words ("You are enough. You are worthy. You are strong.") rather than natural,
 * varied phrasing. Deliberately narrow (same two-word opening, not just the same subject) so it
 * doesn't penalize ordinary second-person narration, which this content is written in on
 * purpose and will legitimately start more than one sentence with "You".
 */
export function hasRepetitiveSentenceOpenings(text: string, minRepeats = 3): boolean {
  const counts = new Map<string, number>();
  for (const sentence of splitSentences(text)) {
    const words = normalizeForComparison(sentence).split(' ').filter(Boolean);
    const opening = words.slice(0, 2).join(' ');
    if (!opening) continue;
    counts.set(opening, (counts.get(opening) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= minRepeats);
}
