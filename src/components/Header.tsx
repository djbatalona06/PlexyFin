import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../session-context'

const isStaging = import.meta.env.VITE_APP_ENV === 'staging'

export function Header() {
  const { session, signOut } = useSession()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="header">
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
        <span className="muted" title={session?.serverName}>
          {session?.userName}
        </span>
        <button type="button" className="btn ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </header>
  )
}
