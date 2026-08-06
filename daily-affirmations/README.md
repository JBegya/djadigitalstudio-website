# DJ&A Ad Studio

An internal desktop tool for DJ&A Digital Studio Limited. Its only job is turning a product's
real screenshots and brand assets into a polished, ready-to-post **static** advertisement — a
Facebook/Instagram post, an App Store screenshot, a website banner — in under a minute.

This is **not** a SaaS product and is not for sale or public distribution. It's a focused
productivity tool built specifically for marketing DJ&A's own apps, not a general design
platform. It is not trying to become Canva or Adobe Express.

## Product philosophy

Every design decision optimizes for **speed, simplicity, professional quality, low operating
cost, consistent branding, and reusability** — in that order of what actually matters for this
tool's one job.

- **Real screenshots, never recreated.** The app never redraws, regenerates, or AI-generates a
  screenshot. A product's actual, uploaded screenshots are placed into device mockups exactly as
  they are. If screenshots are missing, the UI shows a clear placeholder and says so — it never
  fakes one.
- **AI only where it genuinely saves time.** OpenAI is used solely to generate *text* — headlines,
  captions, CTAs, hashtags — never to generate a layout or an image. Every layout comes from a
  small library of hand-built, reusable templates.
- **No video.** There is no voice generation, no background music, no stock footage, no subtitle
  generation, no video rendering. Version 1 produces static graphics only (PNG/JPG/PDF). This is a
  deliberate scope decision, not an oversight — see "What's explicitly out of scope" below.

## Products

Products are **never hardcoded** — each one is a Product Profile loaded from JSON
(`data/products/*.json`), carrying its name, logo, brand colors, fonts, tagline, description,
App Store/Play Store/website/privacy/terms URLs, screenshots, reusable feature cards, target
audience, and keywords. Adding a new product means adding a new JSON file, not writing code.

Initial products: **ShiftEarn Pro**, **SplitShift Hours**, **ShiftHydrate**.

## The workflow

```
Choose Product → Choose Platform → Choose Template → Choose Screenshot → Choose Feature
  → (optional AI headline) → (optional AI caption) → Preview → Export
```

Everything happens on one page. A complete, production-ready advertisement should be achievable
in under a minute.

## What's explicitly out of scope (for now)

Campaign management, scheduling, analytics, video generation, AI image generation, Canva/Figma
integration, social publishing, SEO tools, blog/email generation, plugin architecture, and
workflow automation are all deliberately **not** built in this version. The architecture is meant
to allow adding them later without a major rewrite, but none of them are implemented yet, and the
UI doesn't pretend otherwise.

## Current status

This app is being rebuilt from an earlier single-purpose video generator (the daily affirmation
video pipeline) into the focused static-ad tool described above. Work proceeds as small,
reviewable milestones — reordered from the original plan so the app is genuinely usable (a real,
editable advertisement) before the full product-management system exists:

- [x] **M1 — Project cleanup.** Removed all video/voice/affirmation-specific code and docs;
      renamed the app; landed on a minimal, green skeleton (sidebar shell, Settings screen).
- [x] **M2 — Template Engine.** Five production templates (Apple Hero, Problem → Solution,
      Feature Highlight, Comparison, App Store Screenshot), a live interactive Fabric.js canvas
      with drag/resize/rotate, inline text editing, hand-rolled alignment-guide snapping, a
      properties panel (text/color/size/position), parametric device mockups (iPhone, Apple
      Watch, iPad — no external mockup assets needed), PNG/JPG/PDF export at the exact target
      platform size, and full persistence (save → reload → keep editing, never a one-shot
      export). Runs against bundled sample content — no real products yet, no AI, no API cost.
- [x] **M3 — Brand Manager.** Each Product Profile owns its own logo, app icon, brand colors,
      brand guidelines, status, screenshots, marketing features, and store links directly — no
      separate asset-library concept. Bundled seed profiles (`data/products/*.json`) plus a
      user-writable overlay (never lost on a single-field edit, and self-healing if read by a
      newer schema than it was written with); multipart asset upload with client-side
      thumbnailing (no server-side image-processing dependency); a Brand Manager screen (product
      grid + status badges + "Add Product") and per-product detail screen (Status bar, Identity,
      Brand Guidelines, Store Links, Marketing Features, Screenshots — autosave on blur,
      drag-and-drop or click-to-browse uploads). Brand Guidelines (corner radius, button style,
      preferred background, logo clear space, store badge style, typography) and per-feature
      headline/subheadline/CTA/icon/accent color/priority/suggested screenshot mean the
      Advertisement Wizard (M4) can auto-populate a template without needing AI.
- [ ] **M4 — Advertisement Wizard.** A guided Product → Platform → Feature → Style → Editor flow,
      replacing raw template/asset pickers as the primary entry point into the (already-built)
      Template Engine.
- [ ] **M5 — Copy generator.** AI-generated headlines/captions/CTAs/hashtags (the first and only
      point OpenAI gets used) — always optional, editable like everything else.
