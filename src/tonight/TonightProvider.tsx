import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, getItemsByIds } from '../api/jellyfin'
import { loadTonight, saveTonight, tonightKey } from '../api/storage'
import type { BaseItem } from '../api/types'
import { useSession } from '../session-context'
import * as list from './tonight'
import { TonightContext } from './tonight-context'

const EMPTY: BaseItem[] = []

export function TonightProvider({ children }: { children: ReactNode }) {
  const { session, conn, signOut } = useSession()
  const key = session ? tonightKey(session.serverId, session.userId) : ''
  // Tagged with the key it belongs to, so one user's list can never be saved under another's key.
  const [state, setState] = useState<{ key: string; items: BaseItem[]; loaded: boolean }>({ key: '', items: [], loaded: false })
  const items = state.key === key ? state.items : EMPTY

  useEffect(() => {
    if (!key) return
    let live = true
    loadTonight(key)
      .catch(() => [])
      .then((saved) => live && setState({ key, items: saved, loaded: true }))
    return () => {
      live = false
    }
  }, [key])

  // Save after every change (only once the saved list has been read, or we'd overwrite it with []).
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (state.loaded && state.key) saveTonight(state.key, state.items).catch(() => undefined)
  }, [state])

  const update = useCallback(
    (fn: (items: BaseItem[]) => BaseItem[]) => setState((s) => (s.key === key && s.loaded ? { ...s, items: fn(s.items) } : s)),
    [key],
  )
  const add = useCallback((item: BaseItem) => update((l) => list.add(l, item)), [update])
  const remove = useCallback((id: string) => update((l) => list.remove(l, id)), [update])
  const has = useCallback((id: string) => list.has(items, id), [items])

  const idsRef = useRef<string[]>([])
  idsRef.current = items.map((i) => i.Id)
  const refresh = useCallback(async () => {
    const ids = idsRef.current
    if (!conn || !ids.length) return
    try {
      const fresh = await getItemsByIds(conn, ids)
      update((l) => list.refresh(l, fresh.Items.concat(l.filter((i) => !ids.includes(i.Id)))))
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'auth') void signOut('Your sign-in expired. Please sign in again.')
      // Offline or server hiccup: keep showing the saved copies.
    }
  }, [conn, update, signOut])

  const value = useMemo(() => ({ items, has, add, remove, refresh }), [items, has, add, remove, refresh])
  return <TonightContext.Provider value={value}>{children}</TonightContext.Provider>
}
