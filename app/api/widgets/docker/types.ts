export interface ContainerPort {
  privatePort: number
  publicPort: number | null
  type: string
}

export interface ContainerStatsInfo {
  cpuPercent: number
  memoryUsage: number
  memoryLimit: number
  memoryPercent: number
}

export interface ContainerData {
  id: string
  name: string
  image: string
  state: string
  status: string
  created: number
  ports: ContainerPort[]
  stats: ContainerStatsInfo | null
}
