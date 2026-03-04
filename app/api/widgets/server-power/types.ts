export interface ServerConfig {
  name: string
  webhookUrl: string
  secretName?: string
  statusUrl?: string
  icon?: string
}

export interface ServerStatus {
  name: string
  online: boolean | null
  icon?: string
}

export interface ServerPowerResponse {
  servers: ServerStatus[]
}

export interface ServerPowerActionRequest {
  serverName: string
  action: "on" | "off"
}

export interface ServerPowerActionResponse {
  success: boolean
  serverName: string
  action: string
  message?: string
}
