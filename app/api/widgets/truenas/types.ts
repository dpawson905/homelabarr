export interface TruenasPool {
  name: string
  status: string // ONLINE, DEGRADED, FAULTED
  healthy: boolean
  usedBytes: number
  totalBytes: number
  usedPercentage: number
}

export interface TruenasAlert {
  level: string // INFO, WARNING, CRITICAL
  title: string
  dismissed: boolean
}

export interface TruenasResponse {
  hostname: string
  version: string
  uptimeSeconds: number
  pools: TruenasPool[]
  alerts: { info: number; warning: number; critical: number }
}
