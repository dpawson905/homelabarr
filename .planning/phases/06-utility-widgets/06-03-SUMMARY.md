## Plan 06-03 Summary: Calendar Widget

### What was built
- `components/widgets/calendar-widget.tsx` — Full Calendar widget with agenda view and inline add/edit/delete event form
- Updated `components/widget-renderer.tsx` — Added CalendarWidget import and "calendar" case in the switch
- Updated `components/add-widget-dialog.tsx` — Added "calendar" entry to WIDGET_TYPES and default size (3x4) to WIDGET_DEFAULT_SIZES

### Decisions made
- Used `Calendar03Icon` from hugeicons for the header icon, `PlusSignIcon` for add button, `Delete03Icon` for delete button
- Events are stored in widget config JSON as `{ events: CalendarEvent[], title: string }` — no new API routes needed
- Past events are filtered out using string comparison against today's date formatted as `yyyy-MM-dd` for efficiency
- Events without a time sort before events with a time on the same date
- The add/edit form appears inline (replacing the agenda view) rather than as a separate dialog, consistent with the plan specification
- Color presets use 6 options: primary (teal), red, blue, green, yellow, purple — rendered as clickable dots with ring indicator for selection
- Date and time inputs use native HTML `<input type="date">` and `<input type="time">` for maximum browser compatibility
- The agenda view shows at most 15 upcoming events to prevent overflow
- Date group headings use sticky positioning with a subtle backdrop blur for a polished scroll experience
- Form defaults the date to today when adding a new event for convenience

### Issues encountered
- None — TypeScript compilation passes cleanly with `npx tsc --noEmit`
