'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { WizardFeatureStep } from '@/components/wizard/WizardFeatureStep';
import { WizardPlatformStep } from '@/components/wizard/WizardPlatformStep';
import { WizardProductStep } from '@/components/wizard/WizardProductStep';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStyleStep } from '@/components/wizard/WizardStyleStep';
import { listProducts } from '@/lib/api';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { getTemplatesForContentType } from '@/server/config/templates';
import type { ContentTypeSpec, ProductFeature, ProductProfile, TemplateDefinition } from '@/types/domain';

export interface WizardSelection {
  product: ProductProfile;
  contentType: ContentTypeSpec;
  feature: ProductFeature;
  template: TemplateDefinition;
}

const TOTAL_STEPS = 4;

export function AdvertisementWizard({ onComplete }: { onComplete: (selection: WizardSelection) => void }) {
  const [products, setProducts] = useState<ProductProfile[] | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [contentTypeKey, setContentTypeKey] = useState<string | null>(null);
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(null);

  useEffect(() => {
    listProducts()
      .then((r) => setProducts(r.products))
      .catch(() => toast.error('Could not load products'));
  }, []);

  const product = products?.find((p) => p.id === productId) ?? null;
  const feature = product?.features.find((f) => f.key === featureKey) ?? null;
  const availableTemplates = contentTypeKey ? getTemplatesForContentType(contentTypeKey) : [];
  const template = availableTemplates.find((t) => t.key === templateKey) ?? null;
  const contentType = CONTENT_TYPES.find((c) => c.key === contentTypeKey) ?? null;

  function selectProduct(id: string) {
    setProductId(id);
    setFeatureKey(null);
  }

  function selectContentType(key: string) {
    setContentTypeKey(key);
    setTemplateKey(null);
  }

  function finish() {
    if (!product || !contentType || !feature || !template) return;
    onComplete({ product, contentType, feature, template });
  }

  if (!products) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-muted-foreground">Loading products…</div>;
  }

  if (step === 1) {
    return (
      <WizardShell
        stepNumber={1}
        totalSteps={TOTAL_STEPS}
        title="Which app?"
        onContinue={() => setStep(2)}
        continueDisabled={!product}
      >
        <WizardProductStep products={products} value={productId} onChange={selectProduct} />
      </WizardShell>
    );
  }

  if (step === 2) {
    return (
      <WizardShell
        stepNumber={2}
        totalSteps={TOTAL_STEPS}
        title="Where are you posting?"
        onBack={() => setStep(1)}
        onContinue={() => setStep(3)}
        continueDisabled={!contentType}
      >
        <WizardPlatformStep contentTypes={CONTENT_TYPES} value={contentTypeKey} onChange={selectContentType} />
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
        {product && <WizardFeatureStep product={product} value={featureKey} onChange={setFeatureKey} />}
      </WizardShell>
    );
  }

  return (
    <WizardShell
      stepNumber={4}
      totalSteps={TOTAL_STEPS}
      title="What style?"
      onBack={() => setStep(3)}
      onContinue={finish}
      continueLabel="Open Editor"
      continueDisabled={!template}
    >
      <WizardStyleStep templates={availableTemplates} value={templateKey} onChange={setTemplateKey} />
    </WizardShell>
  );
}
