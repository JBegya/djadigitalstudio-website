'use client';

import { useEffect, useState } from 'react';
import { Canvas, FabricImage, FabricObject, Group, Textbox } from 'fabric';
import { Label } from '@/components/ui/label';

export function PropertiesPanel({ canvas }: { canvas: Canvas | null }) {
  const [selected, setSelected] = useState<FabricObject | null>(null);

  useEffect(() => {
    if (!canvas) {
      setSelected(null);
      return undefined;
    }
    const sync = () => setSelected(canvas.getActiveObject() ?? null);
    const clear = () => setSelected(null);
    canvas.on('selection:created', sync);
    canvas.on('selection:updated', sync);
    canvas.on('selection:cleared', clear);
    canvas.on('object:modified', sync);
    return () => {
      canvas.off('selection:created', sync);
      canvas.off('selection:updated', sync);
      canvas.off('selection:cleared', clear);
      canvas.off('object:modified', sync);
    };
  }, [canvas]);

  if (!canvas) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <BackgroundSection canvas={canvas} />
      {selected instanceof Textbox && <TextSection key={selected.toString() + selected.left} textbox={selected} canvas={canvas} />}
      {(selected instanceof Group || selected instanceof FabricImage) && <TransformSection key={selected.toString() + selected.left} object={selected} canvas={canvas} />}
      {!selected && <p className="text-sm text-muted-foreground">Select an element on the canvas to edit it.</p>}
    </div>
  );
}

function BackgroundSection({ canvas }: { canvas: Canvas }) {
  const [color, setColor] = useState(() => (typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : '#0a0a0c'));

  return (
    <div className="space-y-1.5">
      <Label>Background</Label>
      <input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          canvas.backgroundColor = e.target.value;
          canvas.requestRenderAll();
        }}
        className="h-10 w-full cursor-pointer rounded-md border border-input bg-secondary/40"
      />
    </div>
  );
}

function TextSection({ textbox, canvas }: { textbox: Textbox; canvas: Canvas }) {
  const [text, setText] = useState(textbox.text);
  const [fontSize, setFontSize] = useState(textbox.fontSize);
  const [fill, setFill] = useState(typeof textbox.fill === 'string' ? textbox.fill : '#f5f5f7');

  function apply(patch: Partial<{ text: string; fontSize: number; fill: string }>) {
    textbox.set(patch);
    canvas.requestRenderAll();
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="space-y-1.5">
        <Label>Text</Label>
        <textarea
          className="w-full rounded-md border border-input bg-secondary/40 p-2 text-sm text-foreground"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            apply({ text: e.target.value });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Font size — {fontSize}px</Label>
        <input
          type="range"
          min={12}
          max={120}
          value={fontSize}
          onChange={(e) => {
            const value = Number(e.target.value);
            setFontSize(value);
            apply({ fontSize: value });
          }}
          className="w-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <input
          type="color"
          value={fill}
          onChange={(e) => {
            setFill(e.target.value);
            apply({ fill: e.target.value });
          }}
          className="h-10 w-full cursor-pointer rounded-md border border-input bg-secondary/40"
        />
      </div>
    </div>
  );
}

function TransformSection({ object, canvas }: { object: FabricObject; canvas: Canvas }) {
  const [width, setWidth] = useState(Math.round(object.getScaledWidth()));
  const [height, setHeight] = useState(Math.round(object.getScaledHeight()));
  const [left, setLeft] = useState(Math.round(object.left ?? 0));
  const [top, setTop] = useState(Math.round(object.top ?? 0));

  function applyWidth(value: number) {
    const scale = value / (object.width || 1);
    object.set({ scaleX: scale, scaleY: scale });
    setWidth(value);
    setHeight(Math.round(object.getScaledHeight()));
    canvas.requestRenderAll();
  }
  function applyLeft(value: number) {
    object.set({ left: value });
    setLeft(value);
    canvas.requestRenderAll();
  }
  function applyTop(value: number) {
    object.set({ top: value });
    setTop(value);
    canvas.requestRenderAll();
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <Label>Size &amp; position</Label>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Width" value={width} onChange={applyWidth} />
        <NumberField label="Height" value={height} disabled />
        <NumberField label="X" value={left} onChange={applyLeft} />
        <NumberField label="Y" value={top} onChange={applyTop} />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="block w-full rounded-md border border-input bg-secondary/40 px-2 py-1.5 text-sm text-foreground disabled:opacity-50"
      />
    </label>
  );
}
