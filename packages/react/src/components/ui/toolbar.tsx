import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

/**
 * Toolbar — Fluent 2-styled, Base-UI-modeled toolbar part family.
 *
 * Maps to Fluent 2's **Toolbar**: a transparent horizontal (or vertical) bar of
 * related controls — buttons, groups, separators, links, inline inputs. It is
 * the foundation primitive for an Office-style Ribbon, but stands alone as a
 * general-purpose component.
 *
 * ## Base UI mapping (conventions §9)
 * A toolbar's *behavior* — a single tab stop (roving tabindex), arrow-key
 * navigation among its items, composite focus, and wrap-around at the ends — is
 * real focus management that plain markup can't express, so the parts wrap
 * `@base-ui/react/toolbar` (namespace import as `ToolbarPrimitive`, matching
 * the actual `export * as Toolbar from "./index.parts.js"` shape in
 * node_modules — the same pattern `tabs.tsx`/`popover.tsx` use). Base UI owns
 * all of the keyboard behavior; this wrapper never hand-rolls a roving
 * tabindex.
 *
 * | Exported (kit name) | Base UI primitive     | Element |
 * | ------------------- | --------------------- | ------- |
 * | `Toolbar`           | `Toolbar.Root`        | `<div role="toolbar">` |
 * | `ToolbarButton`     | `Toolbar.Button`      | `<button>` |
 * | `ToolbarGroup`      | `Toolbar.Group`       | `<div role="group">` |
 * | `ToolbarSeparator`  | `Toolbar.Separator`   | `<div role="separator">` |
 * | `ToolbarLink`       | `Toolbar.Link`        | `<a>` |
 * | `ToolbarInput`      | `Toolbar.Input`       | `<input>` |
 *
 * ## Divergences from shadcn
 * shadcn/ui has **no** Toolbar component, so there is no shadcn API to match —
 * the part-family surface here is modeled on Base UI's own parts (renamed with
 * the kit's `Toolbar*` PascalCase convention, §11) rather than on Radix. Two
 * things follow from that:
 * 1. **Composition uses Base UI's `render` prop, not Radix `asChild`.** Every
 *    part forwards Base UI's `render` prop (part of `BaseUIComponentProps`), the
 *    same idiom `popover.tsx`/`tooltip.tsx`/`dropdown-menu.tsx` document for
 *    their triggers. To turn a toolbar item into a different element/component —
 *    e.g. render `ToolbarButton` as the kit `Button`, or as a
 *    `DropdownMenuTrigger`/`PopoverTrigger` — pass
 *    `render={<Button variant="outline">…</Button>}`. That is the direct
 *    analogue of shadcn's `<…Trigger asChild><Button/></…Trigger>`. Because
 *    `ToolbarButton` already carries the `buttonVariants` look (below), for pure
 *    styling prefer its own `variant`/`size` props; reach for `render` when you
 *    need to change the underlying element or delegate to another component.
 * 2. **`ToolbarButton` reuses `Button`'s `buttonVariants`.** Its default
 *    appearance is Fluent's *subtle* button (`variant="ghost"` — transparent at
 *    rest, `bg-accent` hover/press via kit tokens), so a bare `<ToolbarButton>`
 *    reads as part of the same button system instead of a bespoke look. The full
 *    `variant`/`size` surface is exposed (same reuse `pagination.tsx` makes), so
 *    `<ToolbarButton variant="default">` gives a brand-filled primary,
 *    `size="icon"` gives a 32px square icon button, etc.
 *
 * ## Accessibility contract (APG Toolbar pattern)
 * - `Toolbar` (Root) renders `role="toolbar"` and `aria-orientation` for free
 *   (Base UI). It is a composite widget with a **single tab stop**: `Tab` moves
 *   into the toolbar and lands on the first item (or the last-focused item);
 *   `ArrowRight`/`ArrowLeft` (and `ArrowUp`/`ArrowDown` when vertical) move focus
 *   between items and wrap around at the ends (`loopFocus`, on by default).
 *   Base UI's Toolbar deliberately does **not** enable `Home`/`End` (those keys
 *   keep their native behavior; the wrap-around covers jumping end-to-end).
 *   `toolbar.test.tsx` proves each of these.
 * - **A toolbar needs an accessible name — the consumer must supply it.** Like
 *   `PopoverContent` (whose `role="dialog"` triggers axe's `aria-dialog-name`
 *   rule), a `role="toolbar"` container has no implicit name, so pass either
 *   `aria-label` (e.g. `aria-label="Text formatting"`) or `aria-labelledby`
 *   pointing at a visible heading. Every example in `toolbar.test.tsx` and the
 *   preview page does this.
 * - Disabled items stay **focusable and reachable** by arrow keys (Base UI's
 *   `focusableWhenDisabled` defaults to `true`, the APG-recommended behavior for
 *   discoverability) — see the `ToolbarButton` disabled note below.
 *
 * ## `"use client"` — intentionally omitted
 * Every Base UI Toolbar part module (`Root`, `Button`, `Group`, `Separator`,
 * `Link`, `Input`) carries its own `'use client'` directive at the source level
 * (verified in the compiled package output, same check `popover.tsx` documents).
 * This wrapper adds no hooks/handlers of its own and — unlike `select.tsx` /
 * `checkbox.tsx` — imports no `@fluentui/react-icons` (the `buttonVariants`
 * import is a pure `cva` helper). So none of the triggers in conventions §2/§9
 * that would force `"use client"` apply, and the file stays a plain,
 * server-renderable module (a Server Component tree can render these Client
 * Component children without re-declaring the directive). Add the directive here
 * only if that stops holding true.
 *
 * ## data-slot / data-orientation notes
 * Every part renders a real DOM element, so every part gets a `data-slot`:
 * `toolbar`, `toolbar-button`, `toolbar-group`, `toolbar-separator`,
 * `toolbar-link`, `toolbar-input`. Base UI already surfaces the toolbar's
 * orientation as `data-orientation="horizontal" | "vertical"` on the root and
 * every item (and, on the separator, the *perpendicular* orientation), which
 * the layout classes below target with the bracketed `data-[orientation=…]:`
 * form (conventions §4).
 */

