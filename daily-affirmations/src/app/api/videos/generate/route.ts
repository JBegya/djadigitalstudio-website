import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { storyboardsStore } from '@/server/config/storyboards';
import { getVideoWorkDir } from '@/server/config/paths';
import { startVideoGeneration } from '@/server/pipeline/videoOrchestrator';
import { newId } from '@/server/utils/id';

export const runtime = 'nodejs';

interface SceneKeyframeInput {
  sceneNumber?: number;
  dataUrl?: string;
}

interface GenerateVideoBody {
  storyboardId?: string;
  sceneKeyframes?: SceneKeyframeInput[];
}

const BASE64_MARKER = ';base64,';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as GenerateVideoBody;
  if (!body.storyboardId || !Array.isArray(body.sceneKeyframes)) {
    return NextResponse.json({ error: 'storyboardId and sceneKeyframes are required' }, { status: 400 });
  }

  const storyboard = storyboardsStore.get(body.storyboardId);
  if (!storyboard) return NextResponse.json({ error: `Storyboard "${body.storyboardId}" not found` }, { status: 400 });

  const keyframesBySceneNumber = new Map(body.sceneKeyframes.map((k) => [k.sceneNumber, k.dataUrl]));
  const missing = storyboard.scenes.filter((scene) => !keyframesBySceneNumber.get(scene.number));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing rendered keyframes for scene(s) ${missing.map((s) => s.number).join(', ')}` }, { status: 400 });
  }

  // Keyframes are persisted under a fresh work directory keyed by a job id generated here (not
  // inside startVideoGeneration) so this route and the orchestrator agree on the same directory —
  // the orchestrator receives the already-resolved file paths, it never re-derives them.
  const jobId = newId('video');
  const keyframesDir = path.join(getVideoWorkDir(jobId), 'keyframes');
  fs.mkdirSync(keyframesDir, { recursive: true });

  const keyframePaths: Record<number, string> = {};
  for (const scene of storyboard.scenes) {
    const dataUrl = keyframesBySceneNumber.get(scene.number)!;
    const markerIndex = dataUrl.startsWith('data:') ? dataUrl.indexOf(BASE64_MARKER) : -1;
    if (markerIndex === -1) {
      return NextResponse.json({ error: `Keyframe for scene ${scene.number} must be a base64 data URL` }, { status: 400 });
    }
    const base64Payload = dataUrl.slice(markerIndex + BASE64_MARKER.length);
    const filePath = path.join(keyframesDir, `scene-${scene.number}.png`);
    fs.writeFileSync(filePath, Buffer.from(base64Payload, 'base64'));
    keyframePaths[scene.number] = filePath;
  }

  startVideoGeneration(jobId, storyboard.id, keyframePaths);
  return NextResponse.json({ jobId });
}
