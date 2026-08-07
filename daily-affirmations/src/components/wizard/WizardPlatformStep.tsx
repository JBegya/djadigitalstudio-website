'use client';

import { cn } from '@/lib/utils';
import type { ContentTypeSpec } from '@/types/domain';

export function WizardPlatformStep({
  contentTypes,
  value,
  onChange,
}: {
  contentTypes: ContentTypeSpec[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {contentTypes.map((contentType) => (
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
      ))}
    </div>
  );
}
