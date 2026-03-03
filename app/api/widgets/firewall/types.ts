export interface FirewallResponse {
  serviceType: "opnsense" | "pfsense"
  hostname: string
  cpuUsage: number
  memoryUsage: number
  uptimeSeconds: number
  activeStates: number
  wanStatus: "up" | "down" | "unknown"
  gatewayStatus: string
  firmwareNeedsUpdate: boolean
  firmwareVersion: string
}
