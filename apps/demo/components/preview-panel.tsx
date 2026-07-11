import type { ReactNode } from "react";

/**
 * PreviewPanel — the shared wrapper every `/preview/<name>` route renders its
 * examples inside, once per theme. Extracted so all nine routes share one
 * implementation instead of each redefining an identical local `Panel`.
 *
 * The caller sets the theme scope via `className`: the "Light" panel passes
 * `light` and the "Dark" panel passes `dark`. Passing `light` explicitly (not
 * "no class") matters — it pins the panel to light mode through the `.light`
 * re-scope class in the token layer, so the Light preview stays light even when
 * the surrounding page sits under a global `.dark` theme.
 *
 * Server-safe: pure markup + classes, no `"use client"`.
 */
function PreviewPanel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`space-y-8 rounded-xl border border-border bg-background p-8 text-foreground ${className ?? ""}`}
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export { PreviewPanel };
