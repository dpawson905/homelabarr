export interface CalendarItem {
  id: number
  title: string
  seriesOrMovieTitle: string
  episodeInfo?: string // "S02E05" for Sonarr, undefined for Radarr
  airDate: string
  hasFile: boolean
  mediaType: "episode" | "movie"
}

export interface QueueItem {
  id: number
  title: string
  seriesOrMovieTitle: string
  status: string
  progressPercent: number
  sizeTotal: number
  sizeLeft: number
  timeLeft: string
  mediaType: "episode" | "movie"
}

export interface MediaManagementResponse {
  calendar: CalendarItem[]
  queue: QueueItem[]
  serviceType: "sonarr" | "radarr"
}
