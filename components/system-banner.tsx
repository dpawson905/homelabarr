"use client"

import { useState, useEffect, useMemo } from "react"
import { PieChart, Pie, Cell } from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface Filesystem {
  mount: string
  type: string
  used: number
  size: number
  usage: number
}

interface SystemBannerData {
  cpu: { usage: number; cores: number[] }
  memory: { used: number; total: number; usage: number }
  disk: {
    used: number
    total: number
    usage: number
    filesystems: Filesystem[]
  }
  network: { rx_sec: number; tx_sec: number }
  system: {
    hostname: string
    cpuModel: string
    cpuCores: number
    cpuThreads: number
    uptime: number
  }
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getColorVar(usage: number): string {
  if (usage < 60) return "var(--chart-1)"
  if (usage <= 85) return "var(--chart-4)"
  return "var(--destructive)"
}

function getBarColor(usage: number): string {
  if (usage < 60) return "bg-chart-1"
  if (usage <= 85) return "bg-chart-4"
  return "bg-destructive"
}

function RadialGauge({ value, label, subtitle, id }: { value: number; label: string; subtitle?: string; id: string }) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const colorVar = getColorVar(clamped)

  const chartConfig = useMemo(() => ({
    filled: {
      label,
      color: colorVar,
    },
    track: {
      label: "Track",
      color: "var(--border)",
    },
  } satisfies ChartConfig), [label, colorVar])

  const data = [
    { name: "filled", value: clamped, fill: "var(--color-filled)" },
    { name: "track", value: 100 - clamped, fill: "var(--color-track)" },
  ]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-28">
        <ChartContainer config={chartConfig} id={id} className="aspect-square size-full">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={225}
              endAngle={-45}
              innerRadius="70%"
              outerRadius="90%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {clamped.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {subtitle && (
        <span className="text-[0.625rem] text-muted-foreground">{subtitle}</span>
      )}
    </div>
  )
}

export function SystemBanner() {
  const [data, setData] = useState<SystemBannerData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchStats() {
      try {
        const res = await fetch("/api/widgets/system-stats")
        if (!res.ok) {
          if (mounted) setError("Failed to fetch")
          return
        }
        const json = await res.json()
        if (mounted) {
          setData(json)
          setError(null)
        }
      } catch {
        if (mounted) setError("Failed to connect")
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 2000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (error && !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading system stats...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-lg border border-border bg-card overflow-hidden",
      !error && "widget-glow-success"
    )}>
      {/* Hostname bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-foreground">{data.system.hostname}</span>
        </div>
        <span className="text-[0.625rem] text-muted-foreground">
          Uptime: {formatUptime(data.system.uptime)}
        </span>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gauges */}
        <div className="flex items-center justify-center gap-6 sm:col-span-2 lg:col-span-1">
          <RadialGauge
            value={data.cpu.usage}
            label="CPU"
            subtitle={`${data.system.cpuCores}C / ${data.system.cpuThreads}T`}
            id="cpu-gauge"
          />
          <RadialGauge
            value={data.memory.usage}
            label="RAM"
            subtitle={`${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`}
            id="ram-gauge"
          />
        </div>

        {/* System Info */}
        <div className="flex flex-col justify-center gap-2">
          <div>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">Processor</span>
            <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">{data.system.cpuModel}</p>
          </div>
          <div>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">Cores / Threads</span>
            <p className="text-xs font-medium text-foreground mt-0.5">{data.system.cpuCores} cores / {data.system.cpuThreads} threads</p>
          </div>
          <div>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">Network</span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs font-medium text-foreground">
                <span className="text-green-500">▼</span> {formatBytes(Math.max(0, data.network.rx_sec))}/s
              </span>
              <span className="text-xs font-medium text-foreground">
                <span className="text-blue-500">▲</span> {formatBytes(Math.max(0, data.network.tx_sec))}/s
              </span>
            </div>
          </div>
        </div>

        {/* Filesystems */}
        <div className="flex flex-col justify-center gap-2 sm:col-span-2 lg:col-span-2">
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">Filesystems</span>
          <div className="flex flex-col gap-1.5">
            {data.disk.filesystems.map((fs) => (
              <div key={fs.mount} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.625rem] font-medium text-foreground truncate mr-2">
                    {fs.mount}
                    <span className="text-muted-foreground ml-1">({fs.type})</span>
                  </span>
                  <span className="text-[0.625rem] font-medium text-muted-foreground whitespace-nowrap">
                    {formatBytes(fs.used)} / {formatBytes(fs.size)} ({fs.usage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(fs.usage)}`}
                    style={{ width: `${Math.min(fs.usage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CPU cores mini bar */}
      <div className="border-t border-border px-4 py-2">
        <div className="flex items-center gap-1">
          <span className="text-[0.5625rem] text-muted-foreground mr-1 shrink-0">Cores</span>
          <div className="flex flex-1 gap-0.5">
            {data.cpu.cores.map((load, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"
                title={`Core ${i}: ${load.toFixed(0)}%`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(load, 100)}%`,
                    backgroundColor: getColorVar(load),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
