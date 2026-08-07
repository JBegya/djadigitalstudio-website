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

## Marketing Philosophy

This tool exists to help DJ&A market its apps effectively enough that a viewer becomes convinced
an app solves a real problem they have — more downloads, subscriptions, and long-term users, not
advertisements for their own sake. Every ad has to answer one question: *"Why should I download
this today?"* That means:

- **We sell outcomes, not software.** Features are supporting evidence for a transformation, never
  the message itself. Every product's `MarketingIdentity` (see below) captures that transformation
  as an explicit from/to pair.
- **Story before features.** A persuasive ad opens with a relatable, real-life moment — a late
  finish, a missed family dinner, a shift with no water break — never a feature list, a screenshot,
  or marketing buzzwords. The intended shape is Problem → Emotion → Solution → Transformation →
  Call to Action.
- **Marketing Intelligence is the one source of truth.** Every product's `MarketingIdentity`,
  `CustomerPersona`s, and each feature's `FeatureMarketingProfile` (problem, promise, pain points,
  benefits, supporting proof, a suggested story hook, and the personas it resonates with) are
  meant to be reused by *everything* downstream — the ad editor, a future AI Copy Assistant, App
  Store descriptions, social posts, landing pages, and eventually AI-generated video. One
  structured knowledge base, not separate copy reinvented per channel.
- **AI never invents.** When AI is involved (M8 onward), it must never fabricate claims,
  capabilities, features, screenshots, or customer testimonials — it may only draw from and remix
  the structured Marketing Intelligence already stored here. The application, not the model, is
  always the source of truth. `supportingProof`/`successStory` fields are explicitly user-authored
  only for this reason.

## Products

Products are **never hardcoded** — each one is a Product Profile loaded from JSON
(`data/products/*.json`), carrying its name, logo, brand colors/guidelines, fonts, tagline,
description, App Store/Play Store/website/privacy/terms URLs, screenshots, reusable Marketing
Features, Customer Personas, structured Marketing Identity (see "Marketing Philosophy" above), and
keywords. Adding a new product means adding a new JSON file, not writing code.

Initial products: **ShiftEarn Pro**, **SplitShift Hours**, **ShiftHydrate**.

Release status, store URLs, and platform availability are **user-managed configuration, set
through the Brand Manager UI** — never inferred from anything else (e.g. this monorepo's own
marketing pages). Bundled seed profiles ship with these as placeholders (`status: "draft"`,
`"not-planned"`, empty URLs) regardless of what a product's real-world status happens to be, so
the Brand Manager stays the single source of truth.

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
- [x] **M4 — Advertisement Wizard.** A guided, one-question-per-screen Product → Platform →
      Feature → Style → Editor flow is now the entry point at `/create` — real Brand Manager
      products and their features (not sample content) drive the choices, a real
      platform/content-type registry (Facebook, Instagram, LinkedIn, X, App Store Screenshot)
      replaces the old placeholder list, and a template can restrict itself to specific platforms
      (only App Store Screenshot does, so it never shows up as a style option for a social post).
      Finishing the wizard opens the same Fabric.js editor from M2, pre-populated with the real
      product's headline/logo/screenshot — still fully editable, template/device/platform
      unrestricted from that point on. A product with no screenshots yet shows an honest empty
      mockup, never a fabricated image.
- [x] **M5 — Marketing Intelligence Foundation.** Products no longer just store technical fields —
      each one now has a structured `MarketingIdentity` (why the app exists, mission, core
      promise, audiences, problems, emotional triggers, benefits, a from/to transformation, buying
      triggers, objections, and brand voice), a set of `CustomerPersona`s (the same feature can
      mean something different to a nurse than a FIFO worker), and each `ProductFeature` carries
      its own `FeatureMarketingProfile` (core problem/promise, pain points, benefits, supporting
      proof, a suggested story-opening hook, and links to the personas it resonates with). This is
      meant to become the one structured knowledge base every future ad, AI-assisted copy, App
      Store description, and AI-generated video draws from — see "Marketing Philosophy" below.
      Brand Manager gained three new sections (Marketing Identity, Customer Personas, and an
      extended Marketing Features editor) to manage all of it. Nothing here is AI-generated or
      AI-consumed yet — this milestone is the data foundation only.

      **The data model is frozen as of M5.** Product/Feature/Persona/MarketingIdentity already
      cover product identity, why the app exists, personas, pain points, benefits, emotional and
      buying triggers, objections, features, brand guidelines, screenshots, and templates — enough
      to produce compelling marketing. No more fields get added on spec; the risk past this point
      is designing the perfect marketing system instead of shipping ads. New fields only get added
      if real-world use surfaces a genuine gap.
