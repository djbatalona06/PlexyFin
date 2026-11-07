import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError, login, normalizeServerUrl } from '../api/jellyfin'
import { useSession } from '../session-context'

export default function Connect() {
  const { session, deviceId, notice, signIn } = useSession()
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const url = normalizeServerUrl(server)
    if (!url) return setError('Enter your server address.')
    setBusy(true)
    setError('')
    try {
      await signIn(await login(url, deviceId, username.trim(), password))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="connect">
      <img src="./icon.svg" alt="" width="72" height="72" />
      <h1>Hearthreel</h1>
      <p className="muted">Watch your own Jellyfin library, anywhere.</p>

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
