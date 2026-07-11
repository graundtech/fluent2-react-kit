import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Badge — Fluent 2-styled, shadcn-API badge.
 *
 * Aesthetics follow Fluent 2 (pill shape, compact 20px height, 12px/600
 * label, flat filled surfaces, brand/status color tokens); the prop surface
 * (`variant`, `asChild`, `badgeVariants`) follows shadcn/ui.
 *
 * Server-safe: no `"use client"`, no hooks/handlers — the React import is
 * type-only, so the file can be dropped straight into an RSC tree.
 *
 * Hover/active state steps only engage when the badge is rendered as an
 * interactive element via `asChild` (`[a&]:` targets the case where the
 * rendered tag is an `<a>`); a plain status label stays static.
 */
const badgeVariants = cva(
  [
    // layout — Fluent pill, compact height, centered label
    "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap",
    "rounded-full border px-2 text-xs leading-none font-semibold select-none",
    // motion — token duration + Fluent easyEase curve; honors prefers-reduced-motion
    // automatically (the duration tokens collapse to 0.01ms in tokens.css).
    "outline-none transition-colors duration-fast ease-ease",
    // focus — Fluent double-stroke approximation: 2px brand ring + 2px surface-colored gap.
    // Only reachable when the badge is an interactive `asChild` element.
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // invalid — shadcn aria-invalid treatment
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    // icon defaults
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ],
  {
    variants: {
      variant: {
        // Fluent brand filled — flat, full brand state ramp on `asChild` links
        // (spec §2.5): rest brand-80 → hover brand-70 → pressed brand-60 (light);
        // rest brand-70 → hover brand-80 → pressed brand-60 (dark).
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-brand-70 [a&]:active:bg-brand-60 dark:[a&]:hover:bg-brand-80",
        // Fluent standard/neutral — filled neutral surface + subtle border.
        secondary:
          "border-border bg-secondary text-secondary-foreground [a&]:hover:bg-accent [a&]:active:bg-input dark:[a&]:hover:bg-input",
        // Fluent danger — red fill. No red ramp is exposed, so hover/pressed
        // step via opacity; the focus ring switches to destructive.
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 [a&]:active:bg-destructive/80 focus-visible:ring-destructive",
        // Fluent outline — transparent + border, neutral hover.
        outline:
          "border-border bg-transparent text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:active:bg-accent/80 dark:[a&]:hover:bg-input/50",
        // Fluent success — green fill, AA-safe foreground from the status token pair.
        success:
          "border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90 [a&]:active:bg-success/80",
        // Fluent warning — darkOrange fill (not yellow), AA-safe foreground.
        warning:
          "border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90 [a&]:active:bg-warning/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
