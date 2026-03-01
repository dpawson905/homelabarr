## Plan 06-01 Summary: Clock + Notes Widgets

### What was built
- `components/widgets/clock-widget.tsx` — ClockWidget with live ticking clock, configurable timezone/format/seconds/date display, inline settings panel with PATCH save
- `components/widgets/notes-widget.tsx` — NotesWidget with auto-saving textarea (500ms debounce), save status indicator, configurable title
- Updated `components/widget-renderer.tsx` — Added "clock" and "notes" cases to the switch, passing widgetId and config props
- Updated `components/add-widget-dialog.tsx` — Added default sizes for clock (2x2) and notes (3x3) widgets

### Decisions made
- Used `Intl.DateTimeFormat` for timezone-aware clock formatting, avoiding external timezone libraries
- Clock settings use an inline panel (toggled via gear icon) rather than a dialog, keeping the UX lightweight
- Notes auto-save uses a `useRef` timeout pattern for debouncing (500ms after last keystroke)
- Notes "Saved" indicator auto-clears after 2 seconds to avoid visual clutter
- Used `Clock01Icon` for clock header, `StickyNote01Icon` for notes header, `Settings02Icon` for settings gear
- Config syncing in NotesWidget uses a ref to track external config changes without overwriting user edits in progress

### Issues encountered
- None
