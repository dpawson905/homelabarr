# Phase 11: Theme System Foundation + Dracula

**Status:** APPROVED (all 6 sections, 2026-05-17). Ready for writing-plans.
**Date:** 2026-05-17
**Context:** First of 4 theme phases for homelabarr (Phase 11=Dracula, 12=LCARS, 13=Tron Legacy, 14=Tron Classic). This phase establishes the multi-theme architecture AND ships Dracula as the first real theme (becoming the new default, replacing the current teal-as-default).

---

## Section 1 — Theme system architecture (APPROVED)

Extends homelabarr's existing `next-themes` + Tailwind v4 + oklch CSS-vars pattern. Zero refactoring of existing components — they already consume `var(--background)`, `var(--primary)`, etc. New themes = new CSS variable sets + a few extras for fonts/radii.

**Theme registry change** — `app/layout.tsx`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dracula" themes={[
  "light", "dark", "dracula", "lcars", "tron-legacy", "tron-classic"
]}>
```

LCARS/Tron get stub class names in Phase 11; full CSS in their own phases.

**Per-theme file structure**:

```
app/themes/
├── _shared.css              # Radius scale, transitions, anything cross-theme
├── light.css                # Existing root vars (extracted from globals.css)
├── dark.css                 # Existing .dark vars (extracted from globals.css)
├── dracula.css              # NEW — Phase 11
├── lcars.css                # NEW — Phase 12 stub
├── tron-legacy.css          # NEW — Phase 13 stub
└── tron-classic.css         # NEW — Phase 14 stub
```

`globals.css` becomes thin — imports tailwindcss + tw-animate-css + shadcn/tailwind + each theme file.

Each theme file:
```css
.dracula {
  --background: oklch(...);
  --foreground: oklch(...);
  --primary: oklch(...);
  /* ... full shadcn var set ... */

  /* Theme extras */
  --font-mono: 'Fira Code', monospace;
  --radius: 0.625rem;
}
```

**Per-theme component overrides** (for themes that need them) live alongside the theme CSS as utility selectors scoped to the theme class:

```css
.lcars button[data-slot="button"] { /* pill shape, asymmetric borders, etc. */ }
```

Shadcn components are not modified. Theme rewrites hook the data-slot selectors. Dracula barely needs this; LCARS heavily needs it.

**Font loading**: theme-specific declarations in each theme's CSS file. `next/font/google` for free fonts (Fira Code for Dracula).

---

## Section 2 — Dracula visual identity (APPROVED)

**Dracula spec — 11 published colors:**

| Role | Hex | OKLCH (approx; exact values computed during impl) |
|---|---|---|
| Background | `#282A36` | `oklch(0.21 0.02 264)` |
| Current line | `#44475A` | `oklch(0.32 0.02 264)` |
| Foreground | `#F8F8F2` | `oklch(0.96 0.005 95)` |
| Comment | `#6272A4` | `oklch(0.51 0.07 264)` |
| Cyan | `#8BE9FD` | `oklch(0.87 0.13 213)` |
| Green | `#50FA7B` | `oklch(0.85 0.21 142)` |
| Orange | `#FFB86C` | `oklch(0.81 0.14 70)` |
| Pink | `#FF79C6` | `oklch(0.72 0.27 350)` |
| Purple | `#BD93F9` | `oklch(0.71 0.18 296)` |
| Red | `#FF5555` | `oklch(0.66 0.24 25)` |
| Yellow | `#F1FA8C` | `oklch(0.95 0.15 105)` |

**Mapping to shadcn variables:**

| shadcn var | Dracula source |
|---|---|
| `--background` | Background |
| `--foreground` | Foreground |
| `--card` | Current line |
| `--card-foreground` | Foreground |
| `--popover` | Current line |
| `--popover-foreground` | Foreground |
| `--primary` | Purple |
| `--primary-foreground` | Background |
| `--secondary` | Current line |
| `--secondary-foreground` | Foreground |
| `--muted` | Current line |
| `--muted-foreground` | Comment |
| `--accent` | Pink |
| `--accent-foreground` | Background |
| `--destructive` | Red |
| `--border` | Current line |
| `--input` | Current line |
| `--ring` | Purple |
| `--chart-1..5` | Cyan, Green, Orange, Pink, Yellow |
| `--sidebar` | Slightly darker bg, e.g. `oklch(0.18 0.02 264)` |

**Typography:**
- Sans: keep existing Geist Sans
- Mono: **Fira Code** via `next/font/google` with ligatures

**Border radius:** keep `--radius: 0.625rem`.
**Shadows / glow:** standard shadcn scale (Dracula is flat).

