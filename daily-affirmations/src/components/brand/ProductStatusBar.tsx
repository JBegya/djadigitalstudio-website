'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlatformAvailability, ProductProfile, ProductStatus } from '@/types/domain';

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'beta', label: 'Beta' },
  { value: 'released', label: 'Released' },
  { value: 'archived', label: 'Archived' },
];

const AVAILABILITY_OPTIONS: Array<{ value: PlatformAvailability; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'coming-soon', label: 'Coming Soon' },
  { value: 'not-planned', label: 'Not Planned' },
];

export function ProductStatusBar({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/40 px-4 py-3">
      <StatusField label="Status" value={product.status} options={STATUS_OPTIONS} onChange={(v) => onPatch({ status: v })} />
      <StatusField label="App Store" value={product.appStoreAvailability} options={AVAILABILITY_OPTIONS} onChange={(v) => onPatch({ appStoreAvailability: v })} />
      <StatusField label="Google Play" value={product.googlePlayAvailability} options={AVAILABILITY_OPTIONS} onChange={(v) => onPatch({ googlePlayAvailability: v })} />
    </div>
  );
}

function StatusField<T extends string>({
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
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="h-8 w-36 text-xs">
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
