import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, login, normalizeServerUrl, quickConnectStart, type QuickConnectStart } from '../api/jellyfin'
import { QuickConnectWait } from '../components/QuickConnectWait'
import { useSession } from '../session-context'

export default function Connect() {
  const { session, accounts, deviceId, notice, signIn } = useSession()
  const navigate = useNavigate()
  const adding = useSearchParams()[0].get('add') === '1'
  // Adding a second account is usually for the same server, so start with its address filled in.
  const [server, setServer] = useState(accounts[0]?.serverUrl ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState<(QuickConnectStart & { serverUrl: string }) | null>(null)

  if (session && !adding) return <Navigate to="/" replace />

  const finish = async (p: Promise<Parameters<typeof signIn>[0]>) => {
    await signIn(await p)
    navigate('/', { replace: true })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const url = normalizeServerUrl(server)
    if (!url) return setError('Enter your server address.')
    setBusy(true)
    setError('')
    try {
      await finish(login(url, deviceId, username.trim(), password))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Sign in with a code: no typing a password with a TV remote.
  const startCode = async () => {
    const url = normalizeServerUrl(server)
    if (!url) return setError('Enter your server address first.')
    setBusy(true)
    setError('')
    try {
      setCode({ ...(await quickConnectStart(url, deviceId)), serverUrl: url })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const back = session ? (
    <Link to="/" className="btn ghost">
      ← Cancel
    </Link>
  ) : accounts.length ? (
    <Link to="/accounts" className="btn ghost">
      ← Who&apos;s watching?
    </Link>
  ) : null

  if (code) {
    return (
      <main className="connect">
        <QuickConnectWait
          serverUrl={code.serverUrl}
          deviceId={deviceId}
          start={code}
          onSignedIn={(s) => finish(Promise.resolve(s))}
          onCancel={() => setCode(null)}
          onRestart={() => void startCode()}
        />
      </main>
    )
  }

  return (
    <main className="connect">
      {back && <div className="connect-back">{back}</div>}
      <img src="./icon.svg" alt="" width="72" height="72" />
      <h1>{adding ? 'Add an account' : 'Hearthreel'}</h1>
      <p className="muted">{adding ? 'Sign in as someone else. Everyone stays saved on this device.' : 'Watch your own Jellyfin library, anywhere.'}</p>

      <form onSubmit={onSubmit} className="form" aria-describedby={error ? 'connect-error' : undefined}>
        {notice && <p className="notice">{notice}</p>}
        <label>
          Server address
          <input
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="https://jellyfin.example.com"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && (
          <p id="connect-error" className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Connecting…' : 'Connect'}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void startCode()}>
          Sign in with a code instead
        </button>
        <p className="muted small center">Handy on a TV: approve the code from your phone, no password typing.</p>
      </form>

      <details className="help">
        <summary>How do I set up my server?</summary>
        <ol>
          <li>
            Use an <strong>https://</strong> address for Jellyfin (a reverse proxy, Tailscale Serve or a Cloudflare Tunnel).
            Browsers block this app from calling plain <code>http://</code> servers.
          </li>
          <li>
            Only have <code>http://192.168…</code>? Run Hearthreel on your own computer with <code>npm run dev</code> instead.
          </li>
          <li>
            Jellyfin allows other apps by default. If you changed <em>CorsHosts</em>, add this site&apos;s address back.
          </li>
          <li>
            Quick test: open <code>https://YOUR-SERVER/System/Info/Public</code>. If you see text with “ServerName”, you&apos;re ready.
          </li>
        </ol>
      </details>
      <p className="muted small">Your password goes only to your server and is never saved.</p>
    </main>
  )
}
