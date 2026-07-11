"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@kit/components/ui/button";

import { applyTheme, readThemeFromDom, THEMES, type Theme } from "../lib/theme";

/**
 * Theme toggle — a WAI-ARIA radiogroup (light / dark / high contrast) built
 * from the kit's own `Button`. Selecting an option flips the theme classes on
 * `<html>` and persists the choice. All theme constants and logic live in
 * `lib/theme.ts`, the single source of truth shared with the pre-hydration
 * script in `app/layout.tsx`, so the toggle and the script can't drift.
 *
 * Hydration-safe: the real theme class is applied *before* hydration by the
 * inline script in the root layout's `<head>`, so there is no flash of the
 * wrong theme. React state starts as `"light"` on both the server render and
 * the client's first render (deterministic — it never reads
 * `localStorage`/`document` during render), so there is no hydration mismatch.
 * After mount, an effect reads the class the inline script already applied and
 * syncs the highlighted option to match.
 *
 * Keyboard (APG radiogroup): roving tabindex puts only the selected radio in
 * the tab order; Arrow Left/Up and Right/Down move focus AND selection,
 * wrapping at the ends.
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setTheme(readThemeFromDom());
  }, []);

  function select(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  // Move focus and selection together (the radiogroup model), wrapping at ends.
  function focusAndSelect(index: number) {
    const wrapped = (index + THEMES.length) % THEMES.length;
    const target = THEMES[wrapped];
    if (!target) return;
    select(target.value);
    radioRefs.current[wrapped]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
    >
      {THEMES.map(({ value, label }, index) => {
        const selected = theme === value;
        return (
          <Button
            key={value}
            ref={(el) => {
              radioRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            size="sm"
            variant={selected ? "default" : "ghost"}
            onClick={() => select(value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="rounded-sm"
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

export { ThemeToggle };
