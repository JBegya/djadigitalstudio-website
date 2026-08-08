'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteCreation, getSettings, listCreations, listMarketingPacks, listProducts, updateCreation, updateMarketingPack, type RedactedSettings } from '@/lib/api';
import { buildMarketingLibrary, getCampaignVersions, type AssetEntry, type PackGroup } from '@/lib/library/buildMarketingLibrary';
import { ATTENTION_SEVERITY_LABELS, computeAttentionFlags, computePackReadiness, resolveReadinessContentTypes, type AttentionSeverity } from '@/lib/library/packReadiness';
import { NewVersionForm } from '@/components/library/NewVersionForm';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { MARKETING_PACK_OBJECTIVE_OPTIONS } from '@/types/domain';
import type { AdCreation, AssetStatus, ContentTypeSpec, CustomerPersona, MarketingPack, ProductProfile } from '@/types/domain';

const STATUS_OPTIONS: AssetStatus[] = ['draft', 'ready', 'published', 'archived'];

type LibraryFilter = 'all' | AssetStatus | 'ready-to-publish' | 'needs-attention';

const FILTER_OPTIONS: { value: LibraryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'ready-to-publish', label: 'Ready to Publish' },
  { value: 'needs-attention', label: 'Needs Attention' },
];

const SEVERITY_BADGE_VARIANT: Record<AttentionSeverity, 'destructive' | 'warning' | 'secondary'> = {
  'action-required': 'destructive',
  'needs-review': 'warning',
  suggestion: 'secondary',
};

function platformLabel(contentTypeKey: string): string {
  return CONTENT_TYPES.find((c) => c.key === contentTypeKey)?.label ?? contentTypeKey;
}

function objectiveLabel(objective: MarketingPack['objective']): string | undefined {
  return MARKETING_PACK_OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label;
}