- [x] **M6 — Advertisement Intelligence Engine.** The wizard now assembles content from what's
      already stored instead of generic fallbacks: headline prefers a feature's `suggestedHook`
      (and, failing that, a selected persona's own story idea) before falling back to the bare
      feature label; subheadline prefers `corePromise` before the feature description; a store
      badge renders as a real text button when the product has a real App Store/Play Store URL
      (never a link to nowhere, and never a fabricated trademarked badge image). The wizard gained
      a **Persona** step (Product → Persona → Feature → Platform → Style) — picking a persona
      narrows the Feature step to that persona's linked features when any exist. Still entirely
      rule-based, no AI — just using the M5 data model that was already there. Explicit manual
      overrides in Brand Manager always win over every fallback.
- [x] **M7 (Slice 1) — Batch Production & Marketing Library.** The focus shifts from building
      infrastructure to producing marketing output — every new feature from here on is measured
      against how much it speeds up producing real, publishable assets. The wizard's Platform step
      gained a multi-select "Generate for multiple platforms at once" mode: pick a feature, check
      several platforms, then set three things before **Generate All** builds a **Marketing Pack**:
      a **campaign name** (e.g. "Payroll Mistake Story," pre-filled from the feature's label, stable
      across the concept's versions), an **opening hook** (the actual headline generated onto every
      platform in the pack, pre-filled from the feature's stored hook/persona story idea, free to
      change on the next version for A/B testing under the same campaign name), and an optional
      **objective** (Increase Downloads/Subscriptions, Feature Awareness, New Release, Retarget or
      Re-engage Users — purely for future reference, not consumed by any logic). Pack generation
      uses a per-platform default template (`server/config/defaultTemplates.ts`, plain data, not
      code — easy to retune without touching generation logic). Versioning is scoped per (product,
      feature, campaign name): a new creative concept for the same feature starts its own V1, while
      regenerating the same named concept (even with a different hook) counts up (V2, V3, ...) —
      distinct concepts never share a version sequence. Rendering happens on detached,
      never-DOM-attached Fabric canvases (`lib/editor/batchGenerate.ts`), so N platform variants
      render without mounting N visible editors. Every asset stores a `featureKey` and (for
      pack-generated assets) a `packId`, and carries a lifecycle `status`
      (Draft/Ready/Published/Archived) — nothing is ever overwritten. The **Marketing Library**
      (`/exports`, née "Exports") replaces its ComingSoon stub: browse every pack and standalone ad
      by product → feature → campaign name/version → platform, update an asset's status inline, or
      open any asset back in the full editor. The Marketing Intelligence model (Product/Feature/
      Persona/MarketingIdentity) is considered feature-complete for Version 1 as of here — new
      fields only get added to Marketing Pack/AdCreation (the production-tracking records) when a
      production workflow genuinely needs one, never to the frozen knowledge base itself.
- [x] **M7 (Slice 2) — Publishing Workflow.** Managing content that already exists, not scheduling
      or social integrations. A Marketing Pack now carries its own lifecycle `status`
      (Draft/Ready/Published/Archived) — independent of, and never auto-synchronized with, its
      individual assets' own statuses, matching how a real marketing team tracks a campaign
      separately from each of its platform posts. Every asset and pack gains a `publishedAt`,
      always the *first* publish date and never overwritten by a later one; editing a saved,
      already-published asset automatically drops it back to Ready for review, the same way
      creative-approval workflows work. Two computed, never-stored views drive the Marketing
      Library (`lib/library/packReadiness.ts`): **readiness** — a completion percentage plus which
      of a product's own configured required platforms (Settings → Publishing, per product, so
      adding a new platform later never breaks an existing pack's readiness) a pack is still
      missing — and **attention**, three severities (Action Required / Needs Review / Suggestion,
      user-facing language rather than software severity) surfaced from existing data: a missing
      required platform or thumbnail, a stale Draft, a Ready pack still holding a Draft asset, or a
      Published pack overdue for a refresh, both reminder windows configurable in Settings instead
      of hardcoded. A pack only ever shows "Ready to Publish ✓" while its own status is Ready — a
      Published or Archived pack never does, even though the underlying completeness check stays
      the same either way. The status filter gained "Ready to Publish" and "Needs Attention" as
      genuinely distinct views from the plain workflow statuses. Deliberately sequenced for later,
      not dropped: **M7 Slice 3 — Marketing Coverage** (which features/personas/platforms/buying
      triggers/objections still have no Marketing Pack — chosen to come *before* a Home Dashboard,
      since coverage tells you what to create next while a dashboard only summarizes what already
      exists), then one-click Batch Variations (style/tone presets) and a Campaign Pack Generator
      that exports a pack straight to a folder — all still ahead of AI. Backlogged, not built: a
      Publishing Notes field per asset, and per-platform publication detail (platform, date, URL,
      account, performance) evolving out of today's single `publishedAt` timestamp once Marketing
      Coverage exists to make use of it.
- [ ] **M8 — AI Copy Assistant.** AI rewrites/varies the copy the Advertisement Intelligence Engine
      already assembled — it improves phrasing, it never invents a claim, feature, screenshot, or
      testimonial that isn't already grounded in the stored Marketing Intelligence. Deliberately
      last: by the time AI is introduced, it has a mature Product/Persona/Feature/Buying-Trigger/
      Objection/Marketing-Pack corpus to stay grounded in, rather than a thin one.
- [ ] **M9 — Storyboard Generator.** Scene-by-scene advertising concepts (no video yet) generated
      from the same stored Product/Persona/Feature/Story data.
- [ ] **M10 — AI Video Generation.** Connects a chosen storyboard to a video provider through a
      provider-agnostic interface — OpenArt, Runway, Google Veo, Kling, Pika, and Luma are all
      meant to be interchangeable without changing the rest of the app.

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
                           + its Identity/MarketingIdentity/BrandGuidelines/StoreLinks/Personas/
                           Features/Screenshots sections, AssetDropzone, AutosaveField
                           (incl. the shared TagListInput used across the marketing sections)
      editor/              The Template Engine: EditorCanvas (Fabric.js), PropertiesPanel,
                           TemplatePicker, DeviceMockupPicker, ExportBar, CreateAdvertisementScreen
      wizard/               The Advertisement Wizard: WizardShell + one component per step
                           (Product/Platform/Feature/Style), AdvertisementWizard orchestrator
      layout/              Sidebar shell, ComingSoon stub
      settings/            Settings screen
      ui/                  shadcn/ui-style primitives
    lib/
      assets/              Client-side screenshot thumbnailing (canvas-based, no server-side
                           image-processing dependency)
      editor/              Template↔Fabric-object mapping, parametric device mockups, snapping,
                           canvas export, and the ProductProfile→SlotContent mapping the wizard
                           hands off to the editor with — all client-safe, most of it pure and
                           unit-tested (see tests/)
      fonts.ts             Shared next/font/local Inter loader (also used to set Fabric's real
                           font-family string on canvas text)
      api.ts, desktop.ts, utils.ts   Client-side helpers (API client, Electron/browser bridge)
    server/
      config/              Settings, templates, content-type (platform) registry, creations store,
                           products store, paths, model IDs
      ai-services/         OpenAI client (used starting M5)
    types/                 Shared domain types
  assets/
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
