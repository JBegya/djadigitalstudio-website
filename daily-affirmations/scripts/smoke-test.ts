/**
 * Offline pipeline smoke test — renders ONE full affirmation video (Test Mode, no API keys
 * needed) through every stage of the real pipeline, writing to a scratch directory instead of
 * the real Exports/ folder or history.json. Run with `npm run smoke`.
 *
 * This exists so the video engine (the highest-risk, most-likely-to-break part — ffmpeg filter
 * graphs, font rendering, audio mixing) can be verified quickly from the command line without
 * starting the Next.js server or a browser.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeAffirmationScript } from '../src/server/ai-services/scriptWriter';
import { generateVoice } from '../src/server/ai-services/voiceGenerator';
import { writeSocialCopy } from '../src/server/ai-services/socialCopyWriter';
import { fetchBackgroundVideo } from '../src/server/media-services/backgroundMediaService';
import { pickMusicTrack } from '../src/server/media-services/musicService';
import { generateSubtitles } from '../src/server/video-engine/subtitleService';
import { CANVAS_HEIGHT, CANVAS_WIDTH, composeVideo } from '../src/server/video-engine/videoComposer';
import { assembleFinalVideo, getOrCreateBrandFrames } from '../src/server/video-engine/videoAssembly';
import { generateThumbnail } from '../src/server/video-engine/thumbnailService';
import { runQualityChecks } from '../src/server/quality-engine';
import { getBundledMusicDir, getFontsDir } from '../src/server/config/paths';
import type { Settings } from '../src/types/domain';

function step(label: string) {
  console.log(`\n→ ${label}`);
}

async function main() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dja-smoke-'));
  console.log(`Working directory: ${workDir}`);

  const settings: Settings = {
    openaiApiKey: '',
    pexelsApiKey: '',
    outputFolder: workDir,
    musicFolder: getBundledMusicDir(),
    logoPath: path.join(process.cwd(), 'assets', 'logo', 'dja-logo.png'),
    videoLengthSeconds: 24,
    voice: 'warm-female',
    subtitleFont: 'Inter',
    subtitleColor: '#FFFFFF',
    subtitlePosition: 'bottom',
    enabledContentModes: {},
    qualityThreshold: 9,
  };
  const fontsDir = getFontsDir();

  step('Writing affirmation script');
  const script = await writeAffirmationScript({ brand: 'nurse', topicKey: 'running-empty', settings, avoidExamples: [] });
  console.log(`  "${script.text}" (${script.wordCount} words, source=${script.source})`);

  step('Generating voiceover');
  const voice = await generateVoice({ brand: 'nurse', text: script.text, voice: settings.voice, settings, outputPath: path.join(workDir, 'voice.wav') });
  console.log(`  ${voice.durationSeconds.toFixed(1)}s, source=${voice.source}`);
  const targetDuration = Math.min(48, Math.max(15, voice.durationSeconds + 1.2));

  step('Selecting background footage');
  const background = await fetchBackgroundVideo({
    brand: 'nurse',
    topicKey: 'running-empty',
    durationSeconds: targetDuration,
    settings,
    outputPath: path.join(workDir, 'background.mp4'),
  });
  console.log(`  source=${background.source}`);

  step('Timing subtitles');
  const subtitles = await generateSubtitles({
    text: script.text,
    audioPath: voice.audioPath,
    durationSeconds: targetDuration,
    settings,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    outputAssPath: path.join(workDir, 'subs.ass'),
  });
  console.log(`  ${subtitles.cues.length} cues, timing=${subtitles.timingSource}`);

  step('Selecting music');
  const music = pickMusicTrack(settings.musicFolder);
  console.log(`  ${music ? music.fileName : '(none found)'}`);

  step('Composing main content clip');
  const composed = await composeVideo({
    brand: 'nurse',
    backgroundVideoPath: background.videoPath,
    voiceAudioPath: voice.audioPath,
    musicAudioPath: music?.path ?? null,
    assSubtitlePath: subtitles.assPath,
    logoPath: settings.logoPath,
    fontsDir,
    durationSeconds: targetDuration,
    outputPath: path.join(workDir, 'main.mp4'),
    testModeWatermark: true,
  });
  console.log(`  ${composed.outputPath} (${composed.durationSeconds.toFixed(1)}s)`);

  step('Rendering brand intro/outro and assembling final video');
  const { introPath, outroPath } = await getOrCreateBrandFrames('nurse', settings.logoPath, fontsDir);
  const assembled = await assembleFinalVideo({
    introPath,
    mainVideoPath: composed.outputPath,
    outroPath,
    outputPath: path.join(workDir, 'final.mp4'),
  });
  console.log(`  ${assembled.outputPath} (${assembled.durationSeconds.toFixed(1)}s total)`);

  step('Writing captions + hashtags');
  const social = await writeSocialCopy({ brand: 'nurse', topicLabel: script.topicLabel, affirmationText: script.text, settings });
  console.log(`  ${social.hashtags.length} hashtags, hook="${social.thumbnailHook}"`);

  step('Generating thumbnail');
  const thumbnail = await generateThumbnail({
    backgroundVideoPath: background.videoPath,
    hookText: social.thumbnailHook,
    logoPath: settings.logoPath,
    fontsDir,
    outputPath: path.join(workDir, 'thumbnail.png'),
  });
  console.log(`  ${thumbnail.outputPath}`);

  step('Running quality checks');
  const quality = await runQualityChecks({
    brand: 'nurse',
    affirmationText: script.text,
    voiceAudioPath: voice.audioPath,
    mainVideoPath: composed.outputPath,
    finalVideoPath: assembled.outputPath,
    cues: subtitles.cues,
    backgroundSource: background.source,
    pexelsConfigured: Boolean(settings.pexelsApiKey),
    musicUsed: Boolean(music),
    musicConfigured: true,
  });
  for (const check of quality.checks) {
    console.log(`  [${check.passed ? 'PASS' : 'FAIL'}] ${check.name} (${check.score}/10): ${check.message}`);
  }
  console.log(
    `\n  Emotional Impact  ${quality.score.emotionalImpact}/10\n  Visual Quality    ${quality.score.visualQuality}/10\n  Caption Readability ${quality.score.captionReadability}/10\n  Overall           ${quality.score.overall}/10`,
  );

  console.log(`\n${quality.passed ? '✅ Smoke test passed' : '⚠️  Smoke test finished with quality warnings'} — output in ${workDir}`);
  if (!quality.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\n❌ Smoke test failed:', error);
  process.exitCode = 1;
});
