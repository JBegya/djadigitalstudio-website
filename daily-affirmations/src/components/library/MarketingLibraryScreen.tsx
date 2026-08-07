'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteCreation, listCreations, listMarketingPacks, listProducts, updateCreation } from '@/lib/api';
import { buildMarketingLibrary, type AssetEntry } from '@/lib/library/buildMarketingLibrary';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import type { AdCreation, AssetStatus, MarketingPack, ProductProfile } from '@/types/domain';

const STATUS_OPTIONS: AssetStatus[] = ['draft', 'ready', 'published', 'archived'];

function platformLabel(contentTypeKey: string): string {
  return CONTENT_TYPES.find((c) => c.key === contentTypeKey)?.label ?? contentTypeKey;
}

function AssetCard({ entry, onStatusChange, onDelete }: { entry: AssetEntry; onStatusChange: (status: AssetStatus) => void; onDelete: () => void }) {
  const { creation } = entry;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60">
      {creation.thumbnailPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creation.thumbnailPath} alt={creation.headline || 'Advertisement preview'} className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-secondary/40 text-xs text-muted-foreground">No preview</div>
      )}
      <div className="p-2">
        <p className="text-xs font-medium text-foreground">{platformLabel(creation.contentTypeKey)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{creation.headline || 'Untitled'}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <Select value={creation.status ?? 'draft'} onValueChange={(v) => onStatusChange(v as AssetStatus)}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s[0]?.toUpperCase()}
                  {s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Link href={`/create?id=${creation.id}`}>
          <Button type="button" size="sm" variant="outline" className="mt-1.5 w-full">
            Open
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function MarketingLibraryScreen() {
  const [packs, setPacks] = useState<MarketingPack[] | null>(null);
  const [creations, setCreations] = useState<AdCreation[]>([]);
  const [products, setProducts] = useState<ProductProfile[]>([]);

  useEffect(() => {
    Promise.all([listMarketingPacks(), listCreations(), listProducts()])
      .then(([packsRes, creationsRes, productsRes]) => {
        setPacks(packsRes.packs);
        setCreations(creationsRes.creations);
        setProducts(productsRes.products);
      })
      .catch(() => {
        toast.error('Could not load the Marketing Library.');
        setPacks([]);
      });
  }, []);

  const groups = useMemo(() => buildMarketingLibrary(packs ?? [], creations, products), [packs, creations, products]);

  async function handleStatusChange(id: string, status: AssetStatus) {
    setCreations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      await updateCreation(id, { status });
    } catch {
      toast.error('Could not update that asset’s status.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCreation(id);
      setCreations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error('Could not delete that advertisement.');
    }
  }

  if (!packs) {
    return <div className="p-8 text-sm text-muted-foreground">Loading Marketing Library…</div>;
  }

  if (packs.length === 0 && creations.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Marketing Library</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Nothing generated yet. Head to{' '}
          <Link href="/create" className="text-primary underline-offset-4 hover:underline">
            Create Advertisement
          </Link>{' '}
          to generate your first Marketing Pack.
        </p>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-foreground">Marketing Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every Marketing Pack and advertisement you&apos;ve generated, grouped by product and feature. Nothing is ever overwritten.
      </p>

      <div className="mt-8 space-y-10">
        {groups.map((group) => (
          <section key={group.productId}>
            <h2 className="font-display text-lg font-semibold text-foreground">{group.productName}</h2>
            <div className="mt-4 space-y-8">
              {group.features.map((featureGroup) => (
                <div key={featureGroup.featureKey}>
                  <h3 className="text-sm font-semibold text-muted-foreground">{featureGroup.featureLabel}</h3>
                  <div className="mt-3 space-y-6">
                    {featureGroup.packs.map(({ pack, assets }) => (
                      <div key={pack.id}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{pack.name}</p>
                          <Badge>V{pack.version}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(pack.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {assets.map((entry) => (
                            <AssetCard
                              key={entry.creation.id}
                              entry={entry}
                              onStatusChange={(status) => handleStatusChange(entry.creation.id, status)}
                              onDelete={() => handleDelete(entry.creation.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {featureGroup.standaloneAssets.length > 0 && (
                      <div>
                        {featureGroup.packs.length > 0 && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Individual assets</p>}
                        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {featureGroup.standaloneAssets.map((entry) => (
                            <AssetCard
                              key={entry.creation.id}
                              entry={entry}
                              onStatusChange={(status) => handleStatusChange(entry.creation.id, status)}
                              onDelete={() => handleDelete(entry.creation.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
