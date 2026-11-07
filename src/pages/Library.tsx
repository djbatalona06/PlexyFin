import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getChildren, getItem } from '../api/jellyfin'
import type { BaseItem } from '../api/types'
import { Grid } from '../components/Card'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useConn } from '../session-context'
import { useAsync } from '../useAsync'

/** Keyed by folder id so "Show more" state never leaks between folders. */
export default function LibraryRoute() {
  const { id = '' } = useParams()
  return <Library key={id} id={id} />
}

function Library({ id }: { id: string }) {
  const conn = useConn()
  const page = useAsync(`lib:${id}`, async () => {
    const parent = await getItem(conn, id)
    const children = await getChildren(conn, parent)
    return { parent, children }
  })
  const [more, setMore] = useState<BaseItem[]>([])
  const [moreBusy, setMoreBusy] = useState(false)
  const [moreError, setMoreError] = useState('')

  if (page.loading) return <main className="page"><Loading /></main>
  if (page.error || !page.data) return <main className="page"><ErrorBox message={page.error ?? 'Not found.'} onRetry={page.retry} /></main>

  const { parent, children } = page.data
  const items = [...children.Items, ...more]
  const hasMore = items.length < children.TotalRecordCount

  const loadMore = async () => {
    setMoreBusy(true)
    setMoreError('')
    try {
      const next = await getChildren(conn, parent, items.length)
      setMore((m) => [...m, ...next.Items])
    } catch (e) {
      setMoreError((e as Error).message)
    } finally {
      setMoreBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{parent.Name}</h1>
      {items.length ? <Grid items={items} /> : <Empty>This folder is empty.</Empty>}
      {moreError && <ErrorBox message={moreError} />}
      {hasMore && (
        <button type="button" className="btn more" onClick={loadMore} disabled={moreBusy}>
          {moreBusy ? 'Loading…' : `Show more (${children.TotalRecordCount - items.length} left)`}
        </button>
      )}
      <p className="sr-only" aria-live="polite">{`${items.length} of ${children.TotalRecordCount} shown`}</p>
    </main>
  )
}
