export interface NowPlayingItem {
  title: string
  subtitle: string // show name for episodes, artist for music, empty for movies
  user: string
  state: "playing" | "paused" | "buffering"
  progressPercent: number // 0-100
  mediaType: "movie" | "episode" | "music" | "other"
  year?: number
  duration?: string // "1h 23m"
}

export interface RecentlyAddedItem {
  title: string
  subtitle: string
  mediaType: "movie" | "episode" | "music" | "other"
  addedAt: string // ISO date string
  year?: number
}

export interface MediaServerResponse {
  nowPlaying: NowPlayingItem[]
  recentlyAdded: RecentlyAddedItem[]
  serverName?: string
}
