import { useEffect } from 'react'
import Header from './components/layout/Header'
import MainContent from './components/layout/MainContent'
import { FLOWLY_EVENT_NAME } from '@/lib/events'

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
const eventsApiPath = rawApiBaseUrl ? `${rawApiBaseUrl}/events` : '/events'

export default function App() {
  useEffect(() => {
    const eventSource = new EventSource(eventsApiPath)

    eventSource.onmessage = (event) => {
      let parsed: unknown

      try {
        parsed = JSON.parse(event.data)
      } catch {
        console.error('[events:error] invalid JSON', event.data)
        return
      }

      console.log('[events]', parsed)
      window.dispatchEvent(new CustomEvent(FLOWLY_EVENT_NAME, { detail: parsed }))
    }

    eventSource.onerror = (event) => {
      console.error('[events:error]', event)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return (
    <div className="dark flex min-h-screen flex-col bg-(--page-bg)">
      <Header />
      <MainContent />
    </div>
  )
}
