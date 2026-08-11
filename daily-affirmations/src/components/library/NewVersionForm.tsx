'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HookSuggestions } from '@/components/copy/HookSuggestions';
import { generateMarketingPackVersion } from '@/lib/editor/generateMarketingPack';
import { inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { MARKETING_PACK_OBJECTIVE_OPTIONS } from '@/types/domain';
import type { AdCreation, CustomerPersona, MarketingPack, MarketingPackObjective, ProductFeature, ProductProfile } from '@/types/domain';

const NO_OBJECTIVE = 'none';

export function NewVersionForm({
  product,
  feature,
  persona,
  pack,
  assets,
  onCancel,
  onCreated,
}: {
  product: ProductProfile;
  feature: ProductFeature;
  persona: CustomerPersona | null;
  /** The latest existing version of this named campaign. */
  pack: MarketingPack;
  /** That pack's own current assets. */
  assets: AdCreation[];
  onCancel: () => void;
  onCreated: (pack: MarketingPack, creations: AdCreation[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(() => [...new Set(assets.map((a) => a.contentTypeKey))]);
  const [hook, setHook] = useState(assets[0]?.headline ?? '');
  const [objective, setObjective] = useState<string>(pack.objective ?? NO_OBJECTIVE);
  const [generating, setGenerating] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function submit() {
    setGenerating(true);
    try {
      const result = await generateMarketingPackVersion({
        product,
        feature,
        persona,
        contentTypeKeys: selected,
        packName: pack.name,
        hook: hook.trim(),
        objective: objective === NO_OBJECTIVE ? undefined : (objective as MarketingPackObjective),
        fontFamily: inter.style.fontFamily,
      });
      if (result.skippedPlatformCount > 0) {
        toast.error('Some selected platforms have no template configured yet — skipping those.');
      }
      toast.success(`Generated "${result.pack.name}" (V${result.pack.version}) with ${result.creations.length} asset${result.creations.length === 1 ? '' : 's'}.`);
      onCreated(result.pack, result.creations);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-dashed border-border p-4">
      <p className="text-xs text-muted-foreground">
        New version of <span className="font-medium text-foreground">{pack.name}</span> — will be created as V{pack.version + 1}.
      </p>

      <div>
        <Label className="text-xs text-muted-foreground">Latest hook (V{pack.version})</Label>
        <p className="mt-1 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">{assets[0]?.headline || '—'}</p>
      </div>

      <div>
        <Label htmlFor={`nv-hook-${pack.id}`} className="text-xs text-muted-foreground">
          New hook
        </Label>
        <Input id={`nv-hook-${pack.id}`} value={hook} onChange={(e) => setHook(e.target.value)} className="mt-1" autoFocus />
        <HookSuggestions
          product={product}
          feature={feature}
          persona={persona}
          currentHook={hook}
          objective={objective === NO_OBJECTIVE ? undefined : (objective as MarketingPackObjective)}
          onSelect={setHook}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Objective (optional)</Label>
        <Select value={objective} onValueChange={setObjective}>
          <SelectTrigger className="mt-1">
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

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Platforms</Label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => (
            <label
              key={ct.key}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
                selected.includes(ct.key) ? 'border-primary/60 bg-secondary' : 'border-border',
              )}
            >
              <input type="checkbox" checked={selected.includes(ct.key)} onChange={() => toggle(ct.key)} className="h-3.5 w-3.5 accent-primary" />
              {ct.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={selected.length === 0 || !hook.trim() || generating}>
          {generating ? 'Generating…' : `Generate V${pack.version + 1}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={generating}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
