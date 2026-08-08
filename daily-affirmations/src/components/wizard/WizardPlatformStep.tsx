'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findNearDuplicatePackName } from '@/lib/library/campaignNameMatch';
import { cn } from '@/lib/utils';
import { MARKETING_PACK_OBJECTIVE_OPTIONS, type ContentTypeSpec, type MarketingPack, type MarketingPackObjective } from '@/types/domain';

const NO_OBJECTIVE = 'none';

export function WizardPlatformStep({
  contentTypes,
  value,
  onChange,
  onGenerateAll,
  generating,
  suggestedPackName,
  suggestedHook,
  productId,
  featureKey,
  existingPacks,
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
  /** The currently selected product/feature, used to scope the near-duplicate-name check below to
   * the same (productId, featureKey) that MarketingPacksStore.nextVersion itself keys on. */
  productId?: string;
  featureKey?: string;
  /** All known Marketing Packs, for the near-duplicate-name check. Omit (or an empty array) if not
   * loaded yet — the warning simply won't fire until it is, never a false positive. */
  existingPacks?: MarketingPack[];
}) {
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [packName, setPackName] = useState(suggestedPackName ?? '');
  const [hook, setHook] = useState(suggestedHook ?? '');
  const [objective, setObjective] = useState<string>(NO_OBJECTIVE);
  const [dismissedNearDuplicateFor, setDismissedNearDuplicateFor] = useState<string | null>(null);

  useEffect(() => {
    setPackName(suggestedPackName ?? '');
    setDismissedNearDuplicateFor(null);
  }, [suggestedPackName]);

  useEffect(() => {
    setHook(suggestedHook ?? '');
  }, [suggestedHook]);

  const nearDuplicate = useMemo(
    () => (productId && featureKey ? findNearDuplicatePackName(packName, productId, featureKey, existingPacks ?? []) : null),
    [packName, productId, featureKey, existingPacks],
  );
  const showNearDuplicateWarning = nearDuplicate !== null && packName !== dismissedNearDuplicateFor;

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
            {showNearDuplicateWarning && nearDuplicate && (
              <div className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                <p>
                  This looks like &quot;{nearDuplicate.existingPack.name}&quot; (currently at V{nearDuplicate.existingPack.version}) — typing it exactly will
                  add a new version to that campaign instead of starting a separate one.
                </p>
                <div className="mt-1.5 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setPackName(nearDuplicate.existingPack.name);
                      setDismissedNearDuplicateFor(null);
                    }}
                  >
                    Use &quot;{nearDuplicate.existingPack.name}&quot;
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setDismissedNearDuplicateFor(packName)}>
                    Keep as a new campaign
                  </Button>
                </div>
              </div>
            )}
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
