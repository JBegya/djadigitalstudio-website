import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '@/server/utils/logger';
import { escapeDrawtext, escapeFilterPath } from './ffmpegExpr';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './videoComposer';
import { probeDurationSeconds, runFfmpeg } from './ffmpeg';
import { buildLogoFilterChain } from './logoOverlay';

const log = createLogger('thumbnailService');
const LOGO_WIDTH_PX = 116;
const LOGO_MARGIN_PX = 40;
const BASE_FONT_SIZE = Math.round(CANVAS_HEIGHT * 0.062);
export const THUMBNAIL_USABLE_WIDTH = CANVAS_WIDTH * 0.86;
// Empirical average glyph width for Inter ExtraBold, as a fraction of font size.
export const THUMBNAIL_CHAR_WIDTH_FACTOR = 0.56;
const USABLE_WIDTH = THUMBNAIL_USABLE_WIDTH;
const CHAR_WIDTH_FACTOR = THUMBNAIL_CHAR_WIDTH_FACTOR;

export interface ThumbnailRequest {
  /** Clean background footage (no subtitles burned in) — NOT the final composed video, so the
   * hook text never collides with an in-progress subtitle cue baked into the frame. */
  backgroundVideoPath: string;
  hookText: string;
  logoPath?: string | null;
  fontsDir: string;
  outputPath: string;
}

export interface ThumbnailResult {
  outputPath: string;
}

function wrapAtCharBudget(words: string[], charBudget: number): string[] {
  const lines: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidate = [...current, word].join(' ');
    if (candidate.length > charBudget && current.length > 0) {
      lines.push(current.join(' '));
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) lines.push(current.join(' '));
  return lines;
}

/**
 * Wraps the hook into at most 2 lines and picks a font size that guarantees every line fits
 * within the frame — rather than a fixed word-count split at a fixed size, which overflows
 * badly on longer hooks (e.g. "You Are Not Alone: Morning Motivation" at a flat 119px font
 * ran off both edges of the canvas).
 */
export function wrapAndSizeHook(text: string): { text: string; fontSize: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { text: '', fontSize: BASE_FONT_SIZE };

  let fontSize = BASE_FONT_SIZE;
  const budgetFor = (size: number) => Math.max(4, Math.floor(USABLE_WIDTH / (CHAR_WIDTH_FACTOR * size)));

  let lines = wrapAtCharBudget(words, budgetFor(fontSize));
  let guard = 0;
  while (lines.length > 2 && guard < 8) {
    fontSize *= 0.9;
    lines = wrapAtCharBudget(words, budgetFor(fontSize));
    guard++;
  }

  let longest = Math.max(...lines.map((l) => l.length));
  guard = 0;
  while (longest > budgetFor(fontSize) && guard < 8) {
    fontSize *= 0.9;
    lines = wrapAtCharBudget(words, budgetFor(fontSize));
    longest = Math.max(...lines.map((l) => l.length));
    guard++;
  }

  fontSize = Math.max(fontSize, BASE_FONT_SIZE * 0.5);
  return { text: lines.join('\n'), fontSize: Math.round(fontSize) };
}

export async function generateThumbnail(request: ThumbnailRequest): Promise<ThumbnailResult> {
  const { backgroundVideoPath, hookText, fontsDir, outputPath } = request;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // The background may be shorter than the final video (it gets looped by the composer via
  // -stream_loop), so the capture point must stay inside the background's OWN duration.
  const backgroundDuration = await probeDurationSeconds(backgroundVideoPath);
  const captureAt = Math.max(0.2, Math.min(backgroundDuration * 0.4, backgroundDuration - 0.2));

  const hasLogo = Boolean(request.logoPath && fs.existsSync(request.logoPath));
  const fontFile = escapeFilterPath(path.join(fontsDir, 'Inter-ExtraBold.otf'));
  const { text: wrappedText, fontSize } = wrapAndSizeHook(hookText);
  // The wrap's newline is a real embedded line-break byte, which ffmpeg's drawtext renders as
  // a line break directly — escapeDrawtext must run first since it doesn't touch newlines.
  const wrapped = escapeDrawtext(wrappedText);
  const textY = Math.round(CANVAS_HEIGHT * 0.62);

  const steps = [
    `scale=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${CANVAS_WIDTH}:${CANVAS_HEIGHT}`,
    `eq=brightness=-0.02:contrast=1.06:saturation=1.08`,
    `drawtext=fontfile=${fontFile}:text='${wrapped}':line_spacing=14:fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.42:boxborderw=28:x=(w-text_w)/2:y=${textY}:borderw=0`,
  ];

  const inputs = ['-ss', captureAt.toFixed(2), '-i', backgroundVideoPath];
  let chain = `[0:v]${steps.join(',')}[base]`;
  let finalLabel = '[base]';

  if (hasLogo) {
    const logoChain = buildLogoFilterChain(request.logoPath as string, LOGO_WIDTH_PX);
    inputs.push('-i', request.logoPath as string);
    chain += `;[1:v]${logoChain}[wm];[base][wm]overlay=W-w-${LOGO_MARGIN_PX}:H-h-${LOGO_MARGIN_PX}:format=auto[out]`;
    finalLabel = '[out]';
  }

  const args = [...inputs, '-frames:v', '1', '-filter_complex', chain, '-map', finalLabel, outputPath];

  log.info(`Generating thumbnail for ${path.basename(backgroundVideoPath)} at t=${captureAt.toFixed(2)}s (fontSize=${fontSize})`);
  await runFfmpeg(args, `thumbnail generation (${path.basename(outputPath)})`);

  return { outputPath };
}
