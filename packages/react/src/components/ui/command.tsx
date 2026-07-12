"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { SearchRegular } from "@fluentui/react-icons";
import type { ComponentProps, ReactElement, ReactNode } from "react";

import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

/**
 * Command — Fluent 2-styled, shadcn-API command palette (cmdk surface) built on
 * Base UI, with NO `cmdk` dependency.
 *
 * A command palette is an ALWAYS-VISIBLE filtered list whose items fire actions
 * (open a file, run a command) rather than persist a selection. That single
 * requirement drives the architecture decision below.
 *
 * ## Why `@base-ui/react/autocomplete` and NOT `@base-ui/react/combobox`
 * `combobox.tsx` (the filter-list family reference) documents the boundary: Base
 * UI's Combobox and Autocomplete share one `AriaCombobox` engine but differ on
 * *selection*. Command items **perform actions — they don't hold a value** — which
 * points squarely at Autocomplete, and two Autocomplete-only capabilities make it
 * the honest, least-fought fit (verified against `@base-ui/react@1.6.0` in
 * node_modules before committing):
 *
 * 1. **`selectionMode: 'none'`.** `Autocomplete.Root` is hard-wired to `'none'`
 *    (it Omits `selectedValue`/`onValueChange`/`isItemEqualToValue`/… from its
 *    props). There is no committed selection and no check indicator — exactly a
 *    command list. A Combobox would force a value model we'd have to fight.
 * 2. **`inline` + `open` = a statically-open list with no popup.**
 *    `Autocomplete.Root` exposes `inline`: *"Whether the list is rendered inline
 *    without using the component's own popup. Specify `open` unconditionally in
 *    conjunction with this prop so the list is considered visible."* This is the
 *    always-visible palette panel — `Autocomplete.List` renders directly, with no
 *    `Portal`/`Positioner`/`Popup` and no floating-ui positioning to stub. Combobox
 *    has the same `inline` flag (shared engine), but its selection model is dead
 *    weight here, so Autocomplete is the cleaner primitive.
 *
 * Filtering rides the engine's built-in text filter (`mode="list"`, the default):
 * pass `items` to `<Command>` and render the list with a render-function child,
 * exactly like `Combobox` (the built-in filter runs against the `items` prop). A
 * manual filtered-list fallback was NOT needed — the primitive supports the
 * inline-open + per-item `onClick` model natively.
 *
 * Keyboard is fully wired by the engine over the inline list: ArrowUp/Down roving
 * highlight (`data-highlighted`), Home/End to the ends, and Enter fires the
 * highlighted item — because `Autocomplete.Item.onClick` *"fires when clicking the
 * item with the pointer, as well as when pressing Enter with the keyboard if the
 * item is highlighted when the Input or List element has focus."* That is this
 * kit's `CommandItem` action handler.
 *
 * ## Base UI mapping (conventions §9)
 * Namespace import of `@base-ui/react/autocomplete` (matching the export shape in
 * node_modules, like `select.tsx`/`combobox.tsx`). shadcn/cmdk part names mapped
 * onto Base UI's model:
 *
 * | Exported (cmdk name) | Base UI primitive                                       |
 * | -------------------- | ------------------------------------------------------- |
 * | `Command`            | `Autocomplete.Root` (`inline open`) + panel `<div>`     |
 * | `CommandInput`       | search-row `<div>` + `SearchRegular` + `Autocomplete.Input` |
 * | `CommandList`        | `Autocomplete.List` (the scroll container)              |
 * | `CommandEmpty`       | `Autocomplete.Empty`                                    |
 * | `CommandGroup`       | `Autocomplete.Group` (+ `Autocomplete.GroupLabel` heading) |
 * | `CommandItem`        | `Autocomplete.Item`                                     |
 * | `CommandSeparator`   | `Autocomplete.Separator`                                |
 * | `CommandShortcut`    | plain `<span>` (cmdk parity — no Base UI part)          |
 * | `CommandDialog`      | kit `Dialog` + `DialogContent` wrapping a `Command`     |
 *
 * ## Divergences vs cmdk / shadcn's Command (all deliberate)
 * 1. **Items fire `onClick`, not `onSelect`.** cmdk's `CommandItem` has an
 *    `onSelect(value)` callback; Base UI's `Autocomplete.Item` exposes a native
 *    `onClick` that fires on pointer-click AND Enter-when-highlighted (same effect,
 *    honest primitive prop). No synthetic `onSelect`/`value`-string is faked.
 * 2. **Filtering keys off the `items` prop, not item DOM text.** cmdk filters by
 *    scoring each item's rendered text; Base UI filters the `items` array with its
 *    built-in filter. So a *filtering* palette passes `items` + the render-function
 *    `CommandList` child (like `Combobox`). Static `CommandItem` children still
 *    render, but only the `items` prop is filtered.
 * 3. **`CommandGroup` takes a `heading` prop** (rendered via
 *    `Autocomplete.GroupLabel`), matching shadcn's `<CommandGroup heading="…">`
 *    ergonomics. Base UI's control-level label is not exposed (there is none for a
 *    palette).
 * 4. **`Command` renders the panel element; `Autocomplete.Root` renders none.**
 *    Root is a headless provider, so `Command` wraps a `data-slot="command"` panel
 *    `<div>` inside it. Standalone it carries `border`; `CommandDialog` drops the
 *    border (the Dialog surface owns the elevation).
 * 5. **`CommandEmpty` is a SIBLING of `CommandList`, not a child.** cmdk nests
 *    `CommandEmpty` inside `CommandList`; Base UI's `Autocomplete.List` takes
 *    EITHER a render-function child OR nodes (never a mix), and `Autocomplete.Empty`
 *    is a peer of the list (same as `combobox.tsx`). So place `<CommandEmpty>` next
 *    to `<CommandList>` inside `<Command>`, and give `CommandList` only the
 *    render-function child.
 * 6. **`CommandDialog` accepts a `trigger` element** (forwarded to the kit
 *    `DialogTrigger`'s `render` prop) so an uncontrolled palette works without a
 *    client handler — cmdk's `CommandDialog` is controlled-only. Pass `open`/
 *    `onOpenChange` for the controlled path instead. The `DialogTitle`/
 *    `DialogDescription` are present but `sr-only` (Dialog requires an accessible
 *    name; the palette shows no visible heading).
 *
 * ## `"use client"` — required
 * Two reasons, same as `combobox.tsx`: every Base UI Autocomplete part module
 * carries its own `'use client'` (they manage client state), and — decisively —
 * `SearchRegular` from `@fluentui/react-icons` must stay inside a client boundary
 * (its shared icon-sizing module calls `@griffel/react`'s client-only `__styles()`
 * at module scope without a directive, breaking `next build` from an RSC). See
 * conventions §9; `select.tsx`/`checkbox.tsx` are the precedents.
 *
 * ## data-slot note
 * `Autocomplete.Root` renders no DOM element and its props type is strict (no
 * `data-*` passthrough), so it carries no `data-slot`; the `Command` panel `<div>`
 * this file adds does. Every part that renders an element does.
 */

