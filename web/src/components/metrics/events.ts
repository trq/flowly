import type { Spec } from "@json-render/react"

export type MetricsUpsertEvent = {
  channel: "metrics"
  payload: {
    metricId: string
    spec: Spec
  }
  type: "metrics.upsert"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isMetricsUpsertEvent(value: unknown): value is MetricsUpsertEvent {
  if (!isRecord(value)) {
    return false
  }

  if (value.channel !== "metrics" || value.type !== "metrics.upsert") {
    return false
  }

  if (!isRecord(value.payload)) {
    return false
  }

  return typeof value.payload.metricId === "string" && isRecord(value.payload.spec)
}
