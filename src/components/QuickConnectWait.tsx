import { useEffect, useRef, useState } from 'react'
import { ApiError, loginWithQuickConnect, quickConnectApproved, type QuickConnectStart } from '../api/jellyfin'
import type { Session } from '../api/types'

const POLL_MS = 3000

interface Props {
  serverUrl: string
  deviceId: string
  start: QuickConnectStart
  onSignedIn: (s: Session) => Promise<void>
  onCancel: () => void
  onRestart: () => void
}

/** Shows the 6-digit code and waits until someone approves it on another device. */
export function QuickConnectWait({ serverUrl, deviceId, start, onSignedIn, onCancel, onRestart }: Props) {
  const [problem, setProblem] = useState('')
  const signedIn = useRef(onSignedIn) // latest callback, without restarting the polling
  signedIn.current = onSignedIn

  useEffect(() => {
    let live = true
    let timer = 0
    const check = async () => {
      try {
        if (await quickConnectApproved(serverUrl, deviceId, start.Secret)) {
          const s = await loginWithQuickConnect(serverUrl, deviceId, start.Secret)
          if (live) await signedIn.current(s)
          return
        }
      } catch (e) {
        if (!live) return
        if (e instanceof ApiError && (e.kind === 'http' || e.kind === 'auth')) {
          return setProblem('This code expired. Get a new one.')
        }
        // Network blip: keep trying quietly.
      }
      if (live) timer = window.setTimeout(check, POLL_MS)
    }
    timer = window.setTimeout(check, POLL_MS)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [serverUrl, deviceId, start.Secret])

  const digits = start.Code.split('')
  return (
    <section className="qc" aria-labelledby="qc-h">
      <h1 id="qc-h">Sign in with a code</h1>
      <p className="qc-code" aria-label={`Your code is ${digits.join(' ')}`}>
        {digits.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </p>
      <ol className="qc-steps">
        <li>On your phone or computer, open Hearthreel (or Jellyfin) where you&apos;re already signed in.</li>
        <li>
          Go to <strong>your name → Sign in a TV with a code</strong> (in Jellyfin: <strong>Settings → Quick Connect</strong>).
        </li>
        <li>Type this code. This screen signs in by itself.</li>
      </ol>
      {problem ? (
        <p className="error" role="alert">
          {problem}
        </p>
      ) : (
        <p className="muted" role="status">
          Waiting for approval…
        </p>
      )}
      <div className="actions" data-nav-row>
        {problem && (
          <button type="button" className="btn primary" onClick={onRestart}>
            Get a new code
          </button>
        )}
        <button type="button" className="btn" onClick={onCancel}>
          Back
        </button>
      </div>
    </section>
  )
}
