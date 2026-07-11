import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Spinner — Fluent 2-styled, shadcn-API loading indicator.
 *
 * Fluent 2's spinner is a rotating brand-colored ARC (not a full ring). It is
 * drawn as an inline SVG: a faint full-circle "track" in `text-muted-foreground`
 * plus a shorter, round-capped arc in `text-primary` (brand). The whole SVG
 * spins via `animate-spin`; because only the arc has visible stroke, rotating
 * the (rotationally symmetric) track alongside it is visually inert — only the
 * arc appears to move. The track is our own addition — Fluent's spec allows
 * for it and it matches the reference visual — flagged here as a deliberate
 * choice rather than a strict reproduction.
 *
 * Sizes map 1:1 onto Tailwind's `size-*` scale so the numbers in the spec
 * line up exactly: sm=16px (`size-4`), default=24px (`size-6`), lg=32px
 * (`size-8`), xl=40px (`size-10`).
 *
 * Labeled spinner: when `label` is set, Fluent renders visible text next to
 * the glyph (default `labelPosition="after"`) — reproduced here as
 * `text-sm text-foreground` to the right of the arc via `gap-2`. The label
 * text also becomes the accessible name (see a11y notes on `Spinner` below).
 *
 * Reduced motion: `animate-spin` is a CSS animation, not a token-driven
 * transition, so it does not get the automatic duration collapse tokens.css
 * applies to `duration-*` utilities. Per spec we deliberately slow rather than
 * stop the spin under `prefers-reduced-motion` — `motion-reduce:[animation-duration:3s]`
 * — because hiding the animation entirely would remove the only visual signal
 * that progress is still happening (the wrapper's `role="status"` covers the
 * non-visual signal either way).
 *
 * Server-safe: no `"use client"`, no hooks/handlers — the React import is
 * type-only and the animation is pure CSS, so this drops straight into an RSC
 * tree.
 */
const spinnerVariants = cva(
  ["shrink-0", "animate-spin", "motion-reduce:[animation-duration:3s]"],
  {
    variants: {
      size: {
        sm: "size-4",
        default: "size-6",
        lg: "size-8",
        xl: "size-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

function Spinner({
  className,
  size = "default",
  label,
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof spinnerVariants> & {
    /**
     * Visible text rendered beside the arc (Fluent's "labeled spinner").
     * When set, this text is also the element's accessible name.
     */
    label?: string;
  }) {
  // Accessible name precedence: visible label > explicit aria-label override
  // > default "Loading". `aria-label` is pulled out of the rest spread so it
  // can't be set twice on the root element. Use `||` (not `??`) so an *empty*
  // string falls through to the next option: an empty `aria-label` is ignored
  // by the accessible-name computation, which would leave the role=status
  // region unnamed — `label=""` must still resolve to "Loading".
  const accessibleName = label || ariaLabel || "Loading";

  return (
    <span
      role="status"
      aria-label={accessibleName}
      data-slot="spinner"
      data-size={size}
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={spinnerVariants({ size })}
      >
        {/* faint full-circle track */}
        <circle
          cx="8"
          cy="8"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground/25"
        />
        {/* rotating brand arc — ~100° of the circle, round-capped */}
        <circle
          cx="8"
          cy="8"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="28 72"
          className="text-primary"
        />
      </svg>
      {label ? <span className="text-sm text-foreground">{label}</span> : null}
    </span>
  );
}

export { Spinner, spinnerVariants };
