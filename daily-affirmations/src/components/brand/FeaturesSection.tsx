'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TagListInput } from '@/components/brand/AutosaveField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_FEATURE_MARKETING } from '@/types/domain';
import type { DeviceKind, FeaturePriority, ProductFeature, ProductProfile } from '@/types/domain';

const PRIORITY_OPTIONS: Array<{ value: FeaturePriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const DEVICE_OPTIONS: Array<{ value: DeviceKind; label: string }> = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'watch', label: 'Apple Watch' },
  { value: 'ipad', label: 'iPad' },
  { value: 'mac', label: 'Mac' },
];

const NO_SUGGESTED_SCREENSHOT = 'none';
const NO_SUGGESTED_DEVICE = 'none';
const NO_SUGGESTED_EMOTION = 'none';

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
          Rendering fields (headline, subheadline, CTA, priority) plus structured marketing knowledge (problem, promise, proof, hook, linked personas) — enough
          for the Advertisement Wizard and a future Copy Assistant to work from real substance instead of inventing claims.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.features.length === 0 && !addingNew && <p className="text-sm text-muted-foreground">No features yet.</p>}
        {product.features.map((feature, i) => (
          <FeatureRow key={feature.key || i} feature={feature} product={product} onSave={(next) => updateFeature(i, next)} onDelete={() => removeFeature(i)} />
        ))}
        {addingNew && <NewFeatureForm product={product} onSave={addFeature} onCancel={() => setAddingNew(false)} />}
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
  product,
  onSave,
  onDelete,
}: {
  feature: ProductFeature;
  product: ProductProfile;
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
          {feature.marketing.suggestedHook && <p className="text-xs text-muted-foreground">Hook: “{feature.marketing.suggestedHook}”</p>}
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
      <FeatureFields draft={draft} setDraft={setDraft} product={product} />
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

function NewFeatureForm({ product, onSave, onCancel }: { product: ProductProfile; onSave: (feature: ProductFeature) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ProductFeature>({ key: '', label: '', description: '', marketing: DEFAULT_FEATURE_MARKETING });

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-4">
      <FeatureFields draft={draft} setDraft={setDraft} product={product} />
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

function FeatureFields({ draft, setDraft, product }: { draft: ProductFeature; setDraft: (f: ProductFeature) => void; product: ProductProfile }) {
  const marketing = draft.marketing;
  function patchMarketing(fields: Partial<ProductFeature['marketing']>) {
    setDraft({ ...draft, marketing: { ...marketing, ...fields } });
  }

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
              {product.screenshots.map((shot) => (
                <SelectItem key={shot.id} value={shot.id}>
                  {shot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketing Knowledge</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Core Problem" value={marketing.coreProblem} onChange={(e) => patchMarketing({ coreProblem: e.target.value })} />
        <Input placeholder="Core Promise" value={marketing.corePromise} onChange={(e) => patchMarketing({ corePromise: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TagListInput label="Pain Points" value={marketing.painPoints} onChange={(v) => patchMarketing({ painPoints: v })} />
        <TagListInput label="Benefits" value={marketing.benefits} onChange={(v) => patchMarketing({ benefits: v })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Transformation — From"
          value={marketing.transformation.from}
          onChange={(e) => patchMarketing({ transformation: { ...marketing.transformation, from: e.target.value } })}
        />
        <Input
          placeholder="Transformation — To"
          value={marketing.transformation.to}
          onChange={(e) => patchMarketing({ transformation: { ...marketing.transformation, to: e.target.value } })}
        />
      </div>
      <Textarea
        placeholder="Supporting Proof (optional — a real stat or quote, never fabricated)"
        rows={2}
        value={marketing.supportingProof}
        onChange={(e) => patchMarketing({ supportingProof: e.target.value })}
      />
      <Input
        placeholder="Suggested Hook — the relatable moment an ad should open with"
        value={marketing.suggestedHook}
        onChange={(e) => patchMarketing({ suggestedHook: e.target.value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Suggested Device</Label>
          <Select
            value={marketing.suggestedDevice ?? NO_SUGGESTED_DEVICE}
            onValueChange={(v) => patchMarketing({ suggestedDevice: v === NO_SUGGESTED_DEVICE ? undefined : (v as DeviceKind) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SUGGESTED_DEVICE}>None</SelectItem>
              {DEVICE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Suggested Emotion</Label>
          <Select
            value={marketing.suggestedEmotion || NO_SUGGESTED_EMOTION}
            onValueChange={(v) => patchMarketing({ suggestedEmotion: v === NO_SUGGESTED_EMOTION ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SUGGESTED_EMOTION}>None</SelectItem>
              {product.marketingIdentity.emotionalTriggers.map((emotion) => (
                <SelectItem key={emotion} value={emotion}>
                  {emotion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TagListInput label="Suggested Story Types" value={marketing.suggestedStoryTypes} onChange={(v) => patchMarketing({ suggestedStoryTypes: v })} />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Linked Personas</Label>
        {product.personas.length === 0 ? (
          <p className="text-xs text-muted-foreground">No personas yet — add one below to link this feature to a specific persona.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {product.personas.map((persona) => {
              const linked = marketing.linkedPersonaIds.includes(persona.id);
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() =>
                    patchMarketing({
                      linkedPersonaIds: linked ? marketing.linkedPersonaIds.filter((id) => id !== persona.id) : [...marketing.linkedPersonaIds, persona.id],
                    })
                  }
                >
                  <Badge variant={linked ? 'default' : 'outline'}>{persona.name}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
