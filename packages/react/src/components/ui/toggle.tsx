import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Toggle — Fluent 2-styled, shadcn-API two-state toggle button.
 *
 * Maps to Fluent 2's `ToggleButton`: a button that persists a pressed/checked
 * visual state instead of firing a one-shot action (Bold/Italic in a Ribbon
 * are the canonical example — this is built to be dropped into one, see
 * `apps/demo/app/preview/toggle/page.tsx`'s icon-only row). The prop surface
 * (`Toggle`, `toggleVariants`, `variant: "default" | "outline"`,
 * `size: "sm" | "default" | "lg"`) mirrors shadcn/ui's `toggle`, which is
 * itself a thin styling layer over Radix's `Toggle` primitive; here the same
 * shape wraps `@base-ui/react/toggle` instead (conventions §9 — the
 * pressed/unpressed state machine, `aria-pressed` wiring, and Space/Enter
 * activation are genuine behavior a styled `<button>` alone would have to
 * reimplement).
 *
 * ## API divergence from shadcn/Radix
 * Radix's `Toggle` takes `pressed`/`defaultPressed`/`onPressedChange` and
 * composes via `asChild`. Base UI's `Toggle` has the *same* controlled/
 * uncontrolled prop names (`pressed`, `defaultPressed`, `onPressedChange`),
 * so that part of the API needs no shim — but Base UI has no `asChild`.
 * Composition instead goes through the `render` prop it inherits from
 * `BaseUIComponentProps` (`render={<a href="..." />}` or a
 * `(props, state) => ReactElement` render function) — Base UI's idiom for
 * "replace the rendered element" across every primitive in the package. This
 * wrapper does not add its own `asChild`/`Slot` shim on top; `render` is
 * forwarded straight through via `...props` since `Toggle.Props` already
 * includes it. One signature difference worth flagging: Base UI's
 * `onPressedChange` is `(pressed, eventDetails) => void` (an extra
 * `eventDetails` argument), not Radix's single-arg `(pressed) => void` —
 * same divergence already documented on `switch.tsx`'s `onCheckedChange`.
 *
 * `"use client"` is intentionally omitted — same reasoning as `switch.tsx`/
 * `radio-group.tsx`: `@base-ui/react/toggle`'s `Toggle` carries its own
 * `'use client'` directive at the compiled-source level (verified in
 * `node_modules/@base-ui/react/toggle/Toggle.js` and `.mjs`), so it is
 * already a client boundary on its own. This wrapper has no hooks/handlers
 * of its own — it only forwards props — so a Server Component tree can
 * render it unchanged.
 *
 * Base UI's `Toggle` renders a real native `<button>` (`nativeButton`
 * defaults `true`), sets `aria-pressed` itself from its internal state, and
 * stamps presence data-attributes `data-pressed` / `data-disabled`
 * (`ToggleDataAttributes`) — boolean presence, not a Radix-style
 * `data-state="on" | "off"` pair, matched below via Tailwind's bracketed
 * `data-[pressed]:` form (conventions §4). Because it is a genuine native
 * button, `disabled` is a real DOM attribute and Space/Enter activation is
 * free — no reimplementation needed, and the disabled recipe below uses the
 * ordinary `disabled:` pseudo-class (not `data-[disabled]:`, unlike
 * `checkbox.tsx`/`switch.tsx` which render a non-native `<span>`).
 *
 * Height scale, padding, and text sizes are lifted verbatim from
 * `button.tsx`'s `sm`/`default`/`lg` (24/32/40px) so a `Toggle` sits flush
 * next to a `Button` in the same toolbar/Ribbon row. A 1px transparent
 * border ships on every rest state (both variants already have a border, so
 * this just keeps `default`'s box identical) so the border that appears on
 * `data-[pressed]:` doesn't shift layout by 1px when the state flips.
 *
 * Pressed-state color: Fluent's checked `ToggleButton` reads as a filled
 * neutral "selected" surface, not a full brand fill (that's reserved for
 * `appearance="primary"` buttons) — so the pressed state reuses `Button`'s
 * own `secondary` variant tokens (`bg-secondary`/`text-secondary-foreground`,
 * hover steps to `bg-accent`, active/pressed-and-held steps to `bg-input`),
 * the same "filled neutral surface + border" vocabulary `button.tsx` already
 * uses for `secondary`. `outline`'s pressed border swaps to `border-primary`
 * (the brand-tinted checked-border token `checkbox.tsx` uses for its checked
 * box) so an outlined toggle's "on" state reads as brand-accented at a
 * glance, while `default`'s pressed border uses the neutral `border-border`
 * token instead (no outline at rest to accent against).
 */
const toggleVariants = cva(
  [
    // layout
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md border border-transparent font-semibold select-none cursor-pointer",
    // motion — token duration + Fluent easyEase curve; honors prefers-reduced-motion
    // automatically (the duration tokens collapse to 0.01ms in tokens.css).
    "outline-none transition-colors duration-fast ease-ease",
    // disabled — opacity read (conventions §4); real <button disabled>, so the
    // native pseudo-class applies directly (see file header).
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
        // Fluent subtle ToggleButton — transparent at rest, neutral hover
        // (identical ramp to Button's ghost), filled-neutral "secondary"
        // surface once pressed (see file header for the token mapping).
        default: [
          "bg-transparent hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          "dark:hover:bg-accent/50 dark:active:bg-accent/70",
          "data-[pressed]:border-border data-[pressed]:bg-secondary data-[pressed]:text-secondary-foreground",
          "data-[pressed]:hover:bg-accent data-[pressed]:active:bg-input dark:data-[pressed]:hover:bg-input dark:data-[pressed]:active:bg-input",
        ],
        // Fluent outline ToggleButton — bordered + transparent at rest
        // (identical ramp to Button's outline), same pressed fill as
        // `default` but the border brand-tints to signal "on" against the
        // already-visible outline.
        outline: [
          "border-input bg-transparent hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          "dark:bg-input/30 dark:hover:bg-input/50 dark:active:bg-input/70",
          // dark:bg-input/30 (rest) outranks the unscoped pressed fill in the
          // cascade, so the pressed fill must be re-asserted under dark: too
          // (real-browser finding from e2e/toggle.spec.ts).
          "data-[pressed]:border-primary data-[pressed]:bg-secondary data-[pressed]:text-secondary-foreground dark:data-[pressed]:bg-secondary",
          "data-[pressed]:hover:bg-accent data-[pressed]:active:bg-input dark:data-[pressed]:hover:bg-input dark:data-[pressed]:active:bg-input",
        ],
      },
      size: {
        // Fluent medium (default) — 32px height, matches button.tsx's default exactly.
        default: "h-8 px-3 text-sm has-[>svg]:px-2.5",
        // Fluent small — 24px height, matches button.tsx's sm exactly.
        sm: "h-6 gap-1.5 px-2 text-xs has-[>svg]:px-1.5",
        // Fluent large — 40px height, matches button.tsx's lg exactly.
        lg: "h-10 px-4 text-base has-[>svg]:px-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<typeof TogglePrimitive> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      data-variant={variant}
      data-size={size}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
