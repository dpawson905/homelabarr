export interface PortainerEnvironment {
  id: number
  name: string
  status: number // 1 = up, 2 = down
  type: number
}

export interface PortainerResponse {
  environments: PortainerEnvironment[]
  containers: { running: number; stopped: number; total: number }
}