/**
 * Root props, narrowed to a FLAT `items` array (grouping is done with static
 * `CommandGroup` children, not the grouped-items form). Narrowing also sidesteps
 * `Autocomplete.Root`'s two-overload signature, which a spread of the union
 * `items` type can't resolve against.
 */
type CommandProps<ItemValue> = Omit<
  AutocompletePrimitive.Root.Props<ItemValue>,
  "items"
> & {
  items?: readonly ItemValue[];
  className?: string;
};

function Command<ItemValue>({
  className,
  children,
  inline = true,
  open = true,
  ...props
}: CommandProps<ItemValue>) {
  return (
    <AutocompletePrimitive.Root inline={inline} open={open} {...props}>
      <div
        data-slot="command"
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground",
          className
        )}
      >
        {children}
      </div>
    </AutocompletePrimitive.Root>
  );
}

/**
 * Input — the palette search row (cmdk style): a leading `SearchRegular` icon and
 * a borderless, full-width `Autocomplete.Input` sitting above a `border-b`
 * separator. The input is transparent with no field-chrome (the panel is the
 * surface). `className`/`ref`/`...props` forward to the inner `<input>`; style the
 * row with `wrapperClassName`.
 */
function CommandInput({
  className,
  wrapperClassName,
  "aria-expanded": ariaExpanded = true,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.Input> & {
  wrapperClassName?: string;
}) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={cn(
        "flex h-11 items-center gap-2 border-b px-3",
        wrapperClassName
      )}
    >
      <SearchRegular className="size-4 shrink-0 text-muted-foreground" />
      <AutocompletePrimitive.Input
        data-slot="command-input"
        // The list is always visible (inline open), so the combobox input is
        // permanently expanded. Base UI omits `aria-expanded` in inline mode, so
        // set it here to satisfy the WAI-ARIA combobox contract.
        aria-expanded={ariaExpanded}
        className={cn(
          "flex h-full w-full min-w-0 bg-transparent py-3 text-sm outline-none",
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

/**
 * List — the scrollable items container (Base UI `Autocomplete.List`). `children`
 * may be a render function `(item, index) => …` (the filtering API: pass `items`
 * to `<Command>` and map each) or static `CommandItem` children. Scrolls at
 * `overflow-y-auto`, capped at ~300px like cmdk.
 */
function CommandList({
  className,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.List>) {
  return (
    <AutocompletePrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] overflow-x-hidden overflow-y-auto overscroll-contain p-1",
        className
      )}
      {...props}
    />
  );
}

/**
 * Empty — the no-results state (Base UI `Autocomplete.Empty`). Base UI renders
 * its children only when the filtered list is empty and keeps its root mounted to
 * announce, so always place a `<CommandEmpty>` in the list rather than
 * conditionally rendering it. Muted, centered caption.
 */
function CommandEmpty({
  className,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.Empty>) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Group — a labelled set of items (Base UI `Autocomplete.Group`). Pass a
 * `heading` for the muted caption (rendered via `Autocomplete.GroupLabel`),
 * matching shadcn's `<CommandGroup heading="…">`. With built-in filtering, pass
 * grouped `items` to `<Command>` so empty groups drop out automatically.
 */
function CommandGroup({
  className,
  heading,
  children,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.Group> & {
  heading?: ReactNode;
}) {
  return (
    <AutocompletePrimitive.Group
      data-slot="command-group"
      className={cn("overflow-hidden p-1 text-foreground", className)}
      {...props}
    >
      {heading != null && (
        <AutocompletePrimitive.GroupLabel
          data-slot="command-group-heading"
          // Fluent Menu section header — Caption 1 Stronger (12px bold) in
          // NeutralForeground2, matching DropdownMenuLabel's pass-2 fix
          // (Figma validation pass 3 caught this as an intra-kit drift).
          className="px-2 py-1.5 text-xs font-bold text-foreground-2 select-none"
        >
          {heading}
        </AutocompletePrimitive.GroupLabel>
      )}
      {children}
    </AutocompletePrimitive.Group>
  );
}

/**
 * Item — one command (Base UI `Autocomplete.Item`, a `<div role="option">`). Its
 * `onClick` is the action handler: it fires on pointer-click AND on Enter when the
 * item is highlighted (divergence 1). 32px row, 4px list radius, keyboard/hover
 * highlight via `data-highlighted` → `bg-accent`, disabled items muted + inert.
 */
function CommandItem({
  className,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.Item>) {
  return (
    <AutocompletePrimitive.Item
      data-slot="command-item"
      className={cn(
        // layout — Fluent 32px row, 4px list radius, gap for a leading icon
        "relative flex h-8 w-full cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none",
        // highlighted — keyboard focus / hover (Base UI data attribute)
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        // disabled item — muted + non-interactive
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // icons a consumer puts inside the item
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

/**
 * Separator — a thin rule between groups (Base UI `Autocomplete.Separator`).
 */
function CommandSeparator({
  className,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.Separator>) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="command-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/**
 * Shortcut — a right-aligned keyboard-hint caption inside a `CommandItem` (cmdk
 * parity; no Base UI part). `ml-auto` pushes it to the trailing edge.
 */
function CommandShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

/**
 * Dialog — the palette in a modal (Base UI/kit `Dialog`). Composes the kit
 * `Dialog` + `DialogContent` (`p-0 overflow-hidden`, no ✕) around a borderless
 * `Command`. A `trigger` element opens it uncontrolled (forwarded to
 * `DialogTrigger`'s `render`); pass `open`/`onOpenChange` for the controlled path
 * (divergence 6). `title`/`description` are present for a11y but visually hidden.
 */
function CommandDialog<ItemValue>({
  title = "Command Palette",
  description = "Search for a command to run…",
  trigger,
  className,
  children,
  // Dialog-level state. Both `Dialog` and `Autocomplete.Root` own `open`/
  // `defaultOpen`/`onOpenChange`; here they mean the DIALOG. They are pulled out
  // so they never reach the inner `Command`, whose list stays always-open inline.
  open,
  defaultOpen,
  onOpenChange,
  modal,
  ...commandProps
}: Omit<CommandProps<ItemValue>, "open" | "defaultOpen" | "onOpenChange"> & {
  title?: string;
  description?: string;
  trigger?: ReactElement;
  open?: ComponentProps<typeof Dialog>["open"];
  defaultOpen?: ComponentProps<typeof Dialog>["defaultOpen"];
  onOpenChange?: ComponentProps<typeof Dialog>["onOpenChange"];
  modal?: ComponentProps<typeof Dialog>["modal"];
}) {
  return (
    <Dialog
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      {trigger != null && <DialogTrigger render={trigger} />}
      <DialogContent
        showCloseButton={false}
        className={cn("overflow-hidden p-0", className)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-xl border-0" {...commandProps}>
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
};
