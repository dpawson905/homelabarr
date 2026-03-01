"use client"

import { useState, useEffect, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { StickyNote01Icon } from "@hugeicons/core-free-icons"

interface NotesWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
}

export function NotesWidget({ widgetId, config }: NotesWidgetProps): React.ReactElement {
  const title = typeof config?.title === "string" && config.title.trim()
    ? config.title
    : "Notes"
  const initialContent = typeof config?.content === "string" ? config.content : ""

  const [text, setText] = useState<string>(initialContent)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync textarea when config.content is updated externally (e.g. server refresh)
  const savedContentRef = useRef<string>(initialContent)
  useEffect(() => {
    const incoming = typeof config?.content === "string" ? config.content : ""
    if (incoming !== savedContentRef.current) {
      savedContentRef.current = incoming
      setText(incoming)
    }
  }, [config?.content])

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
    }
  }, [])

  async function saveContent(content: string) {
    setSaveStatus("saving")
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { content, title } }),
      })
      if (res.ok) {
        savedContentRef.current = content
        setSaveStatus("saved")
        if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
        savedIndicatorRef.current = setTimeout(() => setSaveStatus("idle"), 2000)
      } else {
        setSaveStatus("idle")
      }
    } catch (error) {
      console.warn("Failed to save notes:", error)
      setSaveStatus("idle")
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveContent(value), 500)
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={StickyNote01Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        {saveStatus !== "idle" && (
          <span className="text-[0.625rem] text-muted-foreground">
            {saveStatus === "saving" ? "Saving..." : "Saved"}
          </span>
        )}
      </div>

      {/* Notes body */}
      <textarea
        className="flex-1 w-full p-3 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground"
        placeholder="Start typing..."
        value={text}
        onChange={handleChange}
      />
    </div>
  )
}
