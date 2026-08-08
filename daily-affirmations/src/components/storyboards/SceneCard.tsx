'use client';

import { AlertTriangle } from 'lucide-react';
import { AutosaveInput, AutosaveTextarea } from '@/components/brand/AutosaveField';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SceneDevicePicker } from './SceneDevicePicker';
import type { ProductScreenshot, StoryboardScene } from '@/types/domain';

const NO_SCREENSHOT = '__none__';

export function SceneCard({
  scene,
  screenshots,
  flagged,
  onChange,
}: {
  scene: StoryboardScene;
  screenshots: ProductScreenshot[];
  flagged: boolean;
  onChange: (patch: Partial<StoryboardScene>) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Scene {scene.number}</Badge>
        <Badge variant="outline">{scene.goal}</Badge>
        {flagged && (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Review needed
          </Badge>
        )}
      </div>
      {flagged && <p className="text-xs text-amber-500">Uses a word from your Words We Avoid list — review before use.</p>}

      <AutosaveTextarea label="Visual" value={scene.visualDescription} onSave={(v) => onChange({ visualDescription: v })} />
      <AutosaveTextarea label="On-screen text" value={scene.onScreenText} onSave={(v) => onChange({ onScreenText: v })} />
      <AutosaveTextarea label="Voiceover" value={scene.voiceover} onSave={(v) => onChange({ voiceover: v })} />
      <AutosaveInput label="CTA (optional)" value={scene.cta ?? ''} onSave={(v) => onChange({ cta: v.trim() || undefined })} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Screenshot</Label>
          <Select value={scene.screenshotId ?? NO_SCREENSHOT} onValueChange={(v) => onChange({ screenshotId: v === NO_SCREENSHOT ? undefined : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SCREENSHOT}>None</SelectItem>
              {screenshots.map((shot) => (
                <SelectItem key={shot.id} value={shot.id}>
                  {shot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SceneDevicePicker value={scene.device} onChange={(d) => onChange({ device: d })} />
      </div>
    </div>
  );
}
