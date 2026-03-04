"use client"

import { useState, useEffect, useCallback } from "react"
import { ServerIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ServerPowerResponse, ServerStatus } from "@/app/api/widgets/server-power/types"

interface ServerFormEntry {
  name: string
  webhookUrl: string
  statusUrl: string
  icon: string
}

interface ServerPowerWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function parseServerConfigs(config: Record<string, unknown> | null): ServerFormEntry[] {
  if (!config || !Array.isArray(config.servers)) return []
  return (config.servers as ServerFormEntry[]).map((s) => ({
    name: s.name ?? "",
    webhookUrl: s.webhookUrl ?? "",
    statusUrl: s.statusUrl ?? "",
    icon: s.icon ?? "",
  }))
}

export function ServerPowerWidget({
  widgetId,
  config,
  onDelete,
}: ServerPowerWidgetProps): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ServerPowerResponse | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const savedServers = parseServerConfigs(config)
  const refreshInterval =
    typeof config?.refreshInterval === "number" ? config.refreshInterval : 30

  const [formServers, setFormServers] = useState<ServerFormEntry[]>(savedServers)

  const isConfigured = savedServers.length > 0

  const fetchStatus = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/widgets/server-power?widgetId=${widgetId}`)
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
    fetchStatus()
    const interval = setInterval(fetchStatus, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchStatus, isConfigured, refreshInterval])

  useEffect(() => {
    setFormServers(parseServerConfigs(config))
  }, [config])

  async function handleAction(serverName: string, action: "on" | "off") {
    setActionLoading(`${serverName}-${action}`)
    try {
      const res = await fetch(`/api/widgets/server-power?widgetId=${widgetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverName, action }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed" }))
        toast.error(body.message || `Failed to power ${action} ${serverName}`)
        return
      }
      toast.success(`${serverName}: power ${action} sent`)
      setTimeout(fetchStatus, 3000)
    } catch {
      toast.error(`Failed to send power ${action} command`)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { servers: formServers, refreshInterval } }),
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

  function addServer() {
    setFormServers([...formServers, { name: "", webhookUrl: "", statusUrl: "", icon: "" }])
  }

  function removeServer(index: number) {
    setFormServers(formServers.filter((_, i) => i !== index))
  }

  function updateServer(index: number, field: keyof ServerFormEntry, value: string) {
    setFormServers(
      formServers.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  function getStatusColor(online: boolean | null): string {
    if (online === null) return "bg-gray-400"
    return online ? "bg-green-500" : "bg-red-500"
  }

  function getStatusLabel(online: boolean | null): string {
    if (online === null) return "Unknown"
    return online ? "Online" : "Offline"
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card">
      <WidgetHeader
        icon={ServerIcon}
        title="Server Power"
        onSettingsClick={() => setShowSettings((s) => !s)}
        isSettings={showSettings}
        status={data && !error ? "success" : error ? "error" : undefined}
      />

      {showSettings ? (
        <div className="flex flex-col gap-3 overflow-y-auto border-b border-border p-3">
          {formServers.map((server, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Server {i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeServer(i)}
                  aria-label="Remove server"
                >
                  <span className="text-xs">&times;</span>
                </Button>
              </div>
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={server.name}
                  onChange={(e) => updateServer(i, "name", e.target.value)}
                  placeholder="nexus"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Webhook URL</Label>
                <Input
                  value={server.webhookUrl}
                  onChange={(e) => updateServer(i, "webhookUrl", e.target.value)}
                  placeholder="https://n8n.local/webhook/server-power"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Status Check URL (optional)</Label>
                <Input
                  value={server.statusUrl}
                  onChange={(e) => updateServer(i, "statusUrl", e.target.value)}
                  placeholder="http://server.local:8080/health"
                  className="h-7 text-xs"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addServer}>
            Add Server
          </Button>
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
                Click settings to add servers
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <p className="text-xs text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchStatus}>
                Retry
              </Button>
            </div>
          ) : (
            data?.servers.map((server: ServerStatus) => (
              <div
                key={server.name}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-2 rounded-full", getStatusColor(server.online))}
                  />
                  <span className="text-sm font-medium">{server.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getStatusLabel(server.online)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => handleAction(server.name, "on")}
                    disabled={actionLoading === `${server.name}-on`}
                  >
                    {actionLoading === `${server.name}-on` ? "..." : "On"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => handleAction(server.name, "off")}
                    disabled={actionLoading === `${server.name}-off`}
                  >
                    {actionLoading === `${server.name}-off` ? "..." : "Off"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
