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

The default Music folder is `~/Documents/DJA Daily Affirmations/Music` (Settings → Music
Folder). On first run, if that folder doesn't exist yet, it's seeded automatically with the two
synthesized placeholder ambient pads bundled in `assets/music/` so Test Mode has something to
mix immediately — replace them with real licensed tracks (`.mp3`, `.wav`, `.m4a`, `.aac`,
`.flac`, `.ogg`) before publishing anything. This folder lives outside the app install
deliberately: it survives updates/reinstalls and is a sensible place to permanently keep
licensed music files. See `assets/music/README.md` for the bundled placeholders themselves.

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
