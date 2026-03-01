export interface DnsClient {
  name: string
  queryCount: number
}

export interface DnsStats {
  totalQueries: number
  blockedQueries: number
  blockPercentage: number
  domainsBlocked: number
  topClients: DnsClient[]
}

export interface DnsResponse {
  stats: DnsStats
  serviceType: "pihole" | "adguard"
  protectionEnabled: boolean
}
