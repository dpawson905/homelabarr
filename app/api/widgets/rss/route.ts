import { NextRequest, NextResponse } from "next/server"
import { lookup } from "dns/promises"
import Parser from "rss-parser"

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Homelabarr/1.0",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
})

/** Block SSRF by rejecting URLs that resolve to private/internal IPs */
async function isPrivateUrl(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr)

    // Only allow http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true

    const hostname = parsed.hostname

    // Block obvious private hostnames
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true

    // Resolve DNS and check for private IP ranges
    const { address } = await lookup(hostname)
    const parts = address.split(".").map(Number)

    if (parts.length === 4) {
      // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
      if (parts[0] === 10) return true
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
      if (parts[0] === 192 && parts[1] === 168) return true
      if (parts[0] === 127) return true
      if (parts[0] === 169 && parts[1] === 254) return true
      if (parts[0] === 0) return true
    }

    // IPv6 loopback
    if (address === "::1" || address === "::") return true

    return false
  } catch {
    // If DNS resolution fails, block it
    return true
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl

  const url = searchParams.get("url")
  const limitStr = searchParams.get("limit")

  if (!url) {
    return NextResponse.json(
      { error: "Missing required query parameter: url" },
      { status: 400 }
    )
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json(
      { error: "Invalid URL provided" },
      { status: 400 }
    )
  }

  if (await isPrivateUrl(url)) {
    return NextResponse.json(
      { error: "RSS feeds from private/internal networks are not allowed" },
      { status: 400 }
    )
  }

  const limit = limitStr ? Math.max(1, Math.min(100, Number(limitStr) || 20)) : 20

  try {
    const feed = await parser.parseURL(url)

    const result = {
      title: feed.title,
      description: feed.description,
      link: feed.link,
      items: feed.items.slice(0, limit).map((item) => ({
        title: item.title ?? "Untitled",
        link: item.link ?? "",
        pubDate: item.pubDate ?? item.isoDate ?? "",
        contentSnippet: (item.contentSnippet ?? "").slice(0, 200),
        creator: item.creator ?? item["dc:creator"] ?? "",
      })),
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=300" },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch or parse feed" },
      { status: 502 }
    )
  }
}
