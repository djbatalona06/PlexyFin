import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { connFrom } from './api/jellyfin'
import { clearSession, getDeviceId, loadSession, saveSession } from './api/storage'
import type { Session } from './api/types'
import { SessionContext } from './session-context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([loadSession(), getDeviceId()])
      .then(([s, id]) => {
        setSession(s ?? null)
        setDeviceId(id)
      })
      .catch(() => setDeviceId(crypto.randomUUID())) // IndexedDB blocked (private mode): work for this visit only
      .finally(() => setReady(true))
  }, [])

  const signIn = useCallback(async (s: Session) => {
    await saveSession(s).catch(() => undefined)
    setNotice('')
    setSession(s)
  }, [])

  const signOut = useCallback(async (msg = '') => {
    await clearSession().catch(() => undefined)
    setNotice(msg)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({ session, deviceId, notice, signIn, signOut, conn: session ? connFrom(session, deviceId) : null }),
    [session, deviceId, notice, signIn, signOut],
  )

  if (!ready) return <div className="splash" aria-busy="true" />
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
