'use client';

import { cn } from '@/lib/utils';
import type { TemplateDefinition } from '@/types/domain';

export function WizardStyleStep({
  templates,
  value,
  onChange,
}: {
  templates: TemplateDefinition[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <button
          key={template.key}
          type="button"
          onClick={() => onChange(template.key)}
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-left transition-colors',
            value === template.key ? 'border-primary/60 bg-secondary text-secondary-foreground' : 'border-border hover:bg-secondary/50',
          )}
        >
          <p className="text-sm font-medium text-foreground">{template.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
        </button>
      ))}
    </div>
  );
}
