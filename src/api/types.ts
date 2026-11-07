// Minimal Jellyfin types: only the fields Hearthreel reads (YAGNI).

export interface Session {
  serverUrl: string
  serverName: string
  serverId: string
  userId: string
  userName: string
  token: string
}

export interface PublicSystemInfo {
  Id: string
  ServerName: string
  Version: string
  ProductName?: string
}

export interface AuthResult {
  AccessToken: string
  ServerId: string
  User: { Id: string; Name: string }
}

export interface UserData {
  PlaybackPositionTicks?: number
  PlayedPercentage?: number
  Played?: boolean
}

export interface BaseItem {
  Id: string
  Name: string
  Type: string
  IsFolder?: boolean
  CollectionType?: string
  MediaType?: string
  ProductionYear?: number
  RunTimeTicks?: number
  Overview?: string
  SeriesId?: string
  SeriesName?: string
  SeriesPrimaryImageTag?: string
  ParentIndexNumber?: number
  IndexNumber?: number
  ImageTags?: Record<string, string>
  UserData?: UserData
}

export interface ItemsResult {
  Items: BaseItem[]
  TotalRecordCount: number
}

export interface MediaSource {
  Id: string
  Container?: string
  SupportsDirectPlay: boolean
  SupportsDirectStream: boolean
  SupportsTranscoding: boolean
  TranscodingUrl?: string
}

export interface PlaybackInfo {
  MediaSources: MediaSource[]
  PlaySessionId: string
  ErrorCode?: string
}

export type PlayMethod = 'DirectPlay' | 'DirectStream' | 'Transcode'
