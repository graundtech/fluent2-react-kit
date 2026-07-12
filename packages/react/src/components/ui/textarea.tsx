import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Textarea — Fluent 2-styled, shadcn-API multi-line text field.
 *
 * Aesthetics follow Fluent 2 (flat at rest, `rounded-md` = 4px); the prop
 * surface is a bare `ComponentProps<"textarea">` — shadcn parity, no size
 * variants. No `cva`/variants export: there is only one visual treatment,
 * same reasoning as `Input`/`Separator`.
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only,
 * so the file can be dropped straight into an RSC tree.
 *
 * `field-sizing-content` (current shadcn/ui baseline) lets the field grow
 * with its content up to `min-h-16`, instead of being permanently boxed to a
 * fixed row count; the browser's native corner-drag resize handle still
 * applies on top of that since no `resize-*` utility overrides it.
 *
 * Focus/invalid: identical Fluent bottom-accent recipe as `Input` (see that
 * file for the full rationale) — an inset box-shadow underline plus
 * `border-primary` on focus, swapping to `--destructive` when the field is
 * both invalid and focused. Copied verbatim from `input.tsx` per
 * conventions §4 so every field-like control in the kit behaves identically.
 */
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // layout — grows with content (field-sizing-content), Fluent flat field
        "flex field-sizing-content min-h-16 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm",
        // placeholder / text selection
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        // motion — color transitions plus the focus box-shadow accent below
        "outline-none transition-[color,box-shadow] duration-fast ease-ease",
        // disabled — opacity-based, matches conventions §4 exactly
        "disabled:pointer-events-none disabled:opacity-50",
        // focus — Fluent bottom brand accent via inset box-shadow, no reflow.
        // Replaces the generic ring recipe for this component (documented
        // deviation, conventions §4).
        "focus-visible:border-primary focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-80)] dark:focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-100)]",
        // invalid — shadcn aria-invalid treatment, conventions §4. Declared
        // after focus-visible so it wins the border tie when both apply; the
        // compound aria-invalid+focus-visible rule swaps the underline accent
        // to destructive too, so an invalid+focused field reads consistently.
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:focus-visible:shadow-[inset_0_-2px_0_0_var(--destructive)]",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
