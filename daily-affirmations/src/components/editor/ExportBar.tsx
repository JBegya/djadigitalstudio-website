'use client';

import { Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContentTypeSpec } from '@/types/domain';

export type ExportFormat = 'png' | 'jpg' | 'pdf';

export function ExportBar({
  contentTypes,
  contentTypeKey,
  onContentTypeChange,
  onSave,
  onExport,
  saving,
  exporting,
}: {
  contentTypes: ContentTypeSpec[];
  contentTypeKey: string;
  onContentTypeChange: (key: string) => void;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
  saving: boolean;
  exporting: ExportFormat | null;
}) {
  const active = contentTypes.find((c) => c.key === contentTypeKey);

  return (
    <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <Select value={contentTypeKey} onValueChange={onContentTypeChange}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {active && (
          <span className="text-xs text-muted-foreground">
            {active.widthPx}×{active.heightPx}px
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onSave} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {(active?.exportFormats ?? ['png', 'jpg']).map((format) => (
          <Button key={format} type="button" onClick={() => onExport(format)} disabled={exporting !== null}>
            <Download className="mr-1.5 h-4 w-4" />
            {exporting === format ? 'Exporting…' : format.toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}
