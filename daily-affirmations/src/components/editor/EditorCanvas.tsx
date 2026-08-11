'use client';

import { useEffect, useRef } from 'react';
import { Canvas, FabricObject, Line } from 'fabric';
import type { TemplateDefinition } from '@/types/domain';
import { buildCanvasFromTemplate, type RectPx, type SlotContent } from '@/lib/editor/templateToCanvas';
import { computeSnap } from '@/lib/editor/snapping';
import type { MockupDevice } from '@/lib/editor/deviceMockup';
import { inter } from '@/lib/fonts';

const GUIDE_COLOR = '#7c9cff';

export interface EditorCanvasProps {
  template: TemplateDefinition;
  content: SlotContent;
  device: MockupDevice;
  widthPx: number;
  heightPx: number;
  /** Present when reopening a previously saved ad — loads its exact saved state instead of
   * rebuilding fresh from the template, so editing genuinely resumes where it left off. Only
   * read when `loadedCreationId` changes (see the effect below) — deliberately not a dependency
   * itself, since `canvasJson` gets a fresh object identity every time the parent re-fetches or
   * re-saves the same creation. */
  initialJson?: Record<string, unknown> | null;
  /** Identifies which saved creation `initialJson` belongs to (or undefined when building fresh
   * from a template). A plain, stable string, unlike `initialJson`/`content` — safe to depend on
   * without retriggering the rebuild on every unrelated parent re-render. */
  loadedCreationId?: string;
  onReady: (canvas: Canvas | null) => void;
}

function rectOf(obj: FabricObject): RectPx {
  return { left: obj.left ?? 0, top: obj.top ?? 0, width: obj.getScaledWidth(), height: obj.getScaledHeight() };
}

export function EditorCanvas({ template, content, device, widthPx, heightPx, initialJson, loadedCreationId, onReady }: EditorCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const guideLinesRef = useRef<Line[]>([]);

  useEffect(() => {
    if (!canvasElRef.current) return undefined;
    const canvas = new Canvas(canvasElRef.current, { width: widthPx, height: heightPx, preserveObjectStacking: true });
    let cancelled = false;

    function hideGuides() {
      for (const line of guideLinesRef.current) canvas.remove(line);
      guideLinesRef.current = [];
    }

    function drawGuides(guides: ReturnType<typeof computeSnap>['guides']) {
      hideGuides();
      guideLinesRef.current = guides.map((guide) =>
        guide.orientation === 'vertical'
          ? new Line([guide.position, 0, guide.position, canvas.getHeight()], { stroke: GUIDE_COLOR, strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true })
          : new Line([0, guide.position, canvas.getWidth(), guide.position], { stroke: GUIDE_COLOR, strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true }),
      );
      guideLinesRef.current.forEach((line) => canvas.add(line));
      canvas.requestRenderAll();
    }

    canvas.on('object:moving', (e) => {
      const target = e.target;
      if (!target) return;
      const others = canvas
        .getObjects()
        .filter((o) => o !== target && !o.excludeFromExport)
        .map(rectOf);
      const result = computeSnap(rectOf(target), canvas.getWidth(), canvas.getHeight(), others);
      if (result.left !== undefined) target.set('left', result.left);
      if (result.top !== undefined) target.set('top', result.top);
      if (result.guides.length > 0) drawGuides(result.guides);
      else hideGuides();
    });
    canvas.on('object:modified', hideGuides);

    async function populate() {
      if (initialJson) {
        await canvas.loadFromJSON(initialJson);
      } else {
        await buildCanvasFromTemplate(canvas, template, content, inter.style.fontFamily, device);
      }
      if (cancelled) return;
      canvas.requestRenderAll();
      onReady(canvas);
    }
    void populate();

    return () => {
      cancelled = true;
      onReady(null);
      canvas.dispose();
    };
    // Rebuilding on every content keystroke would fight the user's live edits — this effect only
    // reruns when the template/device/canvas size/loaded-creation actually changes (a new object
    // graph is genuinely needed), matching the "editable after generation" requirement: once
    // built, the canvas is the user's to edit until they explicitly change the template or open
    // a different saved ad. A single long-lived Canvas is disposed and recreated on the SAME
    // <canvas> DOM element across those transitions — deliberately not paired with a React `key`
    // on this component, which would make React tear down that DOM element concurrently with
    // this cleanup's own canvas.dispose() and throw (two independent things fighting over the
    // same node during unmount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.key, device, widthPx, heightPx, loadedCreationId]);

  return <canvas ref={canvasElRef} className="rounded-2xl shadow-2xl" />;
}
