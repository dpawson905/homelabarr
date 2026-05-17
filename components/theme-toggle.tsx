"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun02Icon, Moon02Icon, ComputerIcon } from "@hugeicons/core-free-icons";

import { THEMES, type IconKey } from "@/lib/themes";
import { ThemeSwatch } from "@/components/theme-swatch";
import { BatIcon } from "@/components/icons/bat-icon";
import { DeltaIcon } from "@/components/icons/delta-icon";
import { ArcIcon } from "@/components/icons/arc-icon";
import { GridIcon } from "@/components/icons/grid-icon";

function getIconForKey(key: IconKey, className = "size-4") {
  switch (key) {
    case "sun":   return <HugeiconsIcon icon={Sun02Icon}  strokeWidth={2} className={className} />;
    case "moon":  return <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} className={className} />;
    case "bat":   return <BatIcon className={className} />;
    case "delta": return <DeltaIcon className={className} />;
    case "arc":   return <ArcIcon className={className} />;
    case "grid":  return <GridIcon className={className} />;
  }
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select theme">
          {mounted ? (
            (() => {
              const current = THEMES.find((t) => t.id === theme) ?? THEMES[1]; // fallback to dark
              return getIconForKey(current.iconKey);
            })()
          ) : (
            <>
              <HugeiconsIcon
                icon={Sun02Icon}
                strokeWidth={2}
                className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              />
              <HugeiconsIcon
                icon={Moon02Icon}
                strokeWidth={2}
                className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
              />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
          {THEMES.map((t) => (
            <DropdownMenuRadioItem
              key={t.id}
              value={t.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                {getIconForKey(t.iconKey)}
                <span>{t.name}</span>
              </span>
              <ThemeSwatch swatches={t.swatches} />
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
            <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} className="size-4" />
            <span>Match system</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
