import { JSONUIProvider, Renderer, type Spec } from "@json-render/react"
import { useEffect, useState } from "react"
import { isMetricsUpsertEvent } from "@/components/metrics/events"
import { metricsRegistry } from "@/components/metrics/registry"
import { Card } from "@/components/ui/card"
import { FLOWLY_EVENT_NAME } from "@/lib/events"

export default function Metrics() {
  const [metricsById, setMetricsById] = useState<Record<string, Spec>>({})

  useEffect(() => {
    const onAppEvent = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail

      if (!isMetricsUpsertEvent(detail)) {
        return
      }

      setMetricsById((previous) => ({
        ...previous,
        [detail.payload.metricId]: detail.payload.spec,
      }))
    }

    window.addEventListener(FLOWLY_EVENT_NAME, onAppEvent)

    return () => {
      window.removeEventListener(FLOWLY_EVENT_NAME, onAppEvent)
    }
  }, [])

  const metrics = Object.entries(metricsById)

  return (
    <section className="h-full min-h-64 px-2 pt-0 pb-4">
      <Card className="flowly-surface flex h-full min-h-[32rem] flex-col p-4">
        <JSONUIProvider registry={metricsRegistry}>
          {metrics.length === 0 ? (
            <p className="text-sm text-zinc-500">Waiting for metrics...</p>
          ) : (
            <div className="space-y-4">
              {metrics.map(([metricId, spec]) => (
                <Renderer key={metricId} registry={metricsRegistry} spec={spec} />
              ))}
            </div>
          )}
        </JSONUIProvider>
      </Card>
    </section>
  )
}
