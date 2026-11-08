// Everything Hearthreel remembers lives in this browser's IndexedDB. Nothing goes to us.
import { get, set, del } from 'idb-keyval'
import type { BaseItem, Session } from './types'

const SESSION_KEY = 'session'
const DEVICE_KEY = 'deviceId'
const SETTINGS_KEY = 'settings'
const ACCOUNTS_KEY = 'accounts'

export const loadSession = () => get<Session>(SESSION_KEY)
export const saveSession = (s: Session) => set(SESSION_KEY, s)
export const clearSession = () => del(SESSION_KEY)

/** Every account saved on this device (tokens only). `session` above is the one in use. */
export const loadAccounts = () => get<Session[]>(ACCOUNTS_KEY)
export const saveAccounts = (list: Session[]) => set(ACCOUNTS_KEY, list)

/** A random id created once per browser so the server can tell devices apart. */
export async function getDeviceId(): Promise<string> {
  const existing = await get<string>(DEVICE_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  await set(DEVICE_KEY, id)
  return id
}

/** Per-device settings. `couch` is undefined until the user picks (then we guess from the device). */
export interface Settings {
  couch?: boolean
}
export const loadSettings = async () => (await get<Settings>(SETTINGS_KEY)) ?? {}
export const saveSettings = (s: Settings) => set(SETTINGS_KEY, s)

/** Quality choice, remembered per server (a home server and a far-away one need different settings). */
export const qualityKey = (serverId: string) => `quality:${serverId}`
export const loadQuality = (serverId: string) => get<string>(qualityKey(serverId))
export const saveQuality = (serverId: string, id: string) => set(qualityKey(serverId), id)

/** The "Tonight" shelf, per server and user. */
export const tonightKey = (serverId: string, userId: string) => `tonight:${serverId}:${userId}`
export const loadTonight = async (key: string) => (await get<BaseItem[]>(key)) ?? []
export const saveTonight = (key: string, items: BaseItem[]) => set(key, items)
