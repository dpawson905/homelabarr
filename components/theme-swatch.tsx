// components/theme-swatch.tsx
/**
 * Renders a row of small colored circles representing a theme's palette identity.
 * Used in the theme switcher dropdown to give each theme a recognizable preview
 * without a full screenshot.
 */
interface ThemeSwatchProps {
  swatches: readonly string[];
  size?: number;  // pixel diameter per dot
}

export function ThemeSwatch({ swatches, size = 8 }: ThemeSwatchProps) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {swatches.map((color, i) => (
        <span
          key={i}
          className="inline-block rounded-full border border-border/20"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
          }}
        />
      ))}
    </span>
  );
}
