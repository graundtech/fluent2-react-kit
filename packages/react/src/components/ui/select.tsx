"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import {
  CheckmarkRegular,
  ChevronDownRegular,
  ChevronUpRegular,
} from "@fluentui/react-icons";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Select — Fluent 2-styled, shadcn-API select (dropdown listbox).
 *
 * This is the kit's first popup/overlay component, so the patterns set here
 * (portal + positioner + popup surface, `shadow-16` flyout elevation, item
 * highlight via Base UI `data-highlighted`) are the reference for Dialog,
 * Tooltip, and Dropdown later.
 *
 * ## Base UI mapping (conventions §9)
 * Behavior — focus management, portalling, open/close state, roving tabindex,
 * type-ahead, collision-aware positioning — genuinely needs a primitive, so the
 * parts wrap `@base-ui/react/select` (namespace import, matching the actual
 * export shape in node_modules, exactly like `avatar.tsx`). shadcn part names
 * are mapped onto Base UI's model:
 *
 * | Exported (shadcn name)  | Base UI primitive                                    |
 * | ----------------------- | ---------------------------------------------------- |
 * | `Select`                | `Select.Root`                                        |
 * | `SelectGroup`           | `Select.Group`                                       |
 * | `SelectValue`           | `Select.Value`                                       |
 * | `SelectTrigger`         | `Select.Trigger` (+ `Select.Icon` chevron appended)  |
 * | `SelectContent`         | `Select.Portal` + `Select.Positioner` + `Select.Popup` + `Select.List` |
 * | `SelectLabel`           | `Select.GroupLabel`  ← see divergence 1              |
 * | `SelectItem`            | `Select.Item` (+ `Select.ItemIndicator` + `Select.ItemText`) |
 * | `SelectSeparator`       | `Select.Separator`                                   |
 * | `SelectScrollUpButton`  | `Select.ScrollUpArrow`                               |
 * | `SelectScrollDownButton`| `Select.ScrollDownArrow`                             |
 *
 * ## Divergences from the shadcn/Radix Select API (all deliberate)
 * 1. **`SelectLabel` maps to Base UI `Select.GroupLabel`, not `Select.Label`.**
 *    Base UI has *two* label parts: `Select.Label` labels the whole control
 *    (like a field `<label>`), while `Select.GroupLabel` is the heading inside a
 *    `Select.Group`. shadcn's `SelectLabel` is the group heading, so it maps to
 *    `GroupLabel`. Base UI's control-level `Select.Label` is intentionally not
 *    re-exported — pair the trigger with the kit's own `Label` component instead.
 *    `Label` is a separate registry item (`registry/items/label.json`) and is
 *    not a `registryDependency` of `select`, so install it explicitly:
 *    `npx shadcn@latest add <registry-url>/r/label.json`.
 *
 *    **Labeling recipe.** Give the `Label` an `id` and the `SelectTrigger` its
 *    own `id`, then set `aria-labelledby="<label-id> <trigger-id>"` on the
 *    trigger (referencing *both*). Pointing only at the external label drops
 *    the chosen value from the accessible name; adding the trigger's own id
 *    folds the `SelectValue` text (the current selection) back in, so a screen
 *    reader announces "<label>, <selected value>". `htmlFor`/`for` can't be
 *    used here — the trigger renders a `<button>`, not a labelable form field —
 *    which is why the association is `aria-labelledby`, not a wrapping/`for`
 *    `<label>`. The Select preview page uses this pattern on every example.
 * 2. **`SelectValue` shows the raw value unless `<Select>` gets an `items` prop.**
 *    Unlike Radix (where `SelectValue` mirrors the selected `SelectItem`'s text),
 *    Base UI's `Select.Value` renders the raw `value` by default. To display a
 *    friendly label, either pass `items` to `<Select>` (Root) — e.g.
 *    `items={[{ value: "apple", label: "Apple" }]}` — or pass a render function
 *    as `SelectValue`'s child: `<SelectValue>{(v) => labels[v]}</SelectValue>`.
 *    This is Base UI's model; the wrapper stays thin and does not paper over it.
 * 3. **No `size` prop on `SelectTrigger`.** Current shadcn ships `sm`/`default`
 *    (h-8/h-9); the kit standardizes on the Fluent medium field height (h-8) to
 *    match `Input`, so there is a single trigger height and no `data-size` hook.
 * 4. **`SelectContent` positions below the trigger (`alignItemWithTrigger=false`).**
 *    Base UI defaults to overlapping the trigger so the selected item's text lines
 *    up with the value (native-select behavior). A shadcn-style dropdown that opens
 *    beneath the field is the expected Fluent flyout, so this is forced off; the
 *    scroll arrows/`data-[side=none]` overlap edge cases go away with it.
 *
 * ## `"use client"` — required (integration-pass correction)
 * Every Base UI Select part module does carry its own `'use client'`
 * directive, so on that basis alone this wrapper could stay server-renderable
 * (same reasoning as `avatar.tsx`). But `CheckmarkRegular`/`ChevronDownRegular`/
 * `ChevronUpRegular` from `@fluentui/react-icons` break that: the package's
 * shared icon-sizing module (`createFluentIcon.styles.js`) calls `@griffel/
 * react`'s `__styles()` at module scope *without* its own `'use client'`
 * directive, even though `__styles` itself is client-only. Rendering any of
 * these icons from a Server Component pulls that module into the server's
 * RSC graph, and `next build` (Turbopack) fails collecting page data with
 * "Attempted to call __styles() from the server but __styles is on the
 * client" — reproduced against `@fluentui/react-icons@2.0.333` /
 * `@griffel/react@1.7.5`, and confirmed to affect every route that shares
 * Turbopack's chunk for these icons, not just this one. `"use client"` here
 * keeps the icon imports inside a client boundary so they're never evaluated
 * on the server. `checkbox.tsx` carries the same fix for the same reason.
 *
 * ## data-slot note
 * `Select` (Root) renders no DOM element of its own and its Base UI props type
 * is strict (no `data-*` passthrough), so it carries no `data-slot`. Every part
 * that renders an element does — `select-trigger`, `select-content`,
 * `select-item`, etc. — which is what tests/consumers hook onto.
 */

function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>
) {
  return <SelectPrimitive.Root {...props} />;
}

