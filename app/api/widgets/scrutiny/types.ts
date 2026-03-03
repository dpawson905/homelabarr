export interface ScrutinyDrive {
  deviceName: string
  modelName: string
  deviceType: string // ATA, NVME, SCSI
  status: "passed" | "failed" | "unknown"
  temperature: number | null
  powerOnHours: number | null
  capacity: number // bytes
}

export interface ScrutinyResponse {
  drives: ScrutinyDrive[]
  summary: {
    total: number
    passed: number
    failed: number
  }
}
