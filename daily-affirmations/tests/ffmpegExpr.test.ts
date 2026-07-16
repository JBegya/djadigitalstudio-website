import { describe, expect, it } from 'vitest';
import { escapeDrawtext, escapeFilterPath } from '@/server/video-engine/ffmpegExpr';

describe('escapeFilterPath', () => {
  it('leaves a normal POSIX path unchanged', () => {
    expect(escapeFilterPath('/home/user/exports/subs.ass')).toBe('/home/user/exports/subs.ass');
  });

  it('escapes backslashes and drive colons in Windows paths', () => {
    expect(escapeFilterPath('C:\\Users\\dja\\subs.ass')).toBe('C\\:\\\\Users\\\\dja\\\\subs.ass');
  });
});

describe('escapeDrawtext', () => {
  it('escapes colons and percent signs', () => {
    expect(escapeDrawtext('10:30 and 50%')).toBe('10\\:30 and 50\\%');
  });

  it('replaces single quotes with a typographic apostrophe instead of breaking the filter', () => {
    expect(escapeDrawtext("You're doing great")).toBe('You’re doing great');
  });
});
