export interface MediaRequest {
  id: number
  title: string
  mediaType: "movie" | "tv"
  status: "pending" | "approved" | "declined" | "available" | "processing"
  requestedBy: string
  requestedAt: string
  year?: number
}

export interface RequestCounts {
  pending: number
  approved: number
  processing: number
  available: number
  total: number
}

export interface MediaRequestsResponse {
  requests: MediaRequest[]
  counts: RequestCounts
}
