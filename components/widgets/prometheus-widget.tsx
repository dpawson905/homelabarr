"use client"

import { useState, useEffect, useCallback } from "react"
import { ChartLineData01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type {
  PromInstantValue,
  PromRangeSeries,
  PrometheusResponse,
} from "@/app/api/widgets/prometheus/types"

interface QueryFormEntry {
  label: string
  query: string
  unit: string
  format: string
}

interface PrometheusWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const DEFAULT_QUERIES: QueryFormEntry[] = [
  {
    label: "CPU Usage",
    query: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
    unit: "%",
    format: "percent",
  },
  {
    label: "Memory Usage",
    query:
      "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
    unit: "%",
    format: "percent",
  },
]

export function PrometheusWidget({
  widgetId,
  config,
  onDelete,
}: PrometheusWidgetProps): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PrometheusResponse | null>(null)

  const savedConfig = {
    prometheusUrl: (config?.prometheusUrl as string) ?? "",
    prometheusSecretName: (config?.prometheusSecretName as string) ?? "",
    showChart: config?.showChart !== false,
    chartDuration: (config?.chartDuration as string) ?? "1h",
    chartStep: (config?.chartStep as string) ?? "60",
    refreshInterval:
      typeof config?.refreshInterval === "number" ? config.refreshInterval : 30,
    queries: Array.isArray(config?.queries)
      ? (config.queries as QueryFormEntry[])
      : [],
  }

  const isConfigured =
    !!savedConfig.prometheusUrl || !!savedConfig.prometheusSecretName

  const [formUrl, setFormUrl] = useState(savedConfig.prometheusUrl)
  const [formSecretName, setFormSecretName] = useState(
    savedConfig.prometheusSecretName
  )
  const [formShowChart, setFormShowChart] = useState(savedConfig.showChart)
  const [formDuration, setFormDuration] = useState(savedConfig.chartDuration)
  const [formStep, setFormStep] = useState(savedConfig.chartStep)
  const [formRefresh, setFormRefresh] = useState(savedConfig.refreshInterval)
  const [formQueries, setFormQueries] = useState<QueryFormEntry[]>(
    savedConfig.queries.length > 0 ? savedConfig.queries : DEFAULT_QUERIES
  )

  useEffect(() => {
    setFormUrl((config?.prometheusUrl as string) ?? "")
    setFormSecretName((config?.prometheusSecretName as string) ?? "")
    setFormShowChart(config?.showChart !== false)
    setFormDuration((config?.chartDuration as string) ?? "1h")
    setFormStep((config?.chartStep as string) ?? "60")
    setFormRefresh(
      typeof config?.refreshInterval === "number" ? config.refreshInterval : 30
    )
    const q = Array.isArray(config?.queries)
      ? (config.queries as QueryFormEntry[])
      : []
    setFormQueries(q.length > 0 ? q : DEFAULT_QUERIES)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/widgets/prometheus?widgetId=${widgetId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }
      setData(await res.json())
      setError(null)
    } catch {
      setError("Failed to connect")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [widgetId, isConfigured])

  useEffect(() => {
    if (!isConfigured) return
    fetchData()
    const interval = setInterval(fetchData, savedConfig.refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchData, isConfigured, savedConfig.refreshInterval])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            prometheusUrl: formUrl,
            prometheusSecretName: formSecretName,
            showChart: formShowChart,
            chartDuration: formDuration,
            chartStep: formStep,
            refreshInterval: formRefresh,
            queries: formQueries,
          },
        }),
      })
      if (res.ok) {
        setShowSettings(false)
        setLoading(true)
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  function addQuery() {
    setFormQueries([...formQueries, { label: "", query: "", unit: "", format: "number" }])
  }

  function removeQuery(index: number) {
    setFormQueries(formQueries.filter((_, i) => i !== index))
  }

  function updateQuery(index: number, field: keyof QueryFormEntry, value: string) {
    setFormQueries(
      formQueries.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    )
  }

  function formatValue(val: number, format?: string): string {
    if (format === "percent") return `${val.toFixed(1)}%`
    if (format === "bytes") {
      if (val > 1e9) return `${(val / 1e9).toFixed(1)} GB`
      if (val > 1e6) return `${(val / 1e6).toFixed(1)} MB`
      if (val > 1e3) return `${(val / 1e3).toFixed(1)} KB`
      return `${val.toFixed(0)} B`
    }
    return val >= 100 ? val.toFixed(0) : val.toFixed(1)
  }

  function buildChartData(range: PromRangeSeries[]) {
    if (range.length === 0) return []
    const timeMap = new Map<number, Record<string, number>>()
    for (const series of range) {
      for (const pt of series.points) {
        const row = timeMap.get(pt.timestamp) ?? { time: pt.timestamp }
        row[series.label] = pt.value
        timeMap.set(pt.timestamp, row)
      }
    }
    return Array.from(timeMap.values()).sort(
      (a, b) => (a.time as number) - (b.time as number)
    )
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card">
      <WidgetHeader
        icon={ChartLineData01Icon}
        title="Prometheus"
        onSettingsClick={() => setShowSettings((s) => !s)}
        isSettings={showSettings}
        status={data && !error ? "success" : error ? "error" : undefined}
      />

      {showSettings ? (
        <div className="flex flex-col gap-3 overflow-y-auto border-b border-border p-3">
          <div>
            <Label className="text-xs">Prometheus URL</Label>
            <Input
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="http://prometheus:9090"
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Or Secret Name (for encrypted URL)</Label>
            <Input
              value={formSecretName}
              onChange={(e) => setFormSecretName(e.target.value)}
              placeholder="prometheus-url"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={formShowChart} onCheckedChange={setFormShowChart} />
            <Label className="text-xs">Show chart</Label>
          </div>
          {formShowChart && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Duration</Label>
                <Input
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  placeholder="1h"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Step (s)</Label>
                <Input
                  value={formStep}
                  onChange={(e) => setFormStep(e.target.value)}
                  placeholder="60"
                  className="h-7 text-xs"
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Refresh interval (s)</Label>
            <Input
              type="number"
              value={formRefresh}
              onChange={(e) => setFormRefresh(parseInt(e.target.value, 10) || 30)}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">PromQL Queries</Label>
            {formQueries.map((q, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 rounded-md border border-border p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Query {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeQuery(i)}
                  >
                    <span className="text-xs">&times;</span>
                  </Button>
                </div>
                <Input
                  value={q.label}
                  onChange={(e) => updateQuery(i, "label", e.target.value)}
                  placeholder="Label"
                  className="h-7 text-xs"
                />
                <Input
                  value={q.query}
                  onChange={(e) => updateQuery(i, "query", e.target.value)}
                  placeholder="PromQL query"
                  className="h-7 text-xs font-mono"
                />
                <div className="flex gap-2">
                  <Input
                    value={q.unit}
                    onChange={(e) => updateQuery(i, "unit", e.target.value)}
                    placeholder="Unit (%)"
                    className="h-7 text-xs flex-1"
                  />
                  <Input
                    value={q.format}
                    onChange={(e) => updateQuery(i, "format", e.target.value)}
                    placeholder="percent|bytes|number"
                    className="h-7 text-xs flex-1"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addQuery}>
              Add Query
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
          </div>
        </div>
      ) : null}

      {!showSettings && (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {!isConfigured ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Click settings to configure Prometheus
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <p className="text-xs text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {data?.instant.map((m: PromInstantValue) => (
                  <div
                    key={m.label}
                    className="rounded-md border border-border px-3 py-2 text-center"
                  >
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatValue(m.value, m.format)}
                    </p>
                  </div>
                ))}
              </div>
              {savedConfig.showChart &&
                data?.range &&
                data.range.length > 0 && (
                  <div className="h-32 w-full mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={buildChartData(data.range)}>
                        <XAxis
                          dataKey="time"
                          tick={false}
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={0.5}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={0.5}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: 11,
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                          }}
                          labelFormatter={(ts: number) =>
                            new Date(ts * 1000).toLocaleTimeString()
                          }
                        />
                        {data.range.map((series: PromRangeSeries, i: number) => (
                          <Line
                            key={series.label}
                            type="monotone"
                            dataKey={series.label}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
