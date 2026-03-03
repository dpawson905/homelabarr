import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchWithTls } from "@/lib/services/service-client"
import type { NpmResponse } from "./types"

interface NpmTokenResponse {
  token: string
  expires: string
}

interface NpmRawProxyHost {
  id: number
  domain_names: string[]
  enabled: number
  ssl_forced: number
}

interface NpmRawCertificate {
  id: number
  provider: string
  domain_names: string[]
  expires_on: string
}

interface NpmRawRedirectionHost {
  id: number
}

interface NpmRawStream {
  id: number
}

const EXPIRING_SOON_DAYS = 14

async function getToken(
  serviceUrl: string,
  email: string,
  password: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const url = new URL("/api/tokens", serviceUrl.replace(/\/$/, "") + "/")
    const res = await fetchWithTls(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: email, secret: password }),
    })

    if (!res.ok) {
      return { ok: false, error: `Authentication failed (${res.status})` }
    }

    const data = (await res.json()) as NpmTokenResponse
    return { ok: true, token: data.token }
  } catch {
    return { ok: false, error: "Failed to authenticate with Nginx Proxy Manager" }
  }
}

async function fetchNpmEndpoint<T>(
  serviceUrl: string,
  token: string,
  endpoint: string
): Promise<T> {
  const url = new URL(endpoint, serviceUrl.replace(/\/$/, "") + "/")
  const res = await fetchWithTls(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`NPM API returned ${res.status} for ${endpoint}`)
  }

  return (await res.json()) as T
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
      { error: "Widget is not configured – URL or secret missing" },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  // apiKey is stored as "email:password"
  const colonIndex = apiKey.indexOf(":")
  if (colonIndex === -1) {
    return NextResponse.json(
      { error: "Secret must be in email:password format" },
      { status: 400 }
    )
  }

  const email = apiKey.slice(0, colonIndex)
  const password = apiKey.slice(colonIndex + 1)

  // Step 1: Authenticate to get JWT token
  const tokenResult = await getToken(serviceUrl, email, password)
  if (!tokenResult.ok) {
    return NextResponse.json(
      { error: tokenResult.error },
      { status: 401 }
    )
  }

  const { token } = tokenResult

  // Step 2: Fetch all data in parallel
  try {
    const [proxyHosts, certificates, redirectionHosts, streams] =
      await Promise.all([
        fetchNpmEndpoint<NpmRawProxyHost[]>(
          serviceUrl,
          token,
          "/api/nginx/proxy-hosts"
        ),
        fetchNpmEndpoint<NpmRawCertificate[]>(
          serviceUrl,
          token,
          "/api/nginx/certificates"
        ),
        fetchNpmEndpoint<NpmRawRedirectionHost[]>(
          serviceUrl,
          token,
          "/api/nginx/redirection-hosts"
        ),
        fetchNpmEndpoint<NpmRawStream[]>(
          serviceUrl,
          token,
          "/api/nginx/streams"
        ),
      ])

    const now = new Date()
    const soonThreshold = new Date(
      now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000
    )

    const enabledCount = proxyHosts.filter((h) => h.enabled === 1).length
    const totalCount = proxyHosts.length

    let expiringSoon = 0
    let expired = 0

    for (const cert of certificates) {
      const expiresOn = new Date(cert.expires_on)
      if (expiresOn <= now) {
        expired++
      } else if (expiresOn <= soonThreshold) {
        expiringSoon++
      }
    }

    const response: NpmResponse = {
      proxyHosts: {
        enabled: enabledCount,
        disabled: totalCount - enabledCount,
        total: totalCount,
      },
      certificates: {
        total: certificates.length,
        expiringSoon,
        expired,
      },
      redirectionHosts: redirectionHosts.length,
      streams: streams.length,
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch NPM data"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
