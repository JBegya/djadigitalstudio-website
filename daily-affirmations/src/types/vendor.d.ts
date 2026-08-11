// Minimal ambient types for small JS-only dependencies that ship no typings.

declare module 'nspell' {
  interface NSpellInstance {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string, model?: string): NSpellInstance;
    remove(word: string): NSpellInstance;
  }
  type DictLike = { aff: Buffer | Uint8Array; dic?: Buffer | Uint8Array };
  function nspell(dictionary: DictLike | DictLike[], dic?: Buffer | Uint8Array): NSpellInstance;
  export = nspell;
}

declare module 'write-good' {
  interface WriteGoodSuggestion {
    index: number;
    offset: number;
    reason: string;
  }
  interface WriteGoodOptions {
    passive?: boolean;
    illusion?: boolean;
    so?: boolean;
    thereIs?: boolean;
    weasel?: boolean;
    adverb?: boolean;
    tooWordy?: boolean;
    cliches?: boolean;
    eprime?: boolean;
  }
  function writeGood(text: string, opts?: WriteGoodOptions): WriteGoodSuggestion[];
  export = writeGood;
}
