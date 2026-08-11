'use client';

import { AutosaveInput } from '@/components/brand/AutosaveField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BackgroundStyle, ButtonStyle, ProductProfile, StoreBadgeStyle } from '@/types/domain';

const BUTTON_STYLE_OPTIONS: Array<{ value: ButtonStyle; label: string }> = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
  { value: 'square', label: 'Square' },
];

const BACKGROUND_OPTIONS: Array<{ value: BackgroundStyle; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'photo', label: 'Photo' },
];

const BADGE_STYLE_OPTIONS: Array<{ value: StoreBadgeStyle; label: string }> = [
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
  { value: 'outline', label: 'Outline' },
];

export function BrandGuidelinesSection({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  const guidelines = product.brandGuidelines;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Guidelines</CardTitle>
        <CardDescription>Beyond colors — the visual rules every generated ad should follow, so ads stay on-brand without re-deciding each time.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <AutosaveInput label="Typography" value={product.fontFamily ?? ''} onSave={(v) => onPatch({ fontFamily: v })} placeholder="e.g. Inter" />
        <AutosaveInput
          label="Corner Radius (px)"
          value={String(guidelines.cornerRadiusPx)}
          onSave={(v) => onPatch({ brandGuidelines: { ...guidelines, cornerRadiusPx: Number(v) || 0 } })}
        />
        <AutosaveInput
          label="Logo Clear Space (px)"
          value={String(guidelines.logoClearSpacePx)}
          onSave={(v) => onPatch({ brandGuidelines: { ...guidelines, logoClearSpacePx: Number(v) || 0 } })}
        />
        <SelectField
          label="Button Style"
          value={guidelines.buttonStyle}
          options={BUTTON_STYLE_OPTIONS}
          onChange={(v) => onPatch({ brandGuidelines: { ...guidelines, buttonStyle: v } })}
        />
        <SelectField
          label="Preferred Background"
          value={guidelines.preferredBackground}
          options={BACKGROUND_OPTIONS}
          onChange={(v) => onPatch({ brandGuidelines: { ...guidelines, preferredBackground: v } })}
        />
        <SelectField
          label="Store Badge Style"
          value={guidelines.storeBadgeStyle}
          options={BADGE_STYLE_OPTIONS}
          onChange={(v) => onPatch({ brandGuidelines: { ...guidelines, storeBadgeStyle: v } })}
        />
      </CardContent>
    </Card>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
