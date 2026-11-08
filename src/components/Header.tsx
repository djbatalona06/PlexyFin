import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { initial } from '../api/accounts'
import { useCouch } from '../couch/couch-context'
import { useSession } from '../session-context'

const isStaging = import.meta.env.VITE_APP_ENV === 'staging'

export function Header() {
  const { session, accounts, chooseAccount } = useSession()
  const { couch, toggleCouch } = useCouch()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="header" data-nav-row>
      <Link to="/" className="brand">
        <img src="./icon.svg" alt="" width="28" height="28" />
        <span>Hearthreel</span>
        {isStaging && <span className="badge">STAGING</span>}
      </Link>
      <form role="search" onSubmit={onSearch} className="search">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" type="search" placeholder="Search movies & shows" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="who">

        <button type="button" className="btn ghost couch-toggle" aria-pressed={couch} onClick={toggleCouch} title="Bigger layout for TVs; arrow keys move around">
          Couch mode
        </button>
        {accounts.length > 1 && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              chooseAccount()
              navigate('/accounts')
            }}
          >
            Switch user
          </button>
        )}
        <Link to="/me" className="btn ghost me-link" title={`${session?.userName} on ${session?.serverName}`}>
          <span className="avatar small" aria-hidden="true">
            {initial(session?.userName ?? '')}
          </span>
          <span className="me-name">{session?.userName}</span>
        </Link>
      </div>
    </header>
  )
}
