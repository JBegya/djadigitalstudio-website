'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MARKETING_PACK_OBJECTIVE_OPTIONS, type ContentTypeSpec, type MarketingPackObjective } from '@/types/domain';

const NO_OBJECTIVE = 'none';

export function WizardPlatformStep({
  contentTypes,
  value,
  onChange,
  onGenerateAll,
  generating,
  suggestedPackName,
  suggestedHook,
}: {
  contentTypes: ContentTypeSpec[];
  value: string | null;
  onChange: (key: string) => void;
  /** Runs "Generate All" for every checked platform instead of continuing to the single-ad Style
   * step — the Batch Production entry point. Omit to hide multi-select entirely. */
  onGenerateAll?: (contentTypeKeys: string[], packName: string, hook: string, objective?: MarketingPackObjective) => void;
  generating?: boolean;
  /** A starting point for the campaign name field — the user should rename it to something that
   * identifies this specific creative concept, since the same feature will eventually have
   * several, each evolving through its own hooks/versions. */
  suggestedPackName?: string;
  /** A starting point for the opening hook, derived from the feature's own stored hook/persona
   * story idea. Unlike the campaign name, the hook is expected to change from version to version
   * (A/B testing different openings under the same named campaign). */
  suggestedHook?: string;
}) {
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [packName, setPackName] = useState(suggestedPackName ?? '');
  const [hook, setHook] = useState(suggestedHook ?? '');
  const [objective, setObjective] = useState<string>(NO_OBJECTIVE);

  useEffect(() => {
    setPackName(suggestedPackName ?? '');
  }, [suggestedPackName]);

  useEffect(() => {
    setHook(suggestedHook ?? '');
  }, [suggestedHook]);

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
        <div className="space-y-3">
          <div>
            <Label htmlFor="pack-name" className="text-xs text-muted-foreground">
              Campaign name
            </Label>
            <Input id="pack-name" value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="e.g. Payroll Mistake Story" className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">
              Identifies this creative concept — stays the same across its versions, even as the hook below changes.
            </p>
          </div>

          <div>
            <Label htmlFor="pack-hook" className="text-xs text-muted-foreground">
              Opening hook
            </Label>
            <Input id="pack-hook" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="e.g. You finished at 11pm. You're back at 7am." className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">
              The headline generated onto every platform in this pack — free to change on the next version for A/B testing.
            </p>
          </div>

          <div>
            <Label htmlFor="pack-objective" className="text-xs text-muted-foreground">
              Objective (optional)
            </Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger id="pack-objective" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OBJECTIVE}>Not set</SelectItem>
                {MARKETING_PACK_OBJECTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          onClick={() => onGenerateAll(selected, packName.trim(), hook.trim(), objective === NO_OBJECTIVE ? undefined : (objective as MarketingPackObjective))}
          disabled={selected.length === 0 || !packName.trim() || !hook.trim() || Boolean(generating)}
        >
          {generating ? 'Generating…' : `Generate All (${selected.length})`}
        </Button>
      )}
    </div>
  );
}
