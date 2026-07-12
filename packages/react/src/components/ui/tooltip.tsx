import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Tooltip — Fluent 2-styled, shadcn-API tooltip.
 *
 * Behavior — hover/focus delay, portalling, collision-aware positioning,
 * dismiss-on-Escape — genuinely needs a primitive (conventions §9), so the
 * parts wrap `@base-ui/react/tooltip` (namespace import, matching the actual
 * export shape in node_modules, exactly like `select.tsx`/`avatar.tsx`).
 * `select.tsx`'s doc comment calls out Tooltip by name as inheriting its
 * portal → positioner → popup pattern; this file is that follow-through.
 *
 * ## Base UI mapping (conventions §9)
 *
 * | Exported (shadcn name) | Base UI primitive                                    |
 * | ----------------------- | ---------------------------------------------------- |
 * | `TooltipProvider`       | `Tooltip.Provider`                                    |
 * | `Tooltip`                | `Tooltip.Root`                                        |
 * | `TooltipTrigger`         | `Tooltip.Trigger`                                     |
 * | `TooltipContent`         | `Tooltip.Portal` + `Tooltip.Positioner` + `Tooltip.Popup` |
 *
 * ## Divergences from the shadcn/Radix Tooltip API (all deliberate)
 * 1. **Neutral elevated surface, not an inverted brand bubble.** shadcn's
 *    tooltip is `bg-primary text-primary-foreground` — a dark, high-contrast
 *    chip. Fluent 2 tooltips are a **neutral flyout**, visually the same family
 *    as `SelectContent`/menus: `bg-popover text-popover-foreground`, a hairline
 *    `border`, and `shadow-16` elevation, just smaller (`text-xs`,
 *    `px-2.5 py-1.5`, `max-w-60`). This is the headline visual departure from
 *    shadcn for this component — everything else follows shadcn's API shape.
 * 2. **No arrow/beak by default.** Base UI ships `Tooltip.Arrow`, but Fluent 2's
 *    tooltip is a plain floating rectangle with no pointer back to the trigger.
 *    `TooltipContent` does not render one and `TooltipArrow` is intentionally
 *    not re-exported; a consumer who wants Radix/shadcn's pointer can compose
 *    `@base-ui/react/tooltip`'s `Arrow` part directly alongside this component.
 * 3. **Composition uses Base UI's `render` prop, not `asChild`.**
 *    `Tooltip.Trigger` renders its own `<button>` (Base UI's model — there is no
 *    Slot-style boolean). `TooltipTrigger`'s props type (`TooltipPrimitive.
 *    Trigger.Props` — used directly rather than `ComponentProps<typeof
 *    TooltipPrimitive.Trigger>`, which loses the `ref` type through Base UI's
 *    generic `<Payload>` call signature) already includes Base UI's `render`
 *    prop, so no extra plumbing is needed to point the trigger at another
 *    element (e.g. the kit's `Button`):
 *    `<TooltipTrigger render={<Button variant="outline">Hover me</Button>} />`.
 *    This is the direct Base UI analogue of shadcn's
 *    `<TooltipTrigger asChild><Button /></TooltipTrigger>`.
 * 4. **`TooltipProvider` defaults `delay` to 600ms**, matching
 *    `Tooltip.Trigger`'s own built-in default — set explicitly here so the hover
 *    delay is documented and overridable in one obvious place
 *    (`<TooltipProvider delay={0}>` for instant-open test/demo scenarios). The
 *    Provider's actual job is *grouping*: once one tooltip in the tree has
 *    opened, sibling tooltips opened within `timeout` (Base UI default 400ms)
 *    skip their own delay and open instantly — useful for a toolbar of
 *    icon buttons. A `<Tooltip>` used outside any `<TooltipProvider>` still
 *    works (Base UI's trigger-level 600ms default applies), the Provider is
 *    only required for the grouping behavior and for tests that want `delay={0}`.
 * 5. **`Tooltip.Viewport` is not exposed.** It exists to animate content
 *    swapping when multiple triggers share a single tooltip instance — a
 *    pattern this kit's simple per-trigger API doesn't use. Out of scope for
 *    this pass; compose it directly from `@base-ui/react/tooltip` if needed.
 * 6. **`TooltipContent` sets `role="tooltip"`; `aria-describedby` is a documented
 *    recipe, not automatic wiring.** Confirmed against Base UI's own docs
 *    (base-ui.com/react/components/tooltip): unlike Radix, Base UI's Tooltip
 *    is explicitly "visual-only" — it does **not** set `role="tooltip"` on the
 *    popup or `aria-describedby` on the trigger, and its own guidance is to
 *    give the trigger an `aria-label` instead ("the tooltip's trigger must
 *    have an `aria-label` attribute that closely matches the tooltip's
 *    content"). This wrapper closes the first, cheap half of that gap itself
 *    — `TooltipContent`'s `Popup` always carries `role="tooltip"` (a bare
 *    `<div>` otherwise has no accessible role at all) — but does not
 *    synthesize `aria-describedby` linkage, which would require id-sharing
 *    plumbing (context + `useState`/`useId`) between `TooltipTrigger` and
 *    `TooltipContent` that Base UI does not expose and that would force
 *    `"use client"` on this otherwise-server-safe wrapper (§2). Consumers who
 *    need the description programmatically associated (beyond an `aria-label`
 *    on the trigger) can wire it manually, the same way `select.tsx`
 *    documents its `aria-labelledby` labeling recipe: give `TooltipContent`
 *    an `id` and pass that same value as `aria-describedby` on
 *    `TooltipTrigger`. `tooltip.test.tsx` has a test exercising this recipe.
 *
 * ## `"use client"` — intentionally omitted
 * Every Base UI Tooltip part module (`Root`, `Trigger`, `Portal`, `Positioner`,
 * `Popup`, `Provider`) carries its own `'use client'` directive at the source
 * level (verified in the compiled package output, same check as `avatar.tsx`).
 * This wrapper imports no icons (`@fluentui/react-icons`, which *would* force
 * the directive per conventions §9 — see `select.tsx`) and defines no
 * hooks/handlers of its own; it only forwards props into already-client parts.
 * So it stays a plain, server-renderable module: a Server Component tree can
 * render these client children directly without the parent re-declaring the
 * directive. Confirmed via `pnpm typecheck` + the test suite.
 *
 * ## data-slot note
 * `Tooltip` (Root) and `TooltipProvider` render no DOM element of their own
 * (Root groups state; Provider is a pair of context providers), so neither
 * carries a `data-slot`. Every part that renders an element does —
 * `tooltip-trigger`, `tooltip-positioner`, `tooltip-content` — which is what
 * tests/consumers hook onto.
 */

function TooltipProvider({
  delay = 600,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />;
}

function TooltipTrigger({
  className,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Content — the floating surface: `Portal` → `Positioner` → `Popup`. Fluent
 * flyout look (divergence 1): `bg-popover` + `border` + `shadow-16`,
 * `rounded-md`, small type (`text-xs`), compact padding, capped width
 * (`max-w-60`) so long copy wraps instead of stretching edge to edge. A
 * subtle scale+fade open/close animation rides Base UI's
 * `data-starting-style`/`data-ending-style` hooks with token durations/easings
 * (same recipe as `SelectContent`). Carries `role="tooltip"` (divergence 6)
 * since Base UI's raw `Popup` has no accessible role of its own.
 */
function TooltipContent({
  className,
  children,
  sideOffset = 4,
  side = "top",
  align = "center",
  ...props
}: ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<
    ComponentProps<typeof TooltipPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        data-slot="tooltip-positioner"
        sideOffset={sideOffset}
        side={side}
        align={align}
        className="z-50 outline-none"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          role="tooltip"
          className={cn(
            "relative max-w-60 origin-[var(--transform-origin)] text-balance rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-16 outline-none",
            // motion — subtle scale + fade on open (enter) / close (exit)
            "transition-[transform,opacity] duration-fast ease-decelerate-mid",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
