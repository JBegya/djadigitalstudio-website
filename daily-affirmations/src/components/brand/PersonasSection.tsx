'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TagListInput } from '@/components/brand/AutosaveField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CustomerPersona, ProductProfile } from '@/types/domain';

const EMPTY_PERSONA: CustomerPersona = {
  id: '',
  name: '',
  occupation: '',
  environment: '',
  biggestProblems: [],
  biggestFears: [],
  biggestFrustrations: [],
  desiredOutcomes: [],
  emotionalTriggers: [],
  storyIdeas: [],
  preferredCommunicationStyle: '',
};

export function PersonasSection({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  const [addingNew, setAddingNew] = useState(false);

  function updatePersona(index: number, next: CustomerPersona): boolean {
    if (product.personas.some((p, i) => i !== index && p.id === next.id)) {
      toast.error(`A persona with id "${next.id}" already exists.`);
      return false;
    }
    onPatch({ personas: product.personas.map((p, i) => (i === index ? next : p)) });
    return true;
  }

  function removePersona(index: number) {
    onPatch({ personas: product.personas.filter((_, i) => i !== index) });
  }

  function addPersona(persona: CustomerPersona) {
    if (product.personas.some((p) => p.id === persona.id)) {
      toast.error(`A persona with id "${persona.id}" already exists.`);
      return;
    }
    onPatch({ personas: [...product.personas, persona] });
    setAddingNew(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Personas</CardTitle>
        <CardDescription>
          Not everyone downloads this app for the same reason — each persona is a real segment with its own problems, fears, and story, so features and ads
          can speak to one of them specifically instead of a generic &ldquo;user.&rdquo;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.personas.length === 0 && !addingNew && <p className="text-sm text-muted-foreground">No personas yet.</p>}
        {product.personas.map((persona, i) => (
          <PersonaRow key={persona.id || i} persona={persona} onSave={(next) => updatePersona(i, next)} onDelete={() => removePersona(i)} />
        ))}
        {addingNew && <NewPersonaForm onSave={addPersona} onCancel={() => setAddingNew(false)} />}
        {!addingNew && (
          <Button type="button" variant="outline" onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4" /> Add Persona
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PersonaRow({
  persona,
  onSave,
  onDelete,
}: {
  persona: CustomerPersona;
  onSave: (next: CustomerPersona) => boolean;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(persona);
  useEffect(() => setDraft(persona), [persona]);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{persona.name || '(untitled persona)'}</p>
          <p className="text-xs text-muted-foreground">{persona.occupation}</p>
          {persona.biggestProblems.length > 0 && <p className="text-xs text-muted-foreground">Problem: {persona.biggestProblems[0]}</p>}
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
      <PersonaFields draft={draft} setDraft={setDraft} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(persona);
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

function NewPersonaForm({ onSave, onCancel }: { onSave: (persona: CustomerPersona) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<CustomerPersona>(EMPTY_PERSONA);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-4">
      <PersonaFields draft={draft} setDraft={setDraft} />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={!draft.id.trim() || !draft.name.trim()} onClick={() => onSave(draft)}>
          Add
        </Button>
      </div>
    </div>
  );
}

function PersonaFields({ draft, setDraft }: { draft: CustomerPersona; setDraft: (p: CustomerPersona) => void }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Name (e.g. Registered Nurse)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <Input placeholder="Id (e.g. registered-nurse)" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Occupation" value={draft.occupation} onChange={(e) => setDraft({ ...draft, occupation: e.target.value })} />
        <Input placeholder="Environment (e.g. Hospital ward, night shifts)" value={draft.environment} onChange={(e) => setDraft({ ...draft, environment: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TagListInput label="Biggest Problems" value={draft.biggestProblems} onChange={(v) => setDraft({ ...draft, biggestProblems: v })} />
        <TagListInput label="Biggest Fears" value={draft.biggestFears} onChange={(v) => setDraft({ ...draft, biggestFears: v })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TagListInput label="Biggest Frustrations" value={draft.biggestFrustrations} onChange={(v) => setDraft({ ...draft, biggestFrustrations: v })} />
        <TagListInput label="Desired Outcomes" value={draft.desiredOutcomes} onChange={(v) => setDraft({ ...draft, desiredOutcomes: v })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TagListInput label="Emotional Triggers" value={draft.emotionalTriggers} onChange={(v) => setDraft({ ...draft, emotionalTriggers: v })} />
        <TagListInput label="Story Ideas" value={draft.storyIdeas} onChange={(v) => setDraft({ ...draft, storyIdeas: v })} />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Preferred Communication Style</p>
        <Input value={draft.preferredCommunicationStyle} onChange={(e) => setDraft({ ...draft, preferredCommunicationStyle: e.target.value })} />
      </div>
    </>
  );
}
