"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import {
  CheckmarkRegular,
  ChevronDownRegular,
  DismissRegular,
} from "@fluentui/react-icons";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Combobox — Fluent 2-styled, composable filterable select built on Base UI.
 *
 * This is the REFERENCE for the kit's filter-list family: Multi Select and
 * Command Menu are built by later agents reading THIS file the way the overlay
 * batch read `select.tsx`. Read the divergence notes and extension-point notes
 * below before extending it.
 *
 * It is the typed-into sibling of `Select`: the field is the kit's Input recipe
 * (h-8, `border-input` + `border-b-stroke-accessible`, bottom brand-accent
 * focus) instead of a button trigger, and the flyout is `SelectContent`'s
 * validated popup recipe verbatim (`bg-popover`, `border`, `shadow-16`,
 * `rounded-md`, `min-w-[var(--anchor-width)]`, scale+fade motion on Base UI's
 * `data-starting-style`/`data-ending-style` hooks). Item rows are `SelectItem`'s
 * 32px `data-[highlighted]` rows with the right-side check.
 *
 * ## Why `@base-ui/react/combobox` and NOT `@base-ui/react/autocomplete`
 * Base UI ships BOTH. They share the same AriaCombobox engine but draw the line
 * at *selection*:
 * - **Combobox** has a selection model — `value`/`onValueChange` (the committed
 *   selected value, single or `multiple`) that is SEPARATE from
 *   `inputValue`/`onInputValueChange` (the transient filter text). Picking an
 *   item commits a discrete value; the input filters the list. This is exactly a
 *   "filterable select".
 * - **Autocomplete** is `selectionMode: 'none'` — it deliberately omits
 *   `selectedValue`/`onValueChange`; the input value IS the only state. It's for
 *   free-text-with-suggestions (search boxes), where there is no discrete
 *   committed choice.
 * The whole filter-list family (this, Multi Select, Command Menu) selects
 * discrete items, so it wraps **combobox**. A future free-text search field is
 * the one case that would wrap autocomplete instead.
 *
 * ## Base UI mapping (conventions §9)
 * Namespace import of `@base-ui/react/combobox`, matching the export shape in
 * node_modules (like `select.tsx`/`avatar.tsx`). shadcn-style part names mapped
 * onto Base UI's model:
 *
 * | Exported (kit name) | Base UI primitive                                          |
 * | ------------------- | ---------------------------------------------------------- |
 * | `Combobox`          | `Combobox.Root`                                            |
 * | `ComboboxInput`     | field wrapper + `Combobox.Input` + `Combobox.Clear` + `Combobox.Trigger` (+ `Combobox.Icon`) |
 * | `ComboboxContent`   | `Combobox.Portal` + `Combobox.Positioner` + `Combobox.Popup` |
 * | `ComboboxList`      | `Combobox.List`  ← see divergence 5                        |
 * | `ComboboxEmpty`     | `Combobox.Empty`                                           |
 * | `ComboboxItem`      | `Combobox.Item` (+ `Combobox.ItemIndicator`)              |
 * | `ComboboxGroup`     | `Combobox.Group`                                          |
 * | `ComboboxLabel`     | `Combobox.GroupLabel`  ← see divergence 1                 |
 * | `ComboboxSeparator` | `Combobox.Separator`                                      |
 * | `ComboboxValue`     | `Combobox.Value`  ← see divergence 4                      |
 *
 * ## Divergences vs Base UI naming (all deliberate)
 * 1. **`ComboboxLabel` maps to `Combobox.GroupLabel`, not `Combobox.Label`.**
 *    Base UI has two label parts: `Combobox.Label` labels the whole control (a
 *    field `<label>`), `Combobox.GroupLabel` is the heading inside a
 *    `Combobox.Group`. Like Select, the kit exposes the *group* heading as
 *    `ComboboxLabel` and does NOT re-export the control-level label — pair
 *    `ComboboxInput` with the kit's own `Label` component (a separate registry
 *    item; install it explicitly). Labeling recipe: give `Label` an `id` and set
 *    `aria-labelledby` on the `ComboboxInput` — but unlike Select's button
 *    trigger, the input IS a labelable form field, so a plain `htmlFor`/`id`
 *    pairing works too (the preview uses `htmlFor` + `id`).
 * 2. **`ComboboxInput` is a composed field, not a bare `<input>`.** It renders a
 *    field-chrome wrapper (`data-slot="combobox-input-wrapper"`) around the real
 *    `Combobox.Input` (`data-slot="combobox-input"`), plus a `Combobox.Clear`
 *    reset button (Base UI auto-unmounts it when the field is empty) and a
 *    `Combobox.Trigger` chevron that toggles the popup. This is the sibling of
 *    `SelectTrigger`, which likewise bakes its chevron in. `className`, `ref` and
 *    all other props forward to the inner `<input>`; the wrapper is styled via
 *    `wrapperClassName`. The chevron/clear are `tabIndex={-1}` (not extra tab
 *    stops — the input already owns `role="combobox"` + keyboard control).
 * 3. **No `Combobox.Arrow`, no scroll buttons.** The popup is a flyout beneath
 *    the field (not an anchored caret-overlap like a native `<select>`), so the
 *    positioner arrow and Select's ScrollUp/DownArrow parts are omitted; the
 *    `List` scrolls with `overflow-y-auto`.
 * 4. **`ComboboxValue` renders the raw selected value unless `items` is given.**
 *    Same model as Select's `SelectValue`: `Combobox.Value` shows the raw
 *    `value` unless `<Combobox items={[{ value, label }]}>` is supplied or a
 *    render child is used. It is exported for callers who display the selection
 *    outside the input; the field itself shows the selection as input text (Base
 *    UI fills the input on select), so most single-select UIs never need it.
 * 5. **`ComboboxList` is a separate part (Select auto-wraps its `List`).** Base
 *    UI does the filtering, so the natural API passes `items` to `<Combobox>` and
 *    renders the list with a render-function child:
 *    `<ComboboxList>{(item) => <ComboboxItem value={item}>{item.label}</ComboboxItem>}</ComboboxList>`.
 *    `ComboboxEmpty` is a sibling of `ComboboxList` INSIDE `ComboboxContent` (not
 *    a `List` child) — it mirrors Base UI's own structure and lets the no-match
 *    caption sit at the popup level. Static `ComboboxItem` children also work,
 *    but the built-in filter only runs against the `items` prop, so filtering UIs
 *    should pass `items` + the render-function form. Unlike `SelectContent`
 *    (which owns its `List`), keeping `List` explicit is what makes correct
 *    `Empty` placement and the render-function API possible.
 *
 * ## Divergences vs shadcn's Combobox recipe
 * shadcn has NO Combobox component — its docs "Combobox" is a hand-rolled recipe
 * composing `Popover` + `Command` (cmdk) with local `useState`, `open`, and a
 * manually-wired `CommandInput`/`CommandItem`/`onSelect`. This kit instead ships
 * a real `Combobox*` part family:
 * - **Filtering is built in.** Base UI's `Combobox.Root` filters `List` items
 *   against the input value automatically (`mode="list"` default); the shadcn
 *   recipe leans on cmdk's `Command` to filter. No `cmdk` dependency here.
 * - **One selection model, not two hooks.** shadcn juggles Popover `open` +
 *   Command `value` + an external `value` `useState`. Here `value`/`inputValue`
 *   are one model on the Root — controlled or uncontrolled — exposed honestly.
 * - **Composable parts, not a monolith.** `Combobox`, `ComboboxInput`,
 *   `ComboboxContent`, `ComboboxItem`, … read as the sibling of `Select`, not as
 *   a bespoke Popover+Command assembly the consumer re-wires each time.
 *
 * ## Extension points for Multi Select (do NOT style chips here)
 * `multiple` is passed through UNBLOCKED (`Combobox`'s generic second type param,
 * exactly like `Select`). When `multiple` is set, Base UI:
 * - makes `value`/`onValueChange` arrays;
 * - keeps `Combobox.Clear` clearing to `[]`;
 * - exposes `Combobox.Chips` / `Combobox.Chip` / `Combobox.ChipRemove` for a
 *   token field, and `Combobox.Row` for grid layouts.
 * The Multi Select agent should build its OWN field part (e.g. `MultiSelectInput`
 * / a chips field) that wraps `Combobox.Chips` around `Combobox.Input` inside the
 * same field-chrome wrapper this file uses — it must NOT reuse `ComboboxInput`,
 * which is the single-line surface. This file intentionally leaves chip styling
 * unspecified; the `combobox-input-wrapper` class string is the shared field
 * recipe to copy. Everything else (`ComboboxContent`, `ComboboxItem`,
 * `ComboboxGroup`, `ComboboxLabel`, `ComboboxEmpty`) is reusable as-is.
 *
 * ## `"use client"` — required
 * `@fluentui/react-icons` forces it: the package's shared icon-sizing module
 * (`createFluentIcon.styles.js`) calls `@griffel/react`'s `__styles()` at module
 * scope without its own `'use client'`, so importing an icon into a Server
 * Component makes `next build` (Turbopack) fail collecting page data. Same fix
 * and root cause as `select.tsx`/`checkbox.tsx` (conventions §9). Every Base UI
 * Combobox part module already carries its own `'use client'`.
 *
 * ## data-slot note
 * `Combobox` (Root) renders no DOM element and its Base UI props type is strict
 * (no `data-*` passthrough), so it carries no `data-slot`. Every part that
 * renders an element does (`combobox-input`, `combobox-content`, `combobox-item`,
 * …) — the styling/testing hook consumers rely on.
 */

