'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FolderOpen, History, PlayCircle, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSettings, listHistory, startGeneration, type RedactedSettings } from '@/lib/api';
import { openFolderPath } from '@/lib/desktop';
import { formatDateLabel } from '@/lib/utils';
import type { GenerationHistoryEntry } from '@/types/domain';
import { toast } from 'sonner';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function HomeScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<RedactedSettings | null>(null);
  const [lastRun, setLastRun] = useState<GenerationHistoryEntry | null>(null);
  const [starting, setStarting] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
    listHistory(1)
      .then(({ runs }) => setLastRun(runs[0] ?? null))
      .catch(() => {});
  }, []);

  const todaysDate = today();
  const readyForToday = lastRun?.date === todaysDate && lastRun.status !== 'failed';

  async function handleGenerate() {
    setStarting(true);
    try {
      const { runId, alreadyRunning } = await startGeneration();
      if (alreadyRunning) toast.info('A generation run is already in progress — jumping to it.');
      router.push(`/generate?runId=${runId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start generation');
      setStarting(false);
    }
  }

  async function handleOpenExportFolder() {
    if (!settings) return;
    setOpeningFolder(true);
    try {
      const result = await openFolderPath(settings.outputFolder);
      if (!result.ok) toast.error(result.error ?? 'Could not open the export folder');
    } finally {
      setOpeningFolder(false);
    }
  }

  const needsSetup = settings && !settings.hasOpenAiKey;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-nurse shadow-lg shadow-primary/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">DJ&amp;A Daily Affirmations</h1>
          <p className="mt-3 text-balance text-base text-muted-foreground">
            {formatDateLabel(todaysDate)} — three Nurse Affirmation videos, three Autism Parent Affirmation videos, ready to post.
          </p>
        </motion.div>

        {needsSetup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-6">
            <Badge variant="warning" className="px-3 py-1">
              Running in Test Mode — add your OpenAI &amp; Pexels API keys in Settings for real content
            </Badge>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="mt-12 w-full"
        >
          <Button size="lg" className="h-16 w-full max-w-md text-lg shadow-xl shadow-primary/20" onClick={handleGenerate} disabled={starting}>
            <Sparkles className="h-5 w-5" />
            {starting ? 'Starting…' : "Generate Today's Videos"}
          </Button>
          {readyForToday && <p className="mt-3 text-sm text-muted-foreground">Today&apos;s videos are already generated — running again will add a new set.</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <ActionCard icon={PlayCircle} label="Preview Videos" onClick={() => router.push('/preview')} />
          <ActionCard icon={FolderOpen} label="Open Export Folder" onClick={handleOpenExportFolder} loading={openingFolder} />
          <ActionCard icon={History} label="Generation History" onClick={() => router.push('/history')} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/settings')} className="text-muted-foreground">
            <SettingsIcon className="h-4 w-4" />
            Settings
          </Button>
        </motion.div>
      </main>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  onClick,
  loading,
}: {
  icon: typeof PlayCircle;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Card className="glass-panel cursor-pointer transition-transform hover:-translate-y-0.5 hover:border-primary/40" onClick={onClick}>
      <CardContent className="flex flex-col items-center gap-2 p-5">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-foreground">{loading ? 'Opening…' : label}</span>
      </CardContent>
    </Card>
  );
}
