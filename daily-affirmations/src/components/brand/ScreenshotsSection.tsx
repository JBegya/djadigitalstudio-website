'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AssetDropzone } from '@/components/brand/AssetDropzone';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateThumbnail } from '@/lib/assets/thumbnail';
import { deleteProductScreenshot, mediaUrl, uploadProductScreenshot } from '@/lib/api';
import type { DeviceKind, ProductProfile } from '@/types/domain';

const DEVICE_OPTIONS: Array<{ value: DeviceKind; label: string }> = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'watch', label: 'Apple Watch' },
  { value: 'ipad', label: 'iPad' },
  { value: 'mac', label: 'Mac' },
];

const THUMBNAIL_MAX_EDGE_PX = 320;

export function ScreenshotsSection({ product, onProductChange }: { product: ProductProfile; onProductChange: (next: ProductProfile) => void }) {
  const [device, setDevice] = useState<DeviceKind>('iphone');
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        const thumbnail = await generateThumbnail(file, THUMBNAIL_MAX_EDGE_PX);
        const { product: next } = await uploadProductScreenshot(product.id, file, {
          thumbnail: thumbnail ?? undefined,
          label: file.name,
          device,
        });
        onProductChange(next);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload screenshot');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(screenshotId: string) {
    try {
      onProductChange((await deleteProductScreenshot(product.id, screenshotId)).product);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete screenshot');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshots</CardTitle>
        <CardDescription>Real screenshots only — these get composited into device mockups in the editor, never recreated.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="shrink-0 text-xs text-muted-foreground">Device for next upload</Label>
          <Select value={device} onValueChange={(v) => setDevice(v as DeviceKind)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AssetDropzone
          label={uploading ? 'Uploading…' : 'Drag screenshots here, or click to browse'}
          accept="image/*"
          multiple
          disabled={uploading}
          onFiles={handleFiles}
        />

        {product.screenshots.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {product.screenshots.map((shot) => (
              <div key={shot.id} className="group relative overflow-hidden rounded-lg border border-border">
                <img src={mediaUrl(shot.thumbnailPath ?? shot.path)} alt={shot.label} className="h-32 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/80 px-2 py-1">
                  <Badge variant="outline">{shot.device}</Badge>
                  <button type="button" onClick={() => handleDelete(shot.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete screenshot">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
