/**
 * Theme registry — single source of truth for all themes.
 * Consumed by:
 *   - app/layout.tsx (ThemeProvider themes prop)
 *   - components/theme-toggle.tsx (dropdown items)
 *   - any future theme-aware component
 *
 * Adding a theme:
 *   1. Add entry below
 *   2. Add corresponding app/themes/<id>.css file with `.<id> { ... }` selector
 *   3. Import the CSS file in app/globals.css
 */

export const THEMES = [
  {
    id: "light",
    name: "Light",
    iconKey: "sun",
    swatches: ["#ffffff", "#e2e2e2", "#0a0a0a"],
  },
  {
    id: "dark",
    name: "Dark",
    iconKey: "moon",
    swatches: ["#0a0a0a", "#262626", "#fafafa"],
  },
  {
    id: "dracula",
    name: "Dracula",
    iconKey: "bat",
    swatches: ["#BD93F9", "#FF79C6", "#8BE9FD", "#50FA7B"],
  },
  {
    id: "lcars",
    name: "LCARS",
    iconKey: "delta",
    swatches: ["#FF9966", "#CC99CC", "#99CCFF", "#FFCC66"],
  },
  {
    id: "tron-legacy",
    name: "Tron Legacy",
    iconKey: "arc",
    swatches: ["#0DBFE9", "#FFFFFF", "#000000"],
  },
  {
    id: "tron-classic",
    name: "Tron Classic",
    iconKey: "grid",
    swatches: ["#00FFFF", "#FF6900", "#000000"],
  },
] as const;

export type ThemeId = typeof THEMES[number]["id"];
export type IconKey = typeof THEMES[number]["iconKey"];
