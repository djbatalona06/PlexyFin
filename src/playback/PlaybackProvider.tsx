import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadQuality, saveQuality } from '../api/storage'
import { ticksToSeconds } from '../api/ticks'
import type { BaseItem, PlayMethod } from '../api/types'
import { useSession } from '../session-context'
import { useTonight } from '../tonight/tonight-context'
import { next as nextOnShelf } from '../tonight/tonight'
import { startPlayback } from './engine'
import { EXPAND_STATE, PlaybackContext, type PlayerMode } from './playback-context'
import { DEFAULT_QUALITY, QUALITIES, qualityFor, type QualityId } from './quality'

const UP_NEXT_SECONDS = 10

interface Current {
  id: string
  startSec: number
  forceTranscode: boolean
  /** Changes whenever playback must (re)start, even for the same item. */
  nonce: number
}

const pipSupported = () => typeof document !== 'undefined' && document.pictureInPictureEnabled === true
const resumeSeconds = (item: BaseItem) => Math.floor(ticksToSeconds(item.UserData?.PlaybackPositionTicks))

/**
 * Owns the one and only <video> element. It lives above the pages, so it keeps playing
 * while you browse (mini-player in the corner, or the browser's picture-in-picture window).
 */
export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { conn, session, signOut } = useSession()
  const tonight = useTonight()
  const navigate = useNavigate()
  const location = useLocation()

  const videoRef = useRef<HTMLVideoElement>(null)
  const positionRef = useRef(0)
  const nonceRef = useRef(0)
  const [current, setCurrent] = useState<Current | null>(null)
  const [mode, setMode] = useState<PlayerMode | null>(null)
  const [title, setTitle] = useState('')
  const [method, setMethod] = useState<PlayMethod | null>(null)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const [inPip, setInPip] = useState(false)
  const [upNext, setUpNext] = useState<{ item: BaseItem; left: number } | null>(null)

  // Quality is remembered per server. Playback waits until the saved choice has been read.
  const serverId = session?.serverId ?? ''
  const [quality, setQualityState] = useState<{ serverId: string; id: QualityId } | null>(null)
  const qualityId = quality?.serverId === serverId ? quality.id : null
  useEffect(() => {
    if (!serverId) return
    let live = true
    loadQuality(serverId)
      .catch(() => undefined)
      .then((id) => live && setQualityState({ serverId, id: qualityFor(id).id }))
    return () => {
      live = false
    }
  }, [serverId])
  const qualityRef = useRef<QualityId>(DEFAULT_QUALITY)
  if (qualityId) qualityRef.current = qualityId

  const tonightRef = useRef(tonight)
  tonightRef.current = tonight
  // Latest values for event handlers that run between renders.
  const currentRef = useRef<Current | null>(null)
  const modeRef = useRef<PlayerMode | null>(null)
  modeRef.current = mode

  const start = useCallback((id: string, startSec: number, forceTranscode = false) => {
    nonceRef.current += 1
    positionRef.current = startSec
    currentRef.current = { id, startSec, forceTranscode, nonce: nonceRef.current }
    setCurrent(currentRef.current)
    setTitle('')
    setMethod(null)
    setError('')
    setUpNext(null)
  }, [])

  const close = useCallback(() => {
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => undefined)
    currentRef.current = null
    setCurrent(null)
    setMode(null)
    setUpNext(null)
  }, [])

  // ---- the engine: (re)start whenever `current` changes ----
  const ready = qualityId !== null
  useEffect(() => {
    const video = videoRef.current
    if (!current || !conn || !video || !ready) return
    return startPlayback(
      video,
      conn,
      { id: current.id, startSec: current.startSec, forceTranscode: current.forceTranscode, quality: qualityFor(qualityRef.current) },
      {
        onTitle: setTitle,
        onReady: setMethod,
        onError: setError,
        onAuthError: () => void signOut('Your sign-in expired. Please sign in again.'),
        onEnded: () => {
          if (!tonightRef.current.has(current.id)) return
          const after = nextOnShelf(tonightRef.current.items, current.id)
          tonightRef.current.remove(current.id)
          if (after) setUpNext({ item: after, left: UP_NEXT_SECONDS })
        },
      },
    )
  }, [current, conn, ready, signOut])

  // Signing out or switching to another account stops the player.
  const account = session ? `${session.serverId}:${session.userId}` : ''
  useEffect(() => {
    close()
  }, [account, close])

  // Leaving the full-screen player by any route change (browser or remote Back) stops it,
  // unless it was shrunk to the mini-player first. Going from one /play page to another doesn't.
  const prevPath = useRef(location.pathname)
  useEffect(() => {
    const was = prevPath.current
    prevPath.current = location.pathname
    if (was.startsWith('/play/') && !location.pathname.startsWith('/play/') && modeRef.current === 'full') close()
  }, [location.pathname, close])

  const play = useCallback(
    (id: string, startSec: number, opts: { keep?: boolean } = {}) => {
      setMode('full')
      if (opts.keep && currentRef.current?.id === id) return // same video, just full screen again
      start(id, startSec)
    },
    [start],
  )

  const goBack = useCallback(
    (id: string) => {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx > 0) navigate(-1)
      else navigate(`/item/${id}`, { replace: true })
    },
    [navigate],
  )

  const minimize = useCallback(() => {
    if (!current) return
    setMode('mini') // first, so the route change below doesn't stop playback
    goBack(current.id)
  }, [current, goBack])

  const expand = useCallback(() => {
    if (!current) return
    if (location.pathname === `/play/${current.id}`) setMode('full')
    else navigate(`/play/${current.id}`, { state: EXPAND_STATE })
  }, [current, location.pathname, navigate])

  const backAndStop = useCallback(() => {
    if (!current) return
    const id = current.id
    close()
    goBack(id)
  }, [current, close, goBack])

  const tryConverting = useCallback(() => {
    if (current) start(current.id, positionRef.current, true)
  }, [current, start])

  const changeQuality = useCallback(
    (id: QualityId) => {
      setQualityState({ serverId, id })
      qualityRef.current = id
      if (serverId) saveQuality(serverId, id).catch(() => undefined)
      if (current) start(current.id, videoRef.current?.currentTime || positionRef.current, current.forceTranscode)
    },
    [serverId, current, start],
  )

  const enterPip = useCallback(async () => {
    const video = videoRef.current
    if (!video || !current) return
    if (pipSupported() && !document.pictureInPictureElement) {
      try {
        await video.requestPictureInPicture()
      } catch {
        /* blocked (e.g. no video frame yet): the mini-player still works */
      }
    }
    if (mode === 'full') minimize()
  }, [current, mode, minimize])

  const playUpNext = useCallback(() => {
    if (!upNext) return
    const { item } = upNext
    const t = resumeSeconds(item)
    start(item.Id, t)
    if (modeRef.current === 'full') navigate(`/play/${item.Id}?t=${t}`, { replace: true, state: EXPAND_STATE })
  }, [upNext, navigate, start])

  // Count down "Up next", then play it.
  useEffect(() => {
    if (!upNext) return
    if (upNext.left <= 0) {
      playUpNext()
      return
    }
    const t = window.setTimeout(() => setUpNext((u) => (u ? { ...u, left: u.left - 1 } : u)), 1000)
    return () => window.clearTimeout(t)
  }, [upNext, playUpNext])

  // Keys in the full-screen player. Esc/Backspace = back (stop), "i" = mini-player.
  useEffect(() => {
    if (mode !== 'full') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.tagName === 'SELECT' && e.key === 'Backspace') return
      if (e.key === 'Escape' || e.key === 'Backspace') backAndStop()
      else if (e.key === 'i' && !e.ctrlKey && !e.metaKey && !e.altKey) minimize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, backAndStop, minimize])

  // Track pause, position and picture-in-picture for the mini-player buttons.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => setPaused(video.paused)
    const onTime = () => {
      if (video.currentTime > 0) positionRef.current = video.currentTime
    }
    const enter = () => setInPip(true)
    const leave = () => setInPip(false)
    video.addEventListener('play', sync)
    video.addEventListener('pause', sync)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('enterpictureinpicture', enter)
    video.addEventListener('leavepictureinpicture', leave)
    return () => {
      video.removeEventListener('play', sync)
      video.removeEventListener('pause', sync)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('enterpictureinpicture', enter)
      video.removeEventListener('leavepictureinpicture', leave)
    }
  }, [])

  // Let the page leave room for the mini-player.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-mini', mode === 'mini')
  }, [mode])

  const togglePause = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => undefined)
    else v.pause()
  }

  const itemId = current?.id ?? null
  const value = useMemo(
    () => ({ itemId, mode, play, expand, minimize, close, quality: qualityId ?? DEFAULT_QUALITY, method }),
    [itemId, mode, play, expand, minimize, close, qualityId, method],
  )

  const full = mode === 'full'
  const q = qualityFor(qualityId)
  const loading = current !== null && !method && !error
  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <div
        className={`player-shell ${full ? 'full' : 'mini'}`}
        hidden={!current}
        role={full ? undefined : 'region'}
        aria-label={full ? undefined : 'Mini player'}
      >
        <video
          ref={videoRef}
          controls={full}
          playsInline
          className="video"
          aria-label={title || 'Video'}
          onClick={full ? undefined : expand}
        />

        {full ? (
          <div className="player-bar" data-nav-row>
            <button type="button" className="btn ghost" onClick={backAndStop}>
              ← Back
            </button>
            <span className="player-title">{title}</span>
            {method && <span className="pill">{method === 'Transcode' ? `Converted${q.maxHeight ? ` · ${q.label}` : ''}` : 'Direct'}</span>}
            <select
              className="quality"
              aria-label="Quality"
              value={q.id}
              onChange={(e) => changeQuality(e.target.value as QualityId)}
            >
              {QUALITIES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn ghost" onClick={minimize} title="Keep watching while you browse (i)" aria-label="Mini player">
              <span className="long">Mini player</span>
              <span className="short">Mini</span>
            </button>
            {pipSupported() && (
              <button type="button" className="btn ghost" onClick={() => void enterPip()} aria-label="Picture-in-picture">
                <span className="long">Picture-in-picture</span>
                <span className="short">PiP</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mini-bar" data-nav-row>
            <span className="mini-title" title={title}>
              {inPip ? 'Playing in picture-in-picture' : title}
            </span>
            <button type="button" className="btn ghost" onClick={togglePause} aria-label={paused ? 'Play' : 'Pause'}>
              {paused ? '▶' : '❚❚'}
            </button>
            <button type="button" className="btn ghost" onClick={expand} aria-label="Expand player">
              ⤢
            </button>
            <button type="button" className="btn ghost" onClick={close} aria-label="Close player">
              ✕
            </button>
          </div>
        )}

        {loading && full && (
          <div className="player-overlay" role="status">
            <p>Starting…</p>
          </div>
        )}
        {error && (
          <div className="player-overlay" role="alert">
            <p>{error}</p>
            <div className="actions">
              {!current?.forceTranscode && full && (
                <button type="button" className="btn primary" onClick={tryConverting} autoFocus>
                  Try converting
                </button>
              )}
              <button type="button" className="btn" onClick={full ? backAndStop : close}>
                {full ? 'Back' : 'Close'}
              </button>
            </div>
            {!current?.forceTranscode && full && (
              <p className="muted small">Converting asks your server to change the video into a format every browser can play.</p>
            )}
          </div>
        )}
        {upNext && (
          <div className="up-next" role="status">
            <p>
              Up next from Tonight: <strong>{upNext.item.Name}</strong> in {upNext.left}s
            </p>
            <div className="actions">
              <button type="button" className="btn primary" onClick={playUpNext} autoFocus>
                Play now
              </button>
              <button type="button" className="btn" onClick={() => setUpNext(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PlaybackContext.Provider>
  )
}
