'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { listHistory } from '@/lib/api';
import { formatDateLabel } from '@/lib/utils';
import type { GenerationHistoryEntry } from '@/types/domain';

const STATUS_VARIANT: Record<GenerationHistoryEntry['status'], 'success' | 'warning' | 'destructive'> = {
  complete: 'success',
  partial: 'warning',
  failed: 'destructive',
};

export function HistoryScreen() {
  const router = useRouter();
  const [runs, setRuns] = useState<GenerationHistoryEntry[] | null>(null);

  useEffect(() => {
    listHistory(90).then(({ runs }) => setRuns(runs));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-foreground">Generation History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every daily run, most recent first.</p>

        <div className="mt-8 space-y-3">
          {runs?.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                <CalendarDays className="h-6 w-6" />
                <p className="text-sm">No videos generated yet — head to Home and click Generate Today&apos;s Videos.</p>
              </CardContent>
            </Card>
          )}

          {runs?.map((run) => {
            const nurseCount = run.videos.filter((v) => v.brand === 'nurse').length;
            const autismCount = run.videos.filter((v) => v.brand === 'autism').length;
            return (
              <Card
                key={run.runId}
                className="cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => router.push(`/preview?date=${run.date}`)}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-medium text-foreground">{formatDateLabel(run.date)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {nurseCount} Nurse · {autismCount} Autism Parent · {run.videos.length} of 6 videos
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
                </CardContent>
              </Card>
            );
          })}

          {runs === null && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        </div>
      </main>
    </div>
  );
}
