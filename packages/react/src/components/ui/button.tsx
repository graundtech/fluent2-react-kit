import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Button — Fluent 2-styled, shadcn-API button.
 *
 * Aesthetics follow Fluent 2 (32px medium height, 14px/600 label, `rounded-md`
 * = 4px, flat surfaces, brand state ramp for the primary); the prop surface
 * (`variant`, `size`, `asChild`, `buttonVariants`) follows shadcn/ui.
 *
 * Server-safe: no `"use client"`, no hooks/handlers — the React import is
 * type-only, so the file can be dropped straight into an RSC tree.
 */
const buttonVariants = cva(
  [
    // layout
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-semibold select-none cursor-pointer",
    // motion — token duration + Fluent easyEase curve; honors prefers-reduced-motion
    // automatically (the duration tokens collapse to 0.01ms in tokens.css).
    "outline-none transition-colors duration-fast ease-ease",
    // disabled — opacity read (uniform across every variant/component; see conventions doc)
    "disabled:pointer-events-none disabled:opacity-50",
    // focus — Fluent double-stroke approximation: 2px brand ring + 2px surface-colored gap
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // invalid — shadcn aria-invalid treatment
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    // icon defaults
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Fluent primary — brand fill, flat, full brand state ramp (spec §2.5).
        // rest brand-80 → hover brand-70 → pressed brand-60 (light);
        // rest brand-70 → hover brand-80 → pressed brand-60 (dark).
        default:
          "bg-primary text-primary-foreground hover:bg-brand-70 active:bg-brand-60 dark:hover:bg-brand-80",
        // Fluent danger — red fill. No red ramp is exposed, so hover/pressed
        // step via opacity; the focus ring switches to destructive.
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive",
        // Fluent standard/neutral — filled neutral surface + border.
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-accent active:bg-input dark:hover:bg-input dark:active:bg-input",
        // Fluent outline — transparent + border, neutral hover.
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:bg-input/30 dark:hover:bg-input/50 dark:active:bg-input/70",
        // Fluent subtle — transparent, neutral hover only.
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/70",
        // Fluent link — brand text, underline on hover. Color ramp matches
        // Fluent BrandForegroundLink (rest brand-70 → hover brand-60 → pressed
        // brand-50 light; brand-100 → 110 → 120 dark), kept in sync with the
        // Link component; the button keeps its own font-semibold weight.
        link: "text-brand-70 underline-offset-4 hover:text-brand-60 hover:underline active:text-brand-50 dark:text-brand-100 dark:hover:text-brand-110 dark:active:text-brand-120",
      },
      size: {
        // Fluent medium (default) — 32px height, 12px horizontal padding, 14px text.
        default: "h-8 px-3 text-sm has-[>svg]:px-2.5",
        // Fluent small — 24px height, 8px padding, 12px text, tighter gap.
        sm: "h-6 gap-1.5 px-2 text-xs has-[>svg]:px-1.5",
        // Fluent large — 40px height, 16px padding, 16px text.
        lg: "h-10 px-4 text-base has-[>svg]:px-3.5",
        // Square icon-only buttons at each height.
        "icon-sm": "size-6",
        icon: "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
