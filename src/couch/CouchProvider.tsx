import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadSettings, saveSettings } from '../api/storage'
import { CouchContext } from './couch-context'
import { isTvUserAgent } from './spatial'

const guess = () => typeof navigator !== 'undefined' && isTvUserAgent(navigator.userAgent)

/** Remembers couch mode on this device. Until the user chooses, TVs and consoles start in couch mode. */
export function CouchProvider({ children }: { children: ReactNode }) {
  const [couch, setCouch] = useState(guess)

  useEffect(() => {
    loadSettings()
      .then((s) => {
        if (s.couch !== undefined) setCouch(s.couch)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    document.documentElement.toggleAttribute('data-couch', couch)
  }, [couch])

  const toggleCouch = useCallback(() => {
    setCouch((on) => {
      loadSettings()
        .then((s) => saveSettings({ ...s, couch: !on }))
        .catch(() => undefined)
      return !on
    })
  }, [])

  const value = useMemo(() => ({ couch, toggleCouch }), [couch, toggleCouch])
  return <CouchContext.Provider value={value}>{children}</CouchContext.Provider>
}
