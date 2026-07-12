"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckmarkRegular, ChevronRightRegular } from "@fluentui/react-icons";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * DropdownMenu — Fluent 2-styled, shadcn-API dropdown menu.
 *
 * Second overlay component in the kit, so it deliberately reuses every pattern
 * `select.tsx` established (portal + positioner + popup surface, `shadow-16`
 * flyout elevation, 32px `data-highlighted` item rows, scale+fade motion via
 * `data-starting-style`/`data-ending-style`). Its popup surface and item rows
 * are visually identical to Select's — same tokens, same radii.
 *
 * ## Base UI mapping (conventions §9)
 * Behavior — focus management, portalling, open/close state, roving tabindex,
 * type-ahead, collision-aware positioning, submenu orchestration — genuinely
 * needs a primitive, so the parts wrap `@base-ui/react/menu` (namespace import,
 * matching the actual export shape in node_modules, exactly like `select.tsx`).
 * shadcn part names are mapped onto Base UI's model:
 *
 * | Exported (shadcn name)     | Base UI primitive                                      |
 * | -------------------------- | ------------------------------------------------------ |
 * | `DropdownMenu`             | `Menu.Root`                                            |
 * | `DropdownMenuTrigger`      | `Menu.Trigger`                                         |
 * | `DropdownMenuContent`      | `Menu.Portal` + `Menu.Positioner` + `Menu.Popup`      |
 * | `DropdownMenuGroup`        | `Menu.Group`                                           |
 * | `DropdownMenuLabel`        | `Menu.GroupLabel`  ← see divergence 1                  |
 * | `DropdownMenuItem`         | `Menu.Item`                                            |
 * | `DropdownMenuCheckboxItem` | `Menu.CheckboxItem` (+ `Menu.CheckboxItemIndicator`)  |
 * | `DropdownMenuRadioGroup`   | `Menu.RadioGroup`                                     |
 * | `DropdownMenuRadioItem`    | `Menu.RadioItem` (+ `Menu.RadioItemIndicator`)        |
 * | `DropdownMenuSeparator`    | `Menu.Separator`                                      |
 * | `DropdownMenuShortcut`     | plain `<span>` (no Base UI part) ← see divergence 4    |
 * | `DropdownMenuSub`          | `Menu.SubmenuRoot`  ← see divergence 2                 |
 * | `DropdownMenuSubTrigger`   | `Menu.SubmenuTrigger` (+ `ChevronRightRegular`)       |
 * | `DropdownMenuSubContent`   | `Menu.Portal` + `Menu.Positioner` + `Menu.Popup`      |
 *
 * ## Divergences from the shadcn/Radix DropdownMenu API (all deliberate)
 * 1. **`DropdownMenuLabel` maps to Base UI `Menu.GroupLabel`.** Like `select.tsx`,
 *    the label part is the heading *inside* a `DropdownMenuGroup` (Base UI
 *    associates it with the group for screen readers). It is styled to match
 *    `SelectLabel` (muted `text-xs` caption) rather than shadcn's darker
 *    `text-sm`, keeping every group heading in the kit visually consistent. It
 *    still honours shadcn's `inset` prop (`data-[inset]:pl-8`).
 * 2. **`DropdownMenuSub` is Base UI `Menu.SubmenuRoot`, not a Radix `Sub`.** Base
 *    UI models a submenu as its own nested root; `DropdownMenuSubContent`
 *    therefore re-composes `Portal` → `Positioner` → `Popup` (Radix's
 *    `SubContent` is a single part). Submenus open to the side and Base UI
 *    positions them collision-aware; the trigger stays highlighted while its
 *    submenu is open via `data-[popup-open]`.
 * 3. **Composition uses Base UI's `render` prop, not `asChild`.** shadcn's
 *    `<DropdownMenuTrigger asChild>` has no analogue here — Base UI parts take a
 *    `render` prop for polymorphism. To use the kit `Button` as the trigger,
 *    pass `render={<Button>…</Button>}`. The wrapper forwards `render` straight
 *    through, so the honest Base UI model is preserved (same reasoning as
 *    `select.tsx` keeping `SelectValue`'s render-function child).
 * 4. **`DropdownMenuShortcut` is a plain `<span>`** (shadcn parity — it is not a
 *    Base UI part, just a right-aligned muted caption for a keyboard hint).
 * 5. **`DropdownMenuItem` keeps shadcn's `inset` + `variant` props.** `variant`
 *    is surfaced as `data-variant` (mirrors `Button`'s `data-variant` hook); the
 *    `"destructive"` value tints the row and its icons with the `destructive`
 *    token (never a hardcoded red), and its highlight uses `destructive/10`
 *    (`/20` in dark) so the destructive intent survives the hover state.
 *
 * ## `"use client"` — required (same root cause as `select.tsx`)
 * Every Base UI Menu part module carries its own `'use client'`, so on that
 * basis this wrapper could stay server-renderable. But `CheckmarkRegular` /
 * `ChevronRightRegular` from `@fluentui/react-icons` force the directive: the
 * package's shared icon-sizing module (`createFluentIcon.styles.js`) calls
 * `@griffel/react`'s `__styles()` at module scope *without* its own
 * `'use client'`, even though `__styles` is client-only. Rendering any of these
 * icons from a Server Component pulls that module into the server's RSC graph,
 * and `next build` (Turbopack) fails collecting page data with "Attempted to
 * call __styles() from the server but __styles is on the client" — reproduced
 * against `@fluentui/react-icons@2.0.333` / `@griffel/react@1.7.5`, and it
 * poisons every route sharing Turbopack's chunk for those icons. `"use client"`
 * here keeps the icon imports inside a client boundary. `select.tsx` and
 * `checkbox.tsx` carry the same fix (their doc comments explain it inline).
 *
 * ## data-slot note
 * `DropdownMenu` (Root) and `DropdownMenuSub` (SubmenuRoot) render no DOM element
 * of their own, so they carry no `data-slot`. Every part that renders an element
 * does — `dropdown-menu-trigger`, `dropdown-menu-content`, `dropdown-menu-item`,
 * etc. — which is what tests/consumers hook onto.
 */

function DropdownMenu<Payload>(props: MenuPrimitive.Root.Props<Payload>) {
  return <MenuPrimitive.Root {...props} />;
}

function DropdownMenuTrigger({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

function DropdownMenuGroup({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Group>) {
  return (
    <MenuPrimitive.Group
      data-slot="dropdown-menu-group"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Content — the floating flyout: `Portal` → `Positioner` → `Popup`. Surface is
 * `bg-popover` + `border` + `shadow-16` (Fluent flyout elevation, conventions
 * §3.6), `rounded-md`, `min-w-[8rem]` (menus size to content, unlike Select
 * which matches the anchor width). A subtle scale+fade open/close animation
 * rides Base UI's `data-starting-style`/`data-ending-style` hooks with token
 * durations/easings — the exact lines from `SelectContent`.
 */
function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  side = "bottom",
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<
    ComponentProps<typeof MenuPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        data-slot="dropdown-menu-positioner"
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-[8rem] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-16 outline-none",
            "max-h-[var(--available-height)]",
            // motion — subtle scale + fade on open (enter) / close (exit)
            "transition-[transform,opacity] duration-fast ease-decelerate-mid",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/**
 * Label — a heading for a `DropdownMenuGroup` (Base UI `Menu.GroupLabel`, see
 * divergence 1). Small muted caption, matched to `SelectLabel`. `inset` shifts
 * it to line up with items that carry a leading indicator.
 */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<typeof MenuPrimitive.GroupLabel> & { inset?: boolean }) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset || undefined}
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground select-none",
        "data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  );
}

/**
 * Item — one command row. 32px tall (`h-8`) with the Fluent 4px list radius,
 * matching `SelectItem`. Highlight (keyboard focus or hover) rides Base UI's
 * `data-highlighted` → `bg-accent`/`text-accent-foreground`. `inset` adds the
 * leading gutter used by checkbox/radio rows; `variant="destructive"` tints the
 * text/icons with the `destructive` token and gives the highlight a destructive
 * wash. Icons follow `SelectItem`'s size-only rules (no muting).
 */
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={cn(
        // layout — Fluent 32px row, 4px list radius
        "relative flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none",
        // highlighted — keyboard focus / hover (Base UI data attribute)
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        // disabled item — muted + non-interactive
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // inset — leading gutter to align with indicator rows
        "data-[inset]:pl-8",
        // destructive variant — token-tinted text, icons, and highlight wash
        "data-[variant=destructive]:text-destructive",
        "data-[variant=destructive]:data-[highlighted]:bg-destructive/10 data-[variant=destructive]:data-[highlighted]:text-destructive dark:data-[variant=destructive]:data-[highlighted]:bg-destructive/20",
        "data-[variant=destructive]:[&_svg:not([class*='text-'])]:text-destructive",
        // icons — size only (matches SelectItem)
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

/**
 * CheckboxItem — a toggleable row. The check (`CheckmarkRegular`) sits in a
 * left gutter (`pl-8`), inside `Menu.CheckboxItemIndicator`, which Base UI only
 * mounts while checked. Base UI keeps the menu open on toggle (its
 * `closeOnClick` defaults to `false` for checkbox items).
 */
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(
        "relative flex h-8 cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckmarkRegular className="size-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioGroup>) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * RadioItem — one option in a `DropdownMenuRadioGroup`. The selected marker is a
 * small filled circle (an inline `<svg>` using `fill-current`, so it inherits
 * the row's text color and needs no extra icon import — same rationale as the
 * kit `RadioGroup` dot). `Menu.RadioItemIndicator` only mounts while selected.
 */
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex h-8 cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <svg viewBox="0 0 8 8" className="size-2 fill-current" aria-hidden>
            <circle cx="4" cy="4" r="4" />
          </svg>
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/**
 * Shortcut — a right-aligned keyboard hint caption. Plain `<span>` (divergence
 * 4), shadcn parity: `ml-auto text-xs tracking-widest text-muted-foreground`.
 */
function DropdownMenuShortcut({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

/**
 * SubTrigger — an item that opens a submenu, with a trailing `ChevronRightRegular`.
 * Same row treatment as `DropdownMenuItem`; stays highlighted while its submenu
 * is open via Base UI's `data-[popup-open]`. Honours `inset`.
 */
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & { inset?: boolean }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      className={cn(
        "relative flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[inset]:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightRegular className="ml-auto size-4 text-muted-foreground" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

/**
 * SubContent — a submenu's floating surface. Same `Portal` → `Positioner` →
 * `Popup` composition and surface as `DropdownMenuContent`, but defaults to
 * opening on the inline-end side (Base UI still flips it collision-aware).
 */
function DropdownMenuSubContent({
  className,
  sideOffset = 4,
  align = "start",
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<
    ComponentProps<typeof MenuPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        data-slot="dropdown-menu-sub-positioner"
        sideOffset={sideOffset}
        align={align}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-sub-content"
          className={cn(
            "min-w-[8rem] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-16 outline-none",
            "max-h-[var(--available-height)]",
            "transition-[transform,opacity] duration-fast ease-decelerate-mid",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
