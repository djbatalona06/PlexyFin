import { useEffect, useRef, useState } from 'react'
import { ApiError } from './api/jellyfin'
import { useSession } from './session-context'

interface State<T> {
  data?: T
  error?: string
  loading: boolean
}

interface Tagged<T> extends State<T> {
  key: string
}

/**
 * Runs `fn` whenever `key` changes and tracks loading/error.
 * A 401 from the server signs the user out automatically.
 */
export function useAsync<T>(key: string, fn: () => Promise<T>): State<T> & { retry: () => void } {
  const { signOut } = useSession()
  const fnRef = useRef(fn)
  fnRef.current = fn
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Tagged<T>>({ key, loading: true })

  useEffect(() => {
    let live = true
    setState({ key, loading: true })
    fnRef
      .current()
      .then((data) => live && setState({ key, data, loading: false }))
      .catch((e: unknown) => {
        if (!live) return
        if (e instanceof ApiError && e.kind === 'auth') {
          void signOut('Your sign-in expired. Please sign in again.')
          return
        }
        setState({ key, error: e instanceof Error ? e.message : 'Something went wrong.', loading: false })
      })
    return () => {
      live = false
    }
  }, [key, attempt, signOut])

  const retry = () => setAttempt((n) => n + 1)
  // On the first render after `key` changes, the old result must not show (e.g. the previous movie).
  if (state.key !== key) return { loading: true, retry }
  return { data: state.data, error: state.error, loading: state.loading, retry }
}
