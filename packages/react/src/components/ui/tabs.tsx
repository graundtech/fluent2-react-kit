"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Tabs — Fluent 2-styled, shadcn-API tabs.
 *
 * ## Base UI mapping (conventions §9)
 * Roving-tabindex focus, arrow-key navigation, and (per divergence 3 below)
 * the sliding active-tab indicator are genuine behavior/layout-measurement
 * that plain markup can't express, so the four parts wrap `@base-ui/react/tabs`
 * (namespace import as `TabsPrimitive`, matching the actual
 * `export * as Tabs from "./index.parts.js"` shape in node_modules — the same
 * pattern `select.tsx`/`radio-group.tsx` use):
 *
 * | Exported (shadcn name) | Base UI primitive     |
 * | ----------------------- | --------------------- |
 * | `Tabs`                  | `Tabs.Root`            |
 * | `TabsList`               | `Tabs.List` (+ `Tabs.Indicator` appended) |
 * | `TabsTrigger`            | `Tabs.Tab`              |
 * | `TabsContent`            | `Tabs.Panel`            |
 *
 * `"use client"` is required here — unlike `radio-group.tsx`, this wrapper
 * itself needs it, not just the primitive parts. `Tabs.Indicator` measures the
 * active tab's DOM layout (`getBoundingClientRect`/`offsetLeft`) inside a
 * `React.useEffect` to drive the sliding-underline CSS vars (divergence 3), so
 * the component genuinely participates in client-side behavior beyond just
 * rendering a client-boundary child — matching the reasoning that already
 * governs `select.tsx`/`checkbox.tsx` for a different trigger (icons there;
 * layout measurement here).
 *
 * ## Divergences from the shadcn/Radix Tabs API (all deliberate)
 * 1. **`TabsList` is a transparent underline bar, not a muted pill.** shadcn's
 *    reference `TabsList` is a segmented control: `bg-muted` rounded box with
 *    each `TabsTrigger` becoming a filled `bg-background` pill when active.
 *    Fluent 2's `TabList` has no pill — it's a transparent row of labels over a
 *    hairline `border-b`, with a 2px brand bar that slides under the active
 *    label. This implementation follows Fluent, not shadcn's segmented look:
 *    `TabsList` carries `border-b border-border` (the resting hairline) and no
 *    background; `TabsTrigger` is unstyled at rest beyond text color (muted →
 *    foreground on hover, foreground + semibold when active via
 *    `data-[active]:`), never a filled pill.
 * 2. **Active state uses Base UI's `data-active`, not shadcn's `data-state`
 *    value pair.** Radix's `Tabs.Trigger` exposes `data-state="active"|
 *    "inactive"`; Base UI's `Tabs.Tab` instead exposes `data-active` as a plain
 *    presence attribute (see `TabsTabDataAttributes` in node_modules — boolean
 *    presence, not a value pair, the same model `radio-group.tsx`'s
 *    `data-checked` uses). Styled here via the bracketed
 *    `data-[active]:` form per conventions §4.
 * 3. **The sliding indicator uses `Tabs.Indicator`'s CSS-var position API**
 *    (`--active-tab-left`/`--active-tab-width`, from `TabsIndicatorCssVars` in
 *    node_modules), not a custom `ref`-measured span. `Tabs.Indicator` renders
 *    a `<span>` inside `TabsList` with those vars set as inline custom
 *    properties (re-measured via a `ResizeObserver`-backed listener whenever
 *    the active tab or list layout changes) and `hidden` until a non-zero size
 *    is available. This wrapper positions the span with
 *    `left-[var(--active-tab-left)] w-[var(--active-tab-width)]` and animates
 *    moves with `transition-[left,width] duration-normal ease-ease` — the
 *    Fluent sliding-underline motion, confirmed working. **jsdom caveat:**
 *    jsdom has no layout engine, so `offsetWidth`/`getBoundingClientRect` are
 *    always `0`; `Tabs.Indicator` treats that as "not yet measured" and stays
 *    `hidden`, so the indicator element exists in the test DOM
 *    (`data-slot="tabs-indicator"`) but the sliding motion itself is only
 *    observable in a real browser (see the Select/Dialog popup-motion note in
 *    conventions §3.5 for the same class of jsdom limitation applied to
 *    motion). The component test asserts the indicator renders and tracks
 *    `data-activation-direction`, not the pixel position.
 * 4. **Default activation is manual (Enter/Space), not automatic-on-arrow.**
 *    Radix/shadcn Tabs activates on arrow-key focus move (`automatic`). Base
 *    UI's `Tabs.List` defaults `activateOnFocus` to `false` — the
 *    WAI-ARIA-recommended "manual activation" pattern: arrow keys move focus
 *    among tabs, and the focused tab is only selected on `Enter`/`Space` (or
 *    click). This wrapper does not override that default, so the kit ships
 *    Base UI's more accessible default rather than papering over it to match
 *    Radix bit-for-bit; callers who want automatic activation can pass
 *    `activateOnFocus` to `TabsList` themselves (it's forwarded straight
 *    through as an ordinary prop).
 *
 * ## data-slot note
 * Every part renders a real DOM element, so every part gets a `data-slot`:
 * `tabs`, `tabs-list`, `tabs-indicator`, `tabs-trigger`, `tabs-content`.
 */

function Tabs({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

/**
 * List — transparent row of tab labels over a hairline bottom border, with
 * the brand sliding indicator (divergence 3) appended as the last child so it
 * paints above the hairline.
 */
function TabsList({
  className,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex items-center gap-1 border-b border-border",
        className
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="absolute bottom-0 left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)] bg-primary transition-[left,width] duration-normal ease-ease"
      />
    </TabsPrimitive.List>
  );
}

/**
 * Trigger — muted label at rest, brand-adjacent foreground + semibold when
 * active (divergence 2: `data-[active]:`, not shadcn's filled pill). Focus
 * uses the generic offset-ring recipe (conventions §4) — a tab is a
 * selectable control, not a typed-into field, so it doesn't get the bottom
 * brand-accent treatment `Input`/`Select` use.
 */
function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // layout
        "cursor-pointer px-3 py-2 text-sm font-medium whitespace-nowrap select-none",
        // motion
        "outline-none transition-colors duration-fast ease-ease",
        // rest / hover — muted until active
        "text-muted-foreground hover:text-foreground",
        // active — Fluent foreground + semibold (divergence 2)
        "data-[active]:text-foreground data-[active]:font-semibold",
        // focus — generic offset-ring recipe (conventions §4)
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // disabled — opacity-based (conventions §4). Unlike `SelectTrigger`,
        // Base UI's `Tabs.Tab` never sets the native `disabled` attribute —
        // it stays a focusable `<button>` per the WAI-ARIA "disabled but
        // reachable" tab pattern and only exposes `aria-disabled`/
        // `data-disabled` (see `TabsTab.js`), so this is `data-[disabled]:`
        // only; a plain `disabled:` selector would never match.
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Content — the panel shown for the active tab. Base UI's `Tabs.Panel`
 * unmounts inactive panels from the accessibility tree (`hidden`) and only
 * the active one is focusable/rendered visible, so this wrapper is just
 * spacing + a focus ring for when a panel itself receives focus (e.g. no
 * focusable content inside it).
 */
function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "pt-4 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
