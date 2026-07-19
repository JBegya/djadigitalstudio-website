import type { SubtitlePosition } from '@/types/domain';
import type { SubtitleCue } from './subtitleTiming';

export interface AssStyleOptions {
  fontFamily: string;
  colorHex: string;
  position: SubtitlePosition;
  canvasWidth: number;
  canvasHeight: number;
}

function toAssTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const centiseconds = Math.round((clamped - Math.floor(clamped)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

/** '#RRGGBB' -> ASS '&H00BBGGRR' (ASS colors are BGR, alpha-first, hex, no leading '#'). */
function hexToAssColor(hex: string): string {
  const clean = hex.replace('#', '').padEnd(6, 'F').slice(0, 6);
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function alignmentFor(position: SubtitlePosition): number {
  if (position === 'top') return 8;
  if (position === 'center') return 5;
  return 2; // bottom-center
}

function marginVFor(position: SubtitlePosition, canvasHeight: number): number {
  // Keeps captions clear of platform UI chrome (like/comment/share rail at the bottom,
  // profile handle + progress bar at the top on Reels/TikTok/Shorts).
  if (position === 'top') return Math.round(canvasHeight * 0.135);
  if (position === 'center') return Math.round(canvasHeight * 0.02);
  return Math.round(canvasHeight * 0.2);
}

function escapeAssText(text: string): string {
  return text.replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\N');
}

/**
 * Builds a styled, animated .ass subtitle track — high-contrast bold captions with a soft
 * fade + gentle scale pop-in, positioned to stay inside the safe area on every reels/shorts
 * surface. libass (via ffmpeg's `ass` filter) renders this directly onto the video.
 */
export function buildAssSubtitleFile(cues: SubtitleCue[], options: AssStyleOptions): string {
  const { fontFamily, colorHex, position, canvasWidth, canvasHeight } = options;
  const fontSize = Math.round(canvasHeight * 0.0445);
  const alignment = alignmentFor(position);
  const marginV = marginVFor(position, canvasHeight);
  const marginLR = Math.round(canvasWidth * 0.083);
  const primaryColor = hexToAssColor(colorHex);

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${canvasWidth}`,
    `PlayResY: ${canvasHeight}`,
    'WrapStyle: 1',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Caption,${fontFamily},${fontSize},${primaryColor},&H000000FF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,4,1,${alignment},${marginLR},${marginLR},${marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = cues.map((cue) => {
    const start = toAssTime(cue.start);
    const end = toAssTime(cue.end);
    const fadeMs = 110;
    const popEndMs = fadeMs + 90;
    const text = `{\\fad(${fadeMs},${fadeMs})\\t(0,${popEndMs},\\fscx104\\fscy104)\\t(${popEndMs},${popEndMs + 80},\\fscx100\\fscy100)}${escapeAssText(cue.text)}`;
    return `Dialogue: 0,${start},${end},Caption,,0,0,0,,${text}`;
  });

  return [...header, ...events].join('\n');
}
