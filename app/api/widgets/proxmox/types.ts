export interface ProxmoxNode {
  id: string
  name: string
  status: "online" | "offline"
  cpuUsage: number
  memUsage: number
  memTotal: number
  uptime: number
}

export interface ProxmoxGuest {
  vmid: number
  name: string
  node: string
  type: "qemu" | "lxc"
  status: "running" | "stopped" | "paused"
  cpuUsage: number
  memUsage: number
  memTotal: number
  uptime: number
}

export interface ProxmoxSummary {
  totalNodes: number
  onlineNodes: number
  totalGuests: number
  runningGuests: number
}

export interface ProxmoxResponse {
  nodes: ProxmoxNode[]
  guests: ProxmoxGuest[]
  summary: ProxmoxSummary
}
