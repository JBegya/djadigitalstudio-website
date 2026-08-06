'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSettings, openLogsFolder, updateSettings, type RedactedSettings } from '@/lib/api';
import { isElectron, pickFolder } from '@/lib/desktop';

export function SettingsScreen() {
  const [settings, setSettings] = useState<RedactedSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const electron = isElectron();

  useEffect(() => {
    getSettings().then(setSettings).catch(() => toast.error('Could not load settings'));
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
