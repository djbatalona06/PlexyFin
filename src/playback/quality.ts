// The Quality menu. "Original" lets the server send the file as-is when the browser can play it.
// The others cap the bitrate and the picture height, so the server converts to something smaller.

export type QualityId = 'original' | '1080p' | '720p' | '480p'

export interface Quality {
  id: QualityId
  label: string
  /** Bits per second the server may send. */
  maxBitrate: number
  /** Tallest picture allowed, in pixels. `undefined` = no limit. */
  maxHeight?: number
}

export const QUALITIES: readonly Quality[] = [
  { id: 'original', label: 'Original', maxBitrate: 120_000_000 },
  { id: '1080p', label: '1080p', maxBitrate: 10_000_000, maxHeight: 1080 },
  { id: '720p', label: '720p', maxBitrate: 4_000_000, maxHeight: 720 },
  { id: '480p', label: '480p', maxBitrate: 1_500_000, maxHeight: 480 },
]

export const DEFAULT_QUALITY: QualityId = 'original'

/** Unknown or missing ids (old saved data, typos) fall back to Original. */
export function qualityFor(id: string | undefined | null): Quality {
  return QUALITIES.find((q) => q.id === id) ?? QUALITIES[0]
}
