'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WizardShell({
  stepNumber,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
}: {
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled: boolean;
}) {
  const router = useRouter();

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-6 py-10">
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < stepNumber ? 'bg-primary' : 'bg-secondary')} />
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Step {stepNumber} of {totalSteps}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}

      <div className="mt-6 flex-1 overflow-y-auto">{children}</div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={() => router.push('/')}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button type="button" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}
