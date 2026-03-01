"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import type { App } from "@/lib/db/schema"

export function SearchWidget(): React.ReactElement {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch("/api/apps")
      if (!res.ok) return
      const data = await res.json()
      setApps(data.apps ?? [])
    } catch {
      // Silently ignore fetch failures
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  function handleSelect(url: string) {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card">
      <Command
        className="bg-card"
        filter={(value, search) => {
          const app = apps.find((a) => a.id === value)
          if (!app) return 0
          const haystack = `${app.name} ${app.description ?? ""} ${app.url}`.toLowerCase()
          return haystack.includes(search.toLowerCase()) ? 1 : 0
        }}
      >
        <CommandInput placeholder="Search apps..." />
        <CommandList className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : apps.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No apps found. Add apps via the App Links widget.
            </div>
          ) : (
            <>
              <CommandEmpty>No matching apps found.</CommandEmpty>
              <CommandGroup>
                {apps.map((app) => (
                  <CommandItem
                    key={app.id}
                    value={app.id}
                    onSelect={() => handleSelect(app.url)}
                    className="cursor-pointer"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-sm">
                      {app.icon?.trim() ? (
                        <span>{app.icon}</span>
                      ) : (
                        <span className="text-[0.625rem] font-semibold text-muted-foreground">
                          {app.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium">{app.name}</span>
                      <span className="truncate text-[0.625rem] text-muted-foreground">
                        {app.url}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  )
}
