'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { mediaUrl } from '@/lib/api';
import type { ProductProfile, ProductStatus } from '@/types/domain';

const STATUS_BADGE_VARIANT: Record<ProductStatus, 'secondary' | 'warning' | 'success' | 'outline'> = {
  draft: 'secondary',
  beta: 'warning',
  released: 'success',
  archived: 'outline',
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  beta: 'Beta',
  released: 'Released',
  archived: 'Archived',
};

export function ProductCard({ product }: { product: ProductProfile }) {
  return (
    <Link href={`/brand/${product.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-secondary/60">
              {product.logoPath ? (
                <img src={mediaUrl(product.logoPath)} alt={product.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">{product.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <Badge variant={STATUS_BADGE_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge>
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">{product.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{product.tagline}</p>
          </div>
          <div className="mt-auto flex gap-2">
            <Badge variant="outline">{product.screenshots.length} screenshots</Badge>
            <Badge variant="outline">{product.features.length} features</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
