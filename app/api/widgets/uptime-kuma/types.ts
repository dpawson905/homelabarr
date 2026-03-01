export type MonitorStatus = "up" | "down" | "pending" | "maintenance"

export interface Monitor {
  id: number
  name: string
  status: MonitorStatus
  uptime24h: number
  uptime30d: number
  responseTime: number
  url?: string
}

export interface UptimeKumaResponse {
  monitors: Monitor[]
  summary: {
    total: number
    up: number
    down: number
    pending: number
    maintenance: number
  }
  statusPageName: string
}
