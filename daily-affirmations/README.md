# DJ&A Daily Affirmations

An internal content production system for DJ&A Digital Studio Limited. One click produces six
ready-to-post vertical videos every day — three **Nurse Affirmations**, three **Autism Parent
Affirmations** — complete with voiceover, subtitles, music, a thumbnail, platform captions, and
hashtags.

This is **not** a SaaS product and is not for sale or public distribution. It's a desktop tool
for one person to run every morning.

## Product philosophy

DJ&A Daily Affirmations is not a motivational app — it's an emotional companion. Every video is
written and spoken as one person who has genuinely lived this quietly comforting another person
who is struggling: a fellow nurse talking to a nurse who just finished a brutal shift, a fellow
autism parent talking to another parent at the end of one of the hardest days of their life.
Never an expert, a coach, a therapist, a narrator, or an influencer. The measure of success isn't
"did this motivate someone" — it's whether the viewer finishes thinking *"this person understands
me. I am not alone."* When a technical decision and an emotional one conflict, the emotional one
wins.

### The Brand Bible

The full creative direction — narrator identity, words to use and avoid, sentence rhythm, visual
style, music style, and worked excellent-vs-weak script examples — is documented explicitly, not
just implied by prompts:

| Document | Covers |
|---|---|
| [`BRAND_VOICE.md`](./BRAND_VOICE.md) | The mission, the narrator concept, brand personality, the core authenticity rule |
| [`WRITING_GUIDE.md`](./WRITING_GUIDE.md) | The five-beat script structure, sentence rhythm, banned phrases, annotated examples |
| [`VISUAL_GUIDE.md`](./VISUAL_GUIDE.md) | Color, typography, motion, footage, subtitles, music |
| [`NURSE_STYLE_GUIDE.md`](./NURSE_STYLE_GUIDE.md) | Everything specific to writing and shooting as a nurse, for nurses |
| [`AUTISM_PARENT_STYLE_GUIDE.md`](./AUTISM_PARENT_STYLE_GUIDE.md) | Everything specific to writing and shooting as an autism parent, for autism parents |
| [`AUDIENCE_PROFILES.md`](./AUDIENCE_PROFILES.md) | Who's listening — the psychology of the person on the other side of the screen, not just who's speaking to them |

Read these before changing a prompt, a visual, or a piece of copy — they're the creative
foundation the code (`src/server/config/brands.ts`, `src/server/ai-services/scriptWriter.ts`)
implements. If the code and the Brand Bible ever disagree, that's a bug: fix the code, or update
the Bible deliberately, but don't let them drift apart silently.

## What it does, end to end

Each day's run picks a **balanced mix of Content Modes** per brand (see below) rather than
random topics, then for each of the 6 videos the pipeline:

1. **Writes an original script** (OpenAI, as a five-beat cinematic monologue — emotional
   recognition, validation, shared experience, gentle comfort, quiet hope — never a generic
   affirmation, never repeats a past one)
2. **Records a voiceover** (OpenAI text-to-speech, gpt-4o-mini-tts with brand-specific delivery
   instructions: unhurried, 110-130wpm, natural breathing pauses, warm rather than performative)
3. **Selects matching background footage** (Pexels, matched to specific, lived-in moments — a
   hospital corridor, washing hands, a therapy waiting room, a quiet couch cuddle — not generic
   mood shots)
4. **Times and burns in subtitles** (Whisper word-level alignment, breaking at commas/dashes/
   sentence ends the way someone speaking slowly actually breathes, not just every few words;
   bold styled captions with a soft fade + scale pop-in, positioned inside each platform's safe
   area)
5. **Mixes in background music** (auto-ducked well under the voice, loudness-normalized — the
   narration is the whole point, the music should be felt more than noticed)
6. **Composes the main clip** (1080×1920, 30fps, smooth Ken Burns zoom with an occasional gentle
   pan, a subtle per-brand colour grade, logo watermark)
7. **Adds the DJ&A brand intro and outro** (a short logo-reveal open and a "Daily Affirmations /
   follow for daily encouragement" close, rendered once per brand and reused — see Brand
   identity below)
8. **Writes platform captions + 30 hashtags + a thumbnail hook** (OpenAI)
9. **Generates a thumbnail** (frame + headline, ≤6 words)
10. **Runs automated quality checks and scores the result** — grammar/spelling, tone, duplicate
    detection, subtitle timing, audio level, video length/resolution, *and* an OpenAI-judged
    emotional-authenticity pass (framed as an experienced ICU nurse / an autism parent actually
    reading the script) scoring emotional authenticity, human warmth, comfort, emotional impact,
    and shareability, plus the one question that matters most: would a real peer genuinely
    believe another peer wrote this? A "no" forces the script to be rewritten outright. Everything
    rolls up into Emotional Impact / Visual Quality / Caption Readability / Overall scores out of
    10, and regenerates just the weakest piece (not the whole video) if anything fails outright or
    the Overall score misses the configured threshold