function Toolbar({
  className,
  ...props
}: ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      className={cn(
        // Fluent 2: a transparent bar of 32px controls with small gaps. Sizes to
        // its content (`w-fit`) so a floating toolbar doesn't stretch; override
        // with `w-full` for an edge-to-edge formatting bar.
        "flex w-fit items-center gap-1",
        // vertical orientation — Base UI emits data-orientation; stack + stretch.
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className
      )}
      {...props}
    />
  );
}

/**
 * ToolbarButton — a toolbar item rendered as Fluent's *subtle* button by
 * default (`variant="ghost"`), reusing `Button`'s `buttonVariants` so its
 * tokens/states stay identical to the kit `Button`. Exposes the full
 * `variant`/`size` surface; compose with another element/component via the
 * `render` prop (see divergence 1 in the file doc comment).
 *
 * Disabled handling: Base UI keeps a disabled toolbar item **focusable**
 * (`focusableWhenDisabled` defaults `true`), so it sets `aria-disabled` +
 * `data-disabled` and does **not** set the native `disabled` attribute — which
 * means `buttonVariants`' `disabled:` opacity would never match. The dimming is
 * re-expressed on `data-[disabled]:` here (the same fix `tabs.tsx` makes for
 * `Tabs.Tab`). Clicks and keyboard activation are still suppressed by Base UI.
 */
