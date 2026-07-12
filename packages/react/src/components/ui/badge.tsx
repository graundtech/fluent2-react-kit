import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Badge — Fluent 2-styled, shadcn-API badge.
 *
 * Aesthetics follow Fluent 2 (a 4px-radius chip — Fluent's fixed `medium`
 * corner token, non-scaling, NOT a full pill — compact 20px height, 10px/600
 * caption-2 label with 4px horizontal padding, flat filled surfaces, brand/
 * status color tokens); the prop surface (`variant`, `asChild`,
 * `badgeVariants`) follows shadcn/ui.
 *
 * Geometry is spec-exact: `rounded-md` (`--radius-md` = 4px, the Fluent badge
 * corner token used at every badge size), `px-1` (4px = `spacingHorizontalXS`),
 * `text-[10px]/[14px]` (Fluent "Caption 2 Strong", == the `--text-caption2`
 * token value — see the layout comment for why the arbitrary length is used
 * over the `text-caption2` utility) + `font-semibold` (600), fixed `h-5`
 * (20px Medium).
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
    // layout — Fluent 4px chip, compact 20px height, centered caption-2 label
    "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap",
    // Fluent "Caption 2 Strong" = 10px/14px, weight 600. Expressed as the
    // arbitrary `text-[10px]/[14px]` rather than the `text-caption2` token
    // utility on purpose: every variant also sets a `text-*` color, and
    // tailwind-merge (unaware of the custom `caption2` font-size) treats
    // `text-caption2` as a text-color and drops it behind the variant color;
    // the `--text-caption2` var also lives in `@theme inline`, which isn't
    // emitted to :root, so a `text-(length:--text-caption2)` reference would be
    // undefined at runtime. The arbitrary length is twMerge-safe and resolves
    // with no runtime var. Values equal the `--text-caption2` token exactly.
    "rounded-md border px-1 text-[10px]/[14px] font-semibold select-none",
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
        // Fluent warning badge — bright orange chip (`#f7630c`) with DARK
        // static text (`#242424`), the opposite foreground polarity from
        // --warning's white text. Uses the dedicated `--warning-badge` pair
        // (~4.98:1 AA), matching Figma's WarningBackground3 + NeutralForeground1
        // Static, so Alert's darkOrange --warning stays put (single-source
        // decoupling; see tokens.css + tokens-research.md §12.9).
        warning:
          "border-transparent bg-warning-badge text-warning-badge-foreground [a&]:hover:bg-warning-badge/90 [a&]:active:bg-warning-badge/80",
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