11. **Exports** into `Exports/YYYY-MM-DD/{Nurse,Autism}/VideoNN.mp4` + thumbnail + caption +
    hashtags files, ready to upload to Facebook Reels, Instagram Reels, TikTok, and YouTube
    Shorts.

The **Preview** screen shows all 6 of a day's videos on one screen with Play, Regenerate, and
Approve actions per video, plus each one's quality scores — reviewing a day's batch is a single
scroll, not six separate opens.

## Content Modes

Instead of picking topics at random, each brand rotates through a fixed set of 6 named
categories, balanced so the least-recently-used category goes first — three videos a day still
covers a good spread rather than clustering on whatever topic came up by chance:

- **Nurse Affirmations:** Morning Motivation, Night Shift, Burnout, Leadership, Self Care, Gratitude
- **Autism Parent Affirmations:** Hard Days, Small Wins, Hope, Therapy, School, Burnout

Each mode has a few specific "angles" under it (e.g. Burnout → *Running on Empty*, *The Weight
You Carry*, *Finding Your Way Back*) so repeat visits to the same mode still feel like a
different, specific moment rather than the same prompt reworded — see `src/server/config/brands.ts`.
Toggle modes off per brand from Settings → Content Modes if you want to temporarily exclude one.

## Brand identity

Nurse Affirmations and Autism Parent Affirmations share one DJ&A identity — the same monogram,
Inter typography, and intro/outro structure — with a distinct accent per series so viewers can
tell the two apart at a glance: Nurse leans cooler (dusty blue, clinical calm), Autism Parent
leans warmer (golden/sage, family warmth). Both the colour grade applied to every clip and the
Pexels search keywords for each topic follow that same cooler/warmer split. Future series are
meant to slot into the same pattern — shared bookends and typography, a series-specific accent.

## Test Mode — try it before adding API keys

With no `OPENAI_API_KEY` / `PEXELS_API_KEY` configured, every AI/stock-footage call falls back
to a local placeholder generator (template affirmation text, a synthesized tone bed instead of
real speech, a generated gradient clip instead of stock footage). The entire pipeline —
composition, subtitle burn-in, audio mixing, thumbnailing, export — still runs for real and
produces real MP4s, just with placeholder content clearly watermarked "TEST MODE". This is the
fastest way to confirm the app works on your machine before spending API credits.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in OPENAI_API_KEY / PEXELS_API_KEY (or leave blank for Test Mode)
npm run dev             # renderer at http://localhost:3131
```

Open http://localhost:3131 in a browser — the whole app works as a local web app, no Electron
required for development. Click **Generate Today's Videos** on the Home screen.

To run as an actual desktop window (native folder pickers, "Open Export Folder" via the OS file
manager, packaged app icon):

```bash
npm run electron:dev
```

> The first `npm install` on a machine with normal internet access will download Electron's
> binary automatically. If you see `ELECTRON_SKIP_BINARY_DOWNLOAD` referenced anywhere, that's
> only relevant to restricted CI/sandbox environments — remove it for normal local development.

### Settings

Everything in `.env` can also be set from the in-app **Settings** screen (API keys, output
folder, music folder, logo, video length, voice, subtitle font/colour/position, which Content
Modes are active per brand, and the minimum Overall quality score before a component gets
auto-regenerated). Settings changes autosave and are stored outside the repo (in your OS's
per-user app-data directory), so `.env` is only really needed for first-run defaults or
headless/CI use.

### Adding your own music

The default Music folder is `~/Documents/DJA Daily Affirmations/Music` (Settings → Music
Folder). On first run, if that folder doesn't exist yet, it's seeded automatically with the two
synthesized placeholder ambient pads bundled in `assets/music/` so Test Mode has something to
mix immediately — replace them with real licensed tracks (`.mp3`, `.wav`, `.m4a`, `.aac`,
`.flac`, `.ogg`) before publishing anything. This folder lives outside the app install
deliberately: it survives updates/reinstalls and is a sensible place to permanently keep
licensed music files. See `assets/music/README.md` for the bundled placeholders themselves.

Look for **piano, ambient textures, gentle strings, warm pads, hopeful minimalism** — nothing
with a strong beat, hook, or lyric that competes with the voice. The mix already ducks music well
under the narration (see `buildAudioChain` in `videoComposer.ts`), but the source track itself
should feel like something you'd barely notice consciously, there to support the emotion rather
than perform alongside it.

### Logo / watermark

`assets/logo/dja-logo.png` (the DJ&A monogram) is the default watermark. Point Settings → Logo
at a different PNG to use your own; a transparent background is recommended (the shipped
monogram's black background is chroma-keyed out automatically since we know its exact color —
a custom logo is trusted to already have real alpha transparency).

## Project structure

```
daily-affirmations/
  electron/              Electron main process + preload (desktop shell only)
  src/
    app/                 Next.js App Router — pages + API routes
    components/          UI (shadcn/ui-style primitives + screen components)
    lib/                 Client-side helpers (API client, Electron/browser bridge)
    server/
      config/             Settings, brand content rules, paths, model IDs
      ai-services/        OpenAI: script writer, TTS, transcription, captions/hashtags
      media-services/      Pexels client, background selection, music selection
      video-engine/        FFmpeg: composition, subtitles (.ass), thumbnails
      quality-engine/      Automated pre-export checks
      history/             Dedup + topic-rotation store
      export/               Exports/ folder writer
      pipeline/             Orchestrator (the 6-video daily run) + progress tracking
    types/                Shared domain types
  assets/                 Bundled fonts (Inter, OFL-licensed), placeholder music, logo, dictionary
  build/                  electron-builder resources (app icon)
  electron-builder.yml    Desktop packaging config (see "Packaging the desktop app" below)
  tests/                  Vitest unit tests for the pure logic (timing, text rules, etc.)
  scripts/                One-off utility scripts (smoke test, standalone-build prep)
