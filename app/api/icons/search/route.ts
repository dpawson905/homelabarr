import { NextRequest, NextResponse } from "next/server"
import { getSimpleIconEntries, getLucideIconNames } from "@/lib/icons/icon-data"

// Module-level caches -- loaded once per server lifetime
let simpleIconsCache: { slug: string; title: string; hex: string }[] | null = null
let lucideNamesCache: string[] | null = null

function getSimpleIcons() {
  if (!simpleIconsCache) {
    simpleIconsCache = getSimpleIconEntries()
  }
  return simpleIconsCache
}

function getLucideNames() {
  if (!lucideNamesCache) {
    lucideNamesCache = getLucideIconNames()
  }
  return lucideNamesCache
}

/** Convert a hyphenated name to title case: "arrow-right" -> "Arrow Right" */
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

  // Search Simple Icons
  if (!library || library === "simple") {
    const simpleIcons = getSimpleIcons()
    for (const icon of simpleIcons) {
      if (icon.title.toLowerCase().includes(query) || icon.slug.toLowerCase().includes(query)) {
        results.push({ ref: `si:${icon.slug}`, title: icon.title, hex: icon.hex })
        if (results.length >= limit) break
      }
    }
  }

  // Search Lucide Icons
  if ((!library || library === "lucide") && results.length < limit) {
    const lucideNames = getLucideNames()
    const remaining = limit - results.length
    let count = 0
    for (const name of lucideNames) {
      if (name.toLowerCase().includes(query)) {
        results.push({ ref: `lucide:${name}`, title: toTitleCase(name) })
        count++
        if (count >= remaining) break
      }
    }
  }

  return NextResponse.json({ icons: results })
}
