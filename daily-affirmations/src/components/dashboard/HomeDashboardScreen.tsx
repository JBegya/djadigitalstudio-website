'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ProgressPercent } from '@/components/ui/progress-percent';
import { getSettings, listCreations, listMarketingPacks, listProducts, type RedactedSettings } from '@/lib/api';
import { computeDashboardSummary, type AttentionWorklistEntry, type RecentPackEntry } from '@/lib/dashboard/computeDashboard';
import { ATTENTION_SEVERITY_LABELS, type AttentionSeverity } from '@/lib/library/packReadiness';
import type { AdCreation, MarketingPack, ProductProfile } from '@/types/domain';

const SEVERITY_BADGE_VARIANT: Record<AttentionSeverity, 'destructive' | 'warning' | 'secondary'> = {
  'action-required': 'destructive',
  'needs-review': 'warning',
  suggestion: 'secondary',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RecentPackRow({ entry }: { entry: RecentPackEntry }) {
  return (
    <Link href="/exports" className="flex items-center justify-between gap-3 border-b border-border/50 py-2 text-sm last:border-0 hover:bg-secondary/30">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-foreground">{entry.packName}</span>
        <Badge>V{entry.version}</Badge>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        {entry.productName}
        <Badge variant="outline">{capitalize(entry.status)}</Badge>
      </span>
    </Link>
  );
}

function WorklistRow({ entry }: { entry: AttentionWorklistEntry }) {
  return (
    <Link href="/exports" className="flex items-center justify-between gap-3 border-b border-border/50 py-2 text-sm last:border-0 hover:bg-secondary/30">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-foreground">{entry.packName}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{entry.productName}</span>
      </span>
      <Badge variant={SEVERITY_BADGE_VARIANT[entry.severity]} title={entry.messages.join('\n')}>
        {ATTENTION_SEVERITY_LABELS[entry.severity]}
      </Badge>
    </Link>
  );
}

export function HomeDashboardScreen() {
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
        toast.error('Could not load the Dashboard.');
        setPacks([]);
      });
  }, []);

  const summary = useMemo(
    () =>
      computeDashboardSummary(
        products,
        packs ?? [],
        creations,
        settings?.requiredPublishingPlatformKeysByProduct ?? {},
        settings?.draftReminderDays ?? 30,
        settings?.refreshReminderDays ?? 183,
        Date.now(),
      ),
    [products, packs, creations, settings],
  );

  if (!packs) {
    return <div className="p-8 text-sm text-muted-foreground">Loading Dashboard…</div>;
  }

  if (products.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Add a product in Brand Manager to get started.</p>
      </main>
    );
  }

  const { production, publishing, coverage } = summary;
  const nothingGeneratedYet = packs.length === 0 && creations.length === 0;

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything you&apos;ve produced, published, and still need to cover — at a glance.</p>

      {nothingGeneratedYet && (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing generated yet. Head to{' '}
          <Link href="/create" className="text-primary underline-offset-4 hover:underline">
            Create Advertisement
          </Link>{' '}
          to generate your first Marketing Pack.
        </p>
      )}

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Production</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Products" value={production.totalProducts} />
            <StatTile label="Marketing Packs" value={production.totalPacks} />
            <StatTile label="Assets Generated" value={production.totalCreations} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Draft {production.creationsByStatus.draft}</span>
            <span>Ready {production.creationsByStatus.ready}</span>
            <span>Published {production.creationsByStatus.published}</span>
            <span>Archived {production.creationsByStatus.archived}</span>
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Marketing Packs</h3>
          <div className="mt-2">
            {production.recentPacks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No Marketing Packs generated yet.</p>
            ) : (
              production.recentPacks.map((entry) => <RecentPackRow key={entry.packId} entry={entry} />)
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Publishing</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Ready to Publish" value={publishing.readyToPublishCount} />
            <StatTile label="Action Required" value={publishing.attentionCountsBySeverity['action-required']} />
            <StatTile label="Needs Review" value={publishing.attentionCountsBySeverity['needs-review']} />
            <StatTile label="Suggestion" value={publishing.attentionCountsBySeverity.suggestion} />
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs Attention</h3>
          <div className="mt-2">
            {publishing.worklist.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              publishing.worklist.map((entry) => <WorklistRow key={entry.packId} entry={entry} />)
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">Coverage</h2>
            <Link href="/coverage" className="text-xs text-primary underline-offset-4 hover:underline">
              View full Coverage report
            </Link>
          </div>
          {coverage.lowestCoverageProduct && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="text-foreground">{coverage.lowestCoverageProduct.productName}</span> has the most coverage gaps —{' '}
              {coverage.lowestCoverageProduct.featureCoveragePercent}% Feature Coverage.
            </p>
          )}
          <div className="mt-4">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border/50 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Product</span>
              <span>Features</span>
              <span>Personas</span>
              <span>Platforms</span>
            </div>
            {coverage.perProduct.map((c) => (
              <div key={c.productId} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border/50 py-2 text-sm last:border-0">
                <span className="truncate text-foreground">{c.productName}</span>
                <ProgressPercent percent={c.featureCoveragePercent} />
                <ProgressPercent percent={c.personaCoveragePercent} />
                <ProgressPercent percent={c.platformCoveragePercent} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
