"use client"

import { useState, useEffect, useRef } from "react"
import { StickyNote01Icon } from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"

interface NotesWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

export function NotesWidget({ widgetId, config, onDelete }: NotesWidgetProps): React.ReactElement {
  const title = typeof config?.title === "string" && config.title.trim()
    ? config.title
    : "Notes"
  const initialContent = typeof config?.content === "string" ? config.content : ""

  const [text, setText] = useState<string>(initialContent)
  const [showSettings, setShowSettings] = useState(false)
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
      <WidgetHeader
        icon={StickyNote01Icon}
        title={title}
        isSettings={showSettings}
        onSettingsClick={() => setShowSettings((s) => !s)}
        rightContent={
          saveStatus !== "idle" ? (
            <span className="text-[0.625rem] text-muted-foreground">
              {saveStatus === "saving" ? "Saving..." : "Saved"}
            </span>
          ) : undefined
        }
      />

      {/* Settings panel */}
      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
        </div>
      ) : (
      /* Notes body */
      <textarea
        className="flex-1 w-full p-3 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground"
        placeholder="Start typing..."
        value={text}
        onChange={handleChange}
      />
      )}
    </div>
  )
}
