'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProductFeature, ProductProfile } from '@/types/domain';

export function FeaturesSection({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  const [addingNew, setAddingNew] = useState(false);

  function updateFeature(index: number, next: ProductFeature) {
    onPatch({ features: product.features.map((f, i) => (i === index ? next : f)) });
  }

  function removeFeature(index: number) {
    onPatch({ features: product.features.filter((_, i) => i !== index) });
  }

  function addFeature(feature: ProductFeature) {
    onPatch({ features: [...product.features, feature] });
    setAddingNew(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
        <CardDescription>Each feature can drive its own ad copy and headline defaults in the Advertisement Wizard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.features.length === 0 && !addingNew && <p className="text-sm text-muted-foreground">No features yet.</p>}
        {product.features.map((feature, i) => (
          <FeatureRow key={feature.key || i} feature={feature} onSave={(next) => updateFeature(i, next)} onDelete={() => removeFeature(i)} />
        ))}
        {addingNew && <NewFeatureForm onSave={addFeature} onCancel={() => setAddingNew(false)} />}
        {!addingNew && (
          <Button type="button" variant="outline" onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4" /> Add Feature
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureRow({ feature, onSave, onDelete }: { feature: ProductFeature; onSave: (next: ProductFeature) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(feature);
  useEffect(() => setDraft(feature), [feature]);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{feature.label || '(untitled feature)'}</p>
          <p className="text-xs text-muted-foreground">{feature.description}</p>
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
      <FeatureFields draft={draft} setDraft={setDraft} />
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
            onSave(draft);
            setEditing(false);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function NewFeatureForm({ onSave, onCancel }: { onSave: (feature: ProductFeature) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ProductFeature>({ key: '', label: '', description: '' });

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-4">
      <FeatureFields draft={draft} setDraft={setDraft} />
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

function FeatureFields({ draft, setDraft }: { draft: ProductFeature; setDraft: (f: ProductFeature) => void }) {
  return (
    <>
      <Input placeholder="Label (e.g. Callback Pay)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
      <Input placeholder="Key (e.g. callback-pay)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
      <Textarea placeholder="Description" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      <Input
        placeholder="Default headline (optional)"
        value={draft.defaultHeadline ?? ''}
        onChange={(e) => setDraft({ ...draft, defaultHeadline: e.target.value })}
      />
      <Input placeholder="Default CTA (optional)" value={draft.defaultCta ?? ''} onChange={(e) => setDraft({ ...draft, defaultCta: e.target.value })} />
    </>
  );
}
