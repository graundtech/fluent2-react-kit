import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Popover — Fluent 2-styled, shadcn-API popover (non-modal floating panel
 * anchored to a trigger, for rich content — forms, menus, previews — that
 * isn't a single-purpose listbox or tooltip).
 *
 * This is the kit's second popup/overlay component; it reuses the
 * portal → positioner → popup structure and motion recipe `select.tsx`
 * established (conventions §9) rather than inventing a new shape.
 *
 * ## Base UI mapping (conventions §9)
 * Behavior — focus management, portalling, open/close state, collision-aware
 * positioning, outside-press/Escape dismissal — genuinely needs a primitive,
 * so the parts wrap `@base-ui/react/popover` (namespace import, matching the
 * actual `export * as Popover from "./index.parts.js"` shape in node_modules,
 * exactly like `select.tsx`). shadcn part names are mapped onto Base UI's
 * model:
 *
 * | Exported (shadcn name) | Base UI primitive                                    |
 * | ----------------------- | ---------------------------------------------------- |
 * | `Popover`               | `Popover.Root`                                       |
 * | `PopoverTrigger`        | `Popover.Trigger`                                    |
 * | `PopoverContent`        | `Popover.Portal` + `Popover.Positioner` + `Popover.Popup` composed |
 *
 * `Popover.Arrow` / `Popover.Title` / `Popover.Description` / `Popover.Close`
 * / `Popover.Backdrop` / `Popover.Viewport` exist in Base UI but are out of
 * scope for this thin wrapper (no arrow ships by default per spec, and the
 * shadcn Popover API itself has no title/description/close parts) — reach
 * for `@base-ui/react/popover` directly if a consumer needs one of those.
 *
 * ## Divergences from the shadcn/Radix Popover API (all deliberate)
 * 1. **No `PopoverAnchor` export.** Radix ships a dedicated `Popover.Anchor`
 *    part you wrap around an arbitrary element to anchor the content
 *    somewhere other than the trigger. Base UI has no equivalent part —
 *    positioning against a different element is instead a plain `anchor`
 *    prop on `Popover.Positioner` (`Element | VirtualElement |
 *    RefObject<Element | null> | (() => Element | VirtualElement | null)`,
 *    confirmed in `positioner/PopoverPositioner.d.ts` via
 *    `UseAnchorPositioningSharedParameters`). Re-exposing that as its own
 *    "Anchor" component would have nothing to render (no DOM wrapper needed
 *    around the target element), so `PopoverContent` instead accepts an
 *    `anchor` prop that forwards straight to the `Positioner`: pass a ref to
 *    the element you want to anchor against instead of wrapping it.
 * 2. **Composition uses Base UI's `render` prop, not `asChild`.**
 *    `Popover.Trigger` renders its own `<button>` (Base UI's model — there is
 *    no Slot-style boolean). `PopoverPrimitive.Trigger.Props` already includes
 *    Base UI's `render` prop, so no extra plumbing is needed to point the
 *    trigger at another element (e.g. the kit's `Button`):
 *    `<PopoverTrigger render={<Button variant="outline">Open</Button>} />`.
 *    This is the direct Base UI analogue of shadcn's
 *    `<PopoverTrigger asChild><Button /></PopoverTrigger>`, same reasoning
 *    `tooltip.tsx` and `dropdown-menu.tsx` document for their own triggers.
 * 3. **The popup's role is `dialog` (non-modal), not the Radix default.**
 *    Base UI's `Popover.Popup` always renders `role="dialog"` (confirmed in
 *    `popup/PopoverPopup.js`) and `Popover.Trigger` sets
 *    `aria-haspopup="dialog"` + `aria-expanded` + `aria-controls`
 *    accordingly. `Popover.Root`'s `modal` prop defaults to `false` (no
 *    `aria-modal`, no scroll lock, outside interaction stays live) and is
 *    left at that default here — Radix's Popover is non-modal by default
 *    too, so behavior matches even though this wrapper doesn't set the prop
 *    itself. Pass `modal` through `<Popover>` (it forwards to `Popover.Root`)
 *    if a consumer needs modal behavior.
 * 4. **`sideOffset` defaults to `4`, not Base UI's `0`.** Same shadcn-parity
 *    override `select.tsx` makes for `SelectContent`; `align="center"` and
 *    `side="bottom"` are already Base UI's own defaults, restated here as
 *    explicit defaults for clarity and so `PopoverContent`'s JSDoc is the one
 *    place all three live.
 * 5. **`PopoverContent` needs an accessible name from the consumer.** Because
 *    the popup is forced to `role="dialog"` (divergence 3), axe-core's
 *    `aria-dialog-name` rule fails if it has neither `aria-label` nor
 *    `aria-labelledby` — unlike Radix's Popover.Content, which is a plain
 *    (unroled) div and has no such requirement. This wrapper doesn't ship a
 *    `PopoverTitle`/heading part (out of scope, matching the shadcn API
 *    surface), so give `PopoverContent` an explicit `aria-label` (e.g.
 *    `aria-label="Edit dimensions"`) or point `aria-labelledby` at a heading
 *    rendered inside it. `popover.test.tsx` and the preview page both do
 *    this on every example.
 *
 * ## `"use client"` — intentionally omitted
 * Every Base UI Popover part this file uses (`Root`, `Trigger`, `Portal`,
 * `Positioner`, `Popup`) carries its own `'use client'` directive at the
 * source level (verified in the compiled package output, same check
 * `avatar.tsx` documents), so they're already client boundaries on their
 * own. This wrapper has no hooks/handlers and — unlike `select.tsx` /
 * `checkbox.tsx` — no `@fluentui/react-icons` import (no arrow renders by
 * default), so none of the triggers in conventions §2/§9 that would force
 * `"use client"` apply here. The file stays a plain, server-renderable
 * module per conventions §2: a Server Component tree can render these
 * Client Component children without the parent re-declaring the directive.
 * Confirmed via `pnpm typecheck` + the test suite; add the directive here
 * only if that stops holding true.
 *
 * ## data-slot note
 * `Popover` (Root) renders no DOM element of its own (same as `Select`) so it
 * carries no `data-slot`. Every part that renders an element does —
 * `popover-trigger`, `popover-positioner`, `popover-content` — which is what
 * tests/consumers hook onto.
 */

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({
  className,
  ...props
}: PopoverPrimitive.Trigger.Props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Content — the floating panel: `Portal` → `Positioner` → `Popup`. Surface is
 * `bg-popover` + `border` + `shadow-16` (Fluent flyout elevation, conventions
 * §3.6), `rounded-md`, `w-72 p-4` (shadcn parity default size for prose/form
 * content — override with `className` for a differently sized panel). A
 * subtle scale+fade open/close animation rides Base UI's
 * `data-starting-style`/`data-ending-style` hooks with the same token
 * durations/easings `SelectContent` uses. No arrow by default (divergence
 * table above) — `origin-[var(--transform-origin)]` keeps the scale
 * animation's pivot correct regardless of which side the popup lands on.
 */
function PopoverContent({
  className,
  children,
  sideOffset = 4,
  align = "center",
  side = "bottom",
  anchor,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<
    ComponentProps<typeof PopoverPrimitive.Positioner>,
    "side" | "align" | "sideOffset" | "anchor"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        sideOffset={sideOffset}
        align={align}
        side={side}
        anchor={anchor}
        className="z-50 outline-none"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 origin-[var(--transform-origin)] rounded-md border bg-popover p-4 text-popover-foreground shadow-16 outline-none",
            // motion — subtle scale + fade on open (enter) / close (exit)
            "transition-[opacity,scale] duration-fast ease-decelerate-mid",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
