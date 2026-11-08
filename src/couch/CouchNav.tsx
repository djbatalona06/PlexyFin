import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { usePlayback } from '../playback/playback-context'
import { useCouch } from './couch-context'
import { ARROW_DIRS, pickNext } from './spatial'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), video[controls]'
const RESTORE_TIMEOUT_MS = 2000

function visible(el: HTMLElement): boolean {
  if (el.closest('[hidden], [inert], .skip')) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function focusables(scope: ParentNode): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible)
}

function moveFocus(el: HTMLElement) {
  el.focus({ preventScroll: true })
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (getComputedStyle(el).position !== 'fixed' && !el.closest('.player-shell')) {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  }
}

/**
 * Couch mode: arrow keys (and TV remote arrows) move focus to the nearest thing on screen.
 * - Each shelf (`data-nav-row`) remembers the last item you were on, and you return to it.
 * - Each page remembers the card you opened (`data-nav-id`), so Back puts you where you were.
 * Renders nothing.
 */
export function CouchNav() {
  const { couch } = useCouch()
  const { mode } = usePlayback()
  const location = useLocation()
  const pageKey = location.pathname + location.search
  const pageKeyRef = useRef(pageKey)
  pageKeyRef.current = pageKey
  const rowMemory = useRef(new WeakMap<Element, HTMLElement>())
  const pageMemory = useRef(new Map<string, string>())

  // Remember where focus goes.
  useEffect(() => {
    if (!couch) return
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      const row = el.closest?.('[data-nav-row]')
      if (row) rowMemory.current.set(row, el)
      const navId = el.closest?.('[data-nav-id]')?.getAttribute('data-nav-id')
      if (navId && el.closest('#main')) pageMemory.current.set(pageKeyRef.current, navId)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [couch])

  // Arrow keys.
  useEffect(() => {
    if (!couch) return
    const onKey = (e: KeyboardEvent) => {
      const dir = ARROW_DIRS[e.key]
      if (!dir || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
      // Let form fields and the video keep their own arrow keys where they need them.
      if (active instanceof HTMLInputElement && (dir === 'left' || dir === 'right')) return
      if (active instanceof HTMLSelectElement && (dir === 'up' || dir === 'down')) return
      if (active instanceof HTMLVideoElement && dir !== 'up') return // seek / volume

      const scope = mode === 'full' ? document.querySelector('.player-shell') ?? document : document
      const all = focusables(scope)
      if (!active || active === document.body || !all.includes(active)) {
        const first = document.querySelector<HTMLElement>('#main [data-nav-id]') ?? all[0]
        if (first) {
          e.preventDefault()
          moveFocus(first)
        }
        return
      }
      const from = active.getBoundingClientRect()
      const candidates = all.filter((el) => el !== active).map((el) => ({ item: el, rect: el.getBoundingClientRect() }))
      let target = pickNext(from, candidates, dir)
      if (!target) return // nothing that way: let the page scroll normally

      const fromRow = active.closest('[data-nav-row]')
      const toRow = target.closest('[data-nav-row]')
      if (toRow && toRow !== fromRow) {
        const remembered = rowMemory.current.get(toRow)
        if (remembered?.isConnected && visible(remembered)) target = remembered
      }
      e.preventDefault()
      moveFocus(target)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [couch, mode])

  // New page: put focus back on the card you opened last time, or on the first card.
  useEffect(() => {
    if (!couch || location.pathname.startsWith('/play/')) return
    const wanted = pageMemory.current.get(pageKey)
    const until = performance.now() + RESTORE_TIMEOUT_MS
    let raf = 0
    const tryRestore = () => {
      const main = document.getElementById('main')
      const saved = wanted ? main?.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(wanted)}"]`) : null
      const nothingFocused = !document.activeElement || document.activeElement === document.body
      if (saved && visible(saved)) return moveFocus(saved)
      if (!wanted && nothingFocused && main) {
        // The page's main button (Play, Play next), else the first card, else anything.
        // (React's autoFocus only works on form fields, not on links like "▶ Play".)
        const first =
          main.querySelector<HTMLElement>('.btn.primary') ?? main.querySelector<HTMLElement>('[data-nav-id]') ?? focusables(main)[0]
        if (first && visible(first)) return moveFocus(first)
      }
      if (performance.now() < until) raf = requestAnimationFrame(tryRestore)
    }
    raf = requestAnimationFrame(tryRestore)
    return () => cancelAnimationFrame(raf)
  }, [couch, pageKey, location.pathname])

  return null
}
