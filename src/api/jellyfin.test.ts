import { describe, expect, it } from 'vitest'
import { authHeader, buildUrl, chooseStream, imageUrl, isMixedContent, normalizeServerUrl } from './jellyfin'
import { buildDeviceProfile } from './profile'
import { formatClock, formatRuntime, secondsToTicks, ticksToSeconds } from './ticks'

describe('normalizeServerUrl', () => {
  it('adds https and strips /web and slashes', () => {
    expect(normalizeServerUrl(' jf.example.com/web/ ')).toBe('https://jf.example.com')
    expect(normalizeServerUrl('http://192.168.1.5:8096/')).toBe('http://192.168.1.5:8096')
    expect(normalizeServerUrl('https://x.y/jellyfin/web/index.html')).toBe('https://x.y/jellyfin')
    expect(normalizeServerUrl('')).toBe('')
  })
})

describe('isMixedContent', () => {
  it('blocks http servers from https pages, except localhost', () => {
    expect(isMixedContent('http://192.168.1.5:8096', 'https:')).toBe(true)
    expect(isMixedContent('http://localhost:8096', 'https:')).toBe(false)
    expect(isMixedContent('https://jf.example.com', 'https:')).toBe(false)
    expect(isMixedContent('http://192.168.1.5:8096', 'http:')).toBe(false)
  })
})

describe('authHeader', () => {
  it('uses the MediaBrowser format and adds the token only when present', () => {
    expect(authHeader('dev-1', undefined, 'Chrome')).toBe(
      'MediaBrowser Client="Hearthreel", Device="Chrome", DeviceId="dev-1", Version="0.1.0"',
    )
    expect(authHeader('dev-1', 'abc', 'Chrome')).toContain(', Token="abc"')
  })
  it('strips characters that would break the header', () => {
    expect(authHeader('a"b,c', undefined, 'X')).toContain('DeviceId="abc"')
  })
})

describe('buildUrl', () => {
  it('skips empty values', () => {
    expect(buildUrl('https://s', '/Items', { a: 1, b: undefined, c: '' })).toBe('https://s/Items?a=1')
  })
})

describe('chooseStream', () => {
  const c = { serverUrl: 'https://s', deviceId: 'd', token: 't', userId: 'u' }
  it('uses the static file for direct play with ApiKey', () => {
    const s = chooseStream(c, 'i', { Id: 'm', SupportsDirectPlay: true, SupportsDirectStream: true, SupportsTranscoding: true }, 'p')
    expect(s?.method).toBe('DirectPlay')
    expect(s?.url).toContain('/Videos/i/stream?static=true&mediaSourceId=m&playSessionId=p&deviceId=d&ApiKey=t')
  })
  it('uses the HLS transcode url otherwise', () => {
    const s = chooseStream(
      c,
      'i',
      { Id: 'm', SupportsDirectPlay: false, SupportsDirectStream: false, SupportsTranscoding: true, TranscodingUrl: '/videos/i/master.m3u8?MediaSourceId=m' },
      'p',
    )
    expect(s).toMatchObject({ method: 'Transcode', isHls: true })
    expect(s?.url).toContain('ApiKey=t')
  })
  it('returns null when nothing is playable', () => {
    expect(chooseStream(c, 'i', { Id: 'm', SupportsDirectPlay: false, SupportsDirectStream: false, SupportsTranscoding: false }, 'p')).toBeNull()
  })
})

describe('imageUrl', () => {
  it('falls back to the series poster for episodes', () => {
    expect(imageUrl('https://s', { Id: 'e', Name: 'E', Type: 'Episode', SeriesId: 's1', SeriesPrimaryImageTag: 'tg' })).toContain('/Items/s1/Images/Primary')
    expect(imageUrl('https://s', { Id: 'x', Name: 'X', Type: 'Movie' })).toBeNull()
  })
})

describe('device profile', () => {
  it('always offers an H.264 HLS transcode, even when nothing plays directly', () => {
    const p = buildDeviceProfile(() => false)
    expect(p.DirectPlayProfiles).toEqual([])
    expect(p.TranscodingProfiles[0]).toMatchObject({ Protocol: 'hls', VideoCodec: 'h264' })
  })
  it('adds codecs the browser reports', () => {
    const p = buildDeviceProfile((m) => m.includes('avc1') || m.includes('hvc1') || m.includes('webm'))
    expect(p.DirectPlayProfiles[0]).toEqual({ Container: 'mp4,m4v', Type: 'Video', VideoCodec: 'h264,hevc', AudioCodec: 'aac,mp3' })
    expect(JSON.stringify(p)).toContain('h264,hevc')
    expect(p.DirectPlayProfiles).toHaveLength(2)
  })
})

describe('ticks', () => {
  it('converts and formats', () => {
    expect(ticksToSeconds(secondsToTicks(12.5))).toBe(12.5)
    expect(formatClock(3909)).toBe('1:05:09')
    expect(formatClock(247)).toBe('4:07')
    expect(formatRuntime(secondsToTicks(112 * 60))).toBe('1h 52m')
  })
})
