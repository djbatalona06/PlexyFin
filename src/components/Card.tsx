import { Link } from 'react-router-dom'
import { imageUrl } from '../api/jellyfin'
import type { BaseItem } from '../api/types'
import { useConn } from '../session-context'
import { hrefFor, subtitleFor } from './item-text'

export function Card({ item }: { item: BaseItem }) {
  const { serverUrl } = useConn()
  const img = imageUrl(serverUrl, item, 360)
  const pct = item.UserData?.PlayedPercentage
  const sub = subtitleFor(item)
  return (
    <Link to={hrefFor(item)} className="card">
      <div className="poster">
        {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{item.Name.charAt(0)}</span>}
        {pct ? (
          <div className="progress" aria-label={`${Math.round(pct)}% watched`}>
            <div style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
      <span className="card-title">{item.Name}</span>
      {sub && <span className="card-sub">{sub}</span>}
    </Link>
  )
}

export function Grid({ items }: { items: BaseItem[] }) {
  return (
    <ul className="grid">
      {items.map((i) => (
        <li key={i.Id}>
          <Card item={i} />
        </li>
      ))}
    </ul>
  )
}
