import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection } from "@/lib/services/service-client"
import type { PaperlessResponse } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PaperlessPaginatedResponse {
  count: number
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
      { error: "Paperless-ngx service not configured. Add a service URL and auth token." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection
  const baseUrl = serviceUrl.replace(/\/+$/, "")

  const headers: Record<string, string> = {
    Authorization: `Token ${apiKey}`,
  }

  const fetchOptions: RequestInit = {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(10_000),
  }

  try {
    const [docsResult, inboxResult, corrResult, tagsResult, typesResult] =
      await Promise.all([
        fetch(`${baseUrl}/api/documents/?page_size=1`, fetchOptions),
        fetch(`${baseUrl}/api/documents/?is_in_inbox=true&page_size=1`, fetchOptions),
        fetch(`${baseUrl}/api/correspondents/?page_size=1`, fetchOptions),
        fetch(`${baseUrl}/api/tags/?page_size=1`, fetchOptions),
        fetch(`${baseUrl}/api/document_types/?page_size=1`, fetchOptions),
      ])

    for (const res of [docsResult, inboxResult, corrResult, tagsResult, typesResult]) {
      if (!res.ok) {
        return NextResponse.json(
          { error: `Service returned ${res.status}` },
          { status: res.status }
        )
      }
    }

    const [docsData, inboxData, corrData, tagsData, typesData]: PaperlessPaginatedResponse[] =
      await Promise.all([
        docsResult.json(),
        inboxResult.json(),
        corrResult.json(),
        tagsResult.json(),
        typesResult.json(),
      ])

    const response: PaperlessResponse = {
      totalDocuments: docsData.count ?? 0,
      inboxCount: inboxData.count ?? 0,
      correspondents: corrData.count ?? 0,
      tags: tagsData.count ?? 0,
      documentTypes: typesData.count ?? 0,
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
        { error: "Service request timed out" },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: "Failed to connect to Paperless-ngx" },
      { status: 502 }
    )
  }
}
