import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { settingsStore } from '@/server/config/settings';
import { getExportProductDir } from '@/server/config/paths';

export const runtime = 'nodejs';

const EXTENSION_BY_FORMAT: Record<string, string> = { png: 'png', jpg: 'jpg', pdf: 'pdf' };

/** Writes one already-rendered export (a data URL from the editor's canvas.toDataURL()/jsPDF
 * output) into the configured output folder. The rendering happens entirely client-side in the
 * browser/Electron canvas — this route only persists the result, the same division of labor as
 * the rest of the app (server never touches pixels it didn't receive already-rendered). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { format?: string; dataUrl?: string; productFolderName?: string; fileName?: string };
  const format = body.format && EXTENSION_BY_FORMAT[body.format] ? body.format : null;
  if (!format || typeof body.dataUrl !== 'string') {
    return NextResponse.json({ error: 'format (png|jpg|pdf) and dataUrl are required' }, { status: 400 });
  }

  // A data URL's parameter section can carry more than just the MIME type — jsPDF's
  // `datauristring` output, for example, is `data:application/pdf;filename=...;base64,<payload>`
  // — so this looks for the `;base64,` marker itself rather than assuming it immediately
  // follows a single `;`-delimited MIME type.
  const marker = ';base64,';
  const markerIndex = body.dataUrl.startsWith('data:') ? body.dataUrl.indexOf(marker) : -1;
  if (markerIndex === -1) return NextResponse.json({ error: 'dataUrl must be a base64 data URL' }, { status: 400 });
  const base64Payload = body.dataUrl.slice(markerIndex + marker.length);

  const settings = settingsStore.load();
  const productFolderName = (body.productFolderName || 'Sample').replace(/[\\/]/g, '-');
  const dir = getExportProductDir(settings.outputFolder, productFolderName);
  const fileName = `${(body.fileName || 'ad').replace(/[\\/]/g, '-')}.${EXTENSION_BY_FORMAT[format]}`;
  const filePath = path.join(dir, fileName);

  fs.writeFileSync(filePath, Buffer.from(base64Payload, 'base64'));
  return NextResponse.json({ path: filePath });
}
