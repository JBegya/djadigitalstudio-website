'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSettings, listProducts, openLogsFolder, updateSettings, type RedactedSettings } from '@/lib/api';
import { isElectron, pickFolder } from '@/lib/desktop';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import type { ProductProfile } from '@/types/domain';

const MIN_REMINDER_DAYS = 1;
const MAX_REMINDER_DAYS = 3650;

function clampReminderDays(value: number): number {
  if (!Number.isFinite(value)) return MIN_REMINDER_DAYS;
  return Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, Math.round(value)));
}

export function SettingsScreen() {
  const [settings, setSettings] = useState<RedactedSettings | null>(null);
  const [products, setProducts] = useState<ProductProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const electron = isElectron();

  useEffect(() => {
    getSettings().then(setSettings).catch(() => toast.error('Could not load settings'));
    listProducts()
      .then((r) => setProducts(r.products))
      .catch(() => toast.error('Could not load products'));
  }, []);

  async function save(patch: Partial<RedactedSettings>) {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    try {
      const next = await updateSettings(patch);
      setSettings(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  function toggleRequiredPlatform(productId: string, contentTypeKey: string) {
    if (!settings) return;
    const current = settings.requiredPublishingPlatformKeysByProduct?.[productId] ?? [];
    const next = current.includes(contentTypeKey) ? current.filter((k) => k !== contentTypeKey) : [...current, contentTypeKey];
    save({
      requiredPublishingPlatformKeysByProduct: {
        ...(settings.requiredPublishingPlatformKeysByProduct ?? {}),
        [productId]: next,
      },
    });
  }

  if (!settings) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-muted-foreground">Loading settings…</div>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Changes save automatically.</p>
        </div>
        {saving && <Badge variant="secondary">Saving…</Badge>}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Key</CardTitle>
            <CardDescription>Stored locally, never committed or shared. Leave blank to keep running in Test Mode (mock ad copy).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="OpenAI API Key" hint={settings.hasOpenAiKey ? 'Connected' : 'Not configured — Test Mode active'}>
              <Input
                type="password"
                placeholder="sk-…"
                defaultValue={settings.openaiApiKey}
                onBlur={(e) => e.target.value !== settings.openaiApiKey && save({ openaiApiKey: e.target.value })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exports</CardTitle>
            <CardDescription>{electron ? 'Browse to pick a folder.' : 'Paste an absolute path (folder browsing needs the desktop app).'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Output Folder">
              <PathRow value={settings.outputFolder} onChange={(v) => save({ outputFolder: v })} onBrowse={electron ? async () => pickFolder(settings.outputFolder) : undefined} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>
              Which platforms each product is actually meant to be marketed on — used to judge whether a Marketing Pack is ready to publish. Leave a
              product unconfigured to skip that check for it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add a product in Brand Manager to configure its required platforms.</p>
            ) : (
              products.map((product) => (
                <div key={product.id}>
                  <Label className="text-sm">{product.name}</Label>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                    {CONTENT_TYPES.map((ct) => {
                      const checked = (settings.requiredPublishingPlatformKeysByProduct?.[product.id] ?? []).includes(ct.key);
                      return (
                        <label key={ct.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRequiredPlatform(product.id, ct.key)}
                            className="h-3.5 w-3.5 rounded border-border accent-primary"
                          />
                          {ct.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <Field label="Draft reminder (days)">
                <ReminderDaysInput value={settings.draftReminderDays ?? 30} onChange={(next) => save({ draftReminderDays: next })} />
              </Field>
              <Field label="Refresh reminder (days)">
                <ReminderDaysInput value={settings.refreshReminderDays ?? 183} onChange={(next) => save({ refreshReminderDays: next })} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnostics</CardTitle>
            <CardDescription>Every session writes a detailed log to disk — useful if something fails or looks wrong.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const result = await openLogsFolder();
                if (!result.ok) toast.error(result.error ?? 'Could not open the logs folder');
              }}
            >
              Open Logs Folder
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Controlled (unlike the password/API-key field above) specifically so a clamped value is
 * visibly reflected back into the input immediately — entering 0 or 99999999 and blurring should
 * show the corrected number, not silently save something different from what's displayed. */
function ReminderDaysInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);

  function commit() {
    const clamped = clampReminderDays(Number(local));
    setLocal(String(clamped));
    if (clamped !== value) onChange(clamped);
  }

  return <Input type="number" min={MIN_REMINDER_DAYS} max={MAX_REMINDER_DAYS} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={commit} />;
}

function PathRow({ value, onChange, onBrowse }: { value: string; onChange: (v: string) => void; onBrowse?: () => Promise<string | null> }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div className="flex gap-2">
      <Input value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => local !== value && onChange(local)} />
      {onBrowse && (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const picked = await onBrowse();
            if (picked) {
              setLocal(picked);
              onChange(picked);
            }
          }}
        >
          Browse
        </Button>
      )}
    </div>
  );
}
