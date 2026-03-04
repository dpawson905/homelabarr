import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "../helpers"
import { resolveSecret } from "@/lib/services/service-client"
import type {
  PromQueryConfig,
  PromInstantValue,
  PromRangePoint,
  PromRangeSeries,
  PrometheusResponse,
} from "./types"

function parseQueries(config: Record<string, unknown> | null): PromQueryConfig[] {
  if (!config || !Array.isArray(config.queries)) return []
  return config.queries as PromQueryConfig[]
}

function getPrometheusUrl(config: Record<string, unknown> | null): string | null {
  if (!config) return null

  const secretName = config.prometheusSecretName as string | undefined
  if (secretName) {
    const resolved = resolveSecret(secretName)
    if (resolved) return resolved.replace(/\/+$/, "")
  }

  const directUrl = config.prometheusUrl as string | undefined
  if (directUrl) return directUrl.replace(/\/+$/, "")

  return null
}

async function queryInstant(
  baseUrl: string,
  query: string
): Promise<number | null> {
  const url = `${baseUrl}/api/v1/query?query=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return null

  const json = await res.json()
  const result = json?.data?.result
  if (!Array.isArray(result) || result.length === 0) return null

  const value = parseFloat(result[0]?.value?.[1])
  return isNaN(value) ? null : value
}

async function queryRange(
  baseUrl: string,
  query: string,
  duration: string,
  step: string
): Promise<PromRangePoint[]> {
  const end = Math.floor(Date.now() / 1000)
  const durationSeconds = parseDuration(duration)
  const start = end - durationSeconds

  const url = `${baseUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&step=${step}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return []

  const json = await res.json()
  const result = json?.data?.result
  if (!Array.isArray(result) || result.length === 0) return []

  return (result[0]?.values ?? []).map(
    ([ts, val]: [number, string]) => ({
      timestamp: ts,
      value: parseFloat(val),
    })
  )
}

function parseDuration(d: string): number {
  const match = d.match(/^(\d+)([smhd])$/)
  if (!match) return 3600
  const n = parseInt(match[1], 10)
  switch (match[2]) {
    case "s": return n
    case "m": return n * 60
    case "h": return n * 3600
    case "d": return n * 86400
    default: return 3600
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const widgetId = url.searchParams.get("widgetId")

  if (!widgetId) {
    return NextResponse.json(
      { error: "widgetId query parameter is required" },
      { status: 400 }
    )
  }

  const widget = getWidgetWithConfig(widgetId)
  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 })
  }

  const config = widget.config as Record<string, unknown> | null
  const promUrl = getPrometheusUrl(config)

  if (!promUrl) {
    return NextResponse.json(
      { error: "Prometheus URL not configured" },
      { status: 400 }
    )
  }

  const queries = parseQueries(config)
  if (queries.length === 0) {
    return NextResponse.json(
      { instant: [], range: [] } satisfies PrometheusResponse,
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  const showChart = config?.showChart !== false
  const chartDuration = (config?.chartDuration as string) ?? "1h"
  const chartStep = (config?.chartStep as string) ?? "60"

  try {
    const instantResults: PromInstantValue[] = await Promise.all(
      queries.map(async (q) => {
        const value = await queryInstant(promUrl, q.query)
        return {
          label: q.label,
          value: value ?? 0,
          unit: q.unit,
          format: q.format,
        }
      })
    )

    let rangeResults: PromRangeSeries[] = []
    if (showChart) {
      rangeResults = await Promise.all(
        queries.map(async (q) => {
          const points = await queryRange(promUrl, q.query, chartDuration, chartStep)
          return { label: q.label, points }
        })
      )
    }

    return NextResponse.json(
      { instant: instantResults, range: rangeResults } satisfies PrometheusResponse,
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to query Prometheus"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
