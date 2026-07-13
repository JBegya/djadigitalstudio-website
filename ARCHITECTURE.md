# Site architecture

djadigitalstudio.com is a static site with **one small generator** for the
parts that repeat per app. Everything else is plain hand-authored HTML.

## The two kinds of pages

**Generated** (owned by `apps.config.js` + `build.js` — don't hand-edit these, your changes will be overwritten on the next build):
- `apps/{id}/index.html` — app landing page
- `privacy/{id}/index.html` — app privacy policy
- `terms/{id}/index.html` — app terms of use
- the app-card grids inside `index.html` and `support/index.html` (between `<!-- BEGIN:APPS_GRID -->` / `<!-- BEGIN:SUPPORT_APPS_GRID -->` markers)
- `sitemap.xml`
- `robots.txt`

**Hand-authored** (edit these directly, the build never touches them):
- `index.html`, `support/index.html` — except the marker-delimited grid sections
- `contact/index.html`
- `privacy.html`, `terms.html`, `refund.html`, `data-deletion.html`, `eula.html` — company-wide legal pages, not app-specific
- `404.html`
- `email-templates/*.html`
- `favicon.svg`, `site.webmanifest`, `netlify.toml`

## How to add a new app

1. Open `apps.config.js`, copy an existing `'live'` entry (or one of the
   `'draft'` stubs at the bottom), and fill in every field: name, taglines,
   store links, features, FAQs, and the full `privacy.sections` /
   `terms.sections` legal text.
2. Set `status: 'draft'` while you're still deciding — a draft entry produces
   **zero output**: no directory, no URL, no sitemap entry, no nav card. It
   only exists in this file, so you can note down ideas without publishing
   anything.
3. When ready to launch, change `status` to `'live'` and run:
   ```
   node build.js
   ```
4. Review the diff (`git diff` or just eyeball the changed files), then
   deploy as usual — drag the folder into Netlify, or push if you've connected
   a git remote.

That's it — one file changes, the landing page, both legal pages, the
homepage card, the support-page card, the sitemap entry, and the structured
data all update together. Nothing else in the repo needs to change.

## Retiring an app

Set `status: 'retired'` instead of deleting the config entry. On the next
build:
- Its `apps/{id}/index.html` becomes a plain "no longer available" notice
  instead of the marketing page (still linking to its Privacy/Terms/Support,
  so existing users and app-store reviewers can still reach them).
- Its Privacy Policy and Terms of Use stay published, unchanged, at their
  existing URLs — required for App Store/Play compliance and for the sake of
  existing users.
- It's dropped from the homepage and support-page grids by default. Add
  `showInNav: true` to the config entry if you want it to stay visible there
  anyway.

## Why a build step at all, given this used to be zero-build static HTML

Two live apps duplicated near-identical HTML three times each (landing,
privacy, terms) — six files of copy-pasted markup that had already drifted
slightly out of sync before this generator existed (that's how the ShiftEarn
Pro paywall ended up linking to the wrong privacy URL after an unrelated
edit). A third and fourth app would have meant six more files to keep in
sync by hand, forever.

`build.js` has **zero npm dependencies** — it's plain Node using only the
built-in `fs`/`path` modules. There's no `npm install`, no bundler, no
framework. The generated output is the same flat static HTML Netlify was
already serving; deployment doesn't change. Run `node build.js` locally
after editing `apps.config.js`, commit the result, deploy as always.

## Why not a src/ vs dist/ split

The generator writes directly into `apps/`, `privacy/{id}/`, `terms/{id}/`,
and the marker sections of `index.html`/`support/index.html` — there's no
separate output directory to keep in sync with a source directory. The
generated files ARE the source of truth for their own content once written;
`apps.config.js` is upstream of them. This keeps the repo layout identical
to before the generator existed, so nothing else about hosting or deployment
had to change.
