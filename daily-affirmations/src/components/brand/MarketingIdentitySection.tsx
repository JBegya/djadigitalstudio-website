'use client';

import { AutosaveInput, AutosaveTextarea, TagListInput } from '@/components/brand/AutosaveField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarketingIdentity, ProductProfile } from '@/types/domain';

export function MarketingIdentitySection({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  const identity = product.marketingIdentity;

  function patchIdentity(fields: Partial<MarketingIdentity>) {
    onPatch({ marketingIdentity: { ...identity, ...fields } });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Marketing Identity — Positioning</CardTitle>
          <CardDescription>Why this app exists, who it&apos;s for, and the problem it solves — the case for why someone should download it today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AutosaveTextarea
            label="Why This App Exists"
            value={identity.whyThisAppExists}
            onSave={(v) => patchIdentity({ whyThisAppExists: v })}
            placeholder="The deeper purpose, beyond technical function — the emotional foundation every ad traces back to."
          />
          <AutosaveTextarea label="Mission" value={identity.mission} onSave={(v) => patchIdentity({ mission: v })} />
          <AutosaveInput label="Core Promise" value={identity.corePromise} onSave={(v) => patchIdentity({ corePromise: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TagListInput label="Primary Audience" value={identity.primaryAudience} onChange={(v) => patchIdentity({ primaryAudience: v })} placeholder="e.g. Nurses" />
            <TagListInput
              label="Secondary Audience"
              value={identity.secondaryAudience}
              onChange={(v) => patchIdentity({ secondaryAudience: v })}
              placeholder="e.g. Retail workers"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TagListInput label="Core Problems" value={identity.coreProblems} onChange={(v) => patchIdentity({ coreProblems: v })} />
            <TagListInput label="Pain Points" value={identity.painPoints} onChange={(v) => patchIdentity({ painPoints: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Identity — Emotional Story</CardTitle>
          <CardDescription>What someone feels before and after, and the real-world moments that make them likely to act.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TagListInput label="Emotional Triggers" value={identity.emotionalTriggers} onChange={(v) => patchIdentity({ emotionalTriggers: v })} />
            <TagListInput label="Benefits" value={identity.benefits} onChange={(v) => patchIdentity({ benefits: v })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AutosaveInput
              label="Transformation — From"
              value={identity.transformation.from}
              onSave={(v) => patchIdentity({ transformation: { ...identity.transformation, from: v } })}
              placeholder={'"I hope I was paid correctly."'}
            />
            <AutosaveInput
              label="Transformation — To"
              value={identity.transformation.to}
              onSave={(v) => patchIdentity({ transformation: { ...identity.transformation, to: v } })}
              placeholder={'"I know exactly what I should be paid."'}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TagListInput
              label="Buying Triggers"
              value={identity.buyingTriggers}
              onChange={(v) => patchIdentity({ buyingTriggers: v })}
              placeholder="e.g. Payroll mistake"
            />
            <TagListInput label="Objections" value={identity.objections} onChange={(v) => patchIdentity({ objections: v })} placeholder="e.g. It's too expensive" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Identity — Brand Voice</CardTitle>
          <CardDescription>How this product talks — so every future ad, headline, and AI-assisted copy sounds consistent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TagListInput label="Brand Personality" value={identity.brandPersonality} onChange={(v) => patchIdentity({ brandPersonality: v })} placeholder="e.g. Trustworthy" />
            <AutosaveInput label="Communication Style" value={identity.communicationStyle} onSave={(v) => patchIdentity({ communicationStyle: v })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TagListInput label="Words We Prefer" value={identity.wordsWePrefer} onChange={(v) => patchIdentity({ wordsWePrefer: v })} />
            <TagListInput label="Words We Avoid" value={identity.wordsWeAvoid} onChange={(v) => patchIdentity({ wordsWeAvoid: v })} />
          </div>
          <TagListInput
            label="Style Guardrails"
            value={identity.styleGuardrails}
            onChange={(v) => patchIdentity({ styleGuardrails: v })}
            placeholder="e.g. Never sensational"
          />
          <AutosaveTextarea label="Core Message" value={identity.coreMessage} onSave={(v) => patchIdentity({ coreMessage: v })} />
          <AutosaveInput label="Call To Action" value={identity.callToAction} onSave={(v) => patchIdentity({ callToAction: v })} />
          <AutosaveTextarea
            label="Success Story"
            value={identity.successStory}
            onSave={(v) => patchIdentity({ successStory: v })}
            placeholder="A real customer narrative, once one exists."
          />
        </CardContent>
      </Card>
    </>
  );
}
