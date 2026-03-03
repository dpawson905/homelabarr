import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection } from "@/lib/services/service-client"
import type { GiteaResponse } from "./types"

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
      { error: "Gitea/Forgejo service not configured. Add a service URL and access token." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection
  const serviceType = ((config?.serviceType as string) ?? "gitea") as "gitea" | "forgejo"

  const headers: Record<string, string> = {
    Authorization: `token ${apiKey}`,
    Accept: "application/json",
  }

  try {
    const [reposRes, notificationsRes] = await Promise.all([
      fetch(
        new URL("/api/v1/repos/search?limit=1&page=1", serviceUrl),
        { headers, signal: AbortSignal.timeout(10_000) }
      ),
      fetch(
        new URL("/api/v1/notifications?page=1&limit=1&status-types=unread", serviceUrl),
        { headers, signal: AbortSignal.timeout(10_000) }
      ),
    ])

    if (!reposRes.ok) {
      return NextResponse.json(
        { error: `${serviceType === "forgejo" ? "Forgejo" : "Gitea"} returned ${reposRes.status}` },
        { status: reposRes.status }
      )
    }

    if (!notificationsRes.ok) {
      return NextResponse.json(
        { error: `${serviceType === "forgejo" ? "Forgejo" : "Gitea"} returned ${notificationsRes.status}` },
        { status: notificationsRes.status }
      )
    }

    const repoCount = parseInt(reposRes.headers.get("X-Total-Count") ?? "0", 10)
    const notificationCount = parseInt(
      notificationsRes.headers.get("X-Total-Count") ?? "0",
      10
    )

    const response: GiteaResponse = {
      repositories: repoCount,
      notifications: notificationCount,
      issues: 0,
      pullRequests: 0,
      serviceType,
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
        { error: `${serviceType === "forgejo" ? "Forgejo" : "Gitea"} request timed out` },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: `Failed to connect to ${serviceType === "forgejo" ? "Forgejo" : "Gitea"}` },
      { status: 502 }
    )
  }
}
