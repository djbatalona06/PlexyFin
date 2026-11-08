import { useEffect } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { usePlayback } from './playback-context'

/**
 * /play/:id. The video itself lives in <PlaybackProvider> (so it survives page changes);
 * this route only tells it what to play and to fill the screen.
 */
export default function PlayRoute() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const startAt = Math.max(0, Number(params.get('t')) || 0)
  const keep = Boolean((useLocation().state as { expand?: boolean } | null)?.expand)
  const { play } = usePlayback()

  useEffect(() => {
    play(id, startAt, { keep })
  }, [id, startAt, keep, play])

  return null
}