function ToolbarButton({
  className,
  variant = "ghost",
  size = "default",
  ...props
}: ComponentProps<typeof ToolbarPrimitive.Button> &
  VariantProps<typeof buttonVariants>) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-button"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant, size }),
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/**
 * ToolbarGroup — clusters related items (e.g. a bold/italic/underline trio)
 * with a tighter gap than the root. Renders `role="group"` (Base UI); a
 * `disabled` prop disables every item inside it.
 */
function ToolbarGroup({
  className,
  ...props
}: ComponentProps<typeof ToolbarPrimitive.Group>) {
  return (
    <ToolbarPrimitive.Group
      data-slot="toolbar-group"
      className={cn(
        "flex items-center gap-0.5",
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className
      )}
      {...props}
    />
  );
}

/**
 * ToolbarSeparator — a 1px `--border` divider between item groups. Base UI's
 * `Toolbar.Separator` renders `role="separator"` with the orientation
 * *perpendicular* to the toolbar, so a horizontal toolbar gets a vertical hair
 * line (inset within the 32px row, with horizontal margin) and a vertical
 * toolbar gets a horizontal one — targeted via `data-[orientation=…]:`.
 */
function ToolbarSeparator({
  className,
  ...props
}: ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={cn(
        "shrink-0 bg-border",
        // vertical hairline (in a horizontal toolbar): 1px wide, inset height.
        "data-[orientation=vertical]:mx-1 data-[orientation=vertical]:h-5 data-[orientation=vertical]:w-px",
        // horizontal hairline (in a vertical toolbar): 1px tall, full width.
        "data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        className
      )}
      {...props}
    />
  );
}

/**
 * ToolbarLink — a toolbar item rendered as an `<a>` that participates in the
 * roving-tabindex sequence. Styled with Fluent's `BrandForegroundLink` ramp,
 * kept in sync with the kit `Link` component (rest `brand-70` → hover
 * `brand-60` → pressed `brand-50` in light; `brand-100`/`110`/`120` in dark) so
 * the two read identically without importing `Link`.
 */
function ToolbarLink({
  className,
  ...props
}: ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      data-slot="toolbar-link"
      className={cn(
        "inline-flex items-center gap-1 rounded-xs text-sm font-normal text-brand-70 underline-offset-4 dark:text-brand-100",
        "outline-none transition-colors duration-fast ease-ease",
        "hover:text-brand-60 hover:underline active:text-brand-50 dark:hover:text-brand-110 dark:active:text-brand-120",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // anchors have no native `disabled`; style off aria-disabled like Link.
        "aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:no-underline",
        className
      )}
      {...props}
    />
  );
}

/**
 * ToolbarInput — a native `<input>` that stays inside the toolbar's keyboard
 * navigation (a font-size box, a search field, etc.). Styled to match the kit
 * `Input`: 32px Fluent field, the darker `--stroke-accessible` resting bottom
 * edge, and the signature no-reflow brand-underline focus accent (inset
 * box-shadow, conventions §4). Disabled is styled on `data-[disabled]:` because
 * — like `ToolbarButton` — Base UI keeps the input focusable-when-disabled and
 * sets `aria-disabled` rather than the native `disabled` attribute.
 */
function ToolbarInput({
  className,
  ...props
}: ComponentProps<typeof ToolbarPrimitive.Input>) {
  return (
    <ToolbarPrimitive.Input
      data-slot="toolbar-input"
      className={cn(
        "flex h-8 min-w-0 rounded-md border border-input border-b-stroke-accessible bg-background px-2.5 text-sm",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "outline-none transition-[color,box-shadow] duration-fast ease-ease",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // focus — Fluent bottom brand accent via inset box-shadow, no reflow.
        "focus-visible:border-primary focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-80)] dark:focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-100)]",
        // invalid — shadcn aria-invalid treatment (after focus so it wins the tie).
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:focus-visible:shadow-[inset_0_-2px_0_0_var(--destructive)]",
        className
      )}
      {...props}
    />
  );
}

export {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
  ToolbarLink,
  ToolbarInput,
};
