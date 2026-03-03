import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { AuthentikResponse } from "./types"

interface AuthentikPaginatedResponse {
  pagination: {
    count: number
  }
}

interface AuthentikVersionResponse {
  version_current: string
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
      { error: "Authentik service not configured. Add a service URL and API token." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [activeUsersResult, totalUsersResult, loginsResult, failedLoginsResult, versionResult] =
    await Promise.all([
      fetchService<AuthentikPaginatedResponse>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v3/core/users/",
        authType: "header-bearer",
        queryParams: {
          is_active: "true",
          page_size: "1",
        },
      }),
      fetchService<AuthentikPaginatedResponse>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v3/core/users/",
        authType: "header-bearer",
        queryParams: {
          page_size: "1",
        },
      }),
      fetchService<AuthentikPaginatedResponse>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v3/events/events/",
        authType: "header-bearer",
        queryParams: {
          action: "login",
          page_size: "1",
          ordering: "-created",
          created_after: twentyFourHoursAgo,
        },
      }),
      fetchService<AuthentikPaginatedResponse>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v3/events/events/",
        authType: "header-bearer",
        queryParams: {
          action: "login_failed",
          page_size: "1",
          ordering: "-created",
          created_after: twentyFourHoursAgo,
        },
      }),
      fetchService<AuthentikVersionResponse>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v3/admin/version/",
        authType: "header-bearer",
      }),
    ])

  if (!activeUsersResult.ok) {
    return NextResponse.json(
      { error: activeUsersResult.error },
      { status: activeUsersResult.status ?? 502 }
    )
  }

  if (!totalUsersResult.ok) {
    return NextResponse.json(
      { error: totalUsersResult.error },
      { status: totalUsersResult.status ?? 502 }
    )
  }

  if (!loginsResult.ok) {
    return NextResponse.json(
      { error: loginsResult.error },
      { status: loginsResult.status ?? 502 }
    )
  }

  if (!failedLoginsResult.ok) {
    return NextResponse.json(
      { error: failedLoginsResult.error },
      { status: failedLoginsResult.status ?? 502 }
    )
  }

  if (!versionResult.ok) {
    return NextResponse.json(
      { error: versionResult.error },
      { status: versionResult.status ?? 502 }
    )
  }

  const response: AuthentikResponse = {
    activeUsers: activeUsersResult.data.pagination.count,
    totalUsers: totalUsersResult.data.pagination.count,
    loginsLast24h: loginsResult.data.pagination.count,
    failedLoginsLast24h: failedLoginsResult.data.pagination.count,
    version: versionResult.data.version_current,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
