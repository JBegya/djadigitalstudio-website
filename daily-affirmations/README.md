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
- [x] **M7 (Slice 3) — Marketing Coverage.** Answers "what haven't I marketed yet?" per product,
      across three dimensions computed live from data the app already has — nothing new is stored.
      **Feature Coverage**: a feature counts as covered by either a Marketing Pack or a standalone
      (packless) asset referencing its `featureKey` — a feature promoted only through the
      single-ad flow still counts as marketed, it just isn't a campaign. **Persona Coverage**:
      counts Marketing Packs only, by a new `MarketingPack.personaId` (the one schema addition
      this slice needed — the wizard already resolved a persona per pack, it just never persisted
      which one); packs made with "No specific persona" are tallied in a separate
      `packsWithNoPersonaCount` note rather than silently miscounted against a real persona, and
      standalone single-ad saves are deliberately excluded since they aren't campaigns.
      **Platform Coverage** reuses Slice 2's per-product required-platform Settings, falling back
      to every registered content type when a product hasn't configured one. A new `/coverage`
      screen (Marketing Coverage in the sidebar) shows one section per product with a headline
      Feature Coverage percentage and three ✓/✗ lists. **Explicitly deferred, not dropped**:
      Buying Trigger/Objection coverage ("Payroll Error ✓ / Second Job ✗") — `MarketingIdentity`'s
      buying triggers and objections are flat strings with no structural link to any Feature,
      Persona, or Marketing Pack today, unlike `FeatureMarketingProfile.linkedPersonaIds`.
      Computing that dimension honestly would mean either fabricating a text-matching heuristic
      (against this app's own rule of never inferring an unsupported claim) or adding a real link
      first — raised directly, and deferred until one exists, e.g. when the AI Copy Assistant needs
      one anyway. The Marketing Intelligence model stays exactly as frozen as it was after Slice 1.
- [x] **M7 (Slice 4) — Home Dashboard.** Closes out M7. The `/` route, replacing its ComingSoon
      stub, summarizing exactly the three things Slices 1–3 already built — nothing new is stored,
      and no new domain concept is introduced. **Production**: total products/packs/advertisements,
      a Draft/Ready/Published/Archived breakdown, and a "Recently Generated" list (the app's first
      sort-by-recency, over `updatedAt ?? createdAt` — new code, not a new concept, the same category
      of display ordering as `buildMarketingLibrary`'s existing sort by pack version). **Publishing**:
      `computePackReadiness`/`computeAttentionFlags` rolled up across every pack instead of one at a
      time — a Ready-to-Publish count and a severity-bucketed "Needs Attention" worklist (each
      flagged pack counted once, under its highest severity, matching the single badge it already
      shows in the Marketing Library). This rollup faithfully inherits Slice 2's existing behavior
      as-is, including that an Archived pack overdue for a refresh still surfaces that flag — the
      Dashboard summarizes what's already computed, it doesn't add a new archived-pack exclusion
      that doesn't exist in the logic it's reusing. **Coverage**: `computeAllCoverage` reused
      untouched, plus one small new (not pass-through) computation — a "lowest coverage" highlight,
      the single product with the most room to grow, mirroring how the Coverage screen itself
      already headlines `featureCoveragePercent` as its primary badge. Two small extractions came
      out of writing this, both driven by a genuine second consumer rather than "this looks
      generic": `resolveReadinessContentTypes` moved out of `MarketingLibraryScreen.tsx` into
      `packReadiness.ts` (kept deliberately separate from Coverage's own required-platform resolver,
      since the two intentionally use different fallback rules), and `ProgressPercent` moved out of
      `MarketingCoverageScreen.tsx` into a small shared `components/ui` primitive. Considered and
      declined: a `?filter=` deep-link from the worklist into the Marketing Library — packs have no
      per-item permalink today, so pre-filtering only narrows the list without landing on the pack
      itself; a half-measure deferred until pack-level permalinks make it worth doing properly.
- [x] **M8 — AI Copy Assistant.** The app's first genuinely AI-powered feature — every milestone
      before this was rule-based. Scoped to **the headline/hook field only** (v1): the one field
      with real per-field text-input UI today, in both the Wizard's batch-creation step and the
      Marketing Library's "New Version" shortcut — subheadline/CTA have no per-field input anywhere
      yet (only generic canvas-selection editing), so AI-rewriting them is a real follow-up, not
      built here. Click "✨ AI Suggestions" under either hook field to get up to 3 AI-varied
      phrasings of the current hook, grounded in that product/feature/persona's own stored
      Marketing Intelligence (brand voice, core problems/promises, pain points, benefits,
      persona-specific fears/desires) — never invented beyond it. A shared `HookSuggestions`
      component powers both entry points identically, with zero new plumbing needed in the Library
      form (it already had every prop in scope). Uses the OpenAI Responses API
      (`getOpenAIClient`/`retryWithBackoff`/`parseStructuredResponse`, already built for this),
      with **Test Mode**: no API key configured means deterministic, network-free mock variations
      instead — the app's first real consumer of `isTestMode`. Every suggestion, mock or real, runs
      through the same anti-fabrication filter: dropped if it matches the brand's own `wordsWeAvoid`
      list (the first real enforcement of that field, previously only displayed in Brand Manager) or
      if it's identical to the hook already showing. Picking a suggestion is exactly `setHook(text)`
      — indistinguishable from typing it — so zero new fields were added to `AdCreation` or
      `MarketingPack`.
- [x] **M9 — Storyboard Generator.** The next pipeline stage: `Marketing Intelligence → AI Copy
      Assistant (M8) → Storyboard Generator (M9) → Video Generator (M10)`. Generates a fixed
      sequence of 5-8 **structured** scenes (Goal / Visual / On-screen text / Voiceover /
      Screenshot-device reference / optional CTA) from an existing Marketing Pack — never a
      screenplay or prose. The Hook scene builds directly on the pack's own already-approved hook
      (`AdCreation.headline`) rather than inventing a new opening line, so a storyboard is always
      grounded in copy a person already chose. No image or video generation here — each scene only
      *describes* what it needs (a screenshot reference a human attaches afterward, a device
      toggle); that's M10's job. Same grounding/Test Mode/anti-fabrication philosophy as M8, with
      one deliberate difference: a storyboard's scenes are a sequential, interdependent narrative,
      so a `wordsWeAvoid` hit is **flagged, never dropped** — silently deleting a scene would break
      the story. "Generate Storyboard" lives on each Marketing Pack in the Library; a new
      `/storyboards` screen lists every generated storyboard, grouped by product/feature/pack, with
      every scene field fully editable in place via the existing `AutosaveInput`/`AutosaveTextarea`
      components. Caught and fixed during manual verification: `/api/storyboards`' GET-only route
      had no mutating sibling method in the same file, which Next.js was statically optimizing at
      build time (confirmed in `next build`'s own output) — the only collection route in this app
      not already saved from that by pairing GET with POST — fixed with `export const dynamic =
      'force-dynamic'`. Every scene also carries an editable `durationSeconds`, defaulted by goal
      keyword (Hook 3s, Problem 4s, Solution 5s, Proof/Benefit/Differentiator 4s, Call to Action
      3s, unrecognized goals 4s) — added ahead of M10 specifically so a Video Generator can render
      an already-timed storyboard instead of inventing its own pacing. Deterministic and
      app-assigned rather than AI-proposed, matching every other production/pacing concern in this
      app that isn't itself a copy-creativity question.
- [x] **M10 — AI Video Generation.** The final pipeline stage: `Storyboard (M9) → Generate assets →
      Generate voiceover → Generate subtitles → Compose video`. Renders a chosen storyboard into a
      finished, watchable `.mp4` through a provider-agnostic `VideoProvider` interface
      (`animateImage`/`checkStatus`), so Runway/Veo/Kling/Pika/Luma/OpenArt can in principle be
      swapped in later as one more `case` in a factory function with zero changes elsewhere. **Scope
      decision, confirmed with the user**: v1 ships the interface plus exactly one implementation —
      a deterministic local FFmpeg Ken Burns pan/zoom renderer, used whenever no real provider is
      configured (the only option today). No real provider is implemented in this pass; none are
      reachable from this network-sandboxed environment, matching the same limitation that already
      applied to live OpenAI calls in M8/M9. `durationSeconds` (M9) is the single source of truth
      for every timing decision — total runtime is always `sum(scene.durationSeconds)`, never
      persisted separately; there's no timeline/transitions/animations editor, no soundtrack mixer,
      and no scene reordering — this stays a renderer, not a video editor.
      Each scene's keyframe is a real, on-brand image — the storyboard scene becomes a synthetic
      single-slide template rendered through the *existing* Fabric.js template engine (zero new
      rendering code), so every frame is built from the product's actual screenshots/branding, never
      AI-invented pixels. One continuous voiceover (not one per scene) is generated over all scenes'
      text for natural prosody, `atempo`-conformed to exactly match the storyboard's total duration,
      with word-level subtitles burned in via ASS/libass. Most of the audio/video engine —
      TTS, Whisper-based subtitle timing with an estimation fallback, ASS generation, the FFmpeg
      compositor — is resurrected and adapted from this app's own history: a "daily affirmations"
      video generator existed before the M1 pivot to a static-ad tool, and its mature,
      already-hardened pipeline (including two real bugs it had already found and fixed — an
      `atempo` audio-duration mismatch and a `concat`-demuxer audio-desync bug, both inherited fixed
      by resurrecting the same code rather than rewriting it) covers almost everything this
      milestone needed. Same Test Mode philosophy as every other AI feature here: no OpenAI key
      still produces a real, complete, watchable video — Ken Burns motion over real keyframes, a
      synthesized voiceover at exactly the target duration, and estimated-timing subtitles, never a
      stub. A fixed 9:16 canvas (1080×1920, 30fps) for v1, not user-configurable. Generation is
      asynchronous (the first long-running, multi-minute pipeline in this app) — a "Generate Video"
      action on each Storyboard kicks off a background job tracked in a new `/videos` library, with
      Server-Sent Events streaming live stage-by-stage progress (`keyframes → animate → voiceover →
      subtitles → compose`) to a per-job page until the finished player appears.
      Three real bugs were found and fixed during manual end-to-end verification, none of them
      caught by the type checker, linter, or unit tests: (1) `@ffmpeg-installer/ffmpeg` and
      `@ffprobe-installer/ffprobe` resolve their platform binary via a dynamic `require()`, which
      made Next's server webpack build bundle each package's *entire* directory — including
      `README.md`/`tsconfig.json` — as a "sync require context" and fail trying to parse them as
      JS; fixed by excluding both packages from the server bundle via
      `experimental.serverComponentsExternalPackages` in `next.config.js`, so Next requires them
      natively at runtime instead. (2) `VideoJobsStore` initially cached its state in memory forever
      after the first read, copying the exact pattern `StoryboardsStore`/`MarketingPacksStore` already
      use safely — but this store doubles as the *live progress* mechanism, polled by one route
      while a background job (owned by a different route's module instance, per Next.js dev-mode's
      per-route bundling) mutates the same file underneath it; the polling route's cached copy never
      saw the update, so the SSE progress bar froze at its very first value forever. Fixed by making
      this store always re-read the file from disk on every call — a deliberate divergence from the
      other stores' permanent-cache pattern, justified by this store's specific liveness
      requirement. (3) A malformed/corrupt keyframe image made FFmpeg's decoder spin forever inside
      the Ken Burns filter graph with no natural exit condition, hanging the job indefinitely at
      ~95% CPU instead of failing it — fixed with a bounded process timeout (120s) on every FFmpeg/
      FFprobe call, with timeout-triggered failures explicitly marked non-retryable (retrying feeds
      the same broken input and will only hang again) so a genuinely bad input now fails the job
      cleanly with a visible error in well under two minutes instead of never.

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
