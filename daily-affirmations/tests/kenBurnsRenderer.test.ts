import { describe, expect, it } from 'vitest';
import { buildKenBurnsExpr, hashToSeed, pickKenBurnsStyle } from '@/server/video-engine/kenBurnsRenderer';

describe('pickKenBurnsStyle', () => {
  it('always returns one of the three known styles and a valid direction', () => {
    for (let seed = 0; seed < 30; seed++) {
      const { style, direction } = pickKenBurnsStyle(seed);
      expect(['zoom-only', 'pan-horizontal', 'pan-vertical']).toContain(style);
      expect([1, -1]).toContain(direction);
    }
  });

  it('is deterministic — the same seed always produces the same style/direction', () => {
    expect(pickKenBurnsStyle(7)).toEqual(pickKenBurnsStyle(7));
    expect(pickKenBurnsStyle(0)).toEqual(pickKenBurnsStyle(0));
  });

  it('produces variety across different seeds (not always the same style)', () => {
    const seen = new Set(Array.from({ length: 50 }, (_, i) => pickKenBurnsStyle(i).style));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('handles negative seeds (from hashToSeed) without throwing or returning an invalid style', () => {
    const { style } = pickKenBurnsStyle(-17);
    expect(['zoom-only', 'pan-horizontal', 'pan-vertical']).toContain(style);
  });
});

describe('hashToSeed', () => {
  it('is deterministic for the same input', () => {
    expect(hashToSeed('/tmp/scene-1.png')).toBe(hashToSeed('/tmp/scene-1.png'));
  });

  it('produces different seeds for different inputs (not a constant)', () => {
    expect(hashToSeed('/tmp/scene-1.png')).not.toBe(hashToSeed('/tmp/scene-2.png'));
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
