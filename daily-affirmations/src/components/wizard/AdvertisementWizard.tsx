'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WizardFeatureStep } from '@/components/wizard/WizardFeatureStep';
import { WizardPersonaStep, NO_PERSONA } from '@/components/wizard/WizardPersonaStep';
import { WizardPlatformStep } from '@/components/wizard/WizardPlatformStep';
import { WizardProductStep } from '@/components/wizard/WizardProductStep';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStyleStep } from '@/components/wizard/WizardStyleStep';
import { listMarketingPacks, listProducts } from '@/lib/api';
import { generateMarketingPackVersion } from '@/lib/editor/generateMarketingPack';
import { inter } from '@/lib/fonts';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { getTemplatesForContentType } from '@/server/config/templates';
import type { ContentTypeSpec, CustomerPersona, MarketingPack, MarketingPackObjective, ProductFeature, ProductProfile, TemplateDefinition } from '@/types/domain';

export interface WizardSelection {
  product: ProductProfile;
  persona: CustomerPersona | null;
  contentType: ContentTypeSpec;
  feature: ProductFeature;
  template: TemplateDefinition;
}

const TOTAL_STEPS = 5;

export function AdvertisementWizard({ onComplete }: { onComplete: (selection: WizardSelection) => void }) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductProfile[] | null>(null);
  const [packs, setPacks] = useState<MarketingPack[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [contentTypeKey, setContentTypeKey] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  useEffect(() => {
    Promise.all([listProducts(), listMarketingPacks()])
      .then(([productsRes, packsRes]) => {
        setProducts(productsRes.products);
        setPacks(packsRes.packs);
      })
      .catch(() => toast.error('Could not load products'));
  }, []);

  const product = products?.find((p) => p.id === productId) ?? null;
  const persona = product?.personas.find((p) => p.id === personaId) ?? null;
  const feature = product?.features.find((f) => f.key === featureKey) ?? null;
  const availableTemplates = contentTypeKey ? getTemplatesForContentType(contentTypeKey) : [];
  const template = availableTemplates.find((t) => t.key === templateKey) ?? null;
  const contentType = CONTENT_TYPES.find((c) => c.key === contentTypeKey) ?? null;
  const suggestedPackName = feature?.label ?? '';
  const suggestedHook = feature ? (feature.marketing.suggestedHook || persona?.storyIdeas[0] || feature.label) : '';

  function selectProduct(id: string) {
    setProductId(id);
    setPersonaId(null);
    setFeatureKey(null);
  }

  function selectPersona(id: string) {
    setPersonaId(id);
    setFeatureKey(null);
  }

  function selectContentType(key: string) {
    setContentTypeKey(key);
    setTemplateKey(null);
  }

  function finish() {
    if (!product || !contentType || !feature || !template) return;
    onComplete({ product, persona, contentType, feature, template });
  }

  async function generateAll(contentTypeKeys: string[], packName: string, hook: string, objective?: MarketingPackObjective) {
    if (!product || !feature) return;
    setBatchGenerating(true);
    try {
      const result = await generateMarketingPackVersion({ product, feature, persona, contentTypeKeys, packName, hook, objective, fontFamily: inter.style.fontFamily });
      if (result.skippedPlatformCount > 0) {
        toast.error('Some selected platforms have no template configured yet — skipping those.');
      }
      toast.success(`Generated "${result.pack.name}" (V${result.pack.version}) with ${result.creations.length} asset${result.creations.length === 1 ? '' : 's'} for ${feature.label}.`);
      router.push('/exports');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch generation failed.');
    } finally {
      setBatchGenerating(false);
    }
  }

  if (!products) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-muted-foreground">Loading products…</div>;
  }

  if (step === 1) {
    return (
      <WizardShell stepNumber={1} totalSteps={TOTAL_STEPS} title="Which app?" onContinue={() => setStep(2)} continueDisabled={!product}>
        <WizardProductStep products={products} value={productId} onChange={selectProduct} />
      </WizardShell>
    );
  }

  if (step === 2) {
    return (
      <WizardShell
        stepNumber={2}
        totalSteps={TOTAL_STEPS}
        title="Who are you talking to?"
        subtitle={product ? `${product.name}'s personas` : undefined}
        onBack={() => setStep(1)}
        onContinue={() => setStep(3)}
        continueDisabled={!personaId}
      >
        {product && <WizardPersonaStep product={product} value={personaId} onChange={selectPersona} />}
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        stepNumber={3}
        totalSteps={TOTAL_STEPS}
        title="What are you promoting?"
        subtitle={product ? `${product.name}'s features` : undefined}
        onBack={() => setStep(2)}
        onContinue={() => setStep(4)}
        continueDisabled={!feature}
      >
        {product && (
          <WizardFeatureStep product={product} personaId={personaId && personaId !== NO_PERSONA ? personaId : undefined} value={featureKey} onChange={setFeatureKey} />
        )}
      </WizardShell>
    );
  }

  if (step === 4) {
    return (
      <WizardShell
        stepNumber={4}
        totalSteps={TOTAL_STEPS}
        title="Where are you posting?"
        onBack={() => setStep(3)}
        onContinue={() => setStep(5)}
        continueDisabled={!contentType}
      >
        <WizardPlatformStep
          contentTypes={CONTENT_TYPES}
          value={contentTypeKey}
          onChange={selectContentType}
          onGenerateAll={generateAll}
          generating={batchGenerating}
          suggestedPackName={suggestedPackName}
          suggestedHook={suggestedHook}
          productId={product?.id}
          featureKey={feature?.key}
          existingPacks={packs}
          product={product}
          feature={feature}
          persona={persona}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell
      stepNumber={5}
      totalSteps={TOTAL_STEPS}
      title="What style?"
      onBack={() => setStep(4)}
      onContinue={finish}
      continueLabel="Generate Advertisement"
      continueDisabled={!template}
    >
      <WizardStyleStep templates={availableTemplates} value={templateKey} onChange={setTemplateKey} />
    </WizardShell>
  );
}
