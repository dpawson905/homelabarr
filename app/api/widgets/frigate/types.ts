export interface FrigateCamera {
  name: string
  fps: number
  detectionFps: number
  processId: number | null
}

export interface FrigateResponse {
  cameras: FrigateCamera[]
  totalDetections: number
  uptimeSeconds: number
  version: string
  detectors: { name: string; inferenceSpeed: number; pid: number }[]
}
