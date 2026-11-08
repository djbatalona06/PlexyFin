// Small Jellyfin client: only the calls listed in docs/spec/02-trd.md.
import type {
  AuthResult,
  BaseItem,
  ItemsResult,
  MediaSource,
  PlaybackInfo,
  PlayMethod,
  PublicSystemInfo,
  Session,
} from './types'

export const APP_NAME = 'Hearthreel'
export const APP_VERSION = '0.1.0'

export type ErrorKind = 'network' | 'mixed-content' | 'auth' | 'http' | 'not-jellyfin' | 'login'

export class ApiError extends Error {
  readonly kind: ErrorKind
  readonly status?: number
  constructor(message: string, kind: ErrorKind, status?: number) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

/** What every request needs to know. */
export interface Conn {
  serverUrl: string
  deviceId: string
  token?: string
  userId?: string
}

export const connFrom = (s: Session, deviceId: string): Conn => ({
  serverUrl: s.serverUrl,
  deviceId,
  token: s.token,
  userId: s.userId,
})

// ---------- pure helpers (unit tested) ----------

/** "jf.example.com/web/" -> "https://jf.example.com" */
export function normalizeServerUrl(input: string): string {
  let url = input.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  url = url.replace(/\/+$/, '')
  url = url.replace(/\/web(\/index\.html)?(#.*)?$/i, '')
  return url.replace(/\/+$/, '')
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** True when an https page would be blocked from calling this http server. */
export function isMixedContent(serverUrl: string, pageProtocol: string): boolean {
  if (pageProtocol !== 'https:') return false
  try {
    const u = new URL(serverUrl)
    return u.protocol === 'http:' && !LOCAL_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

const quote = (v: string) => v.replace(/["\\,]/g, '')

export function deviceName(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

/** Jellyfin's required `Authorization: MediaBrowser ...` header. */
export function authHeader(deviceId: string, token?: string, device = deviceName()): string {
  const parts = [
    `Client="${APP_NAME}"`,
    `Device="${quote(device)}"`,
    `DeviceId="${quote(deviceId)}"`,
    `Version="${APP_VERSION}"`,
  ]
  if (token) parts.push(`Token="${quote(token)}"`)
  return `MediaBrowser ${parts.join(', ')}`
}

type Query = Record<string, string | number | boolean | undefined>

export function buildUrl(serverUrl: string, path: string, query: Query = {}): string {
  const u = new URL(serverUrl + path)
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') u.searchParams.set(k, String(v))
  }
  return u.toString()
}

// ---------- request core ----------

interface ReqOpts {
  method?: 'GET' | 'POST' | 'DELETE'
  query?: Query
  body?: unknown
  keepalive?: boolean
}

/** Ask for PascalCase JSON explicitly; the types in ./types.ts use PascalCase. */
export const JSON_ACCEPT = 'application/json; profile="PascalCase"'

async function request<T>(conn: Conn, path: string, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(conn.deviceId, conn.token),
    // Without this, browsers send "Accept: */*" and Jellyfin 12 answers in camelCase.
    Accept: JSON_ACCEPT,
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(buildUrl(conn.serverUrl, path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      keepalive: opts.keepalive,
    })
  } catch {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError("You're offline. Reconnect to the internet and try again.", 'network')
    }
    throw new ApiError(
      "Can't reach the server. Check the address, that it uses HTTPS, and that it allows this app (CORS).",
      'network',
    )
  }
  if (res.status === 401) throw new ApiError('Please sign in again.', 'auth', 401)
  if (!res.ok) throw new ApiError(`The server answered with an error (${res.status}).`, 'http', res.status)
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ---------- login ----------

export async function probeServer(conn: Conn): Promise<PublicSystemInfo> {
  if (isMixedContent(conn.serverUrl, location.protocol)) {
    throw new ApiError(
      'This app is on https, so browsers block http servers. Use an https address for your server, or run Hearthreel locally (see setup help).',
      'mixed-content',
    )
  }
  let info: PublicSystemInfo
  try {
    info = await request<PublicSystemInfo>(conn, '/System/Info/Public')
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'http') {
      throw new ApiError("That address answered, but it doesn't look like a Jellyfin server.", 'not-jellyfin')
    }
    throw e
  }
  if (!info?.Id || !info.ServerName) {
    throw new ApiError("That address answered, but it doesn't look like a Jellyfin server.", 'not-jellyfin')
  }
  return info
}

function toSession(serverUrl: string, info: PublicSystemInfo, auth: AuthResult): Session {
  return {
    serverUrl,
    serverName: info.ServerName,
    serverId: auth.ServerId || info.Id,
    userId: auth.User.Id,
    userName: auth.User.Name,
    token: auth.AccessToken,
  }
}

export async function login(
  serverUrl: string,
  deviceId: string,
  username: string,
  password: string,
): Promise<Session> {
  const conn: Conn = { serverUrl, deviceId }
  const info = await probeServer(conn)
  try {
    const auth = await request<AuthResult>(conn, '/Users/AuthenticateByName', {
      method: 'POST',
      body: { Username: username, Pw: password },
    })
    return toSession(serverUrl, info, auth)
  } catch (e) {
    if (e instanceof ApiError && (e.kind === 'auth' || e.status === 400)) {
      throw new ApiError('Wrong username or password.', 'login', e.status)
    }
    throw e
  }
}

/** Ends this sign-in on the server (the token stops working). Best effort: callers ignore failures. */
export const logout = (c: Conn) => request<void>(c, '/Sessions/Logout', { method: 'POST', keepalive: true })

// ---------- Quick Connect: sign in with a 6-digit code approved from another device ----------

export interface QuickConnectStart {
  Secret: string
  Code: string
}

/** Step 1 (on the TV): get a code to show. Throws a friendly error if the server has it turned off. */
export async function quickConnectStart(serverUrl: string, deviceId: string): Promise<QuickConnectStart> {
  const conn: Conn = { serverUrl, deviceId }
  await probeServer(conn)
  const enabled = await request<boolean>(conn, '/QuickConnect/Enabled')
  if (!enabled) {
    throw new ApiError('Sign-in codes are turned off on this server. An admin can turn on Quick Connect in Dashboard → General.', 'login')
  }
  return request<QuickConnectStart>(conn, '/QuickConnect/Initiate', { method: 'POST' })
}

/** Step 2 (on the TV): has someone approved the code yet? */
export async function quickConnectApproved(serverUrl: string, deviceId: string, secret: string): Promise<boolean> {
  const state = await request<{ Authenticated: boolean }>({ serverUrl, deviceId }, '/QuickConnect/Connect', { query: { secret } })
  return Boolean(state?.Authenticated)
}

/** Step 3 (on the TV): trade the approved secret for a normal sign-in. */
export async function loginWithQuickConnect(serverUrl: string, deviceId: string, secret: string): Promise<Session> {
  const conn: Conn = { serverUrl, deviceId }
  const info = await probeServer(conn)
  const auth = await request<AuthResult>(conn, '/Users/AuthenticateWithQuickConnect', { method: 'POST', body: { Secret: secret } })
  return toSession(serverUrl, info, auth)
}

/** On a phone that is already signed in: approve the code a TV is showing. The TV signs in as this user. */
export async function quickConnectApprove(c: Conn, code: string): Promise<void> {
  try {
    const ok = await request<boolean>(c, '/QuickConnect/Authorize', { method: 'POST', query: { code, userId: c.userId } })
    if (ok === false) throw new ApiError('', 'http')
  } catch (e) {
    if (e instanceof ApiError && (e.kind === 'http' || e.kind === 'login')) {
      throw new ApiError("That code didn't work. Check the numbers, or get a new code on the TV.", 'login', e.status)
    }
    throw e
  }
}

// ---------- browse ----------

const LIST_FIELDS = 'PrimaryImageAspectRatio,Overview'

export const getViews = (c: Conn) => request<ItemsResult>(c, '/UserViews', { query: { userId: c.userId } })

export const getResume = (c: Conn) =>
  request<ItemsResult>(c, '/UserItems/Resume', {
    query: { userId: c.userId, mediaTypes: 'Video', limit: 12, fields: LIST_FIELDS, enableImageTypes: 'Primary' },
  })

export const getItem = (c: Conn, id: string) => request<BaseItem>(c, `/Items/${id}`, { query: { userId: c.userId } })

export const PAGE_SIZE = 60

/** Children of a library/folder. Movie and TV libraries are flattened like the official clients do. */
export function getChildren(c: Conn, parent: BaseItem, startIndex = 0) {
  const flat =
    parent.CollectionType === 'movies'
      ? { includeItemTypes: 'Movie', recursive: true }
      : parent.CollectionType === 'tvshows'
        ? { includeItemTypes: 'Series', recursive: true }
        : {}
  return request<ItemsResult>(c, '/Items', {
    query: {
      userId: c.userId,
      parentId: parent.Id,
      sortBy: 'ParentIndexNumber,IndexNumber,SortName',
      sortOrder: 'Ascending',
      fields: LIST_FIELDS,
      enableImageTypes: 'Primary',
      startIndex,
      limit: PAGE_SIZE,
      ...flat,
    },
  })
}

export const search = (c: Conn, term: string) =>
  request<ItemsResult>(c, '/Items', {
    query: {
      userId: c.userId,
      searchTerm: term,
      recursive: true,
      includeItemTypes: 'Movie,Series,Episode,Video',
      fields: LIST_FIELDS,
      enableImageTypes: 'Primary',
      limit: 60,
    },
  })

/** Fresh copies of specific items (used to update the "Tonight" shelf). */
export const getItemsByIds = (c: Conn, ids: string[]) =>
  request<ItemsResult>(c, '/Items', {
    query: { userId: c.userId, ids: ids.join(','), fields: LIST_FIELDS, enableImageTypes: 'Primary' },
  })

/** Poster URL. Image endpoints are public, so no token in the URL. */
export function imageUrl(serverUrl: string, item: BaseItem, height = 360): string | null {
  const q = `fillHeight=${height}&quality=90`
  if (item.ImageTags?.Primary) return `${serverUrl}/Items/${item.Id}/Images/Primary?${q}&tag=${item.ImageTags.Primary}`
  if (item.SeriesId && item.SeriesPrimaryImageTag) {
    return `${serverUrl}/Items/${item.SeriesId}/Images/Primary?${q}&tag=${item.SeriesPrimaryImageTag}`
  }
  return null
}

// ---------- playback ----------

export function getPlaybackInfo(
  c: Conn,
  itemId: string,
  deviceProfile: object,
  opts: { startTicks: number; allowDirect: boolean; maxBitrate?: number },
) {
  return request<PlaybackInfo>(c, `/Items/${itemId}/PlaybackInfo`, {
    method: 'POST',
    body: {
      UserId: c.userId,
      StartTimeTicks: opts.startTicks,
      IsPlayback: true,
      AutoOpenLiveStream: true,
      MaxStreamingBitrate: opts.maxBitrate ?? 120_000_000,
      EnableDirectPlay: opts.allowDirect,
      EnableDirectStream: opts.allowDirect,
      EnableTranscoding: true,
      DeviceProfile: deviceProfile,
    },
  })
}

export interface StreamChoice {
  url: string
  method: PlayMethod
  isHls: boolean
}

/** Decide how to play a media source: the file as-is, or the server's HLS transcode. */
export function chooseStream(c: Conn, itemId: string, src: MediaSource, playSessionId: string): StreamChoice | null {
  if (src.SupportsDirectPlay) {
    const url = buildUrl(c.serverUrl, `/Videos/${itemId}/stream`, {
      static: true,
      mediaSourceId: src.Id,
      playSessionId,
      deviceId: c.deviceId,
      ApiKey: c.token,
    })
    return { url, method: 'DirectPlay', isHls: false }
  }
  if (src.TranscodingUrl) {
    const u = new URL(c.serverUrl + src.TranscodingUrl)
    if (!u.searchParams.has('ApiKey') && !u.searchParams.has('api_key') && c.token) {
      u.searchParams.set('ApiKey', c.token)
    }
    const isHls = u.pathname.toLowerCase().endsWith('.m3u8')
    return { url: u.toString(), method: 'Transcode', isHls }
  }
  return null
}

export interface ProgressBody {
  ItemId: string
  MediaSourceId: string
  PlaySessionId: string
  PlayMethod: PlayMethod
  PositionTicks: number
  IsPaused?: boolean
  EventName?: string
  CanSeek?: boolean
}

export const reportStart = (c: Conn, b: ProgressBody) =>
  request<void>(c, '/Sessions/Playing', { method: 'POST', body: { ...b, CanSeek: true } })

export const reportProgress = (c: Conn, b: ProgressBody) =>
  request<void>(c, '/Sessions/Playing/Progress', { method: 'POST', body: { ...b, CanSeek: true } })

/** keepalive lets this finish even when the page is closing. */
export const reportStopped = (c: Conn, b: ProgressBody) =>
  request<void>(c, '/Sessions/Playing/Stopped', { method: 'POST', body: b, keepalive: true })

export const stopTranscode = (c: Conn, playSessionId: string) =>
  request<void>(c, '/Videos/ActiveEncodings', {
    method: 'DELETE',
    query: { deviceId: c.deviceId, playSessionId },
    keepalive: true,
  })
