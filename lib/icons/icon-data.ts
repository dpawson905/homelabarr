// Search index data for the icon picker (used by the icon picker dialog)
// These functions provide metadata only -- no SVG path data for client bundles

type SimpleIconEntry = {
  title: string
  slug: string
  hex: string
  path: string
  svg: string
}

/**
 * Returns all Simple Icons entries with metadata for searching.
 * Only includes slug, title, and hex -- no SVG path data.
 */
export function getSimpleIconEntries(): { slug: string; title: string; hex: string }[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const simpleIcons = require("simple-icons") as Record<string, SimpleIconEntry>

  return Object.values(simpleIcons)
    .filter((entry): entry is SimpleIconEntry => typeof entry === "object" && "slug" in entry)
    .map(({ slug, title, hex }) => ({ slug, title, hex }))
}

/**
 * Returns all Lucide icon names for the picker search.
 */
export function getLucideIconNames(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { iconNames } = require("lucide-react/dynamic") as { iconNames: string[] }
  return iconNames
}
