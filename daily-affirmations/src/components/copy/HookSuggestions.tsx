'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getHookSuggestions } from '@/lib/api';
import type { CustomerPersona, MarketingPackObjective, ProductFeature, ProductProfile } from '@/types/domain';

/**
 * The AI Copy Assistant's entry point — offers 0-3 AI-varied phrasings of an already-typed hook,
 * grounded in this product/feature/persona's own stored Marketing Intelligence. Shared between the
 * Wizard's batch-creation hook field and the Marketing Library's "New Version" hook field, since
 * both need identical behavior and both already have every prop this needs in scope.
 */
export function HookSuggestions({
  product,
  feature,
  persona,
  currentHook,
  objective,
  onSelect,
}: {
  product: ProductProfile;
  feature: ProductFeature;
  persona: CustomerPersona | null;
  currentHook: string;
  objective?: MarketingPackObjective;
  onSelect: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ suggestions: string[]; source: 'openai' | 'mock' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setExpanded(true);
    setLoading(true);
    setError(null);
    try {
      const res = await getHookSuggestions({ productId: product.id, featureKey: feature.key, personaId: persona?.id, currentHook, objective });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not get AI suggestions';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={expanded ? () => setExpanded(false) : run}
        disabled={!currentHook.trim()}
        className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
      >
        {expanded ? 'Hide AI suggestions' : '✨ AI Suggestions'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-dashed border-border p-2.5">
          {loading && <p className="text-xs text-muted-foreground">Generating…</p>}

          {!loading && error && (
            <div className="space-y-1.5">
              <p className="text-xs text-destructive">{error}</p>
              <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={run}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && result?.suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground">No distinct suggestions this time — try again or edit the hook manually.</p>
          )}

          {!loading &&
            result?.suggestions.map((suggestion, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 px-2 py-1.5 text-xs">
                <span className="text-foreground">{suggestion}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 shrink-0 px-2 text-xs"
                  onClick={() => {
                    onSelect(suggestion);
                    setExpanded(false);
                  }}
                >
                  Use this
                </Button>
              </div>
            ))}

          {!loading && result?.source === 'mock' && (
            <p className="text-xs text-muted-foreground">Test Mode — showing mock suggestions. Add an OpenAI API key in Settings for real AI copy.</p>
          )}

          {!loading && result && !error && (
            <button type="button" onClick={run} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
