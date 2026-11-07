// Everything Hearthreel remembers lives in this browser's IndexedDB. Nothing goes to us.
import { get, set, del } from 'idb-keyval'
import type { Session } from './types'

const SESSION_KEY = 'session'
const DEVICE_KEY = 'deviceId'

export const loadSession = () => get<Session>(SESSION_KEY)
export const saveSession = (s: Session) => set(SESSION_KEY, s)
export const clearSession = () => del(SESSION_KEY)

/** A random id created once per browser so the server can tell devices apart. */
export async function getDeviceId(): Promise<string> {
  const existing = await get<string>(DEVICE_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  await set(DEVICE_KEY, id)
  return id
}
