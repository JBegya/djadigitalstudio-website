'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SceneCard } from '@/components/storyboards/SceneCard';
import { Button } from '@/components/ui/button';
import { deleteStoryboard, generateVideo, listMarketingPacks, listProducts, listStoryboards, updateStoryboard } from '@/lib/api';
import { renderSceneKeyframes } from '@/lib/editor/sceneKeyframes';
import { flagScenes } from '@/lib/storyboards/flagScenes';
import { groupStoryboardsByProductFeature } from '@/lib/storyboards/groupStoryboards';
import type { MarketingPack, ProductProfile, Storyboard, StoryboardScene } from '@/types/domain';

export function StoryboardsScreen() {
  const router = useRouter();
  const [storyboards, setStoryboards] = useState<Storyboard[] | null>(null);
  const [packs, setPacks] = useState<MarketingPack[]>([]);
  const [products, setProducts] = useState<ProductProfile[]>([]);
  const [generatingVideoStoryboardId, setGeneratingVideoStoryboardId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listStoryboards(), listMarketingPacks(), listProducts()])
      .then(([sbRes, packsRes, productsRes]) => {
        setStoryboards(sbRes.storyboards);
        setPacks(packsRes.packs);
        setProducts(productsRes.products);
      })
      .catch(() => {
        toast.error('Could not load Storyboards.');
        setStoryboards([]);
      });
  }, []);

  const groups = useMemo(() => groupStoryboardsByProductFeature(storyboards ?? [], packs, products), [storyboards, packs, products]);

  async function handleSceneChange(storyboard: Storyboard, sceneNumber: number, patch: Partial<StoryboardScene>) {
    const newScenes = storyboard.scenes.map((s) => (s.number === sceneNumber ? { ...s, ...patch } : s));
    setStoryboards((prev) => prev?.map((s) => (s.id === storyboard.id ? { ...s, scenes: newScenes } : s)) ?? prev);
    try {
      await updateStoryboard(storyboard.id, { scenes: newScenes });
    } catch {
      toast.error('Could not save that change.');
      setStoryboards((prev) => prev?.map((s) => (s.id === storyboard.id ? storyboard : s)) ?? prev);
    }
  }

  async function handleDelete(storyboardId: string) {
    const prior = storyboards;
    setStoryboards((prev) => prev?.filter((s) => s.id !== storyboardId) ?? prev);
    try {
      await deleteStoryboard(storyboardId);
    } catch {
      toast.error('Could not delete that storyboard.');
      setStoryboards(prior);
    }
  }

  async function handleGenerateVideo(storyboard: Storyboard) {
    const product = products.find((p) => p.id === storyboard.productId);
    if (!product) {
      toast.error('Could not find this storyboard’s product.');
      return;
    }
    setGeneratingVideoStoryboardId(storyboard.id);
    try {
      const sceneKeyframes = await renderSceneKeyframes(storyboard, product);
      const { jobId } = await generateVideo({ storyboardId: storyboard.id, sceneKeyframes });
      router.push(`/videos/${jobId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start video generation.');
    } finally {
      setGeneratingVideoStoryboardId(null);
    }
  }

  if (!storyboards) {
    return <div className="p-8 text-sm text-muted-foreground">Loading Storyboards…</div>;
  }

  if (storyboards.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Storyboards</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          No storyboards yet. Head to the{' '}
          <Link href="/exports" className="text-primary underline-offset-4 hover:underline">
            Marketing Library
          </Link>{' '}
          and click &quot;Generate Storyboard&quot; on any Marketing Pack.
        </p>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-foreground">Storyboards</h1>
      <p className="mt-1 text-sm text-muted-foreground">Scene-by-scene storyboards generated from your Marketing Packs — the next stage before video.</p>

      <div className="mt-8 space-y-10">
        {groups.map((group) => (
          <section key={group.productId}>
            <h2 className="font-display text-lg font-semibold text-foreground">{group.productName}</h2>
            <div className="mt-4 space-y-8">
              {group.features.map((featureGroup) => (
                <div key={featureGroup.featureKey}>
                  <h3 className="text-sm font-semibold text-muted-foreground">{featureGroup.featureLabel}</h3>
                  <div className="mt-3 space-y-6">
                    {featureGroup.packGroups.map((packGroup) => (
                      <div key={packGroup.packId}>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">{packGroup.packName}</p>
                        <div className="mt-3 space-y-6">
                          {packGroup.storyboards.map((storyboard) => {
                            const product = products.find((p) => p.id === storyboard.productId);
                            const flagged = new Set(flagScenes(storyboard.scenes, product?.marketingIdentity.wordsWeAvoid ?? []));
                            const screenshots = product?.screenshots ?? [];
                            return (
                              <div key={storyboard.id} className="rounded-xl border border-dashed border-border p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-muted-foreground">Generated {new Date(storyboard.createdAt).toLocaleDateString()}</p>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGenerateVideo(storyboard)}
                                      disabled={generatingVideoStoryboardId === storyboard.id}
                                    >
                                      {generatingVideoStoryboardId === storyboard.id ? 'Generating…' : 'Generate Video'}
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(storyboard.id)}>
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  {storyboard.scenes.map((scene) => (
                                    <SceneCard
                                      key={scene.number}
                                      scene={scene}
                                      screenshots={screenshots}
                                      flagged={flagged.has(scene.number)}
                                      onChange={(patch) => handleSceneChange(storyboard, scene.number, patch)}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
