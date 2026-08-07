'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ContentTypeSpec } from '@/types/domain';

export function WizardPlatformStep({
  contentTypes,
  value,
  onChange,
  onGenerateAll,
  generating,
  suggestedPackName,
}: {
  contentTypes: ContentTypeSpec[];
  value: string | null;
  onChange: (key: string) => void;
  /** Runs "Generate All" for every checked platform instead of continuing to the single-ad Style
   * step — the Batch Production entry point. Omit to hide multi-select entirely. */
  onGenerateAll?: (contentTypeKeys: string[], packName: string) => void;
  generating?: boolean;
  /** A starting point for the pack name field, derived from the feature's own stored hook/story
   * — the user can (and should) rename it to something that identifies this specific creative
   * concept, since the same feature will eventually have several. */
  suggestedPackName?: string;
}) {
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [packName, setPackName] = useState(suggestedPackName ?? '');

  useEffect(() => {
    setPackName(suggestedPackName ?? '');
  }, [suggestedPackName]);

  function toggleSelected(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <div className="space-y-3">
      {onGenerateAll && (
        <button
          type="button"
          onClick={() => setMultiMode((m) => !m)}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {multiMode ? 'Choose a single platform instead' : 'Generate for multiple platforms at once'}
        </button>
      )}

      {multiMode && onGenerateAll && (
        <div>
          <Label htmlFor="pack-name" className="text-xs text-muted-foreground">
            Marketing Pack name
          </Label>
          <Input
            id="pack-name"
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            placeholder="e.g. Payroll Mistake Story"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Name this creative concept so it&apos;s easy to tell apart from other packs for the same feature later.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {contentTypes.map((contentType) =>
          multiMode ? (
            <label
              key={contentType.key}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                selected.includes(contentType.key) ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(contentType.key)}
                  onChange={() => toggleSelected(contentType.key)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <p className="text-sm font-medium text-foreground">{contentType.label}</p>
              </span>
              <p className="text-xs text-muted-foreground">
                {contentType.widthPx}×{contentType.heightPx}px
              </p>
            </label>
          ) : (
            <button
              key={contentType.key}
              type="button"
              onClick={() => onChange(contentType.key)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                value === contentType.key ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
              )}
            >
              <p className="text-sm font-medium text-foreground">{contentType.label}</p>
              <p className="text-xs text-muted-foreground">
                {contentType.widthPx}×{contentType.heightPx}px
              </p>
            </button>
          ),
        )}
      </div>

      {multiMode && onGenerateAll && (
        <Button
          type="button"
          onClick={() => onGenerateAll(selected, packName.trim())}
          disabled={selected.length === 0 || !packName.trim() || Boolean(generating)}
        >
          {generating ? 'Generating…' : `Generate All (${selected.length})`}
        </Button>
      )}
    </div>
  );
}
