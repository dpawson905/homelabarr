import { NextRequest, NextResponse } from "next/server"
import Parser from "rss-parser"

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Homelabarr/1.0",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
})

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
