// Tells the server which formats this browser can play by itself.
// Anything else gets transcoded by the server to H.264 + AAC over HLS.

export type CanPlay = (mime: string) => boolean

export function browserCanPlay(): CanPlay {
  const video = document.createElement('video')
  return (mime) =>
    video.canPlayType(mime) !== '' ||
    (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(mime))
}

export interface ProfileLimits {
  /** Bits per second. Default 120 Mbps ("Original"). */
  maxBitrate?: number
  /** Tallest picture allowed. When set, bigger videos are converted down to this height. */
  maxHeight?: number
}

export function buildDeviceProfile(can: CanPlay, limits: ProfileLimits = {}) {
  const maxBitrate = limits.maxBitrate ?? 120_000_000
  const mp4Video: string[] = []
  if (can('video/mp4; codecs="avc1.42E01E"')) mp4Video.push('h264')
  if (can('video/mp4; codecs="hvc1.1.6.L93.B0"')) mp4Video.push('hevc')
  if (can('video/mp4; codecs="av01.0.05M.08"')) mp4Video.push('av1')
  if (can('video/mp4; codecs="vp09.00.10.08"')) mp4Video.push('vp9')

  const mp4Audio = ['aac', 'mp3']
  if (can('audio/mp4; codecs="opus"')) mp4Audio.push('opus')
  if (can('audio/mp4; codecs="fLaC"')) mp4Audio.push('flac')
  if (can('audio/mp4; codecs="ac-3"')) mp4Audio.push('ac3')
  if (can('audio/mp4; codecs="ec-3"')) mp4Audio.push('eac3')

  const webmVideo = ['vp8', 'vp9', 'av1'].filter((c) =>
    can(`video/webm; codecs="${c === 'av1' ? 'av01.0.05M.08' : c}"`),
  )

  const direct: object[] = []
  if (mp4Video.length) {
    direct.push({ Container: 'mp4,m4v', Type: 'Video', VideoCodec: mp4Video.join(','), AudioCodec: mp4Audio.join(',') })
  }
  if (webmVideo.length) {
    direct.push({ Container: 'webm', Type: 'Video', VideoCodec: webmVideo.join(','), AudioCodec: 'vorbis,opus' })
  }

  return {
    Name: 'Hearthreel',
    MaxStreamingBitrate: maxBitrate,
    MaxStaticBitrate: maxBitrate,
    DirectPlayProfiles: direct,
    TranscodingProfiles: [
      {
        Container: 'ts',
        Type: 'Video',
        VideoCodec: 'h264',
        AudioCodec: 'aac,mp3',
        Context: 'Streaming',
        Protocol: 'hls',
        MaxAudioChannels: '2',
        MinSegments: 1,
        BreakOnNonKeyFrames: true,
      },
    ],
    ContainerProfiles: [],
    // A Height rule makes the server refuse direct play for taller videos and size the conversion to fit.
    CodecProfiles: limits.maxHeight
      ? [
          {
            Type: 'Video',
            Conditions: [
              { Condition: 'LessThanEqual', Property: 'Height', Value: String(limits.maxHeight), IsRequired: false },
            ],
          },
        ]
      : [],
    SubtitleProfiles: [],
  }
}
