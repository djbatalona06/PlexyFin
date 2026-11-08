import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getResume, getViews, imageUrl } from '../api/jellyfin'
import { Grid } from '../components/Card'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { ticksToSeconds } from '../api/ticks'
import { useConn } from '../session-context'
import { useTonight } from '../tonight/tonight-context'
import { useAsync } from '../useAsync'

export default function Home() {
  const conn = useConn()
  const resume = useAsync('resume', () => getResume(conn))
  const views = useAsync('views', () => getViews(conn))
  const tonight = useTonight()
  const { refresh } = tonight
  const first = tonight.items[0]

  useEffect(() => {
    void refresh() // fresh progress bars; keeps the saved copies if offline
  }, [refresh])

  return (
    <main className="page">
      {first && (
        <section aria-labelledby="h-tonight">
          <div className="row-head">
            <h2 id="h-tonight">Tonight</h2>
            <Link
              className="btn primary"
              to={`/play/${first.Id}?t=${Math.floor(ticksToSeconds(first.UserData?.PlaybackPositionTicks))}`}
            >
              ▶ Play next: {first.Name}
            </Link>
          </div>
          <Grid items={tonight.items} />
        </section>
      )}

      <section aria-labelledby="h-resume">
        <h2 id="h-resume">Continue watching</h2>
        {resume.loading ? (
          <Loading />
        ) : resume.error ? (
          <ErrorBox message={resume.error} onRetry={resume.retry} />
        ) : resume.data?.Items.length ? (
          <Grid items={resume.data.Items} />
        ) : (
          <Empty>Nothing in progress yet. Start something below.</Empty>
        )}
      </section>

      <section aria-labelledby="h-libs">
        <h2 id="h-libs">Libraries</h2>
        {views.loading ? (
          <Loading />
        ) : views.error ? (
          <ErrorBox message={views.error} onRetry={views.retry} />
        ) : views.data?.Items.length ? (
          <ul className="libs" data-nav-row>
            {views.data.Items.map((v) => {
              const img = imageUrl(conn.serverUrl, v, 240)
              return (
                <li key={v.Id}>
                  <Link to={`/library/${v.Id}`} className="lib" data-nav-id={v.Id}>
                    <div className="lib-art">{img && <img src={img} alt="" loading="lazy" />}</div>
                    <span>{v.Name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty>No libraries are shared with this user.</Empty>
        )}
      </section>
    </main>
  )
}
