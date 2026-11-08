import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, quickConnectApprove } from '../api/jellyfin'
import { initial } from '../api/accounts'
import { useConn, useSession } from '../session-context'

/** "Your account": who you are, switch user, add an account, sign a TV in with a code, sign out. */
export default function Me() {
  const { session, accounts, chooseAccount, signOut } = useSession()
  const conn = useConn()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!session) return null

  const approve = async (e: FormEvent) => {
    e.preventDefault()
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) return setMsg({ ok: false, text: 'Codes have 6 numbers.' })
    setBusy(true)
    setMsg(null)
    try {
      await quickConnectApprove(conn, digits)
      setCode('')
      setMsg({ ok: true, text: `Done! The other device is signing in as ${session.userName}.` })
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'auth') return void signOut('Your sign-in expired. Please sign in again.')
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const switchUser = () => {
    chooseAccount()
    navigate('/accounts')
  }

  return (
    <main className="page me">
      <div className="me-head">
        <span className="avatar big" aria-hidden="true">
          {initial(session.userName)}
        </span>
        <div>
          <h1>{session.userName}</h1>
          <p className="muted">
            on {session.serverName} · {accounts.length} account{accounts.length === 1 ? '' : 's'} saved on this device
          </p>
        </div>
      </div>

      <div className="actions" data-nav-row>
        <button type="button" className="btn primary" onClick={switchUser}>
          Switch user
        </button>
        <Link className="btn" to="/connect?add=1">
          ＋ Add another account
        </Link>
      </div>

      <section aria-labelledby="h-code" className="panel">
        <h2 id="h-code">Sign in a TV with a code</h2>
        <p className="muted">
          On the TV, choose <strong>Sign in with a code</strong>. Type the 6 numbers it shows here. The TV will be signed in as you.
        </p>
        <form onSubmit={approve} className="code-form">
          <label>
            Code from the other device
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
            />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Approving…' : 'Approve'}
          </button>
        </form>
        {msg && (
          <p className={msg.ok ? 'notice' : 'error'} role={msg.ok ? 'status' : 'alert'}>
            {msg.text}
          </p>
        )}
      </section>

      <section aria-labelledby="h-out">
        <h2 id="h-out">Sign out</h2>
        <p className="muted">Signs {session.userName} out and removes the account from this device.</p>
        <button type="button" className="btn danger" onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </main>
  )
}
