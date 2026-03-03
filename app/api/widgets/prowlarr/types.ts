export interface ProwlarrIndexer {
  name: string
  enabled: boolean
  protocol: string
}

export interface ProwlarrHealth {
  source: string
  type: string // warning, error
  message: string
}

export interface ProwlarrResponse {
  indexers: { enabled: number; total: number }
  health: ProwlarrHealth[]
  grabs: number
  queries: number
  failedGrabs: number
  failedQueries: number
}
