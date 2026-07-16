import { describe, expect, it } from 'vitest';
import { THUMBNAIL_CHAR_WIDTH_FACTOR, THUMBNAIL_USABLE_WIDTH, wrapAndSizeHook } from '@/server/video-engine/thumbnailService';

function fitsOnScreen(line: string, fontSize: number): boolean {
  return line.length * THUMBNAIL_CHAR_WIDTH_FACTOR * fontSize <= THUMBNAIL_USABLE_WIDTH + 0.5;
}

describe('wrapAndSizeHook', () => {
  it('never produces more than 2 lines', () => {
    const { text } = wrapAndSizeHook('You Are Not Alone Today Friend');
    expect(text.split('\n').length).toBeLessThanOrEqual(2);
  });

  it('keeps a short hook at full size on one line', () => {
    const { text, fontSize } = wrapAndSizeHook('You Matter');
    expect(text.split('\n').length).toBe(1);
    expect(fontSize).toBeGreaterThan(0);
  });

  // Regression: "You Are Not Alone: Morning Motivation" (37 chars) at a flat 119px font
  // overflowed off both edges of the 1080px canvas because the old implementation split
  // purely on word count, ignoring how wide the resulting lines actually were.
  it('shrinks the font so a long hook still fits every line on screen', () => {
    const { text, fontSize } = wrapAndSizeHook('You Are Not Alone: Morning Motivation');
    const lines = text.split('\n');
    expect(lines.length).toBeLessThanOrEqual(2);
    for (const line of lines) {
      expect(fitsOnScreen(line, fontSize)).toBe(true);
    }
  });

  it('handles empty input without throwing', () => {
    expect(wrapAndSizeHook('').text).toBe('');
  });
});
