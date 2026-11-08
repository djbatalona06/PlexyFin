import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { accountKey, initial } from '../api/accounts'
import { useSession } from '../session-context'

/** "Who's watching?": pick one of the accounts saved on this device. No passwords needed. */
export default function Accounts() {
  const { accounts, notice, switchTo, forget } = useSession()
  const navigate = useNavigate()
  const [manage, setManage] = useState(false)

  if (!accounts.length) return <Navigate to="/connect" replace />

  const pick = async (key: string) => {
    await switchTo(key)
    navigate('/', { replace: true })
  }

  return (
    <main className="page accounts" id="main">
      <img src="./icon.svg" alt="" width="56" height="56" />
      <h1>Who&apos;s watching?</h1>
      {notice && <p className="notice">{notice}</p>}
      <ul className="account-grid" data-nav-row>
        {accounts.map((a) => {
          const key = accountKey(a)
          return (
            <li key={key}>
              <button type="button" className="account" data-nav-id={key} onClick={() => void pick(key)} disabled={manage}>
                <span className="avatar" aria-hidden="true">
                  {initial(a.userName)}
                </span>
                <span className="account-name">{a.userName}</span>
                <span className="muted small">{a.serverName}</span>
              </button>
              {manage && (
                <button type="button" className="btn ghost danger" onClick={() => void forget(key)}>
                  Remove {a.userName}
                </button>
              )}
            </li>
          )
        })}
        {!manage && (
          <li>
            <Link to="/connect?add=1" className="account add" data-nav-id="add">
              <span className="avatar" aria-hidden="true">
                ＋
              </span>
              <span className="account-name">Add account</span>
              <span className="muted small">Password or code</span>
            </Link>
          </li>
        )}
      </ul>
      <button type="button" className="btn ghost" onClick={() => setManage((m) => !m)} aria-pressed={manage}>
        {manage ? 'Done' : 'Manage accounts'}
      </button>
      {manage && <p className="muted small">Removing an account signs it out on this device. Your watch history stays on the server.</p>}
    </main>
  )
}
