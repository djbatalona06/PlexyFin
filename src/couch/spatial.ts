// Spatial navigation: given where focus is now and a direction, pick the best thing to move to.
// Pure math on rectangles, so it is easy to test without a browser.

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Candidate<T> {
  item: T
  rect: Rect
}

const EDGE_SLACK = 1 // px; rounding in layouts can make neighbours overlap by a hair
const CROSS_WEIGHT = 2 // being off to the side costs more than being far away

const right = (r: Rect) => r.left + r.width
const bottom = (r: Rect) => r.top + r.height
const cx = (r: Rect) => r.left + r.width / 2
const cy = (r: Rect) => r.top + r.height / 2

/** How much two ranges overlap (0 when they don't). */
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

/**
 * Score a candidate: lower is better, `null` means "not in that direction".
 * main  = gap along the direction of travel (edge to edge)
 * cross = how far off-centre it is sideways
 * Candidates that share a row (or column) with the current one get the cross cost removed,
 * so Right moves along the row instead of jumping to a closer item on the next row.
 */
export function score(from: Rect, to: Rect, dir: Dir): number | null {
  let main: number
  let cross: number
  let shared: number
  if (dir === 'right' || dir === 'left') {
    if (dir === 'right' ? cx(to) <= cx(from) : cx(to) >= cx(from)) return null
    main = dir === 'right' ? to.left - right(from) : from.left - right(to)
    if (main < -EDGE_SLACK && overlap(from.left, right(from), to.left, right(to)) > EDGE_SLACK) {
      // Overlapping horizontally (e.g. a wide element below): treat as touching, not as a jump back.
      main = 0
    }
    cross = Math.abs(cy(to) - cy(from))
    shared = overlap(from.top, bottom(from), to.top, bottom(to))
  } else {
    if (dir === 'down' ? cy(to) <= cy(from) : cy(to) >= cy(from)) return null
    main = dir === 'down' ? to.top - bottom(from) : from.top - bottom(to)
    if (main < -EDGE_SLACK && overlap(from.top, bottom(from), to.top, bottom(to)) > EDGE_SLACK) main = 0
    cross = Math.abs(cx(to) - cx(from))
    shared = overlap(from.left, right(from), to.left, right(to))
  }
  const gap = Math.max(0, main)
  return shared > 0 ? gap + cross * 0.1 : gap + cross * CROSS_WEIGHT
}

/** The best candidate in `dir`, or `null` if there is nothing that way. Ties go to the earlier one (page order). */
export function pickNext<T>(from: Rect, candidates: readonly Candidate<T>[], dir: Dir): T | null {
  let best: T | null = null
  let bestScore = Infinity
  for (const c of candidates) {
    const s = score(from, c.rect, dir)
    if (s !== null && s < bestScore) {
      best = c.item
      bestScore = s
    }
  }
  return best
}

export const ARROW_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/** Smart TVs, streaming sticks and consoles: start in couch mode there. */
export function isTvUserAgent(ua: string): boolean {
  return /SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|\bAFT[A-Z0-9]|CrKey|GoogleTV|Android TV|BRAVIA|HbbTV|PlayStation|Xbox|Roku/i.test(ua)
}
