import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Link — Fluent 2-styled, shadcn-API link.
 *
 * shadcn has no Link primitive; this is a Fluent-driven addition that follows
 * the same authoring pattern as `Button` (cva + `asChild` + `data-slot`) so it
 * reads as part of the same system. Visually it mirrors Button's `link`
 * variant: brand-colored text, `hover:text-brand-70` / `active:text-brand-60`
 * (light), `dark:hover:text-brand-100` / `dark:active:text-brand-110` (dark).
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
    // shape + type
    "rounded-xs font-medium text-primary underline-offset-4",
    // motion — token duration + Fluent easyEase curve; honors prefers-reduced-motion
    // automatically (the duration tokens collapse to 0.01ms in tokens.css).
    "outline-none transition-colors duration-fast ease-ease",
    // interactive state ramp — aligned with Button's `link` variant so hover/
    // active read identically across the two components.
    // rest brand-80 (via text-primary) → hover brand-70 → pressed brand-60 (light);
    // dark hover brand-100 → dark pressed brand-110 (brand ramp is global, so the
    // dark steps are declared explicitly per conventions §4).
    "hover:text-brand-70 hover:underline active:text-brand-60 dark:hover:text-brand-100 dark:active:text-brand-110",
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
