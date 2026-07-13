# Deployment summary — this session

Status: **validated, not yet deployed.** I have no Netlify CLI or credentials
in this environment, so I can't push the deploy myself — see "To deploy"
below.

## Follow-up round (same session, after your review)

- Reverted to only the 4 real mailboxes (`jennie@`/`hello@`/`support@`/`admin@`) — removed all `privacy@`/`legal@`/`noreply@` references.
- Re-verified the DNS CNAME finding independently (fresh `dig`, plus Namecheap's own docs) — confirmed correct. **No DNS changes made**, per your instruction to leave it as-is until Workspace/DKIM are done.
- Generated the real PNG/ICO icon set from your two approved logo files, and discovered **both source logos are not actually transparent** despite being labelled that way (solid black background baked in, no alpha channel) — extracted a genuinely transparent version of the horizontal logo myself (clean background, verified no dark fringing against white/blue test backgrounds) and rebuilt the web/email derivatives from it. Full detail in `BRAND.md`.
- Confirmed the header/footer logo is responsive (CSS-height-constrained, no fixed dimensions) and retina-ready (source delivered at ~4.3× the display size).
- Confirmed ShiftEarn Pro's App Store URL in `apps.config.js` is already exactly correct (Apple's own canonical URL, region-code-free version, auto-redirects correctly) — no change needed.
- **SplitShift Hours store buttons are now hidden** (`storeLinksLive: false` in `apps.config.js`) — its landing page shows "Coming Soon" instead of broken App Store/Play Store links, home/support cards show "◇ Coming Soon" instead of "Available Now". Its privacy/terms pages remain live (compliance-relevant even pre-launch). Flip the flag once the listing actually resolves.
- Deleted `js/app-registry.js` (confirmed dead, build succeeds without it).

## Validation performed

- Full rebuild (`node build.js`) completed with no errors.
- Crawled all 15 pages (9 hand-authored + 6 generated), checked all 20 unique
  internal links via a local server — **0 broken internal links** (1 found
  and fixed: `privacy.html` linked `/data-deletion/` instead of
  `/data-deletion.html`).
- Confirmed every referenced favicon/icon/manifest/brand asset exists on disk.
- Confirmed `apps.config.js` loads without syntax errors and produces the
  expected 2 live / 0 retired / 2 draft split.
- `npx tsc --noEmit` on the ShiftEarn Pro app repo: clean, no errors.
- **External store links — real findings, not related to this session's
  edits:**
  - ✅ ShiftEarn Pro App Store link resolves correctly (verified in a real
    browser, not just curl).
  - ❌ **SplitShift Hours App Store link is broken** — `id6785191817` returns
    "The page you're looking for can't be found." Confirmed with a real
    browser against a known-working control (ShiftEarn Pro's own link, using
    the identical method, resolved fine).
  - ⚠️ **Both apps' Google Play links returned "Not Found"** for every
    package ID on file (`com.shiftearnpro.app`, `com.djadigital.shiftEarnPro`,
    `com.splitshift.app.hours`) — verified against a known-good control
    (`com.instagram.android`, which resolved correctly), so this isn't a
    generic access/blocking issue. Either these apps aren't actually
    published on Google Play yet, or they're under a package ID not
    referenced anywhere in these repos. **You'll need to check Google Play
    Console directly** — I have no way to verify this from here.

## Files added this session (website repo — first commit, nothing to compare against)

**New root pages:** `refund.html`, `data-deletion.html`, `eula.html`, `404.html`
**Rewrote as company-wide hubs:** `privacy.html`, `terms.html` (previously duplicated ShiftEarn Pro's policy)
**Generator system:** `apps.config.js`, `build.js`, `ARCHITECTURE.md`
**Brand system:** `brand/` (2 source logos + 2 web-optimised derivatives), `BRAND.md`, `favicon.ico` + 3 favicon PNGs, `apple-touch-icon.png`, 2 `android-chrome-*.png`, `site.webmanifest`
**Config/infra:** `netlify.toml`, `sitemap.xml`, `robots.txt` (both now generated), `.gitignore`
**Docs:** `GOOGLE-WORKSPACE-DNS-SETUP.md`, `DEPLOYMENT-SUMMARY.md` (this file)
**Email templates (new):** all 7 files in `email-templates/`
**Generated app pages:** `apps/{shiftearn-pro,splitshift-hours}/index.html`, `privacy/{same}/index.html`, `terms/{same}/index.html`

## Files removed this session

- `apps/shiftfamily-calendar/`, `privacy/shiftfamily-calendar/`, `terms/shiftfamily-calendar/` (whole directories — draft app, zero public footprint per your instruction)
- `apps/shifthydrate/`, `privacy/shifthydrate/`, `terms/shifthydrate/` (same)
- `js/app-registry.js` and the `js/` folder (dead code, confirmed unreferenced, build succeeds without it — you authorized this deletion)
- `favicon.svg` (superseded by the real PNG/ICO icon set generated from your approved monogram)

## Files modified (heaviest changes)

- `index.html`, `support/index.html` — app-card grids now generator-managed via marker comments; nav/footer swapped to the real logo image
- `contact/index.html` — restructured to 3 contact tiles (General/Support/Business) per your original spec
- All legal pages — entity name corrected to "DJ&A Digital Studio Limited", contact routed to `support@` only (not the assumed `privacy@`/`legal@`)
- `robots.txt` — simplified (no more `Disallow` lines needed now that drafts produce zero files)

## Outside this repo

- **`/Users/jenniebegya/ShiftEarn Pro/app/paywall.tsx`** and **`app/profile.tsx`** — `PRIVACY_URL`/`TERMS_URL` constants updated to point at `/privacy/shiftearn-pro/` and `/terms/shiftearn-pro/` directly instead of the now-generic `/privacy` and `/terms`. **Not yet built or submitted** — per your instruction, this is a source-code-only fix for the next time you ship an update for other reasons, not a reason to submit one now. The currently-live app build still works fine against the new website (see below).

## Why no new App Store submission is needed right now

The live ShiftEarn Pro build (already in the App Store) has the old
`/privacy` and `/terms` URLs compiled into it. Those still resolve
correctly — `netlify.toml` 301-redirects them to `/privacy.html` /
`/terms.html`, which now show a company-wide policy that clearly links to
the ShiftEarn-Pro-specific one. Not broken, just one extra click. Per your
instruction, that doesn't justify a submission on its own — the source fix
above just means the *next* update (whenever you ship one for a real
feature reason) will use the direct URL.

## To deploy

I don't have Netlify credentials or the CLI installed in this environment,
so I can't push this myself. Two options:

1. **Manual (matches how you deployed last time):** zip or drag the
   `/Users/jenniebegya/Downloads/website` folder into Netlify's dashboard
   under your site's **Deploys** tab.
2. **Git-connected (recommended for the future):** push this folder's git
   repo (already initialized, everything staged) to GitHub, then connect
   Netlify to it under **Site settings → Build & deploy → Link repository**
   for automatic deploys on every push. I can help set up the GitHub side if
   you want — connecting Netlify to it needs your login either way.

Do the DNS fix in `GOOGLE-WORKSPACE-DNS-SETUP.md` Step 0 either before or
after deploying — they're independent of each other (DNS is about mail
routing at the apex, deployment is about the site content Netlify serves).
