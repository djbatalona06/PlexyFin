import { createContext, useContext } from 'react'
import type { PlayMethod } from '../api/types'
import type { QualityId } from './quality'

export type PlayerMode = 'full' | 'mini'

export interface PlaybackCtx {
  /** What is loaded in the player, or null when nothing is. */
  itemId: string | null
  mode: PlayerMode | null
  /**
   * Full-screen player: start `id` at `startSec`. Called by the /play route.
   * With `keep`, a video that is already playing just goes full screen again (no restart).
   */
  play: (id: string, startSec: number, opts?: { keep?: boolean }) => void
  /** Bring the mini-player back to full screen without restarting. */
  expand: () => void
  /** Shrink to the corner and go back to browsing. Video keeps playing. */
  minimize: () => void
  /** Stop and remove the player. */
  close: () => void
  quality: QualityId
  method: PlayMethod | null
}

export const PlaybackContext = createContext<PlaybackCtx | null>(null)

export function usePlayback(): PlaybackCtx {
  const ctx = useContext(PlaybackContext)
  if (!ctx) throw new Error('usePlayback must be used inside <PlaybackProvider>')
  return ctx
}

/** Route state that says "this is the same video, just bigger again". */
export const EXPAND_STATE = { expand: true } as const
