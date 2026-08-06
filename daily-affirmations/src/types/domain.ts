// Shared domain types — imported by both server code and client components.
// Must stay free of Node-only imports (fs, child_process, etc.).

export type ProductId = string;

export interface Settings {
  openaiApiKey: string;
  outputFolder: string;
}

/** Category of a real, user-supplied screenshot — determines which device mockup it's composited into. */
export type DeviceKind = 'iphone' | 'watch' | 'ipad' | 'mac';

export interface ProductScreenshot {
  id: string;
  path: string;
  /** Small preview for the Brand Manager grid — generated client-side at upload time. Logo/icon
   * don't get one; they're single images always shown at a controlled UI size. */
  thumbnailPath?: string;
  label: string;
  device: DeviceKind;
}

export interface ProductFeature {
  key: string;
  label: string;
  description: string;
  defaultHeadline?: string;
  defaultCta?: string;
}

export interface ProductProfile {
  id: ProductId;
  name: string;
  tagline: string;
  description: string;
  appIconPath?: string;
  logoPath?: string;
  brandColors: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  fontFamily?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  websiteUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  /** [] is a first-class, expected state — the UI shows a clear "add screenshots" placeholder. */
  screenshots: ProductScreenshot[];
  features: ProductFeature[];
  targetAudience: string[];
  keywords: string[];
}

/** A platform/placement's fixed output dimensions and supported export formats. */
export interface ContentTypeSpec {
  key: string;
  label: string;
  widthPx: number;
  heightPx: number;
  exportFormats: Array<'png' | 'jpg' | 'pdf'>;
}

export type TemplateSlotKind = 'headline' | 'subheadline' | 'screenshot' | 'cta' | 'logo' | 'storeBadge' | 'featureBullets';

export interface TemplateSlot {
  key: string;
  kind: TemplateSlotKind;
  device?: DeviceKind;
  rect: { xPct: number; yPct: number; wPct: number; hPct: number };
  style?: Record<string, string | number>;
}

export interface TemplateDefinition {
  key: string;
  label: string;
  description: string;
  background: { kind: 'solid' | 'gradient'; colors: string[] };
  slots: TemplateSlot[];
}

/** One saved advertisement, listed on the Dashboard/Exports screens. */
export interface AdCreation {
  id: string;
  productId: ProductId;
  templateKey: string;
  contentTypeKey: string;
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  thumbnailPath: string;
  exportPaths: string[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  /** Fabric's own canvas.toJSON() — every object, position, size, color, and text, tagged with
   * each object's `djaSlotKey`. Reload with canvas.loadFromJSON() to resume editing exactly
   * where the user left off, instead of a one-shot export. */
  canvasJson: Record<string, unknown>;
  canvasWidthPx: number;
  canvasHeightPx: number;
}
