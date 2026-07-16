// Shared domain types — imported by both server code and client components.
// Must stay free of Node-only imports (fs, child_process, etc.).

export type BrandId = 'nurse' | 'autism';

export type VoicePreset = 'warm-female' | 'calm-female' | 'warm-male' | 'calm-male';

export type SubtitlePosition = 'bottom' | 'center' | 'top';

export interface Settings {
  openaiApiKey: string;
  pexelsApiKey: string;
  outputFolder: string;
  musicFolder: string;
  logoPath: string;
  videoLengthSeconds: number; // target length, 15-30
  voice: VoicePreset;
  subtitleFont: string;
  subtitleColor: string; // hex
  subtitlePosition: SubtitlePosition;
  /** Content Mode keys enabled per brand for daily rotation. Omitted/missing brand = all modes enabled. */
  enabledContentModes: Partial<Record<BrandId, string[]>>;
  /** Minimum overall quality score (0-10) a video must clear before export; below it, the weakest component is regenerated. */
  qualityThreshold: number;
}

export type PipelineStage =
  | 'queued'
  | 'script'
  | 'voice'
  | 'background'
  | 'subtitles'
  | 'music'
  | 'compose'
  | 'thumbnail'
  | 'captions'
  | 'quality'
  | 'export'
  | 'done'
  | 'failed';

export interface VideoJobProgress {
  jobId: string;
  brand: BrandId;
  index: number; // 1-3 within the brand
  topic: string;
  stage: PipelineStage;
  percent: number; // 0-100 for this job
  message: string;
  attempt: number;
  updatedAt: string;
}

export interface GenerationRunProgress {
  runId: string;
  date: string; // YYYY-MM-DD
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'complete' | 'failed';
  jobs: VideoJobProgress[];
}

export interface CaptionSet {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtubeShorts: string;
}

/** The four headline quality scores (0-10) shown per video — see server/quality-engine/qualityScore.ts for how they're computed. */
export interface QualityScoreReport {
  emotionalImpact: number;
  visualQuality: number;
  captionReadability: number;
  overall: number;
}

export interface VideoResult {
  jobId: string;
  brand: BrandId;
  index: number;
  topic: string;
  affirmationText: string;
  videoPath: string;
  thumbnailPath: string;
  captionPath: string;
  hashtagsPath: string;
  hashtags: string[];
  captions: CaptionSet;
  durationSeconds: number;
  createdAt: string;
  qualityPassed: boolean;
  qualityIssues: string[];
  qualityScore: QualityScoreReport;
  testMode: boolean;
  /** Manually reviewed and greenlit for posting — set from the batch Preview screen, tracked so a reviewer can see what's left to check at a glance. */
  approved: boolean;
}

export interface GenerationHistoryEntry {
  date: string; // YYYY-MM-DD
  runId: string;
  startedAt: string;
  finishedAt: string;
  status: 'complete' | 'partial' | 'failed';
  videos: VideoResult[];
}

/** One of the 6 named categories a brand rotates content through (Content Modes). */
export interface ContentMode {
  key: string;
  label: string;
}

export interface BrandTopic {
  key: string;
  label: string;
  /** The ContentMode key this angle belongs to — the unit balanced-rotation picks across. */
  mode: string;
  /** Emotion-first Pexels search terms (mood/imagery, not literal occupation nouns) that visually match this angle. */
  keywords: string[];
}

export interface BrandDefinition {
  id: BrandId;
  name: string;
  folderName: string;
  audience: string[];
  /** The fixed set of Content Modes this brand rotates across for balanced variety. */
  contentModes: ContentMode[];
  topics: BrandTopic[];
  toneRules: string[];
  bannedPhrases: string[];
  /** Shared emotional-imagery fallback pool if an angle's own keywords come up empty on Pexels. */
  backgroundKeywordHints: string[];
  systemPrompt: string;
  /** This brand's accent hex within the shared DJ&A palette (cooler for Nurse, warmer for Autism Parent). */
  accentColor: string;
}
