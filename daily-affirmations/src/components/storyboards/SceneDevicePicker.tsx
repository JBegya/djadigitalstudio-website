'use client';

import { cn } from '@/lib/utils';
import type { DeviceKind } from '@/types/domain';

const DEVICES: { value: DeviceKind; label: string }[] = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'watch', label: 'Apple Watch' },
  { value: 'ipad', label: 'iPad' },
  { value: 'mac', label: 'Mac' },
];

/** Copies DeviceMockupPicker.tsx's toggle-button visual pattern, but for an optional per-scene
 * device (that component requires a non-optional value and its own DEVICES array omits 'mac'). */
export function SceneDevicePicker({ value, onChange }: { value?: DeviceKind; onChange: (device: DeviceKind | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Device</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            'rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
            !value ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-transparent text-muted-foreground hover:bg-secondary/50',
          )}
        >
          None
        </button>
        {DEVICES.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => onChange(d.value)}
            className={cn(
              'rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
              value === d.value ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-transparent text-muted-foreground hover:bg-secondary/50',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
