import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection } from "@/lib/services/service-client"
import { fetchWithTls } from "@/lib/services/service-client"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const widgetId = url.searchParams.get("widgetId")
  const thumbPath = url.searchParams.get("path")

  if (!widgetId || !thumbPath) {
    return new NextResponse("Missing parameters", { status: 400 })
  }

  const widget = getWidgetWithConfig(widgetId)
  if (!widget) {
    return new NextResponse("Widget not found", { status: 404 })
  }

  const config = widget.config as Record<string, unknown> | null
  const serviceType = (config?.serviceType as string) ?? ""
  const connection = getServiceConnection(config)

  if (!connection) {
    return new NextResponse("Not configured", { status: 400 })
  }

  const { serviceUrl, apiKey } = connection

  try {
    let imageUrl: string

    if (serviceType === "plex") {
      // Plex: thumbPath is like /library/metadata/123/thumb/456
      const sep = thumbPath.includes("?") ? "&" : "?"
      imageUrl = `${serviceUrl}${thumbPath}${sep}X-Plex-Token=${apiKey}`
    } else {
      // Jellyfin: thumbPath is already a full URL with query params
      const sep = thumbPath.includes("?") ? "&" : "?"
      imageUrl = `${thumbPath}${sep}api_key=${apiKey}`
    }

    const res = await fetchWithTls(imageUrl)

    if (!res.ok) {
      return new NextResponse(null, { status: 502 })
    }

    const body = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get("content-type") ?? "image/jpeg"

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
