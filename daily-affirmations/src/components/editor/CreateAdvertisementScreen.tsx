'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { Canvas } from 'fabric';
import { toast } from 'sonner';
import { AdvertisementWizard, type WizardSelection } from '@/components/wizard/AdvertisementWizard';
import { CONTENT_TYPES, getContentType } from '@/server/config/contentTypes';
import { TEMPLATES, getTemplate } from '@/server/config/templates';
import { computeWorkingSize } from '@/lib/editor/workingSize';
import { extractSlotText, type SlotContent } from '@/lib/editor/templateToCanvas';
import { buildSlotContentFromProduct, resolveFeatureScreenshot } from '@/lib/editor/productToSlotContent';
import { exportCanvasToDataUrl } from '@/lib/editor/exportCanvas';
import type { MockupDevice } from '@/lib/editor/deviceMockup';
import { createCreation, exportAd, getCreation, getProduct, mediaUrl, updateCreation } from '@/lib/api';
import type { AdCreation, ProductFeature, ProductProfile } from '@/types/domain';
import { TemplatePicker } from './TemplatePicker';
import { DeviceMockupPicker } from './DeviceMockupPicker';
import { ExportBar, type ExportFormat } from './ExportBar';
import { PropertiesPanel } from './PropertiesPanel';

const EditorCanvas = dynamic(() => import('./EditorCanvas').then((m) => m.EditorCanvas), {
  ssr: false,
  loading: () => <div className="h-[600px] w-[420px] animate-pulse rounded-2xl bg-secondary/40" />,
});

const MAX_PANEL_WIDTH_PX = 420;
const MAX_PANEL_HEIGHT_PX = 600;

