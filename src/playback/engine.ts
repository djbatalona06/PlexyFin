// Starts playing one item in a <video> element and keeps the server informed.
// Moved out of the Player page so the same <video> can keep playing while you browse.
// Returns a function that stops everything (reports "stopped", ends the server's conversion).
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
  type Conn,
  type ProgressBody,
} from '../api/jellyfin'
import { browserCanPlay, buildDeviceProfile } from '../api/profile'
import { secondsToTicks } from '../api/ticks'
import type { PlayMethod } from '../api/types'
import type { Quality } from './quality'

const PROGRESS_EVERY_MS = 10_000

export interface StartOpts {
  id: string
  startSec: number
  /** Skip direct play and ask the server to convert ("Try converting"). */
  forceTranscode: boolean
  quality: Quality
}

export interface EngineEvents {
  onTitle: (title: string) => void
  onReady: (method: PlayMethod) => void
  onError: (message: string) => void
  /** The server said the sign-in is no longer valid. */
  onAuthError: () => void
  onEnded: () => void
}

function mediaErrorText(video: HTMLVideoElement): string {
  return video.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
    ? "This browser can't play this file's format."
    : 'Playback stopped because of an error.'
}

export function startPlayback(video: HTMLVideoElement, conn: Conn, opts: StartOpts, ev: EngineEvents): () => void {
  const { id, startSec, forceTranscode, quality } = opts
  let disposed = false
  let hls: Hls | null = null
  let timer = 0
  let report: ProgressBody | null = null
  let transcoding = false
  let started = false
  let stopped = false

  const onApiError = (e: unknown) => {
    if (e instanceof ApiError && e.kind === 'auth') ev.onAuthError()
    // Other reporting errors are ignored on purpose: playback should keep going.
  }
  const send = (fn: typeof reportProgress, extra: Partial<ProgressBody> = {}) => {
    if (!report) return
    fn(conn, { ...report, PositionTicks: secondsToTicks(video.currentTime), IsPaused: video.paused, ...extra }).catch(onApiError)
  }
  const fail = (msg: string) => {
    if (!disposed) ev.onError(msg)
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
  const onError = () => fail(mediaErrorText(video))
  const onEnded = () => {
    if (!disposed) ev.onEnded()
  }

  video.addEventListener('playing', onPlaying)
  video.addEventListener('pause', onPause)
  video.addEventListener('seeked', onSeeked)
  video.addEventListener('error', onError)
  video.addEventListener('ended', onEnded)
  window.addEventListener('pagehide', stop)

  ;(async () => {
    try {
      const [item, info] = await Promise.all([
        getItem(conn, id),
        getPlaybackInfo(conn, id, buildDeviceProfile(browserCanPlay(), quality), {
          startTicks: secondsToTicks(startSec),
          allowDirect: !forceTranscode,
          maxBitrate: quality.maxBitrate,
        }),
      ])
      if (disposed) return
      ev.onTitle(item.SeriesName ? `${item.SeriesName} — ${item.Name}` : item.Name)
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
      ev.onReady(choice.method)
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
    video.removeEventListener('error', onError)
    video.removeEventListener('ended', onEnded)
    window.removeEventListener('pagehide', stop)
    hls?.destroy()
    video.removeAttribute('src')
    video.load()
  }
}
