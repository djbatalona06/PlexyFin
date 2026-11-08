import { createContext, useContext } from 'react'
import type { BaseItem } from '../api/types'

export interface TonightCtx {
  items: BaseItem[]
  has: (id: string) => boolean
  add: (item: BaseItem) => void
  remove: (id: string) => void
  /** Ask the server for fresh copies (progress bars). Keeps the saved copies if offline. */
  refresh: () => Promise<void>
}

export const TonightContext = createContext<TonightCtx | null>(null)

export function useTonight(): TonightCtx {
  const ctx = useContext(TonightContext)
  if (!ctx) throw new Error('useTonight must be used inside <TonightProvider>')
  return ctx
}
