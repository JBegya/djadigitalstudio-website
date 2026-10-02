'use client';

import type { MockupDevice } from '@/lib/editor/deviceMockup';
import { cn } from '@/lib/utils';

const DEVICES: { value: MockupDevice; label: string }[] = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'watch', label: 'Apple Watch' },
  { value: 'ipad', label: 'iPad' },
];

export function DeviceMockupPicker({ value, onChange }: { value: MockupDevice; onChange: (device: MockupDevice) => void }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device mockup</p>
      <div className="flex gap-2">
        {DEVICES.map((device) => (
          <button
            key={device.value}
            type="button"
            onClick={() => onChange(device.value)}
            className={cn(
              'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
              value === device.value ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-transparent text-muted-foreground hover:bg-secondary/50',
            )}
          >
            {device.label}
          </button>
        ))}
      </div>
    </div>
  );
}
