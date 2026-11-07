import { lazy, type ComponentType } from 'react'

const FLAG = 'hearthreel:chunk-reload'

// sessionStorage can throw (privacy modes, sandboxed frames); treat that as "no flag".
const flag = {
  get: () => {
    try {
      return sessionStorage.getItem(FLAG)
    } catch {
      return '1'
    }
  },
  set: (v: string | null) => {
    try {
      if (v === null) sessionStorage.removeItem(FLAG)
      else sessionStorage.setItem(FLAG, v)
    } catch {
      /* ignore */
    }
  },
}

/**
 * Like React.lazy, but if a page's code file is gone (a new version was deployed while this tab was open),
 * reload once to pick up the new version instead of showing a blank screen.
 */
export function lazyPage<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load()
      .then((mod) => {
        flag.set(null)
        return mod
      })
      .catch((err: unknown) => {
        if (!flag.get()) {
          flag.set('1')
          location.reload()
          return new Promise<{ default: T }>(() => undefined) // wait for the reload
        }
        throw err
      }),
  )
}
