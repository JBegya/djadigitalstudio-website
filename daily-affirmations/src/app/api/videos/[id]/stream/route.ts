import type { NextRequest } from 'next/server';
import { videoJobsStore } from '@/server/config/videoJobs';

export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 600;

/** Server-Sent Events progress feed for one video job — adapted from the pre-pivot app's own
 * generate/stream route (same polling-a-store-and-pushing shape), just polling VideoJobsStore
 * instead of an in-memory progress map, since only one job runs per generation here. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        if (closed) return;
        const job = videoJobsStore.get(jobId);
        if (!job) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Unknown job id' })}\n\n`));
          controller.close();
          closed = true;
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
        if (job.status !== 'running') {
          controller.close();
          closed = true;
        }
      };

      send();
      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        send();
        if (closed) clearInterval(interval);
      }, POLL_INTERVAL_MS);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
