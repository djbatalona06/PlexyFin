import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { accountKey, migrateAccounts, removeAccount, upsertAccount } from './api/accounts'
import { connFrom, logout } from './api/jellyfin'
import { clearSession, getDeviceId, loadAccounts, loadSession, saveAccounts, saveSession } from './api/storage'
import type { Session } from './api/types'
import { SessionContext } from './session-context'

// Which account this browser tab picked. With several saved accounts we ask "Who's watching?"
// when the app opens, but not again when the same tab reloads.
const PICKED = 'hearthreel:picked'
const picked = {
  get: () => {
    try {
      return sessionStorage.getItem(PICKED)
    } catch {
      return null
    }
  },
  set: (key: string | null) => {
    try {
      if (key === null) sessionStorage.removeItem(PICKED)
      else sessionStorage.setItem(PICKED, key)
    } catch {
      /* ignore */
    }
  },
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [accounts, setAccountsState] = useState<Session[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [notice, setNotice] = useState('')
  const accountsRef = useRef<Session[]>([])
  const sessionRef = useRef<Session | null>(null)
  sessionRef.current = session

  const setAccounts = useCallback((list: Session[]) => {
    accountsRef.current = list
    setAccountsState(list)
    saveAccounts(list).catch(() => undefined)
  }, [])

  useEffect(() => {
    Promise.all([loadSession(), loadAccounts(), getDeviceId()])
      .then(([current, saved, id]) => {
        const list = migrateAccounts(saved, current)
        accountsRef.current = list
        setAccountsState(list)
        if (!saved && list.length) saveAccounts(list).catch(() => undefined)
        const pickedKey = picked.get()
        const active = list.length === 1 ? list[0] : list.find((a) => accountKey(a) === pickedKey)
        setSession(active ?? null)
        setDeviceId(id)
      })
      .catch(() => setDeviceId(crypto.randomUUID())) // IndexedDB blocked (private mode): work for this visit only
      .finally(() => setReady(true))
  }, [])

  const use = useCallback(
    async (s: Session) => {
      setAccounts(upsertAccount(accountsRef.current, s))
      await saveSession(s).catch(() => undefined)
      picked.set(accountKey(s))
      setNotice('')
      setSession(s)
    },
    [setAccounts],
  )

  const switchTo = useCallback(
    async (key: string) => {
      const s = accountsRef.current.find((a) => accountKey(a) === key)
      if (s) await use(s)
    },
    [use],
  )

  const chooseAccount = useCallback(() => {
    picked.set(null)
    setNotice('')
    setSession(null)
  }, [])

  const forget = useCallback(
    async (key: string) => {
      const s = accountsRef.current.find((a) => accountKey(a) === key)
      if (!s) return
      logout(connFrom(s, deviceId)).catch(() => undefined) // revoke the token on the server too
      setAccounts(removeAccount(accountsRef.current, key))
      if (sessionRef.current && accountKey(sessionRef.current) === key) {
        await clearSession().catch(() => undefined)
        picked.set(null)
        setSession(null)
      }
    },
    [deviceId, setAccounts],
  )

  const signOut = useCallback(
    async (msg = '') => {
      const s = sessionRef.current
      if (s) await forget(accountKey(s))
      await clearSession().catch(() => undefined)
      setNotice(msg)
      setSession(null)
    },
    [forget],
  )

  const value = useMemo(
    () => ({
      session,
      deviceId,
      accounts,
      notice,
      signIn: use,
      signOut,
      switchTo,
      chooseAccount,
      forget,
      conn: session ? connFrom(session, deviceId) : null,
    }),
    [session, deviceId, accounts, notice, use, signOut, switchTo, chooseAccount, forget],
  )

  if (!ready) return <div className="splash" aria-busy="true" />
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