**Component shape:** rectangular (no special shapes — that's reserved for LCARS/Tron).

---

## Section 3 — Theme switcher UI (APPROVED)

**Extend existing dropdown** in `components/theme-toggle.tsx` from 3 items to 6. No separate settings page.

```
┌──────────────────────────────┐
│ Theme                        │
├──────────────────────────────┤
│ ○ ☀  Light                   │
│ ○ 🌙 Dark                    │
│ ● 🦇 Dracula            ●●●● │
│ ○ 🖖 LCARS               ●●● │
│ ○ ⚡ Tron Legacy           ●● │
│ ○ ▦  Tron Classic          ●● │
├──────────────────────────────┤
│ ○ 🖥  Match system           │
└──────────────────────────────┘
```

Trailing dots = theme palette swatches (3-4 distinctive colors per theme rendered as small filled circles).

**Registry — `lib/themes.ts`:**

```typescript
export const THEMES = [
  { id: "light",        name: "Light",       iconKey: "sun",     swatches: ["#ffffff","#e2e2e2","#0a0a0a"] },
  { id: "dark",         name: "Dark",        iconKey: "moon",    swatches: ["#0a0a0a","#262626","#fafafa"] },
  { id: "dracula",      name: "Dracula",     iconKey: "bat",     swatches: ["#BD93F9","#FF79C6","#8BE9FD","#50FA7B"] },
  { id: "lcars",        name: "LCARS",       iconKey: "delta",   swatches: ["#FF9966","#CC99CC","#99CCFF","#FFCC66"] },
  { id: "tron-legacy",  name: "Tron Legacy", iconKey: "arc",     swatches: ["#0DBFE9","#FFFFFF","#000000"] },
  { id: "tron-classic", name: "Tron Classic",iconKey: "grid",    swatches: ["#00FFFF","#FF6900","#000000"] },
] as const;

export type ThemeId = typeof THEMES[number]["id"];
```

`ThemeProvider` consumes this registry; the dropdown maps over it. Single source of truth.

**Icons:** lucide-react `Sun`/`Moon`/`Monitor` for existing three; custom inline SVGs for `bat`/`delta`/`arc`/`grid` (cribbed from public-domain Star-Trek-delta, Dracula-bat, Tron-arc references).

**Match-system behavior:** still resolves to light/dark per OS preference. Custom themes are explicit-pick only.

**Where the toggle lives:** unchanged — header right side beside sidebar trigger.

---

## Section 4 — Reference impls to crib from (APPROVED)

| Source | What we take | License |
|---|---|---|
| [`dracula/dracula-ui`](https://github.com/dracula/dracula-ui) | 11-color palette as CSS vars; role assignments (which hue → which UI role) | MIT |
| [`themeselection/shadcn-ui-themes`](https://github.com/themeselection/shadcn-ui-themes) | Community Dracula → shadcn mapping; cross-check against Section 2 | MIT |
| [Tailwind community Dracula plugin](https://github.com/zenorocha/dracula-theme-tailwind) | Tailwind utility-color overrides beyond shadcn's set | MIT |
| [Dracula spec page](https://draculatheme.com/contribute) | The "11 colors, no additions" rule | n/a |

**Explicitly NOT taken:** Dracula Pro (paid), runtime React component libraries (heavy, conflict with shadcn), hex-hardcoded implementations.

**Implementation subtask:** fetch current `dracula/dracula-ui` source to confirm role assignments. ~5 min web fetch; not a blocker.

LCARS/Tron references deferred to their own specs.

---

## Section 5 — Component-shape overrides for Dracula (APPROVED)

Dracula is the lightest-touch theme of the four (palette swap, not structural redesign). Overrides are narrow:

| Override | What | Why |
|---|---|---|
| `::selection` | bg = pink, fg = bg | Iconic Dracula touch |
| `::-webkit-scrollbar-thumb` | Purple | Subtle constant on long pages |
| Code blocks (`<pre>`, `<code>`) | Fira Code with ligatures; bg = current-line; fg = foreground; syntax token colors from Dracula palette | Dracula's origin is code-editor theming |
| `<kbd>` | bg = current-line, fg = cyan, monospace, border = purple | Recognized Dracula kbd treatment |
| Data table row hover | bg = current-line 50% opacity | Matches "currentLine" semantic |
| Focus ring (via `--ring`) | Purple | Reinforces primary identity |
| Skeleton loader pulse | current-line ↔ slightly-lighter | Standard shadcn animation, retinted |

**What we DON'T override for Dracula:**
- Border radius (keep existing)
- Component shapes (keep rectangular)
- Spacing scale
- Animation duration
- Shadow scale (Dracula is flat)

**Implementation:** lives in `app/themes/dracula.css` alongside vars. All overrides scoped under `.dracula` selector.

---

## Section 6 — Out of scope (APPROVED)

**Deferred to their own brainstorm cycles (Phases 12-14):**
- LCARS theme (Phase 12) — colors + asymmetric panels + pill buttons
- Tron Legacy theme (Phase 13) — colors + glow + sharp 0px corners
- Tron Classic theme (Phase 14) — colors + vector-grid backgrounds

**Explicitly excluded from Phase 11:**
- Hermes widget (L3.a) — separate phase
- k8s-autoupdater widget (L3.b) — separate phase
- Custom user-defined themes — Dracula is fixed-spec
- Theme preview before selection — selection IS the preview
- Per-board theme override — themes are global
- Server-side theme persistence beyond next-themes default
- Mobile-specific theme variations
- Print stylesheets
- Accessibility audit per cycle (Dracula's published palette already passes WCAG AA)
- Animated theme transitions (could be nice; v2)
- Localized theme names (Dracula's name is the same in every language)

**Followups that may come up during implementation but aren't this spec's job:**
- Migrating any homelabarr component that still hardcodes a color → use CSS var (discover-and-fix as we hit them, not pre-planned)
- Adding `lib/themes.ts` registry consumers beyond the theme toggle (YAGNI for v1)
