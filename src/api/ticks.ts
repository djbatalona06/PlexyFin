// Jellyfin measures time in "ticks": 10,000,000 ticks = 1 second.
export const TICKS_PER_SECOND = 10_000_000

export const ticksToSeconds = (ticks = 0) => ticks / TICKS_PER_SECOND
export const secondsToTicks = (seconds = 0) => Math.round(seconds * TICKS_PER_SECOND)

/** "1:05:09" or "4:07" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** "1h 52m" or "24m" */
export function formatRuntime(ticks?: number): string {
  if (!ticks) return ''
  const mins = Math.round(ticksToSeconds(ticks) / 60)
  const h = Math.floor(mins / 60)
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`
}
