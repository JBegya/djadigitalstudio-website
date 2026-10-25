import { describe, expect, it } from 'vitest';
import { computeSnap } from '@/lib/editor/snapping';

describe('computeSnap', () => {
  it('snaps to the canvas horizontal and vertical center when close enough', () => {
    // canvas 1000x1000, center at (500,500); a 200x100 box near-centered (left=398, top=449)
    // has its own center at (498,499) — within the 6px threshold of (500,500) on both axes.
    const result = computeSnap({ left: 398, top: 449, width: 200, height: 100 }, 1000, 1000, []);
    expect(result.left).toBe(400); // 500 - 200/2
    expect(result.top).toBe(450); // 500 - 100/2
    expect(result.guides).toEqual(
      expect.arrayContaining([
        { orientation: 'vertical', position: 500 },
        { orientation: 'horizontal', position: 500 },
      ]),
    );
  });

  it('snaps to another object\'s edge when within the threshold', () => {
    const other = { left: 100, top: 100, width: 50, height: 50 }; // right edge at 150
    const moving = { left: 152, top: 300, width: 40, height: 40 }; // left edge 2px from other's right edge
    const result = computeSnap(moving, 2000, 2000, [other]);
    expect(result.left).toBe(150);
    expect(result.guides).toContainEqual({ orientation: 'vertical', position: 150 });
  });

  it('does not snap when nothing is within the threshold', () => {
    const other = { left: 100, top: 100, width: 50, height: 50 };
    const moving = { left: 500, top: 500, width: 40, height: 40 };
    const result = computeSnap(moving, 2000, 2000, [other]);
    expect(result.left).toBeUndefined();
    expect(result.top).toBeUndefined();
    expect(result.guides).toEqual([]);
  });

  it('picks the nearest of multiple in-range candidates', () => {
    // Both objects are wide enough that their own centers/right edges land far away (no
    // center-snap interference) — this isolates a clean left-edge-vs-left-edge comparison.
    const fartherObject = { left: 195, top: 0, width: 1000, height: 10 }; // left edge 5px away
    const closerObject = { left: 204, top: 0, width: 1000, height: 10 }; // left edge 4px away
    const moving = { left: 200, top: 500, width: 30, height: 30 };
    const result = computeSnap(moving, 5000, 5000, [fartherObject, closerObject]);
    expect(result.left).toBe(204);
  });
});
