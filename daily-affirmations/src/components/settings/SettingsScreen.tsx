'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { getSettings, updateSettings, type RedactedSettings } from '@/lib/api';
import { isElectron, pickFolder, pickImageFile } from '@/lib/desktop';
import type { SubtitlePosition, VoicePreset } from '@/types/domain';

const VOICE_OPTIONS: { value: VoicePreset; label: string }[] = [
  { value: 'warm-female', label: 'Warm Female' },
  { value: 'calm-female', label: 'Calm Female' },
  { value: 'warm-male', label: 'Warm Male' },
  { value: 'calm-male', label: 'Calm Male' },
];

const POSITION_OPTIONS: { value: SubtitlePosition; label: string }[] = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
];

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
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center text-muted-foreground">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
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
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Stored locally, never committed or shared. Leave blank to keep running in Test Mode.</CardDescription>
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
              <Field label="Pexels API Key" hint={settings.hasPexelsKey ? 'Connected' : 'Not configured — placeholder backgrounds used'}>
                <Input
                  type="password"
                  placeholder="563492…"
                  defaultValue={settings.pexelsApiKey}
                  onBlur={(e) => e.target.value !== settings.pexelsApiKey && save({ pexelsApiKey: e.target.value })}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Folders &amp; Branding</CardTitle>
              <CardDescription>{electron ? 'Browse to pick a folder or file.' : 'Paste an absolute path (folder browsing needs the desktop app).'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Output Folder">
                <PathRow
                  value={settings.outputFolder}
                  onChange={(v) => save({ outputFolder: v })}
                  onBrowse={electron ? async () => pickFolder(settings.outputFolder) : undefined}
                />
              </Field>
              <Field label="Music Folder">
                <PathRow
                  value={settings.musicFolder}
                  onChange={(v) => save({ musicFolder: v })}
                  onBrowse={electron ? async () => pickFolder(settings.musicFolder) : undefined}
                />
              </Field>
              <Field label="Logo">
                <PathRow
                  value={settings.logoPath}
                  onChange={(v) => save({ logoPath: v })}
                  onBrowse={electron ? async () => pickImageFile(settings.logoPath) : undefined}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Field label={`Video Length — ${settings.videoLengthSeconds}s`}>
                <Slider
                  min={15}
                  max={30}
                  step={1}
                  value={[settings.videoLengthSeconds]}
                  onValueChange={([v]) => setSettings({ ...settings, videoLengthSeconds: v ?? settings.videoLengthSeconds })}
                  onValueCommit={([v]) => save({ videoLengthSeconds: v })}
                />
              </Field>
              <Field label="Voice">
                <Select value={settings.voice} onValueChange={(v: VoicePreset) => save({ voice: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subtitles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Font Family">
                <Input
                  defaultValue={settings.subtitleFont}
                  onBlur={(e) => e.target.value !== settings.subtitleFont && save({ subtitleFont: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Colour">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-12 cursor-pointer rounded-md border border-input bg-secondary/40"
                      value={settings.subtitleColor}
                      onChange={(e) => save({ subtitleColor: e.target.value })}
                    />
                    <Input
                      value={settings.subtitleColor}
                      onChange={(e) => setSettings({ ...settings, subtitleColor: e.target.value })}
                      onBlur={(e) => save({ subtitleColor: e.target.value })}
                    />
                  </div>
                </Field>
                <Field label="Position">
                  <Select value={settings.subtitlePosition} onValueChange={(v: SubtitlePosition) => save({ subtitlePosition: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
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
