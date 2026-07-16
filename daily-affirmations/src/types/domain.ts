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
  testMode: boolean;
}

export interface GenerationHistoryEntry {
  date: string; // YYYY-MM-DD
  runId: string;
  startedAt: string;
  finishedAt: string;
  status: 'complete' | 'partial' | 'failed';
  videos: VideoResult[];
}

export interface BrandTopic {
  key: string;
  label: string;
  /** Pexels search terms that visually match this topic — keeps backgrounds relevant, never random. */
  keywords: string[];
}

export interface BrandDefinition {
  id: BrandId;
  name: string;
  folderName: string;
  audience: string[];
  topics: BrandTopic[];
  toneRules: string[];
  bannedPhrases: string[];
  backgroundKeywordHints: string[];
  systemPrompt: string;
}