export function CreateAdvertisementScreen({ initialCreationId }: { initialCreationId?: string }) {
  const [mode, setMode] = useState<'wizard' | 'editor'>(initialCreationId ? 'editor' : 'wizard');
  const [templateKey, setTemplateKey] = useState(TEMPLATES[0]?.key ?? '');
  const [contentTypeKey, setContentTypeKey] = useState(CONTENT_TYPES[0]?.key ?? '');
  const [device, setDevice] = useState<MockupDevice>('iphone');
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [creationId, setCreationId] = useState<string | null>(null);
  const [loadedCreation, setLoadedCreation] = useState<AdCreation | null>(null);
  const [product, setProduct] = useState<ProductProfile | null>(null);
  const [feature, setFeature] = useState<ProductFeature | null>(null);
  const [slotContent, setSlotContent] = useState<SlotContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  // Gates EditorCanvas out of the first render entirely when reopening a saved ad — mounting it
  // immediately with placeholder defaults and then again moments later once the fetch resolves
  // creates two Fabric Canvas instances on the same underlying <canvas> element in quick
  // succession, and Fabric's own dispose() isn't guaranteed to finish tearing down the first
  // before the second's async template/image loading starts touching it.
  const [loadingCreation, setLoadingCreation] = useState(Boolean(initialCreationId));

  useEffect(() => {
    if (!initialCreationId) return;
    getCreation(initialCreationId)
      .then(async ({ creation }) => {
        setCreationId(creation.id);
        setTemplateKey(creation.templateKey);
        setContentTypeKey(creation.contentTypeKey);
        setLoadedCreation(creation);
        try {
          setProduct((await getProduct(creation.productId)).product);
        } catch {
          // Best-effort — a deleted product shouldn't block reopening a saved ad. Canvas content
          // comes from the saved canvasJson, not this fetch.
        }
      })
      .catch(() => toast.error('Could not load that advertisement — starting a new one instead.'))
      .finally(() => setLoadingCreation(false));
  }, [initialCreationId]);

  const handleReady = useCallback((next: Canvas | null) => setCanvas(next), []);

  function handleWizardComplete(selection: WizardSelection) {
    const screenshot = resolveFeatureScreenshot(selection.product, selection.feature);
    const content = buildSlotContentFromProduct(
      selection.product,
      selection.feature,
      screenshot ? mediaUrl(screenshot.path) : undefined,
      selection.product.logoPath ? mediaUrl(selection.product.logoPath) : undefined,
      selection.persona ?? undefined,
    );
    setProduct(selection.product);
    setFeature(selection.feature);
    setTemplateKey(selection.template.key);
    setContentTypeKey(selection.contentType.key);
    setSlotContent(content);
    setMode('editor');
  }

  if (mode === 'wizard') {
    return <AdvertisementWizard onComplete={handleWizardComplete} />;
  }

  if (loadingCreation) {
    return <div className="p-8 text-sm text-muted-foreground">Loading advertisement…</div>;
  }

  const template = getTemplate(templateKey) ?? TEMPLATES[0];
  const contentType = getContentType(contentTypeKey) ?? CONTENT_TYPES[0];

  if (!template || !contentType) {
    return <div className="p-8 text-sm text-muted-foreground">No templates or content types configured.</div>;
  }

  // Once the user makes an explicit choice, resume normal template-driven building instead of
  // replaying the loaded JSON — this only affects reopening a saved ad, not everyday editing.
  function selectTemplate(key: string) {
    setTemplateKey(key);
    setLoadedCreation(null);
  }
  function selectContentType(key: string) {
    setContentTypeKey(key);
    setLoadedCreation(null);
  }
  function selectDevice(next: MockupDevice) {
    setDevice(next);
    setLoadedCreation(null);
  }

  const workingSize = loadedCreation
    ? { width: loadedCreation.canvasWidthPx, height: loadedCreation.canvasHeightPx }
    : computeWorkingSize(contentType.widthPx, contentType.heightPx, MAX_PANEL_WIDTH_PX, MAX_PANEL_HEIGHT_PX);

  // Only actually read by EditorCanvas when initialJson is absent — i.e. a saved ad reopened and
  // then a picker changed, forcing a fresh build. Falls back to the ad's own real saved fields
  // rather than fabricated sample text.
  const fallbackContent: SlotContent = loadedCreation
    ? { headline: loadedCreation.headline, subheadline: loadedCreation.caption, cta: loadedCreation.cta, accentColor: product?.brandColors.primary ?? '#7c9cff' }
    : { accentColor: '#7c9cff' };

  async function handleSave() {
    if (!canvas) return;
    setSaving(true);
    try {
      const thumbnailPath = await exportCanvasToDataUrl(canvas, { format: 'jpg', targetWidthPx: 400, targetHeightPx: Math.round((400 * canvas.getHeight()) / canvas.getWidth()), quality: 0.7 });
      // Editing a published asset sends it back to Ready — real content changes should go through
      // review again before being considered published a second time. publishedAt itself is never
      // cleared; only a later transition back to 'published' would touch it, and only if unset.
      const wasPublished = loadedCreation?.status === 'published';
      const payload = {
        productId: loadedCreation?.productId ?? product?.id ?? 'sample',
        featureKey: loadedCreation?.featureKey ?? feature?.key,
        packId: loadedCreation?.packId,
        templateKey,
        contentTypeKey,
        headline: extractSlotText(canvas, 'headline'),
        caption: extractSlotText(canvas, 'subheadline'),
        cta: extractSlotText(canvas, 'cta'),
        hashtags: loadedCreation?.hashtags ?? [],
        thumbnailPath,
        exportPaths: loadedCreation?.exportPaths ?? [],
        favorite: loadedCreation?.favorite ?? false,
        status: wasPublished ? 'ready' : (loadedCreation?.status ?? 'draft'),
        canvasJson: canvas.toJSON(),
        canvasWidthPx: canvas.getWidth(),
        canvasHeightPx: canvas.getHeight(),
      };
      if (creationId) {
        const { creation } = await updateCreation(creationId, payload);
        setLoadedCreation(creation);
        toast.success(wasPublished ? 'Saved — moved back to Ready for review since this was published.' : 'Saved.');
      } else {
        const { creation } = await createCreation(payload);
        setCreationId(creation.id);
        setLoadedCreation(creation);
        toast.success('Saved — you can come back and keep editing this anytime.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this advertisement.');
    } finally {
      setSaving(false);
    }
  }

  const handleExport = async (format: ExportFormat) => {
    if (!canvas) return;
    setExporting(format);
    try {
      const dataUrl = await exportCanvasToDataUrl(canvas, { format, targetWidthPx: contentType.widthPx, targetHeightPx: contentType.heightPx });
      const { path } = await exportAd({ format, dataUrl, productFolderName: product?.name ?? 'Sample', fileName: `${templateKey}-${contentTypeKey}-${Date.now()}` });
      toast.success(`Exported to ${path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="font-display text-xl font-semibold text-foreground">Create Advertisement</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {product ? `${product.name}${feature ? ` — ${feature.label}` : ''}` : 'Editing a saved advertisement.'} — fully editable, change template, device,
          or platform anytime below.
        </p>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-border p-4">
          <TemplatePicker templates={TEMPLATES} value={templateKey} onChange={selectTemplate} />
          <div className="mt-6">
            <DeviceMockupPicker value={device} onChange={selectDevice} />
          </div>
        </aside>
        <main className="flex flex-1 flex-col items-center gap-4 overflow-auto p-6">
          <ExportBar
            contentTypes={CONTENT_TYPES}
            contentTypeKey={contentTypeKey}
            onContentTypeChange={selectContentType}
            onSave={handleSave}
            onExport={handleExport}
            saving={saving}
            exporting={exporting}
          />
          <div className="flex flex-1 items-center justify-center">
            <EditorCanvas
              template={template}
              content={slotContent ?? fallbackContent}
              device={device}
              widthPx={workingSize.width}
              heightPx={workingSize.height}
              initialJson={loadedCreation?.canvasJson}
              loadedCreationId={loadedCreation?.id}
              onReady={handleReady}
            />
          </div>
        </main>
        <aside className="w-72 shrink-0 border-l border-border">
          <PropertiesPanel canvas={canvas} />
        </aside>
      </div>
    </div>
  );
}
