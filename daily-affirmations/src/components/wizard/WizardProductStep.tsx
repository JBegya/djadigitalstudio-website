'use client';

import Link from 'next/link';
import { mediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ProductProfile } from '@/types/domain';

export function WizardProductStep({ products, value, onChange }: { products: ProductProfile[]; value: string | null; onChange: (id: string) => void }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products yet —{' '}
        <Link href="/brand" className="text-primary underline-offset-4 hover:underline">
          add one in Brand Manager
        </Link>{' '}
        first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onChange(product.id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
            value === product.id ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/60">
            {product.logoPath ? (
              <img src={mediaUrl(product.logoPath)} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">{product.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{product.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{product.tagline}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
