import { NextRequest, NextResponse } from "next/server"
import { getSimpleIconData } from "@/lib/icons"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { slug } = await params

  const icon = getSimpleIconData(slug)

  if (!icon) {
    return NextResponse.json(
      { error: "Icon not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(icon, {
    headers: { "Cache-Control": "public, max-age=86400" },
  })
}
