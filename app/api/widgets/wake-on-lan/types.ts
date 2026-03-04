export interface WolDeviceConfig {
  name: string
  mac: string
  broadcastAddress?: string
  statusIp?: string
  icon?: string
}

export interface WolDeviceStatus {
  name: string
  mac: string
  online: boolean | null
  icon?: string
}

export interface WolResponse {
  devices: WolDeviceStatus[]
}

export interface WolWakeRequest {
  mac: string
  broadcastAddress?: string
}

export interface WolWakeResponse {
  success: boolean
  mac: string
  message?: string
}
