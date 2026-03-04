import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "../helpers"
import { exec } from "child_process"
import { promisify } from "util"
import dgram from "dgram"
import type {
  WolDeviceConfig,
  WolDeviceStatus,
  WolResponse,
  WolWakeRequest,
} from "./types"

const execAsync = promisify(exec)

function parseDevices(config: Record<string, unknown> | null): WolDeviceConfig[] {
  if (!config || !Array.isArray(config.devices)) return []
  return config.devices as WolDeviceConfig[]
}

async function checkOnline(ip: string): Promise<boolean> {
  try {
    await execAsync(`ping -c 1 -W 2 ${ip}`, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function createMagicPacket(mac: string): Buffer {
  const macBytes = Buffer.from(mac.replace(/[:-]/g, ""), "hex")
  if (macBytes.length !== 6) throw new Error(`Invalid MAC address: ${mac}`)

  const packet = Buffer.alloc(102)
  // 6 bytes of 0xFF
  for (let i = 0; i < 6; i++) packet[i] = 0xff
  // 16 repetitions of MAC address
  for (let i = 0; i < 16; i++) macBytes.copy(packet, 6 + i * 6)

  return packet
}

function sendMagicPacket(
  mac: string,
  broadcastAddress: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const packet = createMagicPacket(mac)
    const socket = dgram.createSocket("udp4")

    socket.once("error", (err) => {
      socket.close()
      reject(err)
    })

    socket.bind(() => {
      socket.setBroadcast(true)
      socket.send(packet, 0, packet.length, 9, broadcastAddress, (err) => {
        socket.close()
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

async function getDeviceStatus(
  device: WolDeviceConfig
): Promise<WolDeviceStatus> {
  const online = device.statusIp ? await checkOnline(device.statusIp) : null
  return { name: device.name, mac: device.mac, online, icon: device.icon }
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
  const devices = parseDevices(config)

  if (devices.length === 0) {
    return NextResponse.json(
      { devices: [] } satisfies WolResponse,
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  const statuses = await Promise.all(devices.map(getDeviceStatus))

  return NextResponse.json(
    { devices: statuses } satisfies WolResponse,
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: WolWakeRequest = await request.json()
  const { mac, broadcastAddress } = body

  if (!mac) {
    return NextResponse.json(
      { error: "MAC address is required" },
      { status: 400 }
    )
  }

  const broadcast = broadcastAddress ?? "255.255.255.255"

  try {
    await sendMagicPacket(mac, broadcast)
    return NextResponse.json({
      success: true,
      mac,
      message: `Magic packet sent to ${mac} via ${broadcast}`,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send magic packet"
    return NextResponse.json(
      { success: false, mac, message },
      { status: 500 }
    )
  }
}
