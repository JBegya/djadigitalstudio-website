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

export type FeaturePriority = 'low' | 'medium' | 'high';

export interface Transformation {
  from: string;
  to: string;
}

/** One real-world segment of a product's users — the same feature can mean something completely
 * different to a nurse than to a FIFO worker, and a persuasive ad needs to speak to one of them
 * specifically rather than a generic "user." */
export interface CustomerPersona {
  id: string;
  name: string;
  occupation: string;
  environment: string;
  biggestProblems: string[];
  biggestFears: string[];
  biggestFrustrations: string[];
  desiredOutcomes: string[];
  emotionalTriggers: string[];
  storyIdeas: string[];
  preferredCommunicationStyle: string;
}

/** Structured marketing knowledge for one feature — persuasion-oriented context beyond what's
 * needed to render a slot, so a future Copy Assistant or story-driven ad flow can draw on real,
 * user-authored substance instead of inventing claims. Never AI-generated itself. */
export interface FeatureMarketingProfile {
  coreProblem: string;
  corePromise: string;
  painPoints: string[];
  benefits: string[];
  transformation: Transformation;
  /** User-authored only — e.g. a real stat or quote. Never fabricated by AI. */
  supportingProof: string;
  /** The "relatable moment" opening line a story-driven ad should start with — never a feature or
   * a screenshot. */
  suggestedHook: string;
  suggestedDevice?: DeviceKind;
  /** References CustomerPersona.id values on the same product — the same feature can support
   * multiple personas' different reasons for caring about it. */
  linkedPersonaIds: string[];
  /** Free text, but the Brand Manager UI populates it from the product's own
   * marketingIdentity.emotionalTriggers so it stays a reference, not independent drift. */
  suggestedEmotion: string;
  suggestedStoryTypes: string[];
}

/** Default/empty shape for a feature's marketing profile — lives here (not in
 * server/config/products.ts) specifically so client components can use it too without pulling
 * that file's `fs`/`path` imports into the browser bundle. */
export const DEFAULT_FEATURE_MARKETING: FeatureMarketingProfile = {
  coreProblem: '',
  corePromise: '',
  painPoints: [],
  benefits: [],
  transformation: { from: '', to: '' },
  supportingProof: '',
  suggestedHook: '',
  suggestedDevice: undefined,
  linkedPersonaIds: [],
  suggestedEmotion: '',
  suggestedStoryTypes: [],
};

export interface ProductFeature {
  key: string;
  label: string;
  description: string;
  /** These make the Advertisement Wizard able to auto-populate a template slot-for-slot without
   * calling AI at all — the copy assistant only needs to kick in when the user wants something
   * better than what's already here. */
  headline?: string;
  subheadline?: string;
  cta?: string;
  /** Free-text icon identifier (e.g. a lucide-react icon name) — no icon picker yet. */
  icon?: string;
  accentColor?: string;
  priority?: FeaturePriority;
  /** References a ProductScreenshot.id on the same product. */
  suggestedScreenshotId?: string;
  marketing: FeatureMarketingProfile;
}

export type ButtonStyle = 'rounded' | 'pill' | 'square';
export type BackgroundStyle = 'solid' | 'gradient' | 'photo';
export type StoreBadgeStyle = 'black' | 'white' | 'outline';

/** Visual rules beyond raw brand colors — lets every generated ad follow the same look without
 * the person building it having to remember or re-decide these choices each time. */
export interface BrandGuidelines {
  cornerRadiusPx: number;
  buttonStyle: ButtonStyle;
  preferredBackground: BackgroundStyle;
  /** Minimum clear space (px, at the template's reference size) to keep free around the logo. */
  logoClearSpacePx: number;
  storeBadgeStyle: StoreBadgeStyle;
}

export type ProductStatus = 'draft' | 'beta' | 'released' | 'archived';
export type PlatformAvailability = 'available' | 'coming-soon' | 'not-planned';

/** Structured, persuasion-oriented marketing knowledge for a product — the "why should I download
 * this today" case, kept separate from technical ProductProfile fields. This is meant to become
 * the single source of truth every future ad, AI-assisted copy, and AI-generated video draws
 * from — never invented or embellished by AI, only ever authored here by a person. */
