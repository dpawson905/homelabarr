export interface PromQueryConfig {
  label: string
  query: string
  unit?: string
  format?: "percent" | "bytes" | "number"
}

export interface PromInstantValue {
  label: string
  value: number
  unit?: string
  format?: "percent" | "bytes" | "number"
}

export interface PromRangePoint {
  timestamp: number
  value: number
}

export interface PromRangeSeries {
  label: string
  points: PromRangePoint[]
}

export interface PrometheusResponse {
  instant: PromInstantValue[]
  range: PromRangeSeries[]
}
