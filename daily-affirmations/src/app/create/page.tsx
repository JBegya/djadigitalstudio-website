import fs from 'node:fs';
import path from 'node:path';
import { CreateAdvertisementScreen } from '@/components/editor/CreateAdvertisementScreen';
import { getAppRoot } from '@/server/config/paths';

function readAsDataUrl(relativePath: string, mimeType: string): string {
  const absolute = path.join(getAppRoot(), relativePath);
  const buffer = fs.readFileSync(absolute);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export default function Page({ searchParams }: { searchParams: { id?: string } }) {
  const sampleScreenshotDataUrl = readAsDataUrl('assets/sample/sample-screenshot.svg', 'image/svg+xml');
  const logoDataUrl = readAsDataUrl('assets/logo/dja-logo.png', 'image/png');

  return <CreateAdvertisementScreen sampleScreenshotDataUrl={sampleScreenshotDataUrl} logoDataUrl={logoDataUrl} initialCreationId={searchParams.id} />;
}
