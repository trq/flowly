import { list as listCommands } from "../../commands";
import { env } from "../../config/env";
import { subscribe, unsubscribe, type AppEvent } from "../../events/bus";

const encoder = new TextEncoder();

function encodeSseData(id: number, payload: unknown): Uint8Array {
  return encoder.encode(`id: ${id}\ndata: ${JSON.stringify(payload)}\n\n`);
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

export function handleEventsGet(): Response {
  let nextEventId = 1;
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let onBusEvent: ((event: AppEvent) => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encodeSseData(nextEventId++, {
          channel: "metrics",
          id: "evt_metrics_income_vs_savings",
          payload: {
            metricId: "income-vs-savings",
            spec: buildIncomeVsSavingsMetricSpec(),
          },
          sentAt: new Date().toISOString(),
          type: "metrics.upsert",
        }),
      );

      controller.enqueue(
        encodeSseData(nextEventId++, {
          channel: "commands",
          id: "evt_commands_snapshot",
          payload: { commands: listCommands() },
          sentAt: new Date().toISOString(),
          type: "commands.snapshot",
        }),
      );

      onBusEvent = (event: AppEvent) => {
        controller.enqueue(encodeSseData(nextEventId++, event));
      };
      subscribe(onBusEvent);

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