function SelectGroup({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn(className)}
      {...props}
    />
  );
}

function SelectValue({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Trigger — Fluent field look, styled to match `Input` (h-8, rounded-md,
 * border-input, px-3, text-sm, flat at rest). Focus uses the sanctioned
 * per-field deviation from conventions §4: a 2px brand underline painted with
 * an inset box-shadow (no reflow) plus `border-primary`, and the `aria-invalid`
 * treatment declared *after* focus so an invalid+focused field shows the
 * destructive accent. The chevron is appended via `Select.Icon`; the trigger's
 * `[&_svg]` rules size it (`size-4`) and mute it (`text-muted-foreground`).
 */
function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        // layout — Fluent medium field, 32px, matches Input. Resting bottom
        // edge uses the darker NeutralStrokeAccessible (#616161) accent while
        // the other sides stay border-input; focus (border-primary + inset
        // underline) and aria-invalid (border-destructive) both override it.
        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input border-b-stroke-accessible bg-background px-3 py-1 text-sm whitespace-nowrap",
        // placeholder text muted (Base UI sets data-placeholder when no value)
        "data-[placeholder]:text-muted-foreground",
        // keep a long value on one line, left-aligned
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:text-left",
        // icon defaults — chevron sized + muted unless overridden
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        // motion — color + box-shadow so the focus accent animates (§4)
        "outline-none transition-[color,box-shadow] duration-fast ease-ease",
        // disabled — opacity read; Base UI emits both `disabled` + `data-disabled`
        "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // focus — Fluent bottom brand accent via inset box-shadow, no reflow (§4)
        "focus-visible:border-primary focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-80)] dark:focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-100)]",
        // invalid — shadcn aria-invalid treatment; after focus so it wins the border
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:focus-visible:shadow-[inset_0_-2px_0_0_var(--destructive)]",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDownRegular />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/**
 * Content — the floating flyout: `Portal` → `Positioner` → `Popup`, with the
 * items in a scrollable `List` between hover-scroll arrows. Surface is
 * `bg-popover` + `border` + `shadow-16` (Fluent flyout elevation, conventions
 * §3.6), `rounded-md`, `min-w` matched to the trigger via Base UI's
 * `--anchor-width`. A subtle scale+fade open/close animation rides Base UI's
 * `data-starting-style`/`data-ending-style` hooks with token durations/easings.
 */
function SelectContent({
  className,
  children,
  sideOffset = 4,
  align = "start",
  side = "bottom",
  ...props
}: ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<
    ComponentProps<typeof SelectPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        sideOffset={sideOffset}
        align={align}
        side={side}
        alignItemWithTrigger={false}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-16 outline-none",
            // motion — subtle scale + fade on open (enter) / close (exit)
            "transition-[transform,opacity] duration-fast ease-decelerate-mid",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List
            data-slot="select-list"
            className="max-h-[var(--available-height)] overflow-y-auto overscroll-contain p-1"
          >
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/**
 * Label — a heading for a `SelectGroup` (Base UI `Select.GroupLabel`), *not* a
 * control-level field label (divergence 1). Small muted caption, Fluent style.
 */
function SelectLabel({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    />
  );
}

/**
 * Item — one option. Text via `ItemText`; the selected-state check
 * (`CheckmarkRegular`) is absolutely positioned on the right (shadcn placement)
 * inside `ItemIndicator`, which Base UI only mounts for the selected item.
 * `rounded-md` (4px) matches Fluent's `Corner-radius/List/Default`. Highlight
 * (keyboard focus or hover) uses `data-highlighted` → `bg-accent`
 * (`#f0f0f0`) `text-accent-foreground`; Fluent's list-hover token is `#f5f5f5`
 * (one grey step lighter), but the kit keeps `--accent` for token consistency
 * with every other hover surface — the difference is imperceptible on a 32px
 * row. Disabled items are muted + inert.
 */
function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // layout — Fluent 32px row, 4px list radius, px-2 with room on the
        // right for the check
        "relative flex h-8 w-full cursor-default items-center rounded-md pr-8 pl-2 text-sm outline-none select-none",
        // highlighted — keyboard focus / hover (Base UI data attribute)
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        // disabled item — muted + non-interactive
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // icons that a consumer puts inside the item text
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckmarkRegular className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-border",
        className
      )}
      {...props}
    />
  );
}

/**
 * ScrollUpButton / ScrollDownButton — Base UI hover-scroll arrows that Base UI
 * only renders when the list overflows in that direction. Rendered as siblings
 * of the `List` inside `SelectContent`, so consumers don't place them manually
 * (shadcn parity — the export exists for API compatibility / manual use).
 */
function SelectScrollUpButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronUpRegular className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronDownRegular className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
