import path from 'node:path';
import { getDefaultLogoPath } from '@/server/config/paths';

/** True for our shipped monogram (solid black background) — everything else is trusted to already be a transparent PNG. */
export function isDefaultLogo(logoPath: string): boolean {
  return path.resolve(logoPath) === path.resolve(getDefaultLogoPath());
}

// Small, elegant, and never competing with the affirmation itself — the watermark should read
// as a quiet signature in the corner, not a bold logo placement. 0.18 sits in the middle of the
// brand identity's 15-20% opacity spec.
const WATERMARK_OPACITY = 0.18;

/** Filter chain (no brackets) that scales a logo input to `widthPx` wide and makes it a clean, semi-transparent watermark. */
export function buildLogoFilterChain(logoPath: string, widthPx: number, opacity = WATERMARK_OPACITY): string {
  const scale = `scale=${widthPx}:-1`;
  if (isDefaultLogo(logoPath)) {
    return `${scale},format=yuva420p,colorkey=0x000000:0.22:0.10,colorchannelmixer=aa=${opacity}`;
  }
  return `${scale},format=rgba,colorchannelmixer=aa=${opacity}`;
}
