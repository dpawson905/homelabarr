// Icon reference parser and Simple Icons data accessor
// Icon refs are stored as prefixed strings: "si:plex", "lucide:home", or plain emoji

type SimpleIconRef = { type: "simple"; slug: string }
type LucideIconRef = { type: "lucide"; name: string }
type EmojiIconRef = { type: "emoji"; value: string }
type NoneIconRef = { type: "none" }

export type IconRef = SimpleIconRef | LucideIconRef | EmojiIconRef | NoneIconRef

/**
 * Parse an icon reference string into a typed descriptor.
 *
 * - "si:plex"      -> { type: "simple", slug: "plex" }
 * - "lucide:home"  -> { type: "lucide", name: "home" }
 * - "🎬"           -> { type: "emoji", value: "🎬" }
 * - null/""        -> { type: "none" }
 */
export function parseIconRef(ref: string | null | undefined): IconRef {
  if (!ref || ref.trim() === "") {
    return { type: "none" }
  }

  const trimmed = ref.trim()

  if (trimmed.startsWith("si:")) {
    const slug = trimmed.slice(3)
    return slug ? { type: "simple", slug } : { type: "none" }
  }

  if (trimmed.startsWith("lucide:")) {
    const name = trimmed.slice(7)
    return name ? { type: "lucide", name } : { type: "none" }
  }

  return { type: "emoji", value: trimmed }
}

// ─── Simple Icons data (server-only) ────────────────────────────────────────

export interface SimpleIconData {
  title: string
  path: string
  hex: string
}

type SimpleIconEntry = {
  title: string
  slug: string
  hex: string
  path: string
  svg: string
}

// Module-level cache so simple-icons is only imported once
let simpleIconsModule: Record<string, SimpleIconEntry> | null = null

function slugToImportKey(slug: string): string {
  const pascal = slug
    .split(/[-.]/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join("")
  return `si${pascal}`
}

/**
 * Look up Simple Icon data by slug. SERVER-ONLY -- uses the full simple-icons
 * package which is too large for client bundles.
 *
 * Returns { title, path, hex } or null if the slug is not found.
 */
export function getSimpleIconData(slug: string): SimpleIconData | null {
  if (!simpleIconsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    simpleIconsModule = require("simple-icons") as Record<string, SimpleIconEntry>
  }

  const icon = simpleIconsModule[slugToImportKey(slug)] as SimpleIconEntry | undefined

  if (!icon) return null

  return { title: icon.title, path: icon.path, hex: icon.hex }
}