function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple>
) {
  return <ComboboxPrimitive.Root {...props} />;
}

/**
 * Value — displays the selected value (Base UI `Combobox.Value`). Renders the
 * raw value unless `items` is passed to `<Combobox>` or a render child is used
 * (divergence 4). Exported for showing the selection outside the input; the
 * field itself already reflects the selection as input text.
 */
function ComboboxValue(props: ComponentProps<typeof ComboboxPrimitive.Value>) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

/**
 * Input — the Fluent single-line combobox field (divergence 2). A field-chrome
 * wrapper holds the real `<input>` (transparent, fills the field), a `Clear`
 * reset button (auto-unmounts when empty) and a chevron `Trigger`. The wrapper
 * carries the kit Input recipe: h-8, `rounded-md`, `border-input` +
 * `border-b-stroke-accessible` at rest, and the Fluent bottom brand accent on
 * focus via an inset box-shadow (no reflow) — keyed off `has-[input:focus-visible]`
 * because focus lands on the inner input, not the wrapper. `aria-invalid` on the
 * input swaps the field to destructive, declared after focus so it wins.
 * `className`/`ref`/`...props` forward to the inner `<input>`; style the wrapper
 * with `wrapperClassName`.
 */
function ComboboxInput({
  className,
  wrapperClassName,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Input> & {
  wrapperClassName?: string;
}) {
  return (
    <div
      data-slot="combobox-input-wrapper"
      className={cn(
        // layout — Fluent medium field, 32px, matches Input. Resting bottom edge
        // uses the darker NeutralStrokeAccessible (#616161) accent; the other
        // sides stay border-input. Focus (border-primary + inset underline) and
        // aria-invalid (border-destructive) both override it.
        "flex h-8 w-full items-center rounded-md border border-input border-b-stroke-accessible bg-background text-sm",
        // motion — color + box-shadow so the focus accent animates (§4)
        "transition-[color,box-shadow] duration-fast ease-ease",
        // focus — Fluent bottom brand accent via inset box-shadow, no reflow (§4).
        // has-[input:focus-visible] because focus is on the inner input; text
        // inputs match :focus-visible on pointer focus too, so this covers both.
        "has-[input:focus-visible]:border-primary has-[input:focus-visible]:shadow-[inset_0_-2px_0_0_var(--brand-80)] dark:has-[input:focus-visible]:shadow-[inset_0_-2px_0_0_var(--brand-100)]",
        // invalid — shadcn aria-invalid treatment; after focus so it wins the border
        "has-[input[aria-invalid='true']]:border-destructive has-[input[aria-invalid='true']]:ring-destructive/20 dark:has-[input[aria-invalid='true']]:ring-destructive/40",
        "has-[input[aria-invalid='true']:focus-visible]:shadow-[inset_0_-2px_0_0_var(--destructive)]",
        // disabled — opacity read when the whole control is disabled
        "has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50",
        wrapperClassName
      )}
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent px-3 py-1 outline-none",
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          className
        )}
        {...props}
      />
      <ComboboxPrimitive.Clear
        data-slot="combobox-clear"
        aria-label="Clear"
        tabIndex={-1}
        className={cn(
          "mr-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none",
          "transition-colors duration-fast ease-ease hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "[&_svg]:pointer-events-none [&_svg]:size-4"
        )}
      >
        <DismissRegular />
      </ComboboxPrimitive.Clear>
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        aria-label="Show options"
        tabIndex={-1}
        className={cn(
          "mr-2 flex shrink-0 items-center text-muted-foreground outline-none",
          "[&_svg]:pointer-events-none [&_svg]:size-4"
        )}
      >
        <ComboboxPrimitive.Icon data-slot="combobox-icon">
          <ChevronDownRegular />
        </ComboboxPrimitive.Icon>
      </ComboboxPrimitive.Trigger>
    </div>
  );
}

