# Spell-check dictionary

`en.aff` / `en.dic` are the Hunspell en_US dictionary from the
[`dictionary-en`](https://www.npmjs.com/package/dictionary-en) npm package (MIT/BSD, see
`LICENSE.txt`), vendored here as plain files instead of depending on that package at runtime.

`dictionary-en` is ESM-only and resolves its own data files via
`new URL('index.aff', import.meta.url)`. That pattern doesn't survive Next.js's server-side
webpack bundling — the URL stops pointing at a real file, and every attempt to keep the package
as a runtime dependency (webpack `externals`, `require.resolve`) ran into a different flavor of
the same bundler/ESM interaction. Reading two static files directly (`src/server/quality-engine/spellChecker.ts`) sidesteps the whole problem.

To update to a newer dictionary release, replace these two files from a fresh
`node_modules/dictionary-en/index.{aff,dic}` and re-copy the license.
