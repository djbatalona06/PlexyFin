import { describe, expect, it } from 'vitest'
import { buildDeviceProfile } from '../api/profile'
import { QUALITIES, qualityFor } from './quality'

const all = () => true

describe('qualityFor', () => {
  it('finds options and falls back to Original', () => {
    expect(qualityFor('720p')).toMatchObject({ maxBitrate: 4_000_000, maxHeight: 720 })
    expect(qualityFor('nonsense').id).toBe('original')
    expect(qualityFor(undefined).id).toBe('original')
  })
  it('lists options from best to smallest', () => {
    const rates = QUALITIES.map((q) => q.maxBitrate)
    expect([...rates].sort((a, b) => b - a)).toEqual(rates)
  })
})

describe('buildDeviceProfile limits', () => {
  it('Original: high bitrate, no height rule', () => {
    const p = buildDeviceProfile(all, qualityFor('original'))
    expect(p.MaxStreamingBitrate).toBe(120_000_000)
    expect(p.CodecProfiles).toEqual([])
  })
  it('480p: caps bitrate and adds a Height rule', () => {
    const p = buildDeviceProfile(all, qualityFor('480p'))
    expect(p.MaxStreamingBitrate).toBe(1_500_000)
    expect(p.MaxStaticBitrate).toBe(1_500_000)
    expect(p.CodecProfiles).toEqual([
      { Type: 'Video', Conditions: [{ Condition: 'LessThanEqual', Property: 'Height', Value: '480', IsRequired: false }] },
    ])
  })
})