/**
 * Content — the floating flyout: `Portal` → `Positioner` → `Popup`. Surface is
 * `SelectContent`'s validated recipe verbatim: `bg-popover` + `border` +
 * `shadow-16` (Fluent flyout elevation), `rounded-md`, min-width matched to the
 * field via Base UI's `--anchor-width`, and the scale+fade open/close animation
 * on `data-starting-style`/`data-ending-style` with token durations/easings.
 * `transition-[opacity,scale]` (never transform-based — conventions §3.5).
 * Children are placed directly in the popup: a `ComboboxEmpty` (no-match
 * caption) and a `ComboboxList` (the scroll container). See divergence 5.
 */
function ComboboxContent({
  className,
  children,
  sideOffset = 4,
  align = "start",
  side = "bottom",
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Popup> &
  Pick<
    ComponentProps<typeof ComboboxPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        data-slot="combobox-positioner"
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="z-50 outline-none"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-16 outline-none",
            // motion — subtle scale + fade on open (enter) / close (exit)
            "transition-[opacity,scale] duration-fast ease-decelerate-mid",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/**
 * List — the scrollable options container (Base UI `Combobox.List`, divergence
 * 5). `children` may be a render function `(item, index) => …` (the filtering
 * API: pass `items` to `<Combobox>` and map each) or static `ComboboxItem`
 * children. Scrolls at `overflow-y-auto`; capped at `--available-height` or 20rem.
 */
function ComboboxList({
  className,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.List>) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "max-h-[min(var(--available-height),20rem)] overflow-y-auto overscroll-contain p-1",
        className
      )}
      {...props}
    />
  );
}

