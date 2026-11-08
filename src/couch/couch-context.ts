import { createContext, useContext } from 'react'

export interface CouchCtx {
  /** 10-foot layout + arrow-key / remote navigation. */
  couch: boolean
  toggleCouch: () => void
}

export const CouchContext = createContext<CouchCtx | null>(null)

export function useCouch(): CouchCtx {
  const ctx = useContext(CouchContext)
  if (!ctx) throw new Error('useCouch must be used inside <CouchProvider>')
  return ctx
}
