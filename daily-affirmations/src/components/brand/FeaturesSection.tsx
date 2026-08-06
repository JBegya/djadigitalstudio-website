'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FeaturePriority, ProductFeature, ProductProfile, ProductScreenshot } from '@/types/domain';

const PRIORITY_OPTIONS: Array<{ value: FeaturePriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const NO_SUGGESTED_SCREENSHOT = 'none';

export function FeaturesSection({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  const [addingNew, setAddingNew] = useState(false);

  function updateFeature(index: number, next: ProductFeature): boolean {
    if (product.features.some((f, i) => i !== index && f.key === next.key)) {
      toast.error(`A feature with key "${next.key}" already exists.`);
      return false;
    }
    onPatch({ features: product.features.map((f, i) => (i === index ? next : f)) });
    return true;
  }

  function removeFeature(index: number) {
    onPatch({ features: product.features.filter((_, i) => i !== index) });
  }

  function addFeature(feature: ProductFeature) {
    if (product.features.some((f) => f.key === feature.key)) {
      toast.error(`A feature with key "${feature.key}" already exists.`);
      return;
    }
    onPatch({ features: [...product.features, feature] });
    setAddingNew(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Features</CardTitle>
        <CardDescription>
          Headline, subheadline, CTA, icon, and priority per feature — enough for the Advertisement Wizard to auto-populate a template without AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.features.length === 0 && !addingNew && <p className="text-sm text-muted-foreground">No features yet.</p>}
        {product.features.map((feature, i) => (
          <FeatureRow
            key={feature.key || i}
            feature={feature}
            screenshots={product.screenshots}
            onSave={(next) => updateFeature(i, next)}
            onDelete={() => removeFeature(i)}
          />
        ))}
        {addingNew && <NewFeatureForm screenshots={product.screenshots} onSave={addFeature} onCancel={() => setAddingNew(false)} />}
        {!addingNew && (
          <Button type="button" variant="outline" onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4" /> Add Feature
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureRow({
  feature,
  screenshots,
  onSave,
  onDelete,
}: {
  feature: ProductFeature;
  screenshots: ProductScreenshot[];
  onSave: (next: ProductFeature) => boolean;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(feature);
  useEffect(() => setDraft(feature), [feature]);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{feature.label || '(untitled feature)'}</p>
            {feature.priority && <Badge variant="outline">{feature.priority}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{feature.description}</p>
          {feature.headline && <p className="text-xs text-muted-foreground">Headline: “{feature.headline}”</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border px-4 py-4">
      <FeatureFields draft={draft} setDraft={setDraft} screenshots={screenshots} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(feature);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (onSave(draft)) setEditing(false);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function NewFeatureForm({
  screenshots,
  onSave,
  onCancel,
}: {
  screenshots: ProductScreenshot[];
  onSave: (feature: ProductFeature) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProductFeature>({ key: '', label: '', description: '' });

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-4">
      <FeatureFields draft={draft} setDraft={setDraft} screenshots={screenshots} />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={!draft.key.trim() || !draft.label.trim()} onClick={() => onSave(draft)}>
          Add
        </Button>
      </div>
    </div>
  );
}

function FeatureFields({
  draft,
  setDraft,
  screenshots,
}: {
  draft: ProductFeature;
  setDraft: (f: ProductFeature) => void;
  screenshots: ProductScreenshot[];
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Label (e.g. Callback Pay)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <Input placeholder="Key (e.g. callback-pay)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
      </div>
      <Textarea placeholder="Description" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Headline (optional)" value={draft.headline ?? ''} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />
        <Input placeholder="Subheadline (optional)" value={draft.subheadline ?? ''} onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="CTA (optional)" value={draft.cta ?? ''} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
        <Input placeholder="Icon (optional, e.g. clock)" value={draft.icon ?? ''} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        <Input placeholder="Accent color (optional, #hex)" value={draft.accentColor ?? ''} onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select value={draft.priority ?? 'medium'} onValueChange={(v) => setDraft({ ...draft, priority: v as FeaturePriority })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Suggested Screenshot</Label>
          <Select
            value={draft.suggestedScreenshotId ?? NO_SUGGESTED_SCREENSHOT}
            onValueChange={(v) => setDraft({ ...draft, suggestedScreenshotId: v === NO_SUGGESTED_SCREENSHOT ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SUGGESTED_SCREENSHOT}>None</SelectItem>
              {screenshots.map((shot) => (
                <SelectItem key={shot.id} value={shot.id}>
                  {shot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
