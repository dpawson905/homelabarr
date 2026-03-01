"use client"

import { useState, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar03Icon, PlusSignIcon, Delete03Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format, isToday, isTomorrow, parseISO, compareAsc } from "date-fns"

interface CalendarEvent {
  id: string
  title: string
  date: string        // ISO date string "YYYY-MM-DD"
  time?: string       // Optional "HH:mm" format
  description?: string
  color?: string      // One of the preset color keys
}

interface CalendarWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
}

const COLOR_PRESETS = [
  { key: "primary", className: "bg-primary" },
  { key: "red", className: "bg-red-500" },
  { key: "blue", className: "bg-blue-500" },
  { key: "green", className: "bg-green-500" },
  { key: "yellow", className: "bg-yellow-500" },
  { key: "purple", className: "bg-purple-500" },
] as const

type ColorKey = (typeof COLOR_PRESETS)[number]["key"]

// Shared className for native date/time inputs to match the design system
const NATIVE_INPUT_CLASS =
  "h-7 w-full rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"

function getColorClass(key?: string): string {
  const preset = COLOR_PRESETS.find((p) => p.key === key)
  return preset ? preset.className : "bg-primary"
}

function getDateHeading(date: Date): string {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  return format(date, "EEE, MMM d")
}

function parseEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is CalendarEvent =>
      typeof e === "object" &&
      e !== null &&
      typeof e.id === "string" &&
      typeof e.title === "string" &&
      typeof e.date === "string"
  )
}

interface DateGroup {
  dateStr: string
  heading: string
  events: CalendarEvent[]
}

export function CalendarWidget({ widgetId, config }: CalendarWidgetProps): React.ReactElement {
  const title = typeof config?.title === "string" && config.title.trim()
    ? config.title
    : "Calendar"

  const [events, setEvents] = useState<CalendarEvent[]>(() => parseEvents(config?.events))
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formTime, setFormTime] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formColor, setFormColor] = useState<ColorKey>("primary")

  // Filter out past events and sort upcoming ones, then group by date
  const groupedEvents = useMemo<DateGroup[]>(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd")

    const upcoming = events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => {
        const dateComparison = compareAsc(parseISO(a.date), parseISO(b.date))
        if (dateComparison !== 0) return dateComparison
        // Same date: sort by time (events without time come first)
        if (!a.time && !b.time) return 0
        if (!a.time) return -1
        if (!b.time) return 1
        return a.time.localeCompare(b.time)
      })
      .slice(0, 15)

    const groups: DateGroup[] = []
    for (const event of upcoming) {
      const existing = groups.find((g) => g.dateStr === event.date)
      if (existing) {
        existing.events.push(event)
      } else {
        groups.push({
          dateStr: event.date,
          heading: getDateHeading(parseISO(event.date)),
          events: [event],
        })
      }
    }
    return groups
  }, [events])

  function resetForm() {
    setFormTitle("")
    setFormDate("")
    setFormTime("")
    setFormDescription("")
    setFormColor("primary")
    setEditingEvent(null)
  }

  function handleOpenAdd() {
    resetForm()
    setFormDate(format(new Date(), "yyyy-MM-dd"))
    setShowForm(true)
  }

  function handleOpenEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormDate(event.date)
    setFormTime(event.time ?? "")
    setFormDescription(event.description ?? "")
    setFormColor((event.color as ColorKey) ?? "primary")
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    resetForm()
  }

  async function persistEvents(updatedEvents: CalendarEvent[]) {
    setSaving(true)
    try {
      await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { events: updatedEvents, title } }),
      })
    } catch (error) {
      console.warn("Failed to save calendar events:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!formTitle.trim() || !formDate) return

    const eventData: CalendarEvent = {
      id: editingEvent ? editingEvent.id : crypto.randomUUID(),
      title: formTitle.trim(),
      date: formDate,
      time: formTime || undefined,
      description: formDescription.trim() || undefined,
      color: formColor,
    }

    const updatedEvents = editingEvent
      ? events.map((e) => (e.id === editingEvent.id ? eventData : e))
      : [...events, eventData]

    setEvents(updatedEvents)
    setShowForm(false)
    resetForm()
    await persistEvents(updatedEvents)
  }

  async function handleDelete() {
    if (!editingEvent) return
    const updatedEvents = events.filter((e) => e.id !== editingEvent.id)
    setEvents(updatedEvents)
    setShowForm(false)
    resetForm()
    await persistEvents(updatedEvents)
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Calendar03Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        {!showForm && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleOpenAdd}
            aria-label="Add event"
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          </Button>
        )}
      </div>

      {/* Add/Edit form panel */}
      {showForm ? (
        <div className="flex flex-col gap-2.5 border-b border-border p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="cal-event-title" className="text-[0.625rem] text-muted-foreground">
              Title *
            </Label>
            <Input
              id="cal-event-title"
              placeholder="Event title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="cal-event-date" className="text-[0.625rem] text-muted-foreground">
                Date *
              </Label>
              <input
                id="cal-event-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={NATIVE_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cal-event-time" className="text-[0.625rem] text-muted-foreground">
                Time
              </Label>
              <input
                id="cal-event-time"
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className={NATIVE_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="cal-event-desc" className="text-[0.625rem] text-muted-foreground">
              Description
            </Label>
            <textarea
              id="cal-event-desc"
              placeholder="Optional description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-foreground outline-none resize-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[0.625rem] text-muted-foreground">Color</Label>
            <div className="flex items-center gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setFormColor(preset.key)}
                  className={cn(
                    "size-5 rounded-full transition-all",
                    preset.className,
                    formColor === preset.key
                      ? "ring-2 ring-ring ring-offset-1 ring-offset-background scale-110"
                      : "opacity-60 hover:opacity-100"
                  )}
                  aria-label={`Color: ${preset.key}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !formTitle.trim() || !formDate}>
              {saving ? "Saving..." : editingEvent ? "Update" : "Add Event"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {editingEvent && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
                className="ml-auto"
              >
                <HugeiconsIcon icon={Delete03Icon} strokeWidth={2} className="size-3" />
                Delete
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Agenda view */
        <div className="flex-1 overflow-y-auto">
          {groupedEvents.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 h-full">
              <span className="text-xs text-muted-foreground">No upcoming events</span>
              <Button size="sm" onClick={handleOpenAdd}>
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3" />
                Add Event
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              {groupedEvents.map((group) => (
                <div key={group.dateStr}>
                  {/* Date group heading */}
                  <div className="sticky top-0 z-10 border-b border-border bg-muted/50 px-3 py-1.5 backdrop-blur-sm">
                    <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wide">
                      {group.heading}
                    </span>
                  </div>
                  {/* Events in this group */}
                  {group.events.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleOpenEdit(event)}
                      className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      {/* Colored left accent bar */}
                      <div
                        className={cn(
                          "mt-0.5 w-[3px] shrink-0 self-stretch rounded-full",
                          getColorClass(event.color)
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {event.title}
                        </span>
                        {event.time && (
                          <span className="text-[0.625rem] text-muted-foreground">
                            {event.time}
                          </span>
                        )}
                        {event.description && (
                          <span className="text-[0.625rem] text-muted-foreground truncate">
                            {event.description}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
