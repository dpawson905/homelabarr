export interface DownloadItem {
  id: string
  name: string
  status:
    | "downloading"
    | "paused"
    | "queued"
    | "completed"
    | "failed"
    | "stalled"
    | "seeding"
    | "checking"
  progressPercent: number
  sizeTotal: number
  sizeRemaining: number
  downloadSpeed: number
  uploadSpeed?: number
  eta: string
  addedAt?: string
}

export interface DownloadSummary {
  totalSpeed: string
  totalItems: number
  activeItems: number
}

export interface DownloadClientResponse {
  items: DownloadItem[]
  summary: DownloadSummary
  serviceType: "qbittorrent" | "sabnzbd"
}