- [ ] **M6 — Export engine polish.** Per-platform batch export, the Exports screen, and a real
      Dashboard.

## Test Mode — try it before adding an API key

The Template Engine (M2) needs no API key at all — it runs entirely against bundled sample
content. Once AI copy generation lands (M5), an unconfigured `OPENAI_API_KEY` will fall back to
placeholder text instead of a real call, the same Test Mode philosophy used throughout this app:
the rest of the workflow stays fully exercisable for free, and AI-generated copy is always
optional — you can type your own headline/caption instead.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in OPENAI_API_KEY (or leave blank for Test Mode)
npm run dev             # renderer at http://localhost:3131
```

Open http://localhost:3131 in a browser — the whole app works as a local web app, no Electron
required for development.

To run as an actual desktop window (native folder pickers, "Open Export Folder" via the OS file
manager, packaged app icon):

```bash
npm run electron:dev
```

> The first `npm install` on a machine with normal internet access will download Electron's
> binary automatically. If you see `ELECTRON_SKIP_BINARY_DOWNLOAD` referenced anywhere, that's
> only relevant to restricted CI/sandbox environments — remove it for normal local development.

### Settings

Everything in `.env` can also be set from the in-app **Settings** screen (API key, output
folder). Settings changes autosave and are stored outside the repo (in your OS's per-user
app-data directory), so `.env` is only really needed for first-run defaults or headless/CI use.

## Project structure

```
daily-affirmations/
  data/
    products/              Bundled seed Product Profile JSON (ShiftEarn Pro, SplitShift Hours,
                           ShiftHydrate) — placeholder copy until real assets are uploaded through
                           the Brand Manager UI. Templates are hand-authored TS
                           (src/server/config/templates.ts), not JSON: fixed, pixel-tuned, and
                           versioned tightly with the slot-mapping code that interprets them.
  electron/              Electron main process + preload (desktop shell only)
  src/
    app/                 Next.js App Router — pages + API routes
    components/
      brand/               Brand Manager: BrandManagerScreen (product grid), ProductDetailScreen
                           + its Identity/StoreLinks/Features/Screenshots sections,
                           AssetDropzone, AutosaveField
      editor/              The Template Engine: EditorCanvas (Fabric.js), PropertiesPanel,
                           TemplatePicker, DeviceMockupPicker, ExportBar, CreateAdvertisementScreen
      layout/              Sidebar shell, ComingSoon stub
      settings/            Settings screen
      ui/                  shadcn/ui-style primitives
    lib/
      assets/              Client-side screenshot thumbnailing (canvas-based, no server-side
                           image-processing dependency)
      editor/              Template↔Fabric-object mapping, parametric device mockups, snapping,
                           canvas export, sample placeholder content — all client-safe, most of it
                           pure and unit-tested (see tests/)
      fonts.ts             Shared next/font/local Inter loader (also used to set Fabric's real
                           font-family string on canvas text)
      api.ts, desktop.ts, utils.ts   Client-side helpers (API client, Electron/browser bridge)
    server/
      config/              Settings, templates, creations store, products store, paths, model IDs
      ai-services/         OpenAI client (used starting M5)
    types/                 Shared domain types
  assets/
    sample/                A clearly-labeled placeholder screenshot SVG for the Template Engine
                           to demo against before real product screenshots exist
    fonts/, logo/          Bundled Inter (OFL-licensed) and the DJ&A studio logo
  build/                  electron-builder resources (app icon)
  electron-builder.yml    Desktop packaging config (see "Packaging the desktop app" below)
  tests/                  Vitest unit tests — pure logic only (Fabric itself needs a real browser
                         Canvas 2D context vitest's node environment doesn't provide; those parts
                         are verified with a manual browser pass instead, not silently skipped)
  scripts/                One-off utility scripts (standalone-build prep)
```

Generated advertisements and each product's asset library deliberately live outside this folder
entirely, at `~/Documents/DJA Ad Studio/` (see Settings → Output Folder). That's a stable,
user-owned location in dev and in every packaged-app scenario alike; the app install itself
(wherever it happens to be, and in a packaged build, read-only) is the wrong place to
default-write generated files.

Clean separation: UI never talks to OpenAI directly — it only calls the Next.js API routes in
`src/app/api/**`, which call into `src/server/**`. That's also what makes the app work
identically whether it's wrapped in Electron or not: `src/server` is plain Node and the Next.js
server process always has full filesystem/OS access, Electron or otherwise.

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

The API key is stored in `.env` (gitignored) and/or the local settings file in your OS's app-data
directory — never in this repo, never logged, and masked in the UI once saved. The one route
that turns a request into a filesystem read (`/api/media`) validates the path stays inside either
the configured Exports folder or the Asset Library (both under the user's content directory)
before serving anything.

`next build` automatically copies `.env` into `.next/standalone/.env` — if left alone, that
would ship whatever `.env` happens to exist on the machine used to build a release (e.g. a
developer's own local API key) inside the distributed app. `npm run electron:build` guards
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
- An OpenAI API key (ad copy generation) — https://platform.openai.com/api-keys
