import { NextRequest, NextResponse } from "next/server"
import { getSimpleIconEntries, getLucideIconNames } from "@/lib/icons/icon-data"

let simpleIconsCache: { slug: string; title: string; hex: string }[] | null = null
let lucideNamesCache: string[] | null = null

function toTitleCase(name: string): string {
  return name
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ")
}

type IconResult = { ref: string; title: string; hex?: string }

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const query = (searchParams.get("q") ?? "").trim().toLowerCase()
  const library = searchParams.get("library") // "simple" | "lucide" | null (both)
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 60, 1), 200)

  if (!query) {
    return NextResponse.json({ icons: [] })
  }

  const results: IconResult[] = []

  if (!library || library === "simple") {
    simpleIconsCache ??= getSimpleIconEntries()
    for (const icon of simpleIconsCache) {
      if (icon.title.toLowerCase().includes(query) || icon.slug.toLowerCase().includes(query)) {
        results.push({ ref: `si:${icon.slug}`, title: icon.title, hex: icon.hex })
        if (results.length >= limit) break
      }
    }
  }

  if ((!library || library === "lucide") && results.length < limit) {
    lucideNamesCache ??= getLucideIconNames()
    for (const name of lucideNamesCache) {
      if (name.toLowerCase().includes(query)) {
        results.push({ ref: `lucide:${name}`, title: toTitleCase(name) })
        if (results.length >= limit) break
      }
    }
  }

  return NextResponse.json({ icons: results })
}
