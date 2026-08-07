import fs from 'node:fs';
import type { Settings } from '@/types/domain';
import { env, loadEnv } from './env';
import { getDefaultOutputFolder, getSettingsFilePath } from './paths';

loadEnv();

const DEFAULT_DRAFT_REMINDER_DAYS = 30;
const DEFAULT_REFRESH_REMINDER_DAYS = 183;
const MIN_REMINDER_DAYS = 1;
const MAX_REMINDER_DAYS = 3650;

function clampReminderDays(value: number): number {
  return Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, Math.round(value)));
}

function defaultSettings(): Settings {
  return {
    openaiApiKey: env('OPENAI_API_KEY'),
    outputFolder: env('DJA_OUTPUT_FOLDER') || getDefaultOutputFolder(),
    requiredPublishingPlatformKeysByProduct: {},
    draftReminderDays: DEFAULT_DRAFT_REMINDER_DAYS,
    refreshReminderDays: DEFAULT_REFRESH_REMINDER_DAYS,
  };
}

const SETTINGS_KEYS: Array<keyof Settings> = [
  'openaiApiKey',
  'outputFolder',
  'requiredPublishingPlatformKeysByProduct',
  'draftReminderDays',
  'refreshReminderDays',
];

/** Reminder-day values are clamped server-side as defense in depth — a future API client, a
 * manual request, or a hand-edited/corrupted settings.json shouldn't be able to store a 0,
 * negative, or absurdly large value, even though the Settings screen already clamps client-side. */
const CLAMPED_KEYS: Array<keyof Settings> = ['draftReminderDays', 'refreshReminderDays'];

function sanitize(candidate: Partial<Settings>, base: Settings): Settings {
  const merged: Settings = { ...base };
  for (const key of SETTINGS_KEYS) {
    let value = candidate[key];
    if (value === undefined || value === null) continue;
    if (CLAMPED_KEYS.includes(key) && typeof value === 'number') value = clampReminderDays(value);
    (merged as Record<keyof Settings, unknown>)[key] = value;
  }
  return merged;
}

/** Reads/writes Settings as JSON on disk. Every `update()` call autosaves immediately.
 * Constructor-injectable with a file path — same shape as CreationsStore/MarketingPacksStore — so
 * tests never touch the real user-data directory. */
export class SettingsStore {
  private cached: Settings | null = null;

  constructor(private readonly filePath: string = getSettingsFilePath()) {}

  load(): Settings {
    if (this.cached) return this.cached;
    const base = defaultSettings();
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as Partial<Settings>;
        this.cached = sanitize(raw, base);
      } catch {
        this.cached = base;
      }
    } else {
      this.cached = base;
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

  /** Settings safe to send to the renderer with secrets masked, plus a flag for whether the key is set. */
  redacted(): Settings & { hasOpenAiKey: boolean } {
    const s = this.load();
    return {
      ...s,
      openaiApiKey: s.openaiApiKey ? maskKey(s.openaiApiKey) : '',
      hasOpenAiKey: Boolean(s.openaiApiKey),
    };
  }

  private persist(settings: Settings): void {
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), 'utf-8');
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
