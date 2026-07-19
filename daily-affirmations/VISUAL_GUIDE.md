# Visual Guide — DJ&A Daily Affirmations

Read `BRAND_VOICE.md` first. This document covers everything a viewer sees and hears that isn't
the words themselves: color, motion, footage, subtitles, and music. The code that implements this
lives mainly in `src/server/video-engine/` (composition, subtitles, brand frames) and
`src/server/config/brands.ts` (per-brand accent colors and imagery keywords).

Every visual and audio decision serves the same goal as the writing: the viewer should feel like
they're sitting quietly with someone who understands, not watching a produced piece of content. If
a visual choice looks impressive but reads as "produced" rather than "real," it's the wrong choice.

## Canvas and safe areas

1080×1920, 30fps, H.264/AAC — full-bleed vertical, matching Facebook Reels, Instagram Reels,
TikTok, and YouTube Shorts. Subtitles and any on-screen text stay inside each platform's safe area
so nothing gets cropped or hidden behind a platform's own UI (like/comment buttons, captions bar).

## Color palette

The shared DJ&A palette, used identically across both series:

| Color | Hex | Use |
|---|---|---|
| Deep Charcoal | `#121212` | Background — the brand intro/outro, never a loud color |
| Soft Warm White | `#F8F8F6` | Primary text |
| Muted Gold | `#C9A227` | Subtle accents only (the outro's call-to-action) — never a dominant color, never used for large areas |

Plus one accent per series, applied to the video's color grade and used as a quiet visual signal
of which series a viewer is watching:

| Series | Accent | Hex | Grade lean |
|---|---|---|---|
| Nurse Affirmations | Dusty Blue | `#7F9FBF` | Cooler — clinical calm |
| Autism Parent Affirmations | Soft Sage Green | `#A8C3A0` | Warmer — family warmth |

See `NURSE_STYLE_GUIDE.md` / `AUTISM_PARENT_STYLE_GUIDE.md` for how this plays out in imagery
choices specifically.

## Typography

**Inter**, throughout. A clear hierarchy for titles, the affirmation text, and subtitles, always
sized and weighted for mobile readability at arm's length on a phone screen — this is watched on a
5-6 inch screen while scrolling, not a desktop monitor.

## Motion — the Ken Burns treatment

Every clip gets a slow, smooth, centered zoom, with an occasional gentle pan layered on top (not
every clip pans — variety reads more natural than a uniform effect applied to everything). The
motion should be almost imperceptible in the moment and only noticeable in retrospect — cinematic,
not a slideshow effect. See `pickKenBurnsStyle`/`buildKenBurnsExpr` in
`src/server/video-engine/videoComposer.ts`.

A subtle color grade (`buildColorGradeFilter`) sits on top of every clip — a small contrast/
saturation lift plus the per-brand cooler/warmer tint — so footage reads as intentionally graded
rather than raw stock video, while staying natural enough that the source clip still looks
believable, not filtered.

## Footage — lived-in and specific, never staged

**This is the most important visual rule in this document.** Footage should reinforce the emotion
by being a *specific, recognizable moment* from the actual life being depicted — a hospital
corridor, a hand washing at a sink, a parent holding a child's hand at a school gate — not a
generic "mood" shot (candles, sunsets, abstract water) that could belong to any wellness brand.
Specificity is what makes the imagery read as real; abstraction is what makes it read as stock
footage.

See `NURSE_STYLE_GUIDE.md` and `AUTISM_PARENT_STYLE_GUIDE.md` for the exact imagery vocabulary
each series draws from — these are the literal search terms used against Pexels
(`src/server/config/brands.ts`'s `keywords` per topic), so keeping them specific and lived-in
directly controls what actually gets selected.

Avoid: staged stock-photo energy (posed smiles, obviously-model actors, perfect lighting that
looks like a commercial), anything that looks like it's selling something, and generic imagery
that doesn't specifically match the topic.

## The brand intro and outro

Shared across both series — the one place viewers see the DJ&A identity directly rather than
inferring it from the accent color.

- **Intro**: 1-2 seconds, a smooth fade-in with a subtle, centered logo reveal. Elegant, not
  flashy — this should barely register as a "logo sting," more like a breath before the video
  starts.
- **Outro**: 2-3 seconds — "DJ&A Daily Affirmations," "A project by DJ&A Digital Studio," and a
  soft call to action ("Follow for daily encouragement.") in Muted Gold, the only place that color
  appears prominently.

Rendered once per brand and cached (`getOrCreateBrandFrames` in
`src/server/video-engine/videoAssembly.ts`) rather than re-rendered per video — identical every
time, which is the point: a viewer should recognize the open and close instantly across every
video they ever watch from this studio.

## The watermark

A small, elegant DJ&A monogram in one corner, 15-20% opacity (`WATERMARK_OPACITY` in
`src/server/video-engine/logoOverlay.ts`). It should never compete with the affirmation for
attention — if a viewer notices the watermark before they notice the words, it's too strong.

## Subtitles — break where people breathe

Bold, styled on-screen captions with a soft fade and scale pop-in, positioned inside each
platform's safe area. Cues break at natural breathing points — commas, dashes, sentence
endings — not at a rigid word count. This matters because the whole voice performance is built
around unhurried pacing with real pauses (see below); subtitles that chop mid-breath undercut that
pacing visually even if the audio is right. See `groupIntoCues`/`endsClause` in
`src/server/video-engine/subtitleTiming.ts`.

## Voice — the delivery, not just the words

The voice should sound like someone quietly comforting a close friend, never like someone reading
a script. Concretely: unhurried, roughly 110-130 words per minute, with real pauses at commas and
sentence breaks — the pause is part of what's being said, not dead air to fill. Warm and calm, not
energetic or cheerful; quiet conviction, not enthusiasm. See `buildVoiceInstructions` in
`src/server/ai-services/voiceGenerator.ts` for the exact delivery instructions sent to the model,
and note that this is genuinely more important than almost any other single production choice —
the same words, read too fast or too brightly, undo the entire effect the writing is built to
create.

## Music — felt, not noticed

**Prefer:** piano, ambient textures, gentle strings, warm pads, hopeful minimalism. **Avoid:**
anything with a strong beat, a hook, or a lyric — those compete with the narration instead of
supporting it, and the narration is the entire emotional point of the video.

The mix ducks music well under the voice (`buildAudioChain` in
`src/server/video-engine/videoComposer.ts`) — by design, quieter than a typical background-music
mix, closer to "felt but not consciously noticed" than "music with narration over it." When
sourcing real licensed tracks (see the main `README.md`'s "Adding your own music" section), choose
tracks that could disappear from a viewer's conscious attention entirely and the video would still
feel complete without them; if a track is interesting enough to notice on its own, it's too loud
or too busy for this brand.

## Design inspiration, applied

**Apple, Headspace, Calm, Notion.** What to borrow: restraint, whitespace (conceptually — nothing
crowds the frame), quiet confidence, a refusal to over-explain. What *not* to borrow: the
high-production, ad-agency polish those brands sometimes use for hero content — this is meant to
feel intimate and handmade-quiet, not like a brand campaign.
