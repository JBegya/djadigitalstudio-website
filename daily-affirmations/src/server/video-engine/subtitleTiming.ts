export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface SubtitleCue {
  text: string;
  start: number;
  end: number;
}

const MAX_WORDS_PER_CUE = 5;
const MAX_CHARS_PER_CUE = 26;
const MAX_CUE_DURATION = 2.4;
const MIN_CUE_DURATION = 0.45;

function endsSentence(word: string): boolean {
  return /[.!?]["')\]]*$/.test(word);
}

/**
 * Duration-proportional fallback timing, used when Whisper alignment isn't available (Test
 * Mode, or a transcription failure). Longer words and words followed by punctuation get more
 * time, which reads much closer to natural speech than a flat even split.
 */
export function estimateWordTimings(text: string, durationSeconds: number): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const weights = words.map((word) => {
    let weight = word.replace(/[^\w']/g, '').length || 1;
    if (/[,;:]["')\]]*$/.test(word)) weight += 2;
    if (endsSentence(word)) weight += 4;
    return weight;
  });
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const timePerWeight = durationSeconds / totalWeight;

  let cursor = 0;
  const timings: WordTiming[] = [];
  words.forEach((word, i) => {
    const weight = weights[i] ?? 1;
    const duration = weight * timePerWeight;
    timings.push({ word, start: cursor, end: cursor + duration });
    cursor += duration;
  });
  return timings;
}

/** Groups word-level timings into short, readable on-screen phrases (TikTok/Reels-style captions). */
export function groupIntoCues(timings: WordTiming[]): SubtitleCue[] {
  if (timings.length === 0) return [];
  const cues: SubtitleCue[] = [];
  let current: WordTiming[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0];
    const last = current[current.length - 1];
    if (!first || !last) return;
    const text = current.map((w) => w.word).join(' ');
    const start = first.start;
    const end = Math.max(last.end, start + MIN_CUE_DURATION);
    cues.push({ text, start, end });
    current = [];
  };

  for (const timing of timings) {
    const prospective = [...current, timing];
    const prospectiveFirst = prospective[0];
    const text = prospective.map((w) => w.word).join(' ');
    const duration = prospectiveFirst ? timing.end - prospectiveFirst.start : 0;
    const tooLong = prospective.length > MAX_WORDS_PER_CUE || text.length > MAX_CHARS_PER_CUE || duration > MAX_CUE_DURATION;

    if (tooLong && current.length > 0) {
      flush();
      current = [timing];
    } else {
      current.push(timing);
    }

    if (endsSentence(timing.word)) flush();
  }
  flush();

  for (let i = 0; i < cues.length - 1; i++) {
    const cue = cues[i];
    const next = cues[i + 1];
    if (cue && next && cue.end > next.start) cue.end = Math.max(cue.start + 0.1, next.start - 0.02);
  }

  return cues;
}

export function buildSubtitleCues(text: string, wordTimings: WordTiming[] | null, durationSeconds: number): SubtitleCue[] {
  const timings = wordTimings && wordTimings.length > 0 ? wordTimings : estimateWordTimings(text, durationSeconds);
  return groupIntoCues(timings);
}
