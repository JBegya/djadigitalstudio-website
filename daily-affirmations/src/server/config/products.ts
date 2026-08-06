import fs from 'node:fs';
import path from 'node:path';
import type { BrandGuidelines, ProductProfile, ProductScreenshot } from '@/types/domain';
import { getProductsDir, getUserProductsOverlayDir } from './paths';

function readJsonSafe<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

const DEFAULT_BRAND_GUIDELINES: BrandGuidelines = {
  cornerRadiusPx: 16,
  buttonStyle: 'rounded',
  preferredBackground: 'solid',
  logoClearSpacePx: 16,
  storeBadgeStyle: 'black',
};

/** Backfills fields added after some bundled/overlay JSON already existed on disk — otherwise a
 * profile written before `brandGuidelines`/`status`/platform-availability existed would come back
 * missing them entirely (JSON on disk isn't statically typed, so old files just don't have them),
 * and the UI would crash reading e.g. `product.brandGuidelines.cornerRadiusPx`. */
function withDefaults(profile: ProductProfile): ProductProfile {
  return {
    ...profile,
    brandGuidelines: { ...DEFAULT_BRAND_GUIDELINES, ...profile.brandGuidelines },
    status: profile.status ?? 'draft',
    appStoreAvailability: profile.appStoreAvailability ?? 'not-planned',
    googlePlayAvailability: profile.googlePlayAvailability ?? 'not-planned',
  };
}

/** Fields that need a one-level-deep merge rather than a wholesale replace — otherwise patching
 * just `brandColors.primary` (or one `brandGuidelines` field) would silently drop the rest. */
function mergeProfile(current: ProductProfile, patch: Partial<ProductProfile>): ProductProfile {
  return {
    ...current,
    ...patch,
    brandColors: { ...current.brandColors, ...patch.brandColors },
    brandGuidelines: { ...current.brandGuidelines, ...patch.brandGuidelines },
  };
}

/**
 * Bundled seed JSON (`data/products/*.json`, read-only, shipped with the app) with an optional
 * per-product overlay (`{userDataDir}/products/*.json`) that — once present — fully replaces the
 * bundled profile. `update()` always reads the current *effective* profile and writes the
 * complete merged result back as the new overlay, so a single-field edit never loses the rest of
 * the bundled data. Mirrors `SettingsStore`/`CreationsStore`'s fs-backed, constructor-injectable
 * shape so tests never touch the real bundled `data/` or user-data directory.
 */
export class ProductStore {
  constructor(
    private readonly bundledDir: string = getProductsDir(),
    private readonly overlayDir: string = getUserProductsOverlayDir(),
  ) {}

  list(): ProductProfile[] {
    const ids = new Set<string>();
    for (const dir of [this.bundledDir, this.overlayDir]) {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.json')) ids.add(file.replace(/\.json$/, ''));
      }
    }
    return [...ids]
      .map((id) => this.get(id))
      .filter((p): p is ProductProfile => p !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string): ProductProfile | null {
    const bundled = readJsonSafe<ProductProfile>(path.join(this.bundledDir, `${id}.json`));
    const overlay = readJsonSafe<ProductProfile>(path.join(this.overlayDir, `${id}.json`));
    const effective = overlay ?? bundled;
    return effective ? withDefaults(effective) : null;
  }

  create(profile: ProductProfile): ProductProfile {
    if (this.get(profile.id)) throw new Error(`Product "${profile.id}" already exists`);
    this.persist(profile);
    return profile;
  }

  update(id: string, patch: Partial<ProductProfile>): ProductProfile {
    const current = this.get(id);
    if (!current) throw new Error(`Product "${id}" not found`);
    const next = mergeProfile(current, patch);
    this.persist(next);
    return next;
  }

  /** Removes a product's *customization* — for a bundled seed product this reverts it to
   * defaults (it still appears in `list()`, sourced from the bundled file); for a product
   * created entirely through the UI (no bundled counterpart) this removes it outright. Fully
   * deleting one of the seeded products isn't supported in this milestone. */
  remove(id: string): void {
    const overlayPath = path.join(this.overlayDir, `${id}.json`);
    if (fs.existsSync(overlayPath)) fs.unlinkSync(overlayPath);
  }

  setLogo(id: string, logoPath: string | undefined): ProductProfile {
    return this.update(id, { logoPath });
  }

  setIcon(id: string, appIconPath: string | undefined): ProductProfile {
    return this.update(id, { appIconPath });
  }

  addScreenshot(id: string, screenshot: ProductScreenshot): ProductProfile {
    const current = this.get(id);
    if (!current) throw new Error(`Product "${id}" not found`);
    return this.update(id, { screenshots: [...current.screenshots, screenshot] });
  }

  removeScreenshot(id: string, screenshotId: string): ProductProfile {
    const current = this.get(id);
    if (!current) throw new Error(`Product "${id}" not found`);
    return this.update(id, { screenshots: current.screenshots.filter((s) => s.id !== screenshotId) });
  }

  private persist(profile: ProductProfile): void {
    fs.mkdirSync(this.overlayDir, { recursive: true });
    fs.writeFileSync(path.join(this.overlayDir, `${profile.id}.json`), JSON.stringify(profile, null, 2), 'utf-8');
  }
}

export const productStore = new ProductStore();
