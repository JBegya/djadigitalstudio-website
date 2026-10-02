'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BrandGuidelinesSection } from '@/components/brand/BrandGuidelinesSection';
import { FeaturesSection } from '@/components/brand/FeaturesSection';
import { IdentitySection } from '@/components/brand/IdentitySection';
import { MarketingIdentitySection } from '@/components/brand/MarketingIdentitySection';
import { PersonasSection } from '@/components/brand/PersonasSection';
import { ProductStatusBar } from '@/components/brand/ProductStatusBar';
import { ScreenshotsSection } from '@/components/brand/ScreenshotsSection';
import { StoreLinksSection } from '@/components/brand/StoreLinksSection';
import { Badge } from '@/components/ui/badge';
import { getProduct, updateProduct } from '@/lib/api';
import type { ProductProfile } from '@/types/domain';

export function ProductDetailScreen({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProduct(productId)
      .then((r) => setProduct(r.product))
      .catch(() => setNotFound(true));
  }, [productId]);

  async function patch(fields: Partial<ProductProfile>) {
    if (!product) return;
    setSaving(true);
    try {
      const { product: next } = await updateProduct(product.id, fields);
      setProduct(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save product');
    } finally {
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Link href="/brand" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Back to Brand Manager
        </Link>
      </main>
    );
  }

  if (!product) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">Loading product…</div>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/brand" className="text-xs text-muted-foreground hover:text-foreground">
            ← Brand Manager
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Changes save automatically.</p>
        </div>
        {saving && <Badge variant="secondary">Saving…</Badge>}
      </div>

      <div className="space-y-6">
        <ProductStatusBar product={product} onPatch={patch} />
        <IdentitySection product={product} onPatch={patch} onProductChange={setProduct} />
        <MarketingIdentitySection product={product} onPatch={patch} />
        <BrandGuidelinesSection product={product} onPatch={patch} />
        <StoreLinksSection product={product} onPatch={patch} />
        <PersonasSection product={product} onPatch={patch} />
        <FeaturesSection product={product} onPatch={patch} />
        <ScreenshotsSection product={product} onProductChange={setProduct} />
      </div>
    </main>
  );
}
