import { list as listCommands } from "../../slash";
import { env } from "../../config/env";
import {
  subscribe,
  unsubscribe,
  getEventsSince,
  type AppEvent,
} from "../../events/bus";

const encoder = new TextEncoder();

function encodeSseSnapshot(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function encodeSseEvent(seq: number, payload: unknown): Uint8Array {
  return encoder.encode(
    `id: ${seq}\ndata: ${JSON.stringify(payload)}\n\n`,
  );
}

function buildIncomeVsSavingsMetricSpec() {
  return {
    elements: {
      "income-vs-savings": {
        children: [],
        props: {
          income: 4800,
          savings: 1200,
          title: "Income vs savings",
        },
        type: "IncomeVsSavingsMetric",
      },
    },
    root: "income-vs-savings",
  };
}

export function handleEventsGet(request: Request): Response {
  const lastEventId = request.headers.get("Last-Event-ID");
  const lastSeq =
    lastEventId && /^\d+$/.test(lastEventId)
      ? Number(lastEventId)
      : null;

  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let onBusEvent: ((event: AppEvent) => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 1. Send snapshots (no SSE id)
      controller.enqueue(
        encodeSseSnapshot({
          channel: "metrics",
          id: crypto.randomUUID(),
          payload: {
            metricId: "income-vs-savings",
            spec: buildIncomeVsSavingsMetricSpec(),
          },
          sentAt: new Date().toISOString(),
          type: "metrics.upsert",
        }),
      );

      controller.enqueue(
        encodeSseSnapshot({
          channel: "commands",
          id: crypto.randomUUID(),
          payload: { commands: listCommands() },
          sentAt: new Date().toISOString(),
          type: "commands.snapshot",
        }),
      );

      // 2. Subscribe to live bus first, buffer events
      const buffer: AppEvent[] = [];
      let streaming = false;

      onBusEvent = (event: AppEvent) => {
        if (streaming) {
          controller.enqueue(encodeSseEvent(event.seq!, event));
        } else {
          buffer.push(event);
        }
      };
      subscribe(onBusEvent);

      // 3. Replay from DB if Last-Event-ID was provided
      if (lastSeq !== null) {
        const missed = await getEventsSince(lastSeq);
        const replayedSeqs = new Set<number>();

        for (const event of missed) {
          controller.enqueue(encodeSseEvent(event.seq!, event));
          replayedSeqs.add(event.seq!);
        }

        // 4. Flush buffer, dedup against replayed events
        for (const event of buffer) {
          if (!replayedSeqs.has(event.seq!)) {
            controller.enqueue(encodeSseEvent(event.seq!, event));
          }
        }
      } else {
        // No replay needed — flush any buffered events
        for (const event of buffer) {
          controller.enqueue(encodeSseEvent(event.seq!, event));
        }
      }

      // Switch to direct streaming
      buffer.length = 0;
      streaming = true;

      heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30_000);
    },
    cancel() {
      if (onBusEvent) unsubscribe(onBusEvent);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      "access-control-allow-origin": env.CORS_ORIGIN,
      "x-accel-buffering": "no",
    },
  });
}
