import { useSearchParams } from 'react-router-dom'
import { search } from '../api/jellyfin'
import { Grid } from '../components/Card'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useConn } from '../session-context'
import { useAsync } from '../useAsync'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const conn = useConn()
  const res = useAsync(`search:${q}`, () => (q ? search(conn, q) : Promise.resolve({ Items: [], TotalRecordCount: 0 })))

  return (
    <main className="page">
      <h1>{q ? `Results for “${q}”` : 'Search'}</h1>
      {!q ? (
        <Empty>Type in the search box above.</Empty>
      ) : res.loading ? (
        <Loading label="Searching…" />
      ) : res.error ? (
        <ErrorBox message={res.error} onRetry={res.retry} />
      ) : res.data?.Items.length ? (
        <Grid items={res.data.Items} />
      ) : (
        <Empty>No matches. Try a shorter word.</Empty>
      )}
    </main>
  )
}
