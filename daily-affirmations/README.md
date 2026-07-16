# DJ&A Daily Affirmations

An internal content production system for DJ&A Digital Studio Limited. One click produces six
ready-to-post vertical affirmation videos every day — three **Nurse Affirmations**, three
**Autism Parent Affirmations** — complete with voiceover, subtitles, music, a thumbnail,
platform captions, and hashtags.

This is **not** a SaaS product and is not for sale or public distribution. It's a desktop tool
for one person to run every morning.

## What it does, end to end

For each of the 6 videos, the pipeline:

1. **Writes an original affirmation** (OpenAI, brand-specific tone rules, never repeats a past one)
2. **Records a voiceover** (OpenAI text-to-speech)
3. **Selects matching background footage** (Pexels, keyword-matched to the topic)
4. **Times and burns in subtitles** (Whisper word-level alignment, styled captions)
5. **Mixes in background music** (auto-ducked under the voice, loudness-normalized)
6. **Composes the final MP4** (1080×1920, 30fps, slow Ken Burns zoom, logo watermark)
7. **Writes platform captions + 30 hashtags + a thumbnail hook** (OpenAI)
8. **Generates a thumbnail** (frame + headline, ≤6 words)
9. **Runs automated quality checks** (grammar/spelling, tone, duplicate detection, subtitle
   timing, audio level, video length/resolution) — regenerates just the failing piece, not
   the whole video
10. **Exports** into `Exports/YYYY-MM-DD/{Nurse,Autism}/VideoNN.mp4` + thumbnail + caption +
    hashtags files, ready to upload to Facebook Reels, Instagram Reels, TikTok, and YouTube
    Shorts.

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
folder, music folder, logo, video length, voice, subtitle font/colour/position). Settings
changes autosave and are stored outside the repo (in your OS's per-user app-data directory), so
`.env` is only really needed for first-run defaults or headless/CI use.

### Adding your own music

Drop royalty-free tracks into `assets/music/` (`.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.ogg`).
Two synthesized placeholder ambient pads ship there so Test Mode has something to mix — replace
them with real licensed tracks before publishing anything. See `assets/music/README.md`.

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
  assets/                 Bundled fonts (Inter, OFL-licensed), music, logo
  Exports/                Default output location (gitignored — this is generated content)
  tests/                  Vitest unit tests for the pure logic (timing, text rules, etc.)
  scripts/                One-off utility scripts
```

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

## Security

API keys are stored in `.env` (gitignored) and/or the local settings file in your OS's app-data
directory — never in this repo, never logged, and masked in the UI once saved. The one route
that turns a request into a filesystem read (`/api/media`) validates the path stays inside the
configured Exports folder before serving anything.

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
