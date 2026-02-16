import { useEffect, useCallback } from 'react'
import { useShooAuth } from '@shoojs/react'
import Header from './components/layout/Header'
import MainContent from './components/layout/MainContent'
import { FLOWLY_EVENT_NAME } from '@/lib/events'
import { isSessionLogoutEvent } from '@/components/layout/events'

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
const eventsApiBasePath = rawApiBaseUrl ? `${rawApiBaseUrl}/events` : '/events'

function isIdentityExpired(params: {
  claimsExp: number | null
  expiresIn?: number
  receivedAt?: number
}): boolean {
  const nowMs = Date.now()
  const nowSeconds = Math.floor(nowMs / 1000)

  if (typeof params.claimsExp === 'number') {
    return params.claimsExp <= nowSeconds
  }

  if (
    typeof params.expiresIn === 'number' &&
    Number.isFinite(params.expiresIn) &&
    typeof params.receivedAt === 'number' &&
    Number.isFinite(params.receivedAt)
  ) {
    return params.receivedAt + params.expiresIn * 1000 <= nowMs
  }

  return false
}

export default function App() {
  const { identity, claims, loading, signIn, clearIdentity } = useShooAuth()

  const handleLogout = useCallback(() => clearIdentity(), [clearIdentity])

  useEffect(() => {
    if (!identity.userId || !identity.token) return
    if (
      !isIdentityExpired({
        claimsExp: typeof claims?.exp === 'number' ? claims.exp : null,
        expiresIn: identity.expiresIn,
        receivedAt: identity.receivedAt,
      })
    ) {
      return
    }

    clearIdentity()
  }, [
    claims?.exp,
    clearIdentity,
    identity.expiresIn,
    identity.receivedAt,
    identity.token,
    identity.userId,
  ])

  useEffect(() => {
    if (!identity.userId || !identity.token) return

    const eventSource = new EventSource(
      `${eventsApiBasePath}?access_token=${encodeURIComponent(identity.token)}`
    )

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
  }, [identity.userId, identity.token])

  useEffect(() => {
    if (!identity.userId) return

    const onAppEvent = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (isSessionLogoutEvent(detail)) handleLogout()
    }

    window.addEventListener(FLOWLY_EVENT_NAME, onAppEvent)
    return () => window.removeEventListener(FLOWLY_EVENT_NAME, onAppEvent)
  }, [identity.userId, handleLogout])

  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-(--page-bg)">
        <p className="text-(--muted-foreground)">Loading…</p>
      </div>
    )
  }

  if (!identity.userId || !identity.token) {
    return (
      <div className="dark flex min-h-screen flex-col items-center justify-center gap-4 bg-(--page-bg)">
        <h1 className="text-2xl font-semibold text-(--foreground)">Welcome to Flowly</h1>
        <button
          onClick={() => signIn()}
          className="rounded-md bg-(--primary) px-6 py-2 text-(--primary-foreground) hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="dark flex min-h-screen flex-col bg-(--page-bg)">
      <Header />
      <MainContent />
    </div>
  )
}
