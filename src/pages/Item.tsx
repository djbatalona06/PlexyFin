import { Link, Navigate, useParams } from 'react-router-dom'
import { getItem, imageUrl } from '../api/jellyfin'
import { formatClock, formatRuntime, ticksToSeconds } from '../api/ticks'
import { subtitleFor } from '../components/item-text'
import { ErrorBox, Loading } from '../components/Status'
import { useConn } from '../session-context'
import { useTonight } from '../tonight/tonight-context'
import { useAsync } from '../useAsync'

export default function Item() {
  const { id = '' } = useParams()
  const conn = useConn()
  const res = useAsync(`item:${id}`, () => getItem(conn, id))
  const tonight = useTonight()

  if (res.loading) return <main className="page"><Loading /></main>
  if (res.error || !res.data) return <main className="page"><ErrorBox message={res.error ?? 'Not found.'} onRetry={res.retry} /></main>

  const item = res.data
  if (item.IsFolder) return <Navigate to={`/library/${item.Id}`} replace />

  const img = imageUrl(conn.serverUrl, item, 720)
  const resumeAt = Math.floor(ticksToSeconds(item.UserData?.PlaybackPositionTicks))
  const playable = item.MediaType === 'Video'
  const meta = [subtitleFor(item), formatRuntime(item.RunTimeTicks)].filter(Boolean).join(' · ')

  return (
    <main className="page item">
      <div className="item-poster">{img ? <img src={img} alt="" /> : <span aria-hidden="true">{item.Name.charAt(0)}</span>}</div>
      <div className="item-body">
        <h1>{item.Name}</h1>
        {meta && <p className="muted">{meta}</p>}
        {item.UserData?.PlayedPercentage ? (
          <div className="progress big" aria-label={`${Math.round(item.UserData.PlayedPercentage)}% watched`}>
            <div style={{ width: `${item.UserData.PlayedPercentage}%` }} />
          </div>
        ) : null}
        <div className="actions" data-nav-row>
          {!playable ? (
            <p className="muted">Hearthreel can only play videos for now.</p>
          ) : resumeAt > 0 ? (
            <>
              <Link className="btn primary" to={`/play/${item.Id}?t=${resumeAt}`} autoFocus>
                ▶ Resume from {formatClock(resumeAt)}
              </Link>
              <Link className="btn" to={`/play/${item.Id}?t=0`}>
                Start over
              </Link>
            </>
          ) : (
            <Link className="btn primary" to={`/play/${item.Id}?t=0`} autoFocus>
              ▶ Play
            </Link>
          )}
          {playable &&
            (tonight.has(item.Id) ? (
              <button type="button" className="btn" onClick={() => tonight.remove(item.Id)} aria-label="Remove from Tonight">
                ✓ On Tonight
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => tonight.add(item)} aria-label="Add to Tonight">
                ＋ Tonight
              </button>
            ))}
        </div>
        {item.Overview && <p className="overview">{item.Overview}</p>}
      </div>
    </main>
  )
}
