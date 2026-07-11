/**
 * Single source of truth for the demo's theme system.
 *
 * Both the pre-hydration inline script (`app/layout.tsx`) and the interactive
 * toggle (`components/theme-toggle.tsx`) derive from the constants here, so the
 * two can never drift out of sync. This module has no top-level side effects
 * and touches `document`/`window` only inside function bodies, so it is safe to
 * import from a Server Component (`layout.tsx`) — the DOM helpers just go
 * uncalled there.
 */

export type Theme = "light" | "dark" | "high-contrast";

/** The localStorage key the chosen theme is persisted under. */
export const THEME_STORAGE_KEY = "fluent2-theme";

/** The ordered set of selectable themes, with their human labels. */
export const THEMES: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high-contrast", label: "High contrast" },
];

/**
 * The <html> class each theme applies. `light` is the default (bare `:root`),
 * so it maps to no class — it is represented by the *absence* of the others.
 */
export const THEME_CLASS_BY_VALUE: Record<Theme, string> = {
  light: "",
  dark: "dark",
  "high-contrast": "high-contrast",
};

/**
 * Every theme class the toggle ever adds/removes on <html> (the non-empty
 * values of {@link THEME_CLASS_BY_VALUE}). Light is excluded — it has no class.
 */
export const THEME_CLASSNAMES: readonly string[] = Object.values(
  THEME_CLASS_BY_VALUE
).filter(Boolean);

/** Applies a theme's class to <html>, clearing the others. Client-only. */
export function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove(...THEME_CLASSNAMES);
  const cls = THEME_CLASS_BY_VALUE[theme];
  if (cls) root.classList.add(cls);
}

/** Persists the chosen theme; a no-op if storage is unavailable. Client-only. */
export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage can throw in private-browsing / storage-disabled contexts —
    // the toggle still works for the current page load, it just won't persist.
  }
}

/** Applies a theme to <html> and persists the choice. Client-only. */
export function applyTheme(theme: Theme): void {
  applyThemeClass(theme);
  persistTheme(theme);
}

/** Reads the theme currently applied to <html> (whatever the init script set). */
export function readThemeFromDom(): Theme {
  const root = document.documentElement;
  const match = THEMES.find(
    ({ value }) =>
      THEME_CLASS_BY_VALUE[value] &&
      root.classList.contains(THEME_CLASS_BY_VALUE[value])
  );
  return match ? match.value : "light";
}

/**
 * Builds the pre-hydration inline script that applies the persisted theme to
 * <html> before React hydrates, so there is no flash of the wrong theme.
 *
 * Returns a fully self-contained JS string: the theme constants are serialized
 * into the source at build time, so nothing is imported at runtime inside the
 * string (it executes before any module graph exists). Keeping it derived from
 * the same constants above is what makes it stay in sync with the toggle.
 */
export function buildThemeInitScript(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  const classes = JSON.stringify(THEME_CLASSNAMES);
  const byValue = JSON.stringify(THEME_CLASS_BY_VALUE);
  return `(function () {
  try {
    var theme = window.localStorage.getItem(${key});
    var root = document.documentElement;
    root.classList.remove.apply(root.classList, ${classes});
    var cls = (${byValue})[theme];
    if (cls) root.classList.add(cls);
  } catch (e) {}
})();`;
}
