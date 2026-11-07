import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type Hls from 'hls.js/light'
import {
  ApiError,
  chooseStream,
  getItem,
  getPlaybackInfo,
  reportProgress,
  reportStart,
  reportStopped,
  stopTranscode,
  type ProgressBody,
} from '../api/jellyfin'
import { browserCanPlay, buildDeviceProfile } from '../api/profile'
import { secondsToTicks } from '../api/ticks'
import { Loading } from '../components/Status'
import { useConn, useSession } from '../session-context'

const PROGRESS_EVERY_MS = 10_000

function mediaErrorText(video: HTMLVideoElement): string {
  return video.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
    ? "This browser can't play this file's format."
    : 'Playback stopped because of an error.'
}

export default function Player() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const startAt = Math.max(0, Number(params.get('t')) || 0)
  const conn = useConn()
  const { signOut } = useSession()
  const navigate = useNavigate()

  const videoRef = useRef<HTMLVideoElement>(null)
  const positionRef = useRef<number | null>(null) // last known position, reused by "Try converting"
  const [title, setTitle] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [forceTranscode, setForceTranscode] = useState(false)

  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(`/item/${id}`, { replace: true })
  }, [navigate, id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let disposed = false
    let hls: Hls | null = null
    let timer = 0
    let report: ProgressBody | null = null
    let transcoding = false
    let started = false
    let stopped = false
    const startSec = positionRef.current ?? startAt

    const onApiError = (e: unknown) => {
      if (e instanceof ApiError && e.kind === 'auth') void signOut('Your sign-in expired. Please sign in again.')
      // Other reporting errors are ignored on purpose: playback should keep going.
    }
    const send = (fn: typeof reportProgress, extra: Partial<ProgressBody> = {}) => {
      if (!report) return
      fn(conn, { ...report, PositionTicks: secondsToTicks(video.currentTime), IsPaused: video.paused, ...extra }).catch(onApiError)
    }
    const fail = (msg: string) => {
      if (!disposed) setError(msg)
    }
    const stop = () => {
      if (stopped || !report) return
      stopped = true
      if (started) send(reportStopped)
      if (transcoding) stopTranscode(conn, report.PlaySessionId).catch(() => undefined)
    }

    const onPlaying = () => {
      if (!started) {
        started = true
        send(reportStart)
      } else send(reportProgress, { EventName: 'Unpause' })
    }
    const onPause = () => {
      if (started && !video.ended) send(reportProgress, { EventName: 'Pause', IsPaused: true })
    }
    const onSeeked = () => {
      if (started) send(reportProgress, { EventName: 'TimeUpdate' })
    }
    const onTime = () => {
      positionRef.current = video.currentTime
    }
    const onError = () => fail(mediaErrorText(video))

    video.addEventListener('playing', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('error', onError)
    window.addEventListener('pagehide', stop)

    ;(async () => {
      try {
        const [item, info] = await Promise.all([
          getItem(conn, id),
          getPlaybackInfo(conn, id, buildDeviceProfile(browserCanPlay()), {
            startTicks: secondsToTicks(startSec),
            allowDirect: !forceTranscode,
          }),
        ])
        if (disposed) return
        setTitle(item.SeriesName ? `${item.SeriesName} — ${item.Name}` : item.Name)
        if (info.ErrorCode) return fail(`The server can't play this right now (${info.ErrorCode}).`)
        const src = info.MediaSources?.[0]
        const choice = src ? chooseStream(conn, id, src, info.PlaySessionId) : null
        if (!src || !choice) return fail("The server didn't offer a way to play this in a browser.")

        report = { ItemId: id, MediaSourceId: src.Id, PlaySessionId: info.PlaySessionId, PlayMethod: choice.method, PositionTicks: 0 }
        transcoding = choice.method === 'Transcode'

        if (startSec > 0) {
          video.addEventListener(
            'loadedmetadata',
            () => {
              if (video.currentTime < 1) video.currentTime = startSec
            },
            { once: true },
          )
        }

        if (choice.isHls) {
          // Prefer hls.js (Media Source) for clearer errors; fall back to native HLS (iPhone Safari).
          const { default: HlsJs } = await import('hls.js/light') // light build, loaded only when needed
          if (disposed) return
          if (HlsJs.isSupported()) {
            hls = new HlsJs({ startPosition: startSec })
            hls.on(HlsJs.Events.ERROR, (_evt, data) => {
              if (data.fatal) fail('The stream stopped because of an error.')
            })
            hls.loadSource(choice.url)
            hls.attachMedia(video)
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = choice.url
          } else {
            return fail("This browser can't play streaming video.")
          }
        } else {
          video.src = choice.url
        }
        setReady(true)
        video.play().catch(() => undefined) // autoplay may be blocked; the user can press play
        timer = window.setInterval(() => {
          if (started && !video.paused) send(reportProgress, { EventName: 'TimeUpdate' })
        }, PROGRESS_EVERY_MS)
      } catch (e) {
        onApiError(e)
        fail(e instanceof Error ? e.message : 'Could not start playback.')
      }
    })()

    return () => {
      disposed = true
      window.clearInterval(timer)
      stop()
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('error', onError)
      window.removeEventListener('pagehide', stop)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [id, forceTranscode, conn, startAt, signOut])

  const tryConverting = () => {
    setError('')
    setReady(false)
    setForceTranscode(true)
  }

  return (
    <div className="player">
      <video ref={videoRef} controls playsInline className="video" aria-label={title || 'Video'} />
      <div className="player-bar">
        <button type="button" className="btn ghost" onClick={goBack}>
          ← Back
        </button>
        <span className="player-title">{title}</span>
      </div>
      {!ready && !error && (
        <div className="player-overlay">
          <Loading label="Starting…" />
        </div>
      )}
      {error && (
        <div className="player-overlay" role="alert">
          <p>{error}</p>
          <div className="actions">
            {!forceTranscode && (
              <button type="button" className="btn primary" onClick={tryConverting} autoFocus>
                Try converting
              </button>
            )}
            <button type="button" className="btn" onClick={goBack}>
              Back
            </button>
          </div>
          {!forceTranscode && <p className="muted small">Converting asks your server to change the video into a format every browser can play.</p>}
        </div>
      )}
    </div>
  )
}
