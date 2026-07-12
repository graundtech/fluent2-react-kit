import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Link — Fluent 2-styled, shadcn-API link.
 *
 * shadcn has no Link primitive; this is a Fluent-driven addition that follows
 * the same authoring pattern as `Button` (cva + `asChild` + `data-slot`) so it
 * reads as part of the same system. The color ramp matches Fluent's
 * `BrandForegroundLink` states exactly — one brand-ramp step darker than an
 * earlier (off-by-one-light) version: rest `brand-70` (`#115ea3`), hover
 * `brand-60` (`#0f548c`), pressed `brand-50` (`#0c3b5e`) in light; rest
 * `brand-100`, hover `brand-110`, pressed `brand-120` in dark. Weight is
 * `font-normal` (Fluent Link is Body 1 / Regular 400, not the medium 500 an
 * earlier version used). Button's own `link` variant carries the same color
 * ramp (kept in sync) but keeps the button's `font-semibold` weight.
 *
 * Two variants, mapping directly to the two Fluent 2 link usages
 * (https://storybooks.fluentui.dev/react/?path=/docs/components-link--docs):
 * - `default` — a standalone link (nav, button-like, card action). No
 *   underline at rest; underline appears on hover only, matching Button's
 *   `link` variant so the two read identically.
 * - `inline` — a link inside a sentence of body text. Fluent requires a
 *   persistent underline here so the link is distinguishable from surrounding
 *   text by shape, not color alone (this also keeps it usable for anyone who
 *   can't perceive the brand-color contrast against body text).
 *
 * `asChild` (Radix Slot) exists specifically so this component can wrap a
 * framework router's own link and still carry Fluent's visual treatment:
 *
 *   <Link asChild>
 *     <NextLink href="/dashboard">Dashboard</NextLink>
 *   </Link>
 *
 * Disabled: anchors have no native `disabled` attribute, so this component
 * does not invent one (that would break the plain DOM-attribute contract
 * `ComponentProps<"a">` gives consumers). Instead it styles `aria-disabled`.
 * Two things consumers must still do themselves, because neither can be
 * enforced from inside the component:
 * - Omit `href` on a disabled link where possible — an anchor without `href`
 *   is not in the tab order and is not exposed as a link by assistive tech,
 *   which is the most robust "disabled" for a link.
 * - If `href` must stay (e.g. to preserve layout/routing), pair
 *   `aria-disabled="true"` with these classes: `pointer-events-none` blocks
 *   pointer activation and `no-underline`/`opacity-50` give a visible cue.
 *   This does **not** remove the link from the tab order or stop Enter-key
 *   activation on its own — add `tabIndex={-1}` too if full keyboard removal
 *   is required.
 *
 * Server-safe: no `"use client"`, no hooks/handlers — the React import is
 * type-only, so the file can be dropped straight into an RSC tree.
 */
const linkVariants = cva(
  [
    // shape + type — Fluent Link is Body 1 / Regular 400
    "rounded-xs font-normal text-brand-70 underline-offset-4 dark:text-brand-100",
    // motion — token duration + Fluent easyEase curve; honors prefers-reduced-motion
    // automatically (the duration tokens collapse to 0.01ms in tokens.css).
    "outline-none transition-colors duration-fast ease-ease",
    // interactive state ramp — Fluent BrandForegroundLink, one brand step
    // darker than the color set above, kept in sync with Button's `link`
    // variant. rest brand-70 → hover brand-60 → pressed brand-50 (light);
    // rest brand-100 → hover brand-110 → pressed brand-120 (dark). The brand
    // ramp is global, so the dark steps are declared explicitly (conventions §4).
    "hover:text-brand-60 hover:underline active:text-brand-50 dark:hover:text-brand-110 dark:active:text-brand-120",
    // focus — Fluent double-stroke approximation: 2px brand ring + 2px surface-colored gap
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // disabled — anchors have no native `disabled`; styled off `aria-disabled` instead.
    // Opacity-based to match the rest of the kit's disabled treatment (see conventions
    // doc §4); `no-underline` also cancels the `inline` variant's persistent underline.
    "aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:no-underline",
  ],
  {
    variants: {
      variant: {
        // Standalone link — no underline at rest, only on hover.
        default: "",
        // Inline-in-prose link — Fluent requires an always-on underline so the
        // link reads as a link independent of its brand-color contrast.
        inline: "underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Link({
  className,
  variant = "default",
  asChild = false,
  ...props
}: ComponentProps<"a"> &
  VariantProps<typeof linkVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="link"
      data-variant={variant}
      className={cn(linkVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Link, linkVariants };
