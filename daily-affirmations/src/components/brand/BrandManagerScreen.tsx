'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ProductCard } from '@/components/brand/ProductCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createProduct, listProducts } from '@/lib/api';
import type { ProductProfile } from '@/types/domain';

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `product-${Math.random().toString(36).slice(2, 8)}`
  );
}

export function BrandManagerScreen() {
  const [products, setProducts] = useState<ProductProfile[] | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    listProducts()
      .then((r) => setProducts(r.products))
      .catch(() => toast.error('Could not load products'));
  }, []);

  async function handleCreate(name: string) {
    try {
      const { product } = await createProduct({ id: slugify(name), name });
      router.push(`/brand/${product.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create product');
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 pb-24">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">Brand Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">Each product owns its logos, screenshots, colors, features, and store links.</p>
      </div>

      {!products ? (
        <p className="text-muted-foreground">Loading products…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          <AddProductCard adding={adding} onStart={() => setAdding(true)} onCancel={() => setAdding(false)} onCreate={handleCreate} />
        </div>
      )}
    </main>
  );
}

function AddProductCard({
  adding,
  onStart,
  onCancel,
  onCreate,
}: {
  adding: boolean;
  onStart: () => void;
  onCancel: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');

  if (!adding) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="h-5 w-5" />
        Add Product
      </button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Input
          autoFocus
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={!name.trim()} onClick={() => onCreate(name)}>
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
