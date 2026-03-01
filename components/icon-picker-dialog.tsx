"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AppIcon } from "@/components/app-icon"
import { cn } from "@/lib/utils"

interface IconPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (iconRef: string) => void
  currentIcon?: string | null
}

type IconResult = { ref: string; title: string; hex?: string }

// Popular homelab brand icons for the default view
const POPULAR_BRANDS: IconResult[] = [
  "plex", "jellyfin", "sonarr", "radarr", "overseerr", "qbittorrent",
  "sabnzbd", "pihole", "adguard", "homeassistant", "proxmox", "uptimekuma",
  "docker", "portainer", "nginx", "grafana", "nextcloud", "gitea",
  "vaultwarden", "paperlessngx", "traefik", "caddy", "wireguard", "tailscale",
  "unifi", "synology", "truenas", "emby", "lidarr", "prowlarr",
].map((slug) => ({ ref: `si:${slug}`, title: slug.charAt(0).toUpperCase() + slug.slice(1) }))

// Popular general-purpose icons for the default view
const POPULAR_GENERAL: IconResult[] = [
  "home", "server", "globe", "settings", "shield", "database",
  "hard-drive", "network", "monitor", "cloud", "lock", "key",
  "wifi", "cpu", "memory-stick", "thermometer", "bell", "calendar",
  "clock", "search", "bookmark", "folder", "file", "download",
  "upload", "activity", "bar-chart", "layers", "terminal", "code",
].map((name) => ({
  ref: `lucide:${name}`,
  title: name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
}))

export function IconPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentIcon,
}: IconPickerDialogProps): React.ReactElement {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("brands")
  const [results, setResults] = useState<IconResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("")
      setDebouncedQuery("")
      setResults([])
      setLoading(false)
      // Focus the search input after mount
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Debounce search input
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim())
    }, 300)
  }, [])

  // Fetch search results when debounced query or tab changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      return
    }

    let cancelled = false
    setLoading(true)

    const library = activeTab === "brands" ? "simple" : "lucide"
    fetch(`/api/icons/search?q=${encodeURIComponent(debouncedQuery)}&library=${library}&limit=60`)
      .then((res) => res.json() as Promise<{ icons: IconResult[] }>)
      .then((data) => {
        if (!cancelled) {
          setResults(data.icons)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, activeTab])

  function handleSelect(ref: string) {
    onSelect(ref)
    onOpenChange(false)
  }

  // Determine which icons to display
  const displayIcons = debouncedQuery
    ? results
    : activeTab === "brands"
      ? POPULAR_BRANDS
      : POPULAR_GENERAL

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
          <DialogDescription>
            Search for a brand or general icon, or pick from popular choices below.
          </DialogDescription>
        </DialogHeader>

        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search icons..."
        />

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setDebouncedQuery(query.trim()) }}>
          <TabsList>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="brands">
            <IconGrid
              icons={activeTab === "brands" ? displayIcons : []}
              currentIcon={currentIcon}
              loading={loading && activeTab === "brands"}
              onSelect={handleSelect}
            />
          </TabsContent>

          <TabsContent value="general">
            <IconGrid
              icons={activeTab === "general" ? displayIcons : []}
              currentIcon={currentIcon}
              loading={loading && activeTab === "general"}
              onSelect={handleSelect}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function IconGrid({
  icons,
  currentIcon,
  loading,
  onSelect,
}: {
  icons: IconResult[]
  currentIcon?: string | null
  loading: boolean
  onSelect: (ref: string) => void
}) {
  return (
    <ScrollArea className="h-[320px]">
      <div className="grid grid-cols-6 gap-2 p-1">
        {/* None / Clear button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelect("")}
                className={cn(
                  "flex h-12 w-full items-center justify-center rounded-md border text-xs text-muted-foreground hover:bg-muted transition-colors",
                  !currentIcon && "ring-2 ring-primary"
                )}
              >
                None
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear icon selection</TooltipContent>
          </Tooltip>

          {icons.map((icon) => (
            <Tooltip key={icon.ref}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(icon.ref)}
                  className={cn(
                    "flex h-12 w-full items-center justify-center rounded-md border hover:bg-muted transition-colors",
                    currentIcon === icon.ref && "ring-2 ring-primary"
                  )}
                >
                  <AppIcon icon={icon.ref} appName={icon.title} size={24} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{icon.title}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          Searching...
        </div>
      )}

      {!loading && icons.length === 0 && (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          No icons found. Try a different search term.
        </div>
      )}
    </ScrollArea>
  )
}
