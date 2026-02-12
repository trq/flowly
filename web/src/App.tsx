import { useEffect } from 'react'
import Header from './components/layout/Header'
import MainContent from './components/layout/MainContent'

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
const eventsApiPath = rawApiBaseUrl ? `${rawApiBaseUrl}/events` : '/events'

export default function App() {
  useEffect(() => {
    const eventSource = new EventSource(eventsApiPath)

    eventSource.onmessage = (event) => {
      console.log('[events]', event.data)
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
