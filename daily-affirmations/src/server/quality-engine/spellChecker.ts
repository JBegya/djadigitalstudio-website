import fs from 'node:fs';
import path from 'node:path';
import nspell from 'nspell';
import { createLogger } from '@/server/utils/logger';

const log = createLogger('spellChecker');

// Domain words that are correct but wouldn't be in a general English dictionary.
const CUSTOM_ALLOWED_WORDS = ['DJA', "DJ&A", 'ICU', 'NICU', 'RN', 'nurses', "nurse's", 'affirmations', 'reels', 'shorts'];

let instance: ReturnType<typeof nspell> | null = null;
let loadFailed = false;

/**
 * The Hunspell en_US dictionary data (from the `dictionary-en` package, vendored here as
 * plain files — see assets/dictionary/LICENSE.txt) rather than depending on that package at
 * runtime. dictionary-en is ESM-only and resolves its .aff/.dic files internally via
 * `new URL('index.aff', import.meta.url)`, which webpack's server bundling mishandles (the
 * URL stops pointing at a real file at runtime); marking it a webpack external or resolving it
 * with `require.resolve` both still ended up with webpack rewriting the path into something
 * that doesn't exist on disk. A plain project asset sidesteps bundler involvement entirely.
 */
function loadDictionaryFiles(): { aff: Buffer; dic: Buffer } {
  const dir = path.join(process.cwd(), 'assets', 'dictionary');
  return {
    aff: fs.readFileSync(path.join(dir, 'en.aff')),
    dic: fs.readFileSync(path.join(dir, 'en.dic')),
  };
}

function getSpellChecker(): ReturnType<typeof nspell> | null {
  if (instance) return instance;
  if (loadFailed) return null;
  try {
    const dictionary = loadDictionaryFiles();
    instance = nspell(dictionary);
    for (const word of CUSTOM_ALLOWED_WORDS) instance.add(word);
    return instance;
  } catch (error) {
    loadFailed = true;
    log.warn(`Spell dictionary unavailable, skipping spellcheck: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

export interface SpellingIssue {
  word: string;
  suggestions: string[];
}

/** Returns misspelled words (ignoring punctuation, numbers, and short/proper-looking tokens). */
export async function findSpellingIssues(text: string): Promise<SpellingIssue[]> {
  const spell = getSpellChecker();
  if (!spell) return [];

  const words = text.match(/[A-Za-z']+/g) ?? [];
  const issues: SpellingIssue[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    const clean = word.replace(/^'+|'+$/g, '');
    if (clean.length < 3) continue;
    if (seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    if (spell.correct(clean)) continue;
    // Capitalized mid-sentence tokens are usually proper nouns — don't flag those.
    if (/^[A-Z]/.test(clean) && !spell.correct(clean.toLowerCase())) continue;
    issues.push({ word: clean, suggestions: spell.suggest(clean).slice(0, 3) });
  }
  return issues;
}
