'use client';

import { cn } from '@/lib/utils';
import type { ProductProfile } from '@/types/domain';

/** A valid, explicit choice (distinct from `value === null`, which means "nothing chosen yet" and
 * keeps Continue disabled) — not every ad needs to target a specific persona, and not every
 * product has personas configured yet. */
export const NO_PERSONA = 'none';

export function WizardPersonaStep({ product, value, onChange }: { product: ProductProfile; value: string | null; onChange: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onChange(NO_PERSONA)}
        className={cn(
          'w-full rounded-xl border px-4 py-3 text-left transition-colors',
          value === NO_PERSONA ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
        )}
      >
        <p className="text-sm font-medium text-foreground">No specific persona</p>
        <p className="mt-0.5 text-xs text-muted-foreground">General audience — show every feature.</p>
      </button>

      {product.personas.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {product.name} has no personas yet — add some in Brand Manager to target ads at a specific segment.
        </p>
      ) : (
        product.personas.map((persona) => (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-left transition-colors',
              value === persona.id ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
            )}
          >
            <p className="text-sm font-medium text-foreground">{persona.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{persona.occupation}</p>
            {persona.biggestProblems[0] && <p className="mt-1 text-xs text-muted-foreground/80">Problem: {persona.biggestProblems[0]}</p>}
          </button>
        ))
      )}
    </div>
  );
}
