'use client';

import { useEffect, useState } from 'react';
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
