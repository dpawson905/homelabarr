export interface NextcloudResponse {
  version: string
  activeUsers: { last5min: number; lastHour: number; lastDay: number }
  storage: { usedBytes: number; freeBytes: number; totalFiles: number }
  shares: { total: number }
  apps: { installed: number; updatesAvailable: number }
}
