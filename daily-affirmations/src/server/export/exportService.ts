import fs from 'node:fs';
import type { BrandId, CaptionSet } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { getExportBrandDir } from '@/server/config/paths';
import { createLogger } from '@/server/utils/logger';

const log = createLogger('exportService');

export interface ExportRequest {
  outputFolder: string;
  date: string;
  brand: BrandId;
  index: number;
  videoPath: string;
  thumbnailPath: string;
  captions: CaptionSet;
  hashtags: string[];
}

export interface ExportedPaths {
  videoPath: string;
  thumbnailPath: string;
  captionPath: string;
  hashtagsPath: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildCaptionFile(captions: CaptionSet): string {
  return [
    'FACEBOOK',
    '--------',
    captions.facebook,
    '',
    'INSTAGRAM',
    '---------',
    captions.instagram,
    '',
    'TIKTOK',
    '------',
    captions.tiktok,
    '',
    'YOUTUBE SHORTS',
    '--------------',
    captions.youtubeShorts,
    '',
  ].join('\n');
}

/** Copies the rendered assets into Exports/{date}/{Brand}/ using the exact spec-required naming. */
export function exportVideoAssets(request: ExportRequest): ExportedPaths {
  const brandDef = getBrand(request.brand);
  const dir = getExportBrandDir(request.outputFolder, request.date, brandDef.folderName);
  const suffix = pad2(request.index);

  const videoPath = `${dir}/Video${suffix}.mp4`;
  const thumbnailPath = `${dir}/Thumbnail${suffix}.png`;
  const captionPath = `${dir}/Caption${suffix}.txt`;
  const hashtagsPath = `${dir}/Hashtags${suffix}.txt`;

  fs.copyFileSync(request.videoPath, videoPath);
  fs.copyFileSync(request.thumbnailPath, thumbnailPath);
  fs.writeFileSync(captionPath, buildCaptionFile(request.captions), 'utf-8');
  fs.writeFileSync(hashtagsPath, request.hashtags.join(' '), 'utf-8');

  log.info(`Exported ${brandDef.name} video ${suffix} to ${dir}`);
  return { videoPath, thumbnailPath, captionPath, hashtagsPath };
}
