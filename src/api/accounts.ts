// Saved sign-ins on this device ("Who's watching?"). Pure helpers; storage lives in storage.ts.
// Only tokens are saved, never passwords.
import type { Session } from './types'

/** One account = one user on one server. */
export const accountKey = (s: Pick<Session, 'serverId' | 'userId'>) => `${s.serverId}:${s.userId}`

/** Add or update an account and move it to the front (most recently used first). */
export function upsertAccount(list: readonly Session[], s: Session): Session[] {
  const key = accountKey(s)
  return [s, ...list.filter((a) => accountKey(a) !== key)]
}

export const removeAccount = (list: readonly Session[], key: string): Session[] => list.filter((a) => accountKey(a) !== key)

/**
 * Session 1 saved a single `session`. Make sure that account is in the list too,
 * so people who were signed in before this update stay signed in.
 */
export function migrateAccounts(saved: readonly Session[] | undefined, current: Session | undefined): Session[] {
  const list = [...(saved ?? [])]
  if (current && !list.some((a) => accountKey(a) === accountKey(current))) list.unshift(current)
  return list
}

/** First letter for the round avatar. */
export const initial = (name: string) => (name.trim().charAt(0) || '?').toUpperCase()
