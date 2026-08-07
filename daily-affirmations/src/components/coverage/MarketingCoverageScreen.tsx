'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ProgressPercent } from '@/components/ui/progress-percent';
import { getSettings, listCreations, listMarketingPacks, listProducts, type RedactedSettings } from '@/lib/api';
import { computeAllCoverage, type ProductCoverage } from '@/lib/coverage/computeCoverage';
import type { AdCreation, MarketingPack, ProductProfile } from '@/types/domain';

function CoverageRow({ covered, label, detail }: { covered: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 text-sm last:border-0">
      <span className="flex items-center gap-2">
        <span className={covered ? 'text-emerald-400' : 'text-muted-foreground/50'}>{covered ? '✓' : '✗'}</span>
        <span className={covered ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      </span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

function ProductCoverageSection({ coverage }: { coverage: ProductCoverage }) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{coverage.productName}</h2>
        <Badge>{coverage.featureCoveragePercent}% Feature Coverage</Badge>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Features</h3>
            <ProgressPercent percent={coverage.featureCoveragePercent} />
          </div>
          <div className="mt-2">
            {coverage.features.length === 0 ? (
              <p className="text-xs text-muted-foreground">No features defined yet.</p>
            ) : (
              coverage.features.map((f) => {
                const adCount = f.packCount + f.standaloneAssetCount;
                return <CoverageRow key={f.featureKey} covered={f.covered} label={f.featureLabel} detail={`${adCount} ad${adCount === 1 ? '' : 's'}`} />;
              })
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personas</h3>
            <ProgressPercent percent={coverage.personaCoveragePercent} />
          </div>
          <div className="mt-2">
            {coverage.personas.length === 0 ? (
              <p className="text-xs text-muted-foreground">No personas defined yet.</p>
            ) : (
              coverage.personas.map((p) => (
                <CoverageRow key={p.personaId} covered={p.covered} label={p.personaLabel} detail={`${p.packCount} campaign${p.packCount === 1 ? '' : 's'}`} />
              ))
            )}
            {coverage.packsWithNoPersonaCount > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {coverage.packsWithNoPersonaCount} campaign{coverage.packsWithNoPersonaCount === 1 ? '' : 's'} generated with no specific persona.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platforms</h3>
            <ProgressPercent percent={coverage.platformCoveragePercent} />
          </div>
          <div className="mt-2">
            {coverage.platforms.length === 0 ? (
              <p className="text-xs text-muted-foreground">No platforms configured.</p>
            ) : (
              coverage.platforms.map((p) => <CoverageRow key={p.contentTypeKey} covered={p.covered} label={p.label} />)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketingCoverageScreen() {
  const [packs, setPacks] = useState<MarketingPack[] | null>(null);
  const [creations, setCreations] = useState<AdCreation[]>([]);
  const [products, setProducts] = useState<ProductProfile[]>([]);
  const [settings, setSettings] = useState<RedactedSettings | null>(null);

  useEffect(() => {
    Promise.all([listMarketingPacks(), listCreations(), listProducts(), getSettings()])
      .then(([packsRes, creationsRes, productsRes, settingsRes]) => {
        setPacks(packsRes.packs);
        setCreations(creationsRes.creations);
        setProducts(productsRes.products);
        setSettings(settingsRes);
      })
      .catch(() => {
        toast.error('Could not load Marketing Coverage.');
        setPacks([]);
      });
  }, []);

  const coverage = useMemo(
    () => computeAllCoverage(products, packs ?? [], creations, settings?.requiredPublishingPlatformKeysByProduct ?? {}),
    [products, packs, creations, settings],
  );

  if (!packs) {
    return <div className="p-8 text-sm text-muted-foreground">Loading Marketing Coverage…</div>;
  }

  if (products.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Marketing Coverage</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Add a product in Brand Manager to see its marketing coverage.</p>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-foreground">Marketing Coverage</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Where the marketing gaps are, per product — which features, personas, and platforms still have no advertisements.
      </p>

      <div className="mt-8 space-y-10">
        {coverage.map((c) => (
          <ProductCoverageSection key={c.productId} coverage={c} />
        ))}
      </div>
    </main>
  );
}
