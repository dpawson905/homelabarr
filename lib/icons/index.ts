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
 * - "si:plex"     -> { type: "simple", slug: "plex" }
 * - "lucide:home" -> { type: "lucide", name: "home" }
 * - "🎬"          -> { type: "emoji", value: "🎬" }
 * - null/""       -> { type: "none" }
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

  // No prefix -- treat as emoji
  return { type: "emoji", value: trimmed }
}

// ─── Simple Icons data (server-only) ────────────────────────────────────────

export interface SimpleIconData {
  title: string
  path: string
  hex: string
}

// Module-level cache so simple-icons is only imported once
let simpleIconsModule: Record<string, { title: string; slug: string; hex: string; path: string; svg: string }> | null = null

/**
 * Convert a slug like "plex" to its simple-icons import key "siPlex".
 */
function slugToImportKey(slug: string): string {
  // simple-icons keys are "si" + PascalCase of the slug
  // Slug segments are separated by hyphens in the slug (e.g., "visual-studio-code")
  const pascal = slug
    .split(/[-.]/)
    .map((segment) => {
      if (segment.length === 0) return ""
      return segment.charAt(0).toUpperCase() + segment.slice(1)
    })
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
    simpleIconsModule = require("simple-icons") as typeof simpleIconsModule
  }

  const key = slugToImportKey(slug)
  const icon = simpleIconsModule![key] as
    | { title: string; slug: string; hex: string; path: string; svg: string }
    | undefined

  if (!icon) return null

  return {
    title: icon.title,
    path: icon.path,
    hex: icon.hex,
  }
}
