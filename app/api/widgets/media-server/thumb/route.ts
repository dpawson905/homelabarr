import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection } from "@/lib/services/service-client"
import { fetchWithTls } from "@/lib/services/service-client"

/**
 * Validate that a thumb path is safe to use with a given service URL.
 * Prevents SSRF and API key exfiltration by ensuring the resolved URL
 * always points back to the configured service origin.
 */
function validateThumbUrl(
  serviceType: string,
  serviceUrl: string,
  thumbPath: string
): string | null {
  try {
    if (serviceType === "plex") {
      // Plex paths must be relative (start with /, no protocol, no .., no @)
      if (!/^\/[\w/.-]+$/.test(thumbPath)) return null
      if (thumbPath.includes("..")) return null
      const resolved = new URL(thumbPath, serviceUrl)
      if (resolved.origin !== new URL(serviceUrl).origin) return null
      return resolved.toString()
    } else {
      // Jellyfin: thumbPath is a full URL — must match the configured service origin
      const resolved = new URL(thumbPath)
      if (resolved.origin !== new URL(serviceUrl).origin) return null
      return resolved.toString()
    }
  } catch {
    return null
  }
}

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

  const validatedUrl = validateThumbUrl(serviceType, serviceUrl, thumbPath)
  if (!validatedUrl) {
    return new NextResponse("Invalid thumbnail path", { status: 400 })
  }

  try {
    // Append auth token to the validated URL
    const sep = validatedUrl.includes("?") ? "&" : "?"
    const imageUrl =
      serviceType === "plex"
        ? `${validatedUrl}${sep}X-Plex-Token=${apiKey}`
        : `${validatedUrl}${sep}api_key=${apiKey}`

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
