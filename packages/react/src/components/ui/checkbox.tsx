"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckmarkFilled, SubtractRegular } from "@fluentui/react-icons";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Checkbox — Fluent 2-styled, shadcn-API checkbox.
 *
 * This is a Base UI case (conventions §9): the checked/unchecked/indeterminate
 * state machine, the hidden native `<input type="checkbox">` for real form
 * participation, and keyboard activation (Space/Enter) are genuine behavior a
 * styled `<span>` can't express on its own, so this wraps
 * `@base-ui/react/checkbox` (`Checkbox`, imported as a namespace exposing
 * `Checkbox.Root` / `Checkbox.Indicator` — matches the actual
 * `export * as Checkbox from "./index.parts.js"` shape in node_modules, the
 * same pattern `avatar.tsx` and `radio-group.tsx` use for their own Base UI
 * subpaths). `Checkbox.Root` renders a `<span role="checkbox">` plus a
 * visually-hidden native `<input type="checkbox">` sibling for form
 * submission; none of that is reimplemented here.
 *
 * `"use client"` is required here — integration-pass correction of the
 * original reasoning below. `@base-ui/react/checkbox`'s `CheckboxRoot` and
 * `CheckboxIndicator` do each carry their own `'use client'` directive, so
 * *those* parts alone wouldn't force this file to be a client boundary
 * (same reasoning as `avatar.tsx` / `radio-group.tsx`). But
 * `CheckmarkFilled`/`SubtractRegular` from `@fluentui/react-icons` don't hold
 * to that pattern: the package's shared icon-sizing module
 * (`createFluentIcon.styles.js`) calls `@griffel/react`'s `__styles()` at
 * module scope *without* its own `'use client'` directive, even though
 * `__styles` itself is client-only. Rendering either icon from a Server
 * Component pulls that module into the server's RSC graph, and `next build`
 * (Turbopack) fails collecting page data with "Attempted to call __styles()
 * from the server but __styles is on the client" — reproduced against
 * `@fluentui/react-icons@2.0.333` / `@griffel/react@1.7.5`, and confirmed to
 * affect every route that shares Turbopack's chunk for these icons, not just
 * this one. `"use client"` here keeps the icon imports inside a client
 * boundary so they're never evaluated on the server. `select.tsx` carries the
 * same fix for the same reason.
 *
 * Box: Fluent 2's checkbox indicator is 16px square (`size-4`) with
 * `borderRadius: tokens.borderRadiusSmall` (confirmed against Fluent UI v9's
 * `useCheckboxStyles.styles.ts` — `indicatorSizeMedium = '16px'`,
 * `borderRadius: tokens.borderRadiusSmall`, checkmark `fontSize: '12px'`).
 * `borderRadiusSmall` is Fluent's 2px step, which is exactly this kit's
 * `rounded-sm` (`--radius-sm: calc(var(--radius) - 4px)` = 6px − 4px = 2px in
 * `tokens.css`) — no new radius token needed. `aspect-square` guards the box
 * against flex-row squish when paired with a `Label` (mirrors
 * `radio-group.tsx`'s `RadioGroupItem`).
 *
 * Checked glyph: `CheckmarkFilled` from `@fluentui/react-icons` at `size-3`
 * (12px, matching Fluent's checkmark `fontSize`) — a real glyph is
 * appropriate here (unlike Radio's plain dot) because Fluent's checkbox
 * indicator specifically shows a checkmark, not just a filled shape.
 *
 * Indeterminate: Base UI's `indeterminate` prop (forwarded to `Checkbox.Root`
 * so it drives `aria-checked="mixed"` and the `data-indeterminate` attribute
 * Base UI uses for its own state) renders a dash instead of a checkmark. The
 * spec offered a choice between `SubtractRegular` and a hand-drawn 8×2 bar;
 * `SubtractRegular` is used since `@fluentui/react-icons` ships that exact
 * glyph and pulling in an icon dependency is already paid for by the checked
 * state. Which icon to render is decided from this component's own
 * `indeterminate` prop (a plain ternary), not a CSS toggle keyed off Base
 * UI's data attributes — simpler and directly assertable in tests, and
 * `Checkbox.Indicator` already only mounts while `checked || indeterminate`
 * (see `CheckboxIndicator.mjs`'s `rendered` check), so no extra
 * checked-conditional is needed beyond that ternary.
 *
 * States: `data-checked`/`data-unchecked`/`data-indeterminate` and
 * `data-disabled` are Base UI's own presence attributes on `Checkbox.Root`'s
 * rendered `<span>` (see `CheckboxRootDataAttributes` in node_modules —
 * boolean presence, not a `data-state="checked"` value pair like Radix),
 * matched here via Tailwind's `data-[checked]:` / `data-[indeterminate]:` /
 * `data-[disabled]:` arbitrary-attribute variants — the same convention
 * `radio-group.tsx` established. There is no native `:disabled` pseudo-class
 * to reach for (confirmed against `useFocusableWhenDisabled.mjs`: a
 * non-native-button Base UI root gets `aria-disabled`, not a real `disabled`
 * DOM attribute, when disabled — and `:disabled` only ever matches elements
 * that support the HTML `disabled` attribute natively), so the
 * opacity/pointer-events disabled recipe from conventions §4 is re-expressed
 * against `data-[disabled]:` instead of `disabled:`. Focus, per conventions
 * §4, stays the generic offset-ring recipe (not the field bottom-accent
 * variant — a checkbox is a selectable control, not a typed-into field).
 * `aria-invalid` is a bare ARIA attribute Base UI passes through untouched
 * (not in `CheckboxRoot`'s destructured prop list), so the standard
 * `aria-invalid:` recipe applies as-is.
 */
function Checkbox({
  className,
  indeterminate = false,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      indeterminate={indeterminate}
      className={cn(
        // layout — Fluent 16px box, small radius (Fluent borderRadiusSmall)
        "aspect-square size-4 shrink-0 cursor-pointer rounded-sm border border-input bg-background",
        "inline-flex items-center justify-center",
        // motion
        "outline-none transition-colors duration-fast ease-ease",
        // checked / indeterminate — brand fill (Base UI presence attributes)
        "data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground",
        "data-[indeterminate]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:text-primary-foreground",
        // disabled — opacity-based (conventions §4), re-expressed against
        // Base UI's data-disabled presence attribute (this renders a
        // <span>, not a native disableable element — see doc comment)
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // focus — generic offset-ring recipe (conventions §4)
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // invalid — shadcn aria-invalid treatment (conventions §4)
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
      >
        {indeterminate ? (
          <SubtractRegular aria-hidden="true" className="size-3" />
        ) : (
          <CheckmarkFilled aria-hidden="true" className="size-3" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
