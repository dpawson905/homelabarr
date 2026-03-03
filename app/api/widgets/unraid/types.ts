export interface UnraidArrayDisk {
  name: string
  temp: number | null
  numErrors: number
  status: string
}

export interface UnraidContainer {
  name: string
  state: string
}

export interface UnraidVm {
  name: string
  state: string
}

export interface UnraidResponse {
  arrayState: string
  arrayUsed: number
  arrayTotal: number
  arrayFree: number
  cpuPercent: number
  memoryUsed: number
  memoryTotal: number
  disks: UnraidArrayDisk[]
  containers: { running: number; stopped: number; total: number }
  vms: { running: number; stopped: number; total: number }
  uptime: number
}
