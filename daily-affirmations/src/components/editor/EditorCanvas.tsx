'use client';

import { useEffect, useRef } from 'react';
import { Canvas, FabricObject, Line } from 'fabric';
import type { TemplateDefinition } from '@/types/domain';
import { buildCanvasFromTemplate, type RectPx, type SlotContent } from '@/lib/editor/templateToCanvas';
import { computeSnap } from '@/lib/editor/snapping';
import type { MockupDevice } from '@/lib/editor/deviceMockup';
import { inter } from '@/lib/fonts';

const GUIDE_COLOR = '#7c9cff';

/** Fabric refuses to let two Canvas instances wrap the same `<canvas>` DOM element at once
 * ("Trying to initialize a canvas that has already been initialized"). Normally there's only ever
 * one, but React 18 Strict Mode's dev-only double-invoke (mount → cleanup → mount) can start a
 * second effect run before the first one's async population has settled enough to safely dispose
 * — tracked here per element so a new run waits for the previous one's disposal to actually finish
 * before constructing its own Canvas on the same node. Empty/resolved for the common case (a
 * never-before-used element, or production's single real mount), so this adds no real delay there. */
const pendingDisposal = new WeakMap<HTMLCanvasElement, Promise<void>>();

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
    const el = canvasElRef.current;
    if (!el) return undefined;
    let cancelled = false;
    let canvas: Canvas | null = null;

    function hideGuides() {
      if (!canvas) return;
      for (const line of guideLinesRef.current) canvas.remove(line);
      guideLinesRef.current = [];
    }

    function drawGuides(guides: ReturnType<typeof computeSnap>['guides']) {
      const activeCanvas = canvas;
      if (!activeCanvas) return;
      hideGuides();
      guideLinesRef.current = guides.map((guide) =>
        guide.orientation === 'vertical'
          ? new Line([guide.position, 0, guide.position, activeCanvas.getHeight()], { stroke: GUIDE_COLOR, strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true })
          : new Line([0, guide.position, activeCanvas.getWidth(), guide.position], { stroke: GUIDE_COLOR, strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true }),
      );
      guideLinesRef.current.forEach((line) => activeCanvas.add(line));
      activeCanvas.requestRenderAll();
    }

    // Wait for any still-in-flight disposal of a previous Canvas on this same DOM element (see
    // pendingDisposal's doc comment) before constructing a new one — Fabric throws if two Canvas
    // instances ever wrap the same element at once.
    const ready = (pendingDisposal.get(el) ?? Promise.resolve()).then(async () => {
      if (cancelled) return;
      canvas = new Canvas(el, { width: widthPx, height: heightPx, preserveObjectStacking: true });

      canvas.on('object:moving', (e) => {
        const target = e.target;
        if (!target || !canvas) return;
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

      if (initialJson) {
        await canvas.loadFromJSON(initialJson);
      } else {
        await buildCanvasFromTemplate(canvas, template, content, inter.style.fontFamily, device);
      }
      if (cancelled) return;
      canvas.requestRenderAll();
      onReady(canvas);
    });
    const readySettled = ready.catch(() => {});

    return () => {
      cancelled = true;
      onReady(null);
      // Deferred until population has actually settled — disposing a canvas the instant cleanup
      // fires would race Fabric's still-running loadFromJSON/buildCanvasFromTemplate and throw
      // "Cannot read properties of undefined (reading 'clearRect')" once it resumes against an
      // already-torn-down context. React 18 Strict Mode's dev-only double-invoke (mount → cleanup
      // → mount) reliably hits this, since the first effect's population is usually still pending
      // when its own cleanup runs.
      const disposal = readySettled.then(() => {
        canvas?.dispose();
      });
      pendingDisposal.set(el, disposal);
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
