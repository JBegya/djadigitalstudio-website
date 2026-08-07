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
import { createCreation, createMarketingPack, listProducts, mediaUrl } from '@/lib/api';
import { generateAdsForPlatforms } from '@/lib/editor/batchGenerate';
import { resolveFeatureScreenshot } from '@/lib/editor/productToSlotContent';
import { inter } from '@/lib/fonts';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { getDefaultTemplateForContentType } from '@/server/config/defaultTemplates';
import { getTemplatesForContentType } from '@/server/config/templates';
import type { ContentTypeSpec, CustomerPersona, ProductFeature, ProductProfile, TemplateDefinition } from '@/types/domain';

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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [contentTypeKey, setContentTypeKey] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  useEffect(() => {
    listProducts()
      .then((r) => setProducts(r.products))
      .catch(() => toast.error('Could not load products'));
  }, []);

  const product = products?.find((p) => p.id === productId) ?? null;
  const persona = product?.personas.find((p) => p.id === personaId) ?? null;
  const feature = product?.features.find((f) => f.key === featureKey) ?? null;
  const availableTemplates = contentTypeKey ? getTemplatesForContentType(contentTypeKey) : [];
  const template = availableTemplates.find((t) => t.key === templateKey) ?? null;
  const contentType = CONTENT_TYPES.find((c) => c.key === contentTypeKey) ?? null;

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

  async function generateAll(contentTypeKeys: string[]) {
    if (!product || !feature || contentTypeKeys.length === 0) return;
    const pairs = contentTypeKeys
      .map((key) => {
        const type = CONTENT_TYPES.find((c) => c.key === key);
        const defaultTemplate = getDefaultTemplateForContentType(key);
        return type && defaultTemplate ? { contentType: type, template: defaultTemplate } : null;
      })
      .filter((p): p is { contentType: ContentTypeSpec; template: TemplateDefinition } => p !== null);

    if (pairs.length < contentTypeKeys.length) {
      toast.error('Some selected platforms have no template configured yet — skipping those.');
    }
    if (pairs.length === 0) return;

    setBatchGenerating(true);
    try {
      const { pack } = await createMarketingPack({ productId: product.id, featureKey: feature.key });
      const screenshot = resolveFeatureScreenshot(product, feature);
      const generated = await generateAdsForPlatforms(pairs, {
        product,
        feature,
        persona,
        screenshotUrl: screenshot ? mediaUrl(screenshot.path) : undefined,
        logoUrl: product.logoPath ? mediaUrl(product.logoPath) : undefined,
        fontFamily: inter.style.fontFamily,
        device: 'iphone',
      });
      await Promise.all(
        generated.map((ad) =>
          createCreation({
            productId: product.id,
            featureKey: feature.key,
            packId: pack.id,
            templateKey: ad.template.key,
            contentTypeKey: ad.contentType.key,
            headline: ad.headline,
            caption: ad.subheadline,
            cta: ad.cta,
            hashtags: [],
            thumbnailPath: ad.thumbnailDataUrl,
            exportPaths: [],
            favorite: false,
            status: 'draft',
            canvasJson: ad.canvasJson,
            canvasWidthPx: ad.widthPx,
            canvasHeightPx: ad.heightPx,
          }),
        ),
      );
      toast.success(`Generated Marketing Pack V${pack.version} with ${generated.length} asset${generated.length === 1 ? '' : 's'} for ${feature.label}.`);
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
