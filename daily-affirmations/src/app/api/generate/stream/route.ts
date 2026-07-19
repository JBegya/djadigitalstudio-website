import type { NextRequest } from 'next/server';
import { getRun } from '@/server/pipeline/progressStore';

export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 600;

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get('runId');
  if (!runId) {
    return new Response('Missing runId', { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        if (closed) return;
        const run = getRun(runId);
        if (!run) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Unknown runId' })}\n\n`));
          controller.close();
          closed = true;
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(run)}\n\n`));
        if (run.status !== 'running') {
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