function personaLabelFor(pack: MarketingPack, products: ProductProfile[]): string | undefined {
  if (!pack.personaId) return undefined;
  return products.find((p) => p.id === pack.productId)?.personas.find((persona) => persona.id === pack.personaId)?.name;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
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
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
          Updated {formatDate(creation.updatedAt)}
          {creation.publishedAt && <> · First Published On {formatDate(creation.publishedAt)}</>}
        </p>
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

function PackHeader({
  pack,
  assets,
  requiredContentTypes,
  draftReminderDays,
  refreshReminderDays,
  personaLabel,
  onStatusChange,
  onNewVersion,
}: {
  pack: MarketingPack;
  assets: AdCreation[];
  requiredContentTypes: ContentTypeSpec[];
  draftReminderDays: number;
  refreshReminderDays: number;
  personaLabel?: string;
  onStatusChange: (status: AssetStatus) => void;
  /** Undefined hides the button — shown only on a campaign's latest-version row, and only when
   * its underlying feature/product can still be found (nothing safe to regenerate against otherwise). */
  onNewVersion?: () => void;
}) {
  const readiness = computePackReadiness(assets, requiredContentTypes);
  const attention = computeAttentionFlags(pack, assets, readiness, Date.now(), draftReminderDays, refreshReminderDays);
  const packStatus = pack.status ?? 'draft';
  // "Ready to Publish" is only ever shown while the pack's own lifecycle stage is Ready — a
  // Published or Archived pack shouldn't display it even if every asset it holds still happens to
  // satisfy the underlying (unchanged) readiness calculation.
  const showReadyToPublish = readiness.readyToPublish && packStatus === 'ready';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm font-semibold text-foreground">{pack.name}</p>
      <Badge>V{pack.version}</Badge>
      {personaLabel && <Badge variant="outline">{personaLabel}</Badge>}
      {objectiveLabel(pack.objective) && <Badge variant="outline">{objectiveLabel(pack.objective)}</Badge>}
      <Select value={packStatus} onValueChange={(v) => onStatusChange(v as AssetStatus)}>
        <SelectTrigger className="h-7 w-28 text-xs">
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
      {showReadyToPublish ? (
        <Badge variant="success">Ready to Publish ✓</Badge>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${readiness.completionPercent}%` }} />
          </span>
          {readiness.completionPercent}% Complete ({readiness.readyCount}/{readiness.totalCount} assets)
          {readiness.missingRequiredPlatformLabels.length > 0 && (
            <span className="text-amber-500">⚠ Missing {readiness.missingRequiredPlatformLabels.join(', ')}</span>
          )}
        </span>
      )}
      {attention.needsAttention && attention.highestSeverity && (
        <Badge variant={SEVERITY_BADGE_VARIANT[attention.highestSeverity]} title={attention.flags.map((f) => f.message).join('\n')}>
          {ATTENTION_SEVERITY_LABELS[attention.highestSeverity]}
        </Badge>
      )}
      <span className="text-xs text-muted-foreground">{formatDate(pack.createdAt)}</span>
      {pack.publishedAt && <span className="text-xs text-muted-foreground">First Published On {formatDate(pack.publishedAt)}</span>}
      {onNewVersion && (
        <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={onNewVersion}>
          New Version
        </Button>
      )}
    </div>
  );
}

export function MarketingLibraryScreen() {
  const [packs, setPacks] = useState<MarketingPack[] | null>(null);
  const [creations, setCreations] = useState<AdCreation[]>([]);
  const [products, setProducts] = useState<ProductProfile[]>([]);
  const [settings, setSettings] = useState<RedactedSettings | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [newVersionPackId, setNewVersionPackId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMarketingPacks(), listCreations(), listProducts(), getSettings()])
      .then(([packsRes, creationsRes, productsRes, settingsRes]) => {
        setPacks(packsRes.packs);
        setCreations(creationsRes.creations);
        setProducts(productsRes.products);
        setSettings(settingsRes);
      })
      .catch(() => {
        toast.error('Could not load the Marketing Library.');
        setPacks([]);
      });
  }, []);

  const groups = useMemo(() => buildMarketingLibrary(packs ?? [], creations, products), [packs, creations, products]);

  const draftReminderDays = settings?.draftReminderDays ?? 30;
  const refreshReminderDays = settings?.refreshReminderDays ?? 183;

  function requiredContentTypesFor(productId: string): ContentTypeSpec[] {
    return resolveReadinessContentTypes(productId, settings?.requiredPublishingPlatformKeysByProduct ?? {});
  }

  // The unfiltered pack list for a given product+feature — used to determine "is this the latest
  // version of this campaign" independent of the active status filter, which must not be able to
  // hide the true latest version from that computation.
  function allPacksForFeature(productId: string, featureKey: string): PackGroup[] {
    return groups.find((g) => g.productId === productId)?.features.find((fg) => fg.featureKey === featureKey)?.packs ?? [];
  }

  function packMatchesFilter(pack: MarketingPack, assets: AdCreation[]): boolean {
    if (filter === 'all') return true;
    if (filter === 'ready-to-publish' || filter === 'needs-attention') {
      const readiness = computePackReadiness(assets, requiredContentTypesFor(pack.productId));
      if (filter === 'ready-to-publish') return readiness.readyToPublish && (pack.status ?? 'draft') === 'ready';
      return computeAttentionFlags(pack, assets, readiness, Date.now(), draftReminderDays, refreshReminderDays).needsAttention;
    }
    return (pack.status ?? 'draft') === filter;
  }

  function standaloneMatchesFilter(creation: AdCreation): boolean {
    if (filter === 'all') return true;
    if (filter === 'ready-to-publish') return (creation.status ?? 'draft') === 'ready';
    if (filter === 'needs-attention') return !creation.thumbnailPath;
    return (creation.status ?? 'draft') === filter;
  }

  async function handleStatusChange(id: string, status: AssetStatus) {
    const previousStatus = creations.find((c) => c.id === id)?.status;
    setCreations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      const { creation } = await updateCreation(id, { status });
      setCreations((prev) => prev.map((c) => (c.id === id ? creation : c)));
    } catch {
      setCreations((prev) => prev.map((c) => (c.id === id ? { ...c, status: previousStatus } : c)));
      toast.error('Could not update that asset’s status.');
    }
  }

  async function handlePackStatusChange(packId: string, status: AssetStatus) {
    const previousStatus = packs?.find((p) => p.id === packId)?.status;
    setPacks((prev) => (prev ? prev.map((p) => (p.id === packId ? { ...p, status } : p)) : prev));
    try {
      const { pack } = await updateMarketingPack(packId, { status });
      setPacks((prev) => (prev ? prev.map((p) => (p.id === packId ? pack : p)) : prev));
    } catch {
      setPacks((prev) => (prev ? prev.map((p) => (p.id === packId ? { ...p, status: previousStatus } : p)) : prev));
      toast.error('Could not update that pack’s status.');
    }
  }

  function handleNewVersionCreated(newPack: MarketingPack, newCreations: AdCreation[]) {
    setPacks((prev) => (prev ? [...prev, newPack] : prev));
    setCreations((prev) => [...prev, ...newCreations]);
    setNewVersionPackId(null);
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

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      features: group.features
        .map((featureGroup) => ({
          ...featureGroup,
          packs: featureGroup.packs.filter(({ pack, assets }) => packMatchesFilter(pack, assets.map((a) => a.creation))),
          standaloneAssets: featureGroup.standaloneAssets.filter((entry) => standaloneMatchesFilter(entry.creation)),
        }))
        .filter((featureGroup) => featureGroup.packs.length > 0 || featureGroup.standaloneAssets.length > 0),
    }))
    .filter((group) => group.features.length > 0);

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Marketing Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every Marketing Pack and advertisement you&apos;ve generated, grouped by product and feature. Nothing is ever overwritten.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as LibraryFilter)}>
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 space-y-10">
        {visibleGroups.map((group) => (
          <section key={group.productId}>
            <h2 className="font-display text-lg font-semibold text-foreground">{group.productName}</h2>
            <div className="mt-4 space-y-8">
              {group.features.map((featureGroup) => (
                <div key={featureGroup.featureKey}>
                  <h3 className="text-sm font-semibold text-muted-foreground">{featureGroup.featureLabel}</h3>
                  <div className="mt-3 space-y-6">
                    {featureGroup.packs.map(({ pack, assets }) => {
                      const isLatest = getCampaignVersions(allPacksForFeature(pack.productId, pack.featureKey), pack.productId, pack.featureKey, pack.name).at(-1)
                        ?.pack.id === pack.id;
                      const product = products.find((p) => p.id === pack.productId);
                      const feature = product?.features.find((f) => f.key === pack.featureKey);
                      const persona: CustomerPersona | null = pack.personaId ? (product?.personas.find((p) => p.id === pack.personaId) ?? null) : null;
                      return (
                        <div key={pack.id}>
                          <PackHeader
                            pack={pack}
                            assets={assets.map((a) => a.creation)}
                            requiredContentTypes={requiredContentTypesFor(pack.productId)}
                            draftReminderDays={draftReminderDays}
                            refreshReminderDays={refreshReminderDays}
                            personaLabel={personaLabelFor(pack, products)}
                            onStatusChange={(status) => handlePackStatusChange(pack.id, status)}
                            onNewVersion={isLatest && product && feature ? () => setNewVersionPackId(pack.id) : undefined}
                          />
                          {newVersionPackId === pack.id && product && feature && (
                            <NewVersionForm
                              product={product}
                              feature={feature}
                              persona={persona}
                              pack={pack}
                              assets={assets.map((a) => a.creation)}
                              onCancel={() => setNewVersionPackId(null)}
                              onCreated={handleNewVersionCreated}
                            />
                          )}
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
                      );
                    })}

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
