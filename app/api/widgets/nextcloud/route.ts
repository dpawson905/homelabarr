import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchWithTls } from "@/lib/services/service-client"
import type { NextcloudResponse } from "./types"

interface NextcloudOcsData {
  nextcloud: {
    system: {
      version: string
      freespace: number
      apps: {
        num_installed: number
        num_updates_available: number
      }
    }
    storage: {
      num_files: number
    }
    shares: {
      num_shares_user: number
      num_shares_groups: number
      num_shares_link: number
    }
  }
  activeUsers: {
    last5minutes: number
    last1hour: number
    last24hours: number
  }
}

interface NextcloudOcsResponse {
  ocs: {
    data: NextcloudOcsData
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
  const connection = getServiceConnection(config)

  if (!connection) {
    return NextResponse.json(
      { error: "Nextcloud service not configured. Add a service URL and credentials." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  try {
    const res = await fetchWithTls(
      new URL("/ocs/v2.php/apps/serverinfo/api/v1/info?format=json", serviceUrl).toString(),
      {
        headers: {
          "Authorization": "Basic " + Buffer.from(apiKey).toString("base64"),
          "OCS-APIREQUEST": "true",
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nextcloud returned ${res.status}` },
        { status: res.status }
      )
    }

    const raw = (await res.json()) as NextcloudOcsResponse
    const data = raw.ocs.data
    const system = data.nextcloud.system
    const storage = data.nextcloud.storage
    const shares = data.nextcloud.shares
    const users = data.activeUsers

    const totalShares =
      (shares.num_shares_user ?? 0) +
      (shares.num_shares_groups ?? 0) +
      (shares.num_shares_link ?? 0)

    const response: NextcloudResponse = {
      version: system.version,
      activeUsers: {
        last5min: users.last5minutes ?? 0,
        lastHour: users.last1hour ?? 0,
        lastDay: users.last24hours ?? 0,
      },
      storage: {
        freeBytes: system.freespace ?? 0,
        usedBytes: 0,
        totalFiles: storage.num_files ?? 0,
      },
      shares: {
        total: totalShares,
      },
      apps: {
        installed: system.apps?.num_installed ?? 0,
        updatesAvailable: system.apps?.num_updates_available ?? 0,
      },
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        { error: "Nextcloud request timed out" },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: "Failed to connect to Nextcloud" },
      { status: 502 }
    )
  }
}
