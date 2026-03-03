export interface SpeedtestResult {
  download: number // Mbps
  upload: number // Mbps
  ping: number // ms
  serverName: string
  testTime: string // ISO date string
}

export interface SpeedtestResponse {
  latest: SpeedtestResult | null
}
