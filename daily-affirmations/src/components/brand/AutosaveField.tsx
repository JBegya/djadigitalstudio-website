'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** Local-state-then-blur pattern matching SettingsScreen — edits stay local while typing and only
 * round-trip to the server (and back into the `value` prop) once the field loses focus. */
export function AutosaveInput({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={local} placeholder={placeholder} onChange={(e) => setLocal(e.target.value)} onBlur={() => local !== value && onSave(local)} />
    </div>
  );
}

export function AutosaveTextarea({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={3} value={local} placeholder={placeholder} onChange={(e) => setLocal(e.target.value)} onBlur={() => local !== value && onSave(local)} />
    </div>
  );
}

/** A controlled list-of-strings editor — add via Enter/button, remove via an "×" on each chip.
 * Unlike AutosaveInput/AutosaveTextarea, every add/remove is already a discrete, complete change
 * (there's no "still typing" state to debounce), so it calls `onChange` immediately every time —
 * the caller decides whether that means "patch the server now" or "update local draft state." */
export function TagListInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`} className="rounded-full hover:bg-background/40">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
