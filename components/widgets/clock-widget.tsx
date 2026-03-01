"use client"

import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Resolved once at module load - the local timezone never changes at runtime
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

interface ClockWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
}

function formatTime(date: Date, timezone: string, format: "12h" | "24h", showSeconds: boolean): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      ...(showSeconds ? { second: "2-digit" } : {}),
      hour12: format === "12h",
    }).format(date)
  } catch {
    return date.toLocaleTimeString()
  }
}

function formatDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

export function ClockWidget({ widgetId, config }: ClockWidgetProps): React.ReactElement {
  const [now, setNow] = useState<Date>(new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)

  const [timezone, setTimezone] = useState<string>(
    typeof config?.timezone === "string" ? config.timezone : ""
  )
  const [format, setFormat] = useState<"12h" | "24h">(
    config?.format === "24h" ? "24h" : "12h"
  )
  const [showSeconds, setShowSeconds] = useState<boolean>(
    config?.showSeconds === false ? false : true
  )
  const [showDate, setShowDate] = useState<boolean>(
    config?.showDate === false ? false : true
  )

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const effectiveTz = timezone.trim() || LOCAL_TIMEZONE

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { timezone, format, showSeconds, showDate } }),
      })
      if (res.ok) {
        setShowSettings(false)
      }
    } catch (error) {
      console.warn("Failed to save clock config:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Clock01Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">Clock</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowSettings((s) => !s)}
          aria-label="Clock settings"
        >
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings ? (
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="tz-input" className="text-[0.625rem] text-muted-foreground">
              Timezone
            </Label>
            <Input
              id="tz-input"
              placeholder="e.g. America/New_York"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <span className="text-[0.5rem] text-muted-foreground">
              Leave empty for local time
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-[0.625rem] text-muted-foreground">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "12h" | "24h")}>
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="show-seconds" className="text-[0.625rem] text-muted-foreground">
              Show seconds
            </Label>
            <Switch
              id="show-seconds"
              size="sm"
              checked={showSeconds}
              onCheckedChange={setShowSeconds}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="show-date" className="text-[0.625rem] text-muted-foreground">
              Show date
            </Label>
            <Switch
              id="show-date"
              size="sm"
              checked={showDate}
              onCheckedChange={setShowDate}
            />
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : null}

      {/* Clock display */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-3">
        <span className="font-mono text-2xl font-semibold tracking-tight text-foreground">
          {formatTime(now, effectiveTz, format, showSeconds)}
        </span>
        {showDate && (
          <span className="text-xs text-muted-foreground">
            {formatDate(now, effectiveTz)}
          </span>
        )}
      </div>
    </div>
  )
}
