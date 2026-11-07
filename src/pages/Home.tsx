import { Link } from 'react-router-dom'
import { getResume, getViews, imageUrl } from '../api/jellyfin'
import { Grid } from '../components/Card'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useConn } from '../session-context'
import { useAsync } from '../useAsync'

export default function Home() {
  const conn = useConn()
  const resume = useAsync('resume', () => getResume(conn))
  const views = useAsync('views', () => getViews(conn))

  return (
    <main className="page">
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
          <ul className="libs">
            {views.data.Items.map((v) => {
              const img = imageUrl(conn.serverUrl, v, 240)
              return (
                <li key={v.Id}>
                  <Link to={`/library/${v.Id}`} className="lib">
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
