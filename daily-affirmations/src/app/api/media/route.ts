import fs from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { settingsStore } from '@/server/config/settings';

export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function resolveSafePath(requested: string): string | null {
  const outputFolder = path.resolve(settingsStore.load().outputFolder);
  const resolved = path.resolve(requested);
  if (resolved !== outputFolder && !resolved.startsWith(outputFolder + path.sep)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

/**
 * Streams a file from inside the configured Exports folder, with HTTP Range support so the
 * in-app video preview can scrub. `path` must resolve inside outputFolder — anything else is
 * rejected, since this is the one route that turns an arbitrary string into a filesystem read.
 */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('path');
  if (!requested) return new Response('Missing path', { status: 400 });

  const filePath = resolveSafePath(requested);
  if (!filePath) return new Response('Not found', { status: 404 });

  const stat = fs.statSync(filePath);
  const mime = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const range = request.headers.get('range');

  if (!range) {
    const buffer = fs.readFileSync(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: { 'Content-Type': mime, 'Content-Length': String(stat.size), 'Accept-Ranges': 'bytes' },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match?.[1] ? Number(match[1]) : 0;
  const end = match?.[2] ? Number(match[2]) : stat.size - 1;
  const chunkSize = end - start + 1;

  const buffer = Buffer.alloc(chunkSize);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, chunkSize, start);
  fs.closeSync(fd);

  return new Response(new Uint8Array(buffer), {
    status: 206,
    headers: {
      'Content-Type': mime,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunkSize),
    },
  });
}
