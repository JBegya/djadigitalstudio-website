import { describe, expect, it } from 'vitest';
import { buildAssSubtitleFile } from '@/server/video-engine/assSubtitles';

const CUES = [
  { text: 'You are still standing', start: 0.2, end: 2.1 },
  { text: 'after everything today.', start: 2.2, end: 4.5 },
];

describe('buildAssSubtitleFile', () => {
  it('embeds the canvas resolution and one Dialogue line per cue', () => {
    const ass = buildAssSubtitleFile(CUES, { fontFamily: 'Inter', colorHex: '#FFFFFF', position: 'bottom', canvasWidth: 1080, canvasHeight: 1920 });
    expect(ass).toContain('PlayResX: 1080');
    expect(ass).toContain('PlayResY: 1920');
    expect(ass.match(/^Dialogue:/gm)?.length).toBe(2);
    expect(ass).toContain('You are still standing');
    expect(ass).toContain('after everything today.');
  });

  it('maps subtitle position to the correct ASS alignment code', () => {
    const bottom = buildAssSubtitleFile(CUES, { fontFamily: 'Inter', colorHex: '#FFFFFF', position: 'bottom', canvasWidth: 1080, canvasHeight: 1920 });
    const top = buildAssSubtitleFile(CUES, { fontFamily: 'Inter', colorHex: '#FFFFFF', position: 'top', canvasWidth: 1080, canvasHeight: 1920 });
    const center = buildAssSubtitleFile(CUES, { fontFamily: 'Inter', colorHex: '#FFFFFF', position: 'center', canvasWidth: 1080, canvasHeight: 1920 });

    expect(bottom).toMatch(/Style: Caption,.*,2,\d+,\d+,\d+,1/);
    expect(top).toMatch(/Style: Caption,.*,8,\d+,\d+,\d+,1/);
    expect(center).toMatch(/Style: Caption,.*,5,\d+,\d+,\d+,1/);
  });

  it('converts hex colors to ASS BGR order', () => {
    // #FF0000 (red) -> ASS stores BGR, so it becomes &H000000FF
    const ass = buildAssSubtitleFile(CUES, { fontFamily: 'Inter', colorHex: '#FF0000', position: 'bottom', canvasWidth: 1080, canvasHeight: 1920 });
    expect(ass).toContain('&H000000FF');
  });

  it('formats dialogue timestamps as H:MM:SS.CC', () => {
    const ass = buildAssSubtitleFile(CUES, { fontFamily: 'Inter', colorHex: '#FFFFFF', position: 'bottom', canvasWidth: 1080, canvasHeight: 1920 });
    expect(ass).toMatch(/Dialogue: 0,0:00:00\.20,0:00:02\.10,Caption/);
  });
});
