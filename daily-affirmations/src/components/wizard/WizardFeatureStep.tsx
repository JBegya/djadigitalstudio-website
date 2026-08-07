'use client';

import Link from 'next/link';
import { resolveFeatureScreenshot } from '@/lib/editor/productToSlotContent';
import { cn } from '@/lib/utils';
import type { ProductProfile } from '@/types/domain';

export function WizardFeatureStep({
  product,
  personaId,
  value,
  onChange,
}: {
  product: ProductProfile;
  /** A CustomerPersona.id, or undefined/NO_PERSONA when no specific persona was chosen. */
  personaId?: string;
  value: string | null;
  onChange: (key: string) => void;
}) {
  if (product.features.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {product.name} has no features yet —{' '}
        <Link href={`/brand/${product.id}`} className="text-primary underline-offset-4 hover:underline">
          add at least one in Brand Manager
        </Link>
        .
      </p>
    );
  }

  const linkedFeatures = personaId ? product.features.filter((f) => f.marketing.linkedPersonaIds.includes(personaId)) : [];
  const showingFilteredList = linkedFeatures.length > 0;
  const features = showingFilteredList ? linkedFeatures : product.features;

  return (
    <div className="space-y-2">
      {personaId && !showingFilteredList && (
        <p className="px-1 text-xs text-muted-foreground">No features are linked to this persona yet — showing all features.</p>
      )}
      {features.map((feature) => {
        const screenshot = resolveFeatureScreenshot(product, feature);
        return (
          <button
            key={feature.key}
            type="button"
            onClick={() => onChange(feature.key)}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-left transition-colors',
              value === feature.key ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
            )}
          >
            <p className="text-sm font-medium text-foreground">{feature.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">{screenshot ? `Uses: ${screenshot.label}` : 'No screenshot yet'}</p>
          </button>
        );
      })}
    </div>
  );
}
