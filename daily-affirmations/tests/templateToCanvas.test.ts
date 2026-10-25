import { describe, expect, it } from 'vitest';
import { resolveSlotRect } from '@/lib/editor/templateToCanvas';

describe('resolveSlotRect', () => {
  it('converts a percentage rect to pixels for a given canvas size', () => {
    const rect = resolveSlotRect({ xPct: 10, yPct: 20, wPct: 50, hPct: 30 }, 1000, 2000);
    expect(rect).toEqual({ left: 100, top: 400, width: 500, height: 600 });
  });

  it('handles a full-bleed rect (0%,0%,100%,100%)', () => {
    const rect = resolveSlotRect({ xPct: 0, yPct: 0, wPct: 100, hPct: 100 }, 1080, 1920);
    expect(rect).toEqual({ left: 0, top: 0, width: 1080, height: 1920 });
  });

  it('handles a zero-size rect without throwing', () => {
    const rect = resolveSlotRect({ xPct: 50, yPct: 50, wPct: 0, hPct: 0 }, 800, 800);
    expect(rect).toEqual({ left: 400, top: 400, width: 0, height: 0 });
  });

  it('handles a rect that extends past the canvas edge (off-canvas placement is allowed, not clamped)', () => {
    const rect = resolveSlotRect({ xPct: 80, yPct: 80, wPct: 40, hPct: 40 }, 1000, 1000);
    expect(rect).toEqual({ left: 800, top: 800, width: 400, height: 400 });
  });

  it('scales proportionally for different canvas sizes from the same percentage rect', () => {
    const small = resolveSlotRect({ xPct: 25, yPct: 25, wPct: 50, hPct: 50 }, 100, 100);
    const large = resolveSlotRect({ xPct: 25, yPct: 25, wPct: 50, hPct: 50 }, 1000, 1000);
    expect(large).toEqual({ left: small.left * 10, top: small.top * 10, width: small.width * 10, height: small.height * 10 });
  });
});
