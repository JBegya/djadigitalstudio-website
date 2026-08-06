'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { Canvas } from 'fabric';
import { toast } from 'sonner';
import { TEMPLATES, getTemplate } from '@/server/config/templates';
import { SAMPLE_CONTENT_TYPES, SAMPLE_SLOT_CONTENT, getSampleContentType } from '@/lib/editor/sampleContent';
import { computeWorkingSize } from '@/lib/editor/workingSize';
import { extractSlotText } from '@/lib/editor/templateToCanvas';
import { exportCanvasToDataUrl } from '@/lib/editor/exportCanvas';
import type { MockupDevice } from '@/lib/editor/deviceMockup';
import { createCreation, exportAd, getCreation, updateCreation } from '@/lib/api';
import type { AdCreation } from '@/types/domain';
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

export function CreateAdvertisementScreen({
  sampleScreenshotDataUrl,
  logoDataUrl,
  initialCreationId,
}: {
  sampleScreenshotDataUrl: string;
  logoDataUrl: string;
  initialCreationId?: string;
}) {
  const [templateKey, setTemplateKey] = useState(TEMPLATES[0]?.key ?? '');
  const [contentTypeKey, setContentTypeKey] = useState(SAMPLE_CONTENT_TYPES[0]?.key ?? '');
  const [device, setDevice] = useState<MockupDevice>('iphone');
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [creationId, setCreationId] = useState<string | null>(null);
  const [loadedCreation, setLoadedCreation] = useState<AdCreation | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  useEffect(() => {
    if (!initialCreationId) return;
    getCreation(initialCreationId)
      .then(({ creation }) => {
        setCreationId(creation.id);
        setTemplateKey(creation.templateKey);
        setContentTypeKey(creation.contentTypeKey);
        setLoadedCreation(creation);
      })
      .catch(() => toast.error('Could not load that advertisement — starting a new one instead.'));
  }, [initialCreationId]);

  const template = getTemplate(templateKey) ?? TEMPLATES[0];
  const contentType = getSampleContentType(contentTypeKey);

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

  const handleReady = useCallback((next: Canvas | null) => setCanvas(next), []);

  async function handleSave() {
    if (!canvas) return;
    setSaving(true);
    try {
      const payload = {
        productId: loadedCreation?.productId ?? 'sample',
        templateKey,
        contentTypeKey,
        headline: extractSlotText(canvas, 'headline'),
        caption: extractSlotText(canvas, 'subheadline'),
        cta: extractSlotText(canvas, 'cta'),
        hashtags: loadedCreation?.hashtags ?? [],
        thumbnailPath: loadedCreation?.thumbnailPath ?? '',
        exportPaths: loadedCreation?.exportPaths ?? [],
        favorite: loadedCreation?.favorite ?? false,
        canvasJson: canvas.toJSON(),
        canvasWidthPx: canvas.getWidth(),
        canvasHeightPx: canvas.getHeight(),
      };
      if (creationId) {
        const { creation } = await updateCreation(creationId, payload);
        setLoadedCreation(creation);
        toast.success('Saved.');
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

  async function handleExport(format: ExportFormat) {
    if (!canvas) return;
    setExporting(format);
    try {
      const dataUrl = await exportCanvasToDataUrl(canvas, { format, targetWidthPx: contentType.widthPx, targetHeightPx: contentType.heightPx });
      const { path } = await exportAd({ format, dataUrl, productFolderName: 'Sample', fileName: `${templateKey}-${contentTypeKey}-${Date.now()}` });
      toast.success(`Exported to ${path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setExporting(null);
    }
  }

  if (!template) {
    return <div className="p-8 text-sm text-muted-foreground">No templates configured.</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="font-display text-xl font-semibold text-foreground">Create Advertisement</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sample content shown below — real products, screenshots, and AI copy arrive in later milestones. Everything here stays fully editable after you save.
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
            contentTypes={SAMPLE_CONTENT_TYPES}
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
              content={{ ...SAMPLE_SLOT_CONTENT, screenshotUrl: sampleScreenshotDataUrl, logoUrl: logoDataUrl, storeBadgeUrl: logoDataUrl }}
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
