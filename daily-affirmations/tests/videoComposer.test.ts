import { describe, expect, it } from 'vitest';
import { buildKenBurnsExpr, pickKenBurnsStyle } from '@/server/video-engine/videoComposer';
import { buildColorGradeFilter } from '@/server/video-engine/ffmpegExpr';

describe('pickKenBurnsStyle', () => {
  it('always returns one of the three known styles and a valid direction', () => {
    for (let i = 0; i < 30; i++) {
      const { style, direction } = pickKenBurnsStyle();
      expect(['zoom-only', 'pan-horizontal', 'pan-vertical']).toContain(style);
      expect([1, -1]).toContain(direction);
    }
  });

  it('produces some variety across many calls (not always the same style)', () => {
    const seen = new Set(Array.from({ length: 50 }, () => pickKenBurnsStyle().style));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('buildKenBurnsExpr', () => {
  const totalFrames = 720; // 24s at 30fps

  it('zoom-only style centers both x and y with no pan term', () => {
    const { zoomExpr, xExpr, yExpr } = buildKenBurnsExpr({ style: 'zoom-only', direction: 1 }, totalFrames);
    expect(zoomExpr).toContain('on');
    expect(xExpr).toBe('(iw-iw/zoom)/2');
    expect(yExpr).toBe('(ih-ih/zoom)/2');
  });

  it('pan-horizontal adds a pan term to x but leaves y centered', () => {
    const { xExpr, yExpr } = buildKenBurnsExpr({ style: 'pan-horizontal', direction: 1 }, totalFrames);
    expect(xExpr).toContain('(iw-iw/zoom)/2+');
    expect(xExpr).toContain('(iw-iw/zoom)*0.35');
    expect(yExpr).toBe('(ih-ih/zoom)/2');
  });

  it('pan-vertical adds a pan term to y but leaves x centered', () => {
    const { xExpr, yExpr } = buildKenBurnsExpr({ style: 'pan-vertical', direction: -1 }, totalFrames);
    expect(yExpr).toContain('(ih-ih/zoom)/2+');
    expect(yExpr).toContain('*-1');
    expect(xExpr).toBe('(iw-iw/zoom)/2');
  });

  it('the zoom expression is capped at the requested maxZoom', () => {
    const { zoomExpr } = buildKenBurnsExpr({ style: 'zoom-only', direction: 1 }, totalFrames, 1.2);
    expect(zoomExpr).toContain('1.2');
    expect(zoomExpr).toMatch(/^min\(1\+/);
  });

  it('produces well-formed, non-empty expressions for every style/direction combination', () => {
    for (const style of ['zoom-only', 'pan-horizontal', 'pan-vertical'] as const) {
      for (const direction of [1, -1] as const) {
        const { zoomExpr, xExpr, yExpr } = buildKenBurnsExpr({ style, direction }, totalFrames);
        for (const expr of [zoomExpr, xExpr, yExpr]) {
          expect(expr.length).toBeGreaterThan(0);
          expect(expr).not.toContain('NaN');
          expect(expr).not.toContain('undefined');
        }
      }
    }
  });
});

describe('buildColorGradeFilter', () => {
  it('produces distinct filter strings for cooler vs warmer', () => {
    const cooler = buildColorGradeFilter('cooler');
    const warmer = buildColorGradeFilter('warmer');
    expect(cooler).not.toBe(warmer);
    expect(cooler).toContain('colorbalance');
    expect(warmer).toContain('colorbalance');
    expect(cooler).toContain('eq=contrast');
    expect(warmer).toContain('eq=contrast');
  });

  it('the cooler grade shifts blue up and red down; the warmer grade the reverse', () => {
    const cooler = buildColorGradeFilter('cooler');
    const warmer = buildColorGradeFilter('warmer');
    expect(cooler).toContain('bs=0.05'); // blue boosted in shadows
    expect(cooler).toContain('rs=-0.03'); // red reduced in shadows
    expect(warmer).toContain('rs=0.04'); // red boosted in shadows
    expect(warmer).toContain('bs=-0.03'); // blue reduced in shadows
  });
});
