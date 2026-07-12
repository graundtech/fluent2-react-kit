import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Separator — Fluent 2-styled, shadcn-API separator.
 *
 * A thin 1px Fluent divider (`bg-border`) that separates content
 * horizontally or vertically. Implemented natively with a plain `<div>` — no
 * primitive is needed since the WAI-ARIA "separator" pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/separator/) is trivial: a role
 * swap plus an orientation attribute.
 *
 * Stroke color — deliberate token-consistency deviation: Fluent's Divider uses
 * its own stroke token (`#e0e0e0`, grey-88), one ramp step lighter than the
 * generic `--border` (`#d1d1d1`, grey-82) this component reuses. The kit keeps
 * `bg-border` on purpose: a divider sharing the exact border token used by
 * inputs/cards is worth more than a one-step-lighter grey, and `--border` is
 * intentionally NOT re-pointed globally to `#e0e0e0` (that would lighten every
 * input/card border too). Net effect: the divider reads a hair more prominent
 * than Fluent's spec — an accepted, single-step fidelity trade for token
 * cohesion.
 *
 * ARIA:
 * - `decorative` (default `true`) → `role="none"`, removing it from the
 *   accessibility tree. `aria-orientation` is withheld in this case too —
 *   ARIA forbids relying on global states/properties alongside `role="none"`.
 * - non-decorative → `role="separator"`. `aria-orientation="vertical"` is
 *   emitted only for the vertical case; horizontal is the implicit default
 *   per the APG, so it is intentionally never set to `"horizontal"`.
 *
 * Sizing follows current shadcn: a single 1px stroke that fills the cross
 * axis, switched by `data-orientation` selectors rather than a cva variant
 * group (there is only one visual treatment, just two axes).
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only,
 * so the file can be dropped straight into an RSC tree.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={
        !decorative && orientation === "vertical" ? "vertical" : undefined
      }
      data-slot="separator"
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
