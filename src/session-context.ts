import { createContext, useContext } from 'react'
import type { Conn } from './api/jellyfin'
import type { Session } from './api/types'

export interface SessionCtx {
  /** The account in use, or null on the connect screen / "Who's watching?". */
  session: Session | null
  conn: Conn | null
  deviceId: string
  /** Every account saved on this device, most recently used first. */
  accounts: Session[]
  /** One-time message shown on the connect / accounts screen (e.g. "Please sign in again"). */
  notice: string
  /** Use a new sign-in (saves it on this device). */
  signIn: (s: Session) => Promise<void>
  /** Sign this account out and forget it on this device. */
  signOut: (notice?: string) => Promise<void>
  /** Switch to another saved account, no password needed. */
  switchTo: (key: string) => Promise<void>
  /** Go back to "Who's watching?" (keeps every account saved). */
  chooseAccount: () => void
  /** Remove a saved account from this device. */
  forget: (key: string) => Promise<void>
}

export const SessionContext = createContext<SessionCtx | null>(null)

export function useSession(): SessionCtx {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}

/** For pages behind the login: the connection is guaranteed to exist. */
export function useConn(): Conn {
  const { conn } = useSession()
  if (!conn) throw new Error('Not signed in')
  return conn
}
