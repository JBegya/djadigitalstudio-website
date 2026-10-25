'use client';

import type { TemplateDefinition } from '@/types/domain';
import { cn } from '@/lib/utils';

export function TemplatePicker({ templates, value, onChange }: { templates: TemplateDefinition[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</p>
      {templates.map((template) => (
        <button
          key={template.key}
          type="button"
          onClick={() => onChange(template.key)}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
            value === template.key ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-transparent hover:bg-secondary/50',
          )}
        >
          <p className="text-sm font-medium text-foreground">{template.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
        </button>
      ))}
    </div>
  );
}
