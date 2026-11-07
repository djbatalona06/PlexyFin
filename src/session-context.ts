import { createContext, useContext } from 'react'
import type { Conn } from './api/jellyfin'
import type { Session } from './api/types'

export interface SessionCtx {
  session: Session | null
  conn: Conn | null
  deviceId: string
  /** One-time message shown on the connect screen (e.g. "Please sign in again"). */
  notice: string
  signIn: (s: Session) => Promise<void>
  signOut: (notice?: string) => Promise<void>
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
