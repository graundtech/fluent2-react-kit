import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Input — Fluent 2-styled, shadcn-API text input.
 *
 * Aesthetics follow Fluent 2 (32px medium field, `rounded-md` = 4px, flat at
 * rest); the prop surface is a bare `ComponentProps<"input">` — shadcn parity,
 * no size variants (Fluent's small/large field sizes are backlog, not shipped
 * here). No `cva`/variants export: there is only one visual treatment, same
 * reasoning as `Separator`.
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only,
 * so the file can be dropped straight into an RSC tree.
 *
 * Focus — the signature Fluent detail is a 2px brand underline on the bottom
 * edge while the rest of the border stays put, with **no layout shift**. The
 * generic kit focus ring (conventions §4: `ring-2 ring-ring ring-offset-2`)
 * is a poor fit here — an offset ring around a form field reads as floating
 * outside the field rather than "this field is active," which is the Fluent
 * signature. So this component deliberately swaps it for an **inset
 * box-shadow** (`shadow-[inset_0_-2px_0_0_var(--brand-80)]`), documented here
 * as the allowed per-component deviation conventions §4 anticipates:
 * - It paints *inside* the border box, so nothing reflows — no offset ring,
 *   no extra border width.
 * - `border` also switches to `border-primary` on focus so the whole field
 *   reads as active, not just the underline.
 * - `--brand-80`/`--brand-100` are read directly via `var()` (not a Tailwind
 *   `bg-brand-*` utility) because the ramp is global — same hex in light and
 *   dark (tokens.css §brand ramp comment) — so the light/dark split is a
 *   `dark:` override on which stop is used, exactly as the spec prescribes.
 *
 * Invalid — the shadcn `aria-invalid:` treatment from conventions §4
 * (destructive border + destructive ring tint) is declared *after* the focus
 * classes so it wins the border tie-break when a field is both invalid and
 * focused (same declaration order Button already relies on for its own
 * focus/invalid overlap). The bottom-edge accent itself also swaps to
 * `--destructive` in the invalid+focused compound state, so a required field
 * left invalid doesn't show a reassuring brand-blue underline while the rest
 * of the field is screaming destructive-red.
 */
function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        // layout — Fluent medium field, 32px height. The resting bottom edge
        // is the darker NeutralStrokeAccessible (#616161) while the other three
        // sides stay border-input (#d1d1d1) — Fluent's signature field accent.
        // On focus, border-primary paints all sides (and the inset underline
        // covers this); aria-invalid's border-destructive likewise wins by
        // specificity, so the darker bottom only shows at rest.
        "flex h-8 w-full min-w-0 rounded-md border border-input border-b-stroke-accessible bg-background px-3 py-1 text-sm",
        // placeholder / text selection
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        // file input button (shadcn parity)
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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

export { Input };
