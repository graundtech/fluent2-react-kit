"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownRegular } from "@fluentui/react-icons";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Accordion — Fluent 2-styled, shadcn-API accordion (expand/collapse groups).
 *
 * ## Base UI mapping (conventions §9)
 * Behavior — open/close state, focus-safe disabled triggers, and a
 * height-animated collapsible panel — genuinely needs a primitive, so the
 * parts wrap `@base-ui/react/accordion` (namespace import, matching the
 * actual `export * as Accordion from "./index.parts.js"` shape in
 * node_modules, same pattern as `select.tsx`/`checkbox.tsx`). shadcn part
 * names map onto Base UI's model:
 *
 * | Exported (shadcn name) | Base UI primitive        |
 * | ----------------------- | ------------------------ |
 * | `Accordion`              | `Accordion.Root`         |
 * | `AccordionItem`          | `Accordion.Item`         |
 * | `AccordionTrigger`       | `Accordion.Header` (h3) + `Accordion.Trigger` (button), composed like shadcn |
 * | `AccordionContent`       | `Accordion.Panel`        |
 *
 * ## Divergences from the shadcn/Radix Accordion API (all deliberate)
 * 1. **No `type="single" | "multiple"` prop.** Radix's Accordion takes a
 *    `type` discriminant that also changes the shape of `value`
 *    (`string | undefined` for `"single"`, `string[]` for `"multiple"`).
 *    Base UI instead has a single `multiple?: boolean` prop (default
 *    `false`) and *always* represents the open set as an array
 *    (`AccordionValue<Value> = Value[]`), even in single mode (an array of
 *    zero or one items). This wrapper does not paper over that with a fake
 *    `type` shim — `<Accordion>` passes `AccordionPrimitive.Root.Props`
 *    straight through, so callers use `multiple` and read/write `value`/
 *    `defaultValue`/`onValueChange` as arrays. `multiple=false` (the
 *    default) still enforces "opening one closes the others" the same way
 *    Radix's `type="single"` does — Base UI's root closes any previously
 *    open item when a new one opens and `multiple` is false.
 * 2. **`AccordionItem` takes `value` directly** (not wrapped/renamed) — same
 *    prop name as Base UI, and it auto-generates a stable id if omitted, so
 *    `value` is optional here (unlike Radix, where an uncontrolled
 *    `type="single"` item still needs an explicit `value` to open by
 *    default).
 *
 * ## Chevron rotation
 * `AccordionTrigger` carries Base UI's own `data-panel-open` presence
 * attribute (from `AccordionTriggerDataAttributes.panelOpen`, verified
 * against the compiled source — *not* `data-open`, which lives on
 * `Accordion.Item`/`Accordion.Panel` instead) when its panel is open. The
 * chevron is a child of the trigger button, so the trigger carries `group`
 * and the chevron targets `group-data-[panel-open]:rotate-180` (conventions
 * §4's bracketed data-attribute form) — the bracket form works on ancestor
 * *and* self, `group-` just relays the parent's attribute to a descendant
 * selector.
 *
 * ## Height animation
 * `Accordion.Panel` measures its own content and exposes it as two CSS
 * custom properties set as inline styles on the panel element itself:
 * `--accordion-panel-height` and `--accordion-panel-width` (verified against
 * `AccordionPanelCssVars` in the compiled source — during open/close these
 * update live as Base UI's `ResizeObserver` re-measures). `AccordionContent`
 * reads `--accordion-panel-height` back via `h-[var(--accordion-panel-height)]`
 * on the outer, `overflow-hidden` panel and transitions `height` (never
 * `transition-transform`/`scale`/`translate` — height is the property that
 * actually changes here, conventions §3.5's rule generalized) with token
 * durations/easings: `duration-normal ease-decelerate-mid` entering,
 * `ease-accelerate-mid` (via `data-ending-style:ease-accelerate-mid`, which
 * wins by source order) exiting. `data-starting-style`/`data-ending-style`
 * (Base UI's enter/exit hooks, already used by `select.tsx`'s popup) pin the
 * height to `0` at both animation boundaries, so the transition always
 * animates *from* `0` *to* the measured height (open) or the reverse
 * (close) — this is Base UI's own documented pattern for this component,
 * reproduced with the kit's tokens instead of raw CSS. Padding lives on an
 * *inner* `div` (not the animated panel itself) so the padding doesn't
 * distort the measured/animated height — the same inner-wrapper split
 * shadcn's own Radix-based `AccordionContent` uses. `AccordionPanel`
 * unmounts while closed by default (`keepMounted` is not forced on); Base
 * UI's own transition-status tracking (mirrors Radix `Presence`) keeps it
 * mounted for the *closing* animation without any extra prop here.
 *
 * ## `"use client"` — required (conventions §9)
 * Every Base UI Accordion part module carries its own `'use client'`
 * directive, so on that basis alone this wrapper could stay
 * server-renderable (same reasoning as `avatar.tsx`). But
 * `ChevronDownRegular` from `@fluentui/react-icons` breaks that: the
 * package's shared icon-sizing module (`createFluentIcon.styles.js`) calls
 * `@griffel/react`'s `__styles()` at module scope *without* its own
 * `'use client'` directive, even though `__styles` itself is client-only.
 * Rendering the icon from a Server Component pulls that module into the
 * server's RSC graph, and `next build` (Turbopack) fails collecting page
 * data with "Attempted to call __styles() from the server but __styles is
 * on the client" — reproduced against `@fluentui/react-icons@2.0.333` /
 * `@griffel/react@1.7.5`, and confirmed to affect every route sharing
 * Turbopack's chunk for this icon, not just this one. `"use client"` here
 * keeps the icon import inside a client boundary so it's never evaluated on
 * the server. `select.tsx` and `checkbox.tsx` carry the same fix for the
 * same reason.
 *
 * ## Keyboard behavior note
 * Base UI's Accordion no longer implements roving-tabindex arrow-key
 * navigation between triggers — `AccordionRoot.Props.orientation` is
 * explicitly documented (and typed) as `@deprecated`, "following the APG
 * guidance update to remove the roving focus pattern" for accordions, and
 * the compiled `AccordionTrigger` has no `onKeyDown` handler beyond the
 * generic focusable-when-disabled Tab guard — only `onClick`. So each
 * trigger is a normal Tab stop (Enter/Space activate it, matching any
 * `<button>`); ArrowUp/ArrowDown do **not** move focus between triggers in
 * this version, and the test file asserts that actual (non-roving)
 * behavior rather than the older Radix pattern.
 */
function Accordion<Value = unknown>(
  props: AccordionPrimitive.Root.Props<Value>
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

/**
 * Item — groups one trigger with its panel. `border-b` per shadcn (every
 * item but the last is visually separated by the next item's top-less
 * border — the whole accordion typically sits inside a container that adds
 * the top border, matching shadcn's own layout).
 */
function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
}

/**
 * Trigger — `Accordion.Header` (renders `<h3>`, the heading level shadcn
 * uses) wrapping `Accordion.Trigger` (the actual `<button>`), exactly like
 * shadcn's Radix-based composition. The chevron rotates via
 * `group-data-[panel-open]:rotate-180` — see the component doc comment for
 * why the attribute lives on the trigger rather than the icon itself.
 */
function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-center justify-between gap-2 py-4 text-left text-sm font-medium outline-none",
          "transition-colors duration-fast ease-ease hover:underline",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownRegular
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-normal ease-ease group-data-[panel-open]:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

/**
 * Content — the collapsible panel. See the component doc comment's "Height
 * animation" section for the exact mechanism. `role="region"` and
 * `aria-labelledby` (pointing at the trigger) are set by Base UI itself, not
 * reimplemented here.
 */
function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "h-[var(--accordion-panel-height)] overflow-hidden text-sm",
        "transition-[height] duration-normal ease-decelerate-mid",
        "data-starting-style:h-0 data-ending-style:h-0 data-ending-style:ease-accelerate-mid"
      )}
      {...props}
    >
      <div className={cn("pb-4 text-muted-foreground", className)}>
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