/**
 * Empty — the no-match state (Base UI `Combobox.Empty`). Base UI renders its
 * children ONLY when the filtered list is empty, and its root element must stay
 * mounted to announce (it carries `role="presentation"` + a live region), so
 * always place a `<ComboboxEmpty>` in the content rather than conditionally
 * rendering it. Muted, centered caption.
 */
function ComboboxEmpty({
  className,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Empty>) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Item — one option (Base UI `Combobox.Item`, renders a `<div>` with
 * `role="option"`). `value` selects it; the selected-state check
 * (`CheckmarkRegular`) is absolutely positioned on the right inside
 * `ItemIndicator`, which Base UI only mounts for the selected item. 32px row,
 * 4px list radius, highlight (keyboard focus or hover) via `data-highlighted` →
 * `bg-accent`, disabled items muted + inert — the `SelectItem` recipe.
 */
function ComboboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Item>) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        // layout — Fluent 32px row, 4px list radius, room on the right for check
        "relative flex h-8 w-full cursor-default items-center rounded-md pr-8 pl-2 text-sm outline-none select-none",
        // rest text is NeutralForeground2, darkening to accent-foreground on
        // highlight (Figma validation: Fluent list rows rest at #424242)
        "text-foreground-2 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        // disabled item — muted + non-interactive
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // icons a consumer puts inside the item text
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <ComboboxPrimitive.ItemIndicator>
          <CheckmarkRegular className="size-4" />
        </ComboboxPrimitive.ItemIndicator>
      </span>
      {children}
    </ComboboxPrimitive.Item>
  );
}

/**
 * Group — wraps a set of items under a `ComboboxLabel` heading (Base UI
 * `Combobox.Group`). With Base UI's built-in filtering, pass grouped `items` to
 * `<Combobox>` so empty groups drop out automatically; see the preview.
 */
function ComboboxGroup({
  className,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Group>) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Label — a heading for a `ComboboxGroup` (Base UI `Combobox.GroupLabel`), NOT a
 * control-level field label (divergence 1). Small muted caption, Fluent style.
 */
function ComboboxLabel({
  className,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.GroupLabel>) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Separator>) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxValue,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxSeparator,
};
