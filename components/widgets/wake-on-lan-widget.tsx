"use client"

import { useState, useEffect, useCallback } from "react"
import { Wifi01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { WolResponse, WolDeviceStatus } from "@/app/api/widgets/wake-on-lan/types"

interface DeviceFormEntry {
  name: string
  mac: string
  broadcastAddress: string
  statusIp: string
}

interface WakeOnLanWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function parseDeviceConfigs(
  config: Record<string, unknown> | null
): DeviceFormEntry[] {
  if (!config || !Array.isArray(config.devices)) return []
  return (config.devices as DeviceFormEntry[]).map((d) => ({
    name: d.name ?? "",
    mac: d.mac ?? "",
    broadcastAddress: d.broadcastAddress ?? "",
    statusIp: d.statusIp ?? "",
  }))
}

export function WakeOnLanWidget({
  widgetId,
  config,
  onDelete,
}: WakeOnLanWidgetProps): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WolResponse | null>(null)
  const [waking, setWaking] = useState<string | null>(null)

  const savedDevices = parseDeviceConfigs(config)
  const isConfigured = savedDevices.length > 0

  const [formDevices, setFormDevices] = useState<DeviceFormEntry[]>(savedDevices)

  const fetchStatus = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/widgets/wake-on-lan?widgetId=${widgetId}`)
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
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus, isConfigured])

  useEffect(() => {
    setFormDevices(parseDeviceConfigs(config))
  }, [config])

  async function handleWake(mac: string, broadcastAddress?: string) {
    setWaking(mac)
    try {
      const res = await fetch("/api/widgets/wake-on-lan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac, broadcastAddress }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed" }))
        toast.error(body.message || "Failed to send wake packet")
        return
      }
      toast.success("Wake packet sent")
      setTimeout(fetchStatus, 10000)
    } catch {
      toast.error("Failed to send wake packet")
    } finally {
      setWaking(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { devices: formDevices } }),
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

  function addDevice() {
    setFormDevices([
      ...formDevices,
      { name: "", mac: "", broadcastAddress: "", statusIp: "" },
    ])
  }

  function removeDevice(index: number) {
    setFormDevices(formDevices.filter((_, i) => i !== index))
  }

  function updateDevice(
    index: number,
    field: keyof DeviceFormEntry,
    value: string
  ) {
    setFormDevices(
      formDevices.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    )
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card">
      <WidgetHeader
        icon={Wifi01Icon}
        title="Wake-on-LAN"
        onSettingsClick={() => setShowSettings((s) => !s)}
        isSettings={showSettings}
        status={data && !error ? "success" : error ? "error" : undefined}
      />

      {showSettings ? (
        <div className="flex flex-col gap-3 overflow-y-auto border-b border-border p-3">
          {formDevices.map((device, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border border-border p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Device {i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeDevice(i)}
                  aria-label="Remove device"
                >
                  <span className="text-xs">&times;</span>
                </Button>
              </div>
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={device.name}
                  onChange={(e) => updateDevice(i, "name", e.target.value)}
                  placeholder="Synology NAS"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">MAC Address</Label>
                <Input
                  value={device.mac}
                  onChange={(e) => updateDevice(i, "mac", e.target.value)}
                  placeholder="00:11:32:AA:BB:CC"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Broadcast Address (optional)</Label>
                <Input
                  value={device.broadcastAddress}
                  onChange={(e) =>
                    updateDevice(i, "broadcastAddress", e.target.value)
                  }
                  placeholder="192.168.1.255"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Status Check IP (optional)</Label>
                <Input
                  value={device.statusIp}
                  onChange={(e) => updateDevice(i, "statusIp", e.target.value)}
                  placeholder="192.168.1.50"
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addDevice}>
            Add Device
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
                Click settings to add devices
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
            data?.devices.map((device: WolDeviceStatus) => (
              <div
                key={device.mac}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      device.online === null
                        ? "bg-gray-400"
                        : device.online
                          ? "bg-green-500"
                          : "bg-red-500"
                    )}
                  />
                  <div>
                    <span className="text-sm font-medium">{device.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">
                      {device.mac}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() =>
                    handleWake(
                      device.mac,
                      savedDevices.find((d) => d.mac === device.mac)
                        ?.broadcastAddress || undefined
                    )
                  }
                  disabled={device.online === true || waking === device.mac}
                >
                  {waking === device.mac
                    ? "Waking..."
                    : device.online
                      ? "Online"
                      : "Wake"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