```

Generated content — exported videos and the user's music library — deliberately lives outside
this folder entirely, at `~/Documents/DJA Daily Affirmations/` (see "Adding your own music"
above and Settings → Output Folder). That's a stable, user-owned location in dev and in every
packaged-app scenario alike; the app install itself (wherever it happens to be, and in a
packaged build, read-only) is the wrong place to default-write generated files or ask someone to
permanently keep licensed music.

Clean separation: UI never talks to OpenAI/Pexels/ffmpeg directly — it only calls the Next.js
API routes in `src/app/api/**`, which call into `src/server/**`. That's also what makes the app
work identically whether it's wrapped in Electron or not: `src/server` is plain Node and the
Next.js server process always has full filesystem/OS access, Electron or otherwise.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server at :3131 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run electron:dev` | Next dev server + Electron shell together |
| `npm run electron:build` | Build + package the desktop app (electron-builder) |
| `npm test` | Run the unit test suite (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next/ESLint |
| `npm run smoke` | Offline pipeline smoke test — renders one full video in Test Mode via plain Node, no browser needed |

## Packaging the desktop app

```bash
npm run electron:build
```

This runs, in order: `next build` (production build) → `scripts/prepare-standalone.js` (copies
the static asset bundle into the standalone output and strips any `.env*` files that `next
build` may have copied in — see Security below) → `electron:compile` (compiles the Electron
main/preload process) → `electron-builder` (packages everything per `electron-builder.yml`).

Output lands in `release/` — a `.dmg`/`.zip` on macOS, an NSIS installer on Windows, or an
AppImage on Linux, per the targets configured in `electron-builder.yml`. The app icon is
`build/icon.png`. macOS and Windows builds are unsigned (no code-signing certificate configured)
— they still run locally; macOS Gatekeeper will warn on first launch (right-click → Open
bypasses it).

This is an internal tool distributed manually, not through an app store or auto-update server,
so `electron-builder`'s publish step is disabled entirely.

## Security

API keys are stored in `.env` (gitignored) and/or the local settings file in your OS's app-data
directory — never in this repo, never logged, and masked in the UI once saved. The one route
that turns a request into a filesystem read (`/api/media`) validates the path stays inside the
configured Exports folder before serving anything.

`next build` automatically copies `.env` into `.next/standalone/.env` — if left alone, that
would ship whatever `.env` happens to exist on the machine used to build a release (e.g. a
developer's own local API keys) inside the distributed app. `npm run electron:build` guards
against this twice: `scripts/prepare-standalone.js` deletes any `.env*` file from the standalone
output right after the build, and `electron-builder.yml`'s `files` list excludes them as well in
case the standalone folder is ever packaged some other way. Real installs are configured entirely
via the in-app Settings screen (persisted outside the app, per above), so `.env` is never needed
at runtime in a packaged build.

`npm audit` currently flags a handful of advisories against the Next.js 14.2.x line (the app
pins `^14.2.16`, which resolves to the latest 14.2.x patch release) that were only fixed
starting in Next 15/16. Since this app runs locally as a single-user desktop tool rather than a
publicly-hosted server, the practical exposure is low, but a major-version upgrade is worth
doing deliberately (with a full re-test) rather than as a drive-by dependency bump — track it
as follow-up work, not a blocker for internal use.

## Requirements

- Node.js 20+
- An OpenAI API key (script writing, TTS, transcription, captions/hashtags) — https://platform.openai.com/api-keys
- A Pexels API key (background footage) — https://www.pexels.com/api/
- ffmpeg is bundled via `@ffmpeg-installer/ffmpeg` / `@ffprobe-installer/ffprobe` — nothing to
  install separately.
