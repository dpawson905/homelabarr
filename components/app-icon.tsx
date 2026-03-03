"use client"

import { useEffect, useState } from "react"
import { DynamicIcon } from "lucide-react/dynamic"
import type { IconName } from "lucide-react/dynamic"
import { parseIconRef } from "@/lib/icons"

interface AppIconProps {
  icon: string | null | undefined
  appName: string
  size?: number
  className?: string
}

type SimpleIconData = {
  path: string
  hex: string
  title: string
}

// Module-level cache to avoid refetching the same icon across renders
const simpleIconCache = new Map<string, SimpleIconData | null>()

function FirstLetterFallback({ name, size }: { name: string; size: number }) {
  return (
    <span
      className="text-sm font-semibold text-muted-foreground"
      style={{ fontSize: size * 0.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function SimpleIcon({ slug, appName, size }: { slug: string; appName: string; size: number }) {
  const [iconData, setIconData] = useState<SimpleIconData | null>(
    simpleIconCache.get(slug) ?? null
  )
  const [loading, setLoading] = useState(!simpleIconCache.has(slug))

  useEffect(() => {
    if (simpleIconCache.has(slug)) return

    let cancelled = false

    fetch(`/api/icons/simple/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? (res.json() as Promise<SimpleIconData>) : null))
      .then((data) => {
        simpleIconCache.set(slug, data)
        if (!cancelled) {
          setIconData(data)
          setLoading(false)
        }
      })
      .catch(() => {
        simpleIconCache.set(slug, null)
        if (!cancelled) {
          setIconData(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading || !iconData) {
    return <FirstLetterFallback name={appName} size={size} />
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={iconData.title}>
      <path d={iconData.path} fill={`#${iconData.hex}`} />
    </svg>
  )
}

export function AppIcon({
  icon,
  appName,
  size = 20,
  className,
}: AppIconProps): React.ReactElement {
  const ref = parseIconRef(icon)

  let content: React.ReactNode

  switch (ref.type) {
    case "none":
      content = <FirstLetterFallback name={appName} size={size} />
      break
    case "emoji":
      content = <span>{ref.value}</span>
      break
    case "lucide":
      content = <DynamicIcon name={ref.name as IconName} size={size} />
      break
    case "simple":
      content = <SimpleIcon slug={ref.slug} appName={appName} size={size} />
      break
  }

  return className ? <span className={className}>{content}</span> : <>{content}</>
}