export interface MarketingIdentity {
  /** The deeper purpose behind the product, beyond its technical function — the emotional
   * foundation every ad for this product should ultimately trace back to. */
  whyThisAppExists: string;
  mission: string;
  corePromise: string;
  primaryAudience: string[];
  secondaryAudience: string[];
  coreProblems: string[];
  painPoints: string[];
  emotionalTriggers: string[];
  benefits: string[];
  transformation: Transformation;
  /** Real-world moments when someone is most likely to search for or download the app (a payroll
   * mistake, changing jobs, tax season) — what an ad should be timed/targeted around. */
  buyingTriggers: string[];
  /** Common reasons someone hesitates to download or subscribe, so future ads/copy can address
   * them honestly instead of ignoring them. */
  objections: string[];
  brandPersonality: string[];
  communicationStyle: string;
  wordsWePrefer: string[];
  wordsWeAvoid: string[];
  /** Explicit do/don't copywriting rules ("Never sensational", "Always end with hope") — kept
   * separate from brandPersonality's adjective list since these are rules to follow, not traits
   * to imitate. */
  styleGuardrails: string[];
  coreMessage: string;
  callToAction: string;
  /** A real customer narrative, once one exists — never fabricated. */
  successStory: string;
}

/** Default/empty shape — lives here (not in server/config/products.ts) specifically so client
 * components (e.g. the "Add Product" flow, a fresh feature form) can use it without pulling that
 * file's `fs`/`path` imports into the browser bundle. */
export const DEFAULT_MARKETING_IDENTITY: MarketingIdentity = {
  whyThisAppExists: '',
  mission: '',
  corePromise: '',
  primaryAudience: [],
  secondaryAudience: [],
  coreProblems: [],
  painPoints: [],
  emotionalTriggers: [],
  benefits: [],
  transformation: { from: '', to: '' },
  buyingTriggers: [],
  objections: [],
  brandPersonality: [],
  communicationStyle: '',
  wordsWePrefer: [],
  wordsWeAvoid: [],
  styleGuardrails: [],
  coreMessage: '',
  callToAction: '',
  successStory: '',
};

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
  brandGuidelines: BrandGuidelines;
  marketingIdentity: MarketingIdentity;
  fontFamily?: string;
  status: ProductStatus;
  appStoreUrl?: string;
  appStoreAvailability: PlatformAvailability;
  googlePlayUrl?: string;
  googlePlayAvailability: PlatformAvailability;
  websiteUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  /** [] is a first-class, expected state — the UI shows a clear "add screenshots" placeholder. */
  screenshots: ProductScreenshot[];
  features: ProductFeature[];
  personas: CustomerPersona[];
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
  /** Optional whitelist of ContentTypeSpec keys this template is valid for — omitted means
   * universal/social-safe. Used to keep e.g. a native-App-Store-styled template from being
   * offered for a Facebook/Instagram/LinkedIn/X post in the Advertisement Wizard. */
  contentTypeKeys?: string[];
}

/** Where a generated asset stands in its real-world lifecycle — separate from the app's own CRUD
 * state, which never deletes history. Tracked per asset (not per pack): a Marketing Pack's
 * platforms are typically published on different days. */
export type AssetStatus = 'draft' | 'ready' | 'published' | 'archived';

/** One saved advertisement, listed in the Marketing Library. */
export interface AdCreation {
  id: string;
  productId: ProductId;
  /** Which feature this ad promotes — unset on ads saved before this field existed. Powers
   * grouping/versioning in the Marketing Library; nothing else on this record can derive it. */
  featureKey?: string;
  /** The Marketing Pack this asset was generated as part of — unset for ads saved one at a time
   * through the single-ad wizard/editor flow, which don't create a pack. */
  packId?: string;
  templateKey: string;
  contentTypeKey: string;
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  /** A small JPEG data URL preview, not a filesystem path — no separate export-to-disk step
   * happens at save time. */
  thumbnailPath: string;
  exportPaths: string[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  /** Defaults to 'draft' — unset on ads saved before this field existed. */
  status?: AssetStatus;
  /** Fabric's own canvas.toJSON() — every object, position, size, color, and text, tagged with
   * each object's `djaSlotKey`. Reload with canvas.loadFromJSON() to resume editing exactly
   * where the user left off, instead of a one-shot export. */
  canvasJson: Record<string, unknown>;
  canvasWidthPx: number;
  canvasHeightPx: number;
}

/**
 * The primary unit of marketing output: everything generated for one feature in a single "Generate
 * Marketing Pack" run, across every platform selected. Individual per-platform assets (AdCreation)
 * reference a pack via `packId` rather than the pack listing its assets, so the asset list can
 * never go stale. The pack itself is versioned as a whole — regenerating a feature always creates
 * a new pack (Pack V2, V3, ...) rather than overwriting the last one.
 */
export interface MarketingPack {
  id: string;
  productId: ProductId;
  featureKey: string;
  /** 1-based, sequential per product+feature — computed server-side at creation time. */
  version: number;
  createdAt: string;
}
