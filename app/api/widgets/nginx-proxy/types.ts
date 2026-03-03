export interface NpmProxyHost {
  id: number
  domainNames: string[]
  enabled: boolean
  sslForced: boolean
}

export interface NpmCertificate {
  id: number
  provider: string
  domainNames: string[]
  expiresOn: string // ISO date
  isExpiringSoon: boolean
}

export interface NpmResponse {
  proxyHosts: { enabled: number; disabled: number; total: number }
  certificates: { total: number; expiringSoon: number; expired: number }
  redirectionHosts: number
  streams: number
}
