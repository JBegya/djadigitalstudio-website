import fs from 'node:fs';
import type { Settings } from '@/types/domain';
import { env, loadEnv } from './env';
import { getDefaultLogoPath, getDefaultMusicFolder, getDefaultOutputFolder, getSettingsFilePath, seedMusicFolderOnFirstRun } from './paths';

loadEnv();

function defaultSettings(): Settings {
  return {
    openaiApiKey: env('OPENAI_API_KEY'),
    pexelsApiKey: env('PEXELS_API_KEY'),
    outputFolder: env('DJA_OUTPUT_FOLDER') || getDefaultOutputFolder(),
    musicFolder: env('DJA_MUSIC_FOLDER') || getDefaultMusicFolder(),
    logoPath: env('DJA_LOGO_PATH') || getDefaultLogoPath(),
    videoLengthSeconds: 24,
    voice: 'warm-female',
    subtitleFont: 'Inter',
    subtitleColor: '#FFFFFF',
    subtitlePosition: 'bottom',
  };
}

const SETTINGS_KEYS: Array<keyof Settings> = [
  'openaiApiKey',
  'pexelsApiKey',
  'outputFolder',
  'musicFolder',
  'logoPath',
  'videoLengthSeconds',
  'voice',
  'subtitleFont',
  'subtitleColor',
  'subtitlePosition',
];

function sanitize(candidate: Partial<Settings>, base: Settings): Settings {
  const merged: Settings = { ...base };
  for (const key of SETTINGS_KEYS) {
    const value = candidate[key];
    if (value === undefined || value === null) continue;
    // TS can't narrow `merged[key] = candidate[key]` through a generic loop variable here.
    (merged as Record<keyof Settings, unknown>)[key] = value;
  }
  merged.videoLengthSeconds = Math.min(30, Math.max(15, Math.round(Number(merged.videoLengthSeconds) || 24)));
  return merged;
}

/** Reads/writes Settings as JSON on disk. Every `update()` call autosaves immediately. */
class SettingsStore {
  private cached: Settings | null = null;

  load(): Settings {
    if (this.cached) return this.cached;
    const file = getSettingsFilePath();
    const base = defaultSettings();
    if (fs.existsSync(file)) {
      try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<Settings>;
        this.cached = sanitize(raw, base);
      } catch {
        this.cached = base;
      }
    } else {
      this.cached = base;
      seedMusicFolderOnFirstRun(base.musicFolder);
      this.persist(this.cached);
    }
    return this.cached;
  }

  update(partial: Partial<Settings>): Settings {
    const current = this.load();
    const next = sanitize(partial, current);
    this.cached = next;
    this.persist(next);
    return next;
  }

  /** Settings safe to send to the renderer with secrets masked, plus flags for whether keys are set. */
  redacted(): Settings & { hasOpenAiKey: boolean; hasPexelsKey: boolean } {
    const s = this.load();
    return {
      ...s,
      openaiApiKey: s.openaiApiKey ? maskKey(s.openaiApiKey) : '',
      pexelsApiKey: s.pexelsApiKey ? maskKey(s.pexelsApiKey) : '',
      hasOpenAiKey: Boolean(s.openaiApiKey),
      hasPexelsKey: Boolean(s.pexelsApiKey),
    };
  }

  private persist(settings: Settings): void {
    fs.writeFileSync(getSettingsFilePath(), JSON.stringify(settings, null, 2), 'utf-8');
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export const settingsStore = new SettingsStore();

export function isTestMode(settings: Settings): boolean {
  return !settings.openaiApiKey;
}
