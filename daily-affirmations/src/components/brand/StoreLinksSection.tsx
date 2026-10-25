'use client';

import { AutosaveInput } from '@/components/brand/AutosaveField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProductProfile } from '@/types/domain';

export function StoreLinksSection({ product, onPatch }: { product: ProductProfile; onPatch: (patch: Partial<ProductProfile>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Links</CardTitle>
        <CardDescription>Used for store badges and CTA links in generated ads.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <AutosaveInput label="App Store URL" value={product.appStoreUrl ?? ''} onSave={(v) => onPatch({ appStoreUrl: v })} placeholder="https://apps.apple.com/…" />
        <AutosaveInput label="Google Play URL" value={product.googlePlayUrl ?? ''} onSave={(v) => onPatch({ googlePlayUrl: v })} placeholder="https://play.google.com/…" />
        <AutosaveInput label="Website URL" value={product.websiteUrl ?? ''} onSave={(v) => onPatch({ websiteUrl: v })} placeholder="https://…" />
        <AutosaveInput label="Privacy Policy URL" value={product.privacyUrl ?? ''} onSave={(v) => onPatch({ privacyUrl: v })} placeholder="https://…" />
        <AutosaveInput label="Terms of Service URL" value={product.termsUrl ?? ''} onSave={(v) => onPatch({ termsUrl: v })} placeholder="https://…" />
      </CardContent>
    </Card>
  );
}
