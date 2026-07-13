"use client";

import type { VariantProps } from "class-variance-authority";
import { createContext, useContext } from "react";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

/**
 * SplitButton — Fluent 2-styled, kit-original split button family.
 *
 * A split button is a primary command visually joined to a smaller secondary
 * trigger that opens a menu — Word's "Paste ▾", the Ribbon's "Underline ▾", etc.
 * Clicking the main part runs the default command; clicking the chevron opens a
 * menu of alternatives. This kit item is the anchor for an upcoming Office-style
 * Ribbon, but stands alone.
 *
 * ## Fluent 2 mapping / no shadcn counterpart
 * Maps to Fluent 2's **SplitButton**. There is **no** shadcn/ui or Base UI
 * split-button primitive, so this is a **kit-original composition** designed
 * conservatively within kit idioms — it is nothing but two `buttonVariants`
 * buttons joined at the seam, plus a tiny context so the two parts share the
 * root's `variant`/`size`. It carries no menu behavior of its own: the menu is
 * supplied by composing the chevron with the kit `DropdownMenu` (recipe below),
 * which is why `dropdown-menu` is **not** a dependency of this file.
 *
 * Parts (shadcn-style compound API):
 *
 * | Part                 | Element                | Role                                   |
 * | -------------------- | ---------------------- | -------------------------------------- |
 * | `SplitButton`        | `div` `role="group"`   | `inline-flex isolate` join + context   |
 * | `SplitButtonAction`  | `button`               | the primary command (`rounded-r-none`) |
 * | `SplitButtonTrigger` | `button` (icon-only)   | the chevron secondary (`rounded-l-none`)|
 *
 * `SplitButton` publishes its `variant`/`size` through a file-local context;
 * both parts read it, and either part can still override locally by passing its
 * own `variant`/`size` prop. The axes are exactly `Button`'s (`variant`: default
 * | secondary | outline | ghost | destructive | link; `size`: sm | default |
 * lg). The Trigger maps the shared text size to the matching square icon size
 * (sm→icon-sm, default→icon, lg→icon-lg) so its height always matches the Action.
 *
 * ## The joining divider (token decision)
 * Fluent draws a 1px seam between the two parts. Its color has to read on both
 * filled and outlined surfaces, so it is chosen per variant and pulled into a
 * single hairline with `-ml-px` (collapses the Action's right edge and the
 * Trigger's left edge into one line on bordered variants):
 *
 * - **default** (brand fill): `border-l-brand-60 dark:border-l-brand-90` — a
 *   darker brand line in light, a lighter brand line in dark; both read clearly
 *   against the `bg-primary` fill (brand-80 light / brand-70 dark). This is
 *   Fluent's "darker brand divider" on the primary split button.
 * - **destructive** (red fill): `border-l-destructive-foreground/30` — a subtle
 *   translucent-white seam on the red fill, in both themes.
 * - **secondary / ghost**: `border-l-border` — the neutral `--border` seam.
 * - **outline**: `border-l-input` — matches the part's own `border-input` frame
 *   so the seam is continuous with the outline.
 *
 * All four are token-driven (§3.7 — never a hardcoded color) and validated in
 * light and dark.
 *
 * ## Keyboard model — two tab stops (WAI / Fluent)
 * The Action and the Trigger are **two separate tab stops**, exactly as WAI-ARIA
 * and Fluent 2 specify for split buttons: Tab lands on the Action (Enter/Space
 * runs the command), Tab again lands on the Trigger (Enter/Space/↓ opens the
 * menu). They are two real `<button>`s, so this falls out of native semantics —
 * no roving tabindex, no `role` juggling. `role="group"` on the root just
 * associates the pair for assistive tech.
 *
 * ## Accessibility
 * The Action is an ordinary button (name from its children). The Trigger is
 * icon-only, so it **must** have an accessible name: it defaults to
 * `aria-label="More options"`, which consumers should override with something
 * specific to the command (e.g. `aria-label="Paste options"`). The
 * `aria-haspopup="menu"` / `aria-expanded` state is **not** hardcoded here — it
 * arrives from the `DropdownMenuTrigger` composition (verified in the tests), so
 * a bare `SplitButtonTrigger` (no menu) carries neither, and a composed one
 * carries both.
 *
 * ## Composition recipe (with the kit DropdownMenu)
 * Base UI parts compose via a `render` prop (not shadcn's `asChild`), so the
 * chevron is handed to the menu trigger as `render={<SplitButtonTrigger />}`:
 *
 * ```tsx
 * <DropdownMenu>
 *   <SplitButton variant="default">
 *     <SplitButtonAction onClick={paste}>Paste</SplitButtonAction>
 *     <DropdownMenuTrigger
 *       render={<SplitButtonTrigger aria-label="Paste options" />}
 *     />
 *   </SplitButton>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>Keep Source Formatting</DropdownMenuItem>
 *     <DropdownMenuItem>Merge Formatting</DropdownMenuItem>
 *     <DropdownMenuItem>Keep Text Only</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 *
 * The Action fires its `onClick` independently and never opens the menu; only
 * the chevron does.
 *
 * ## `"use client"` — required
 * This file owns a React context (`createContext`/`useContext`) to share the
 * root's `variant`/`size` with its parts, which is a client-only feature, so the
 * whole file is a client boundary. The chevron glyph is an **inline `<svg>`**
 * (the breadcrumb/pagination precedent), deliberately *not* `@fluentui/react-icons`,
 * so nothing here pulls the icon package's `__styles()`-at-module-scope problem
 * into play (conventions §9).
 */

type SplitButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;
type SplitButtonSize = "sm" | "default" | "lg";

/** Per-variant divider color for the 1px joining seam (see doc comment). */
const dividerByVariant: Record<SplitButtonVariant, string> = {
  default: "border-l-brand-60 dark:border-l-brand-90",
  destructive: "border-l-destructive-foreground/30",
  secondary: "border-l-border",
  outline: "border-l-input",
  ghost: "border-l-border",
  link: "border-l-border",
};

/** The shared text size maps to the matching square icon size on the Trigger. */
const triggerSizeBySize: Record<
  SplitButtonSize,
  NonNullable<VariantProps<typeof buttonVariants>["size"]>
> = {
  sm: "icon-sm",
  default: "icon",
  lg: "icon-lg",
};

type SplitButtonContextValue = {
  variant: SplitButtonVariant;
  size: SplitButtonSize;
};

const SplitButtonContext = createContext<SplitButtonContextValue>({
  variant: "default",
  size: "default",
});

type SplitButtonAxes = {
  variant?: SplitButtonVariant;
  size?: SplitButtonSize;
};

/**
 * SplitButton (root) — the `inline-flex isolate` group that joins the two parts
 * and shares `variant`/`size` with them via context. `isolate` gives the pair
 * its own stacking context so a focused part's ring/seam paints above its
 * neighbor.
 */
function SplitButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<"div"> & SplitButtonAxes) {
  return (
    <SplitButtonContext.Provider value={{ variant, size }}>
      <div
        role="group"
        data-slot="split-button"
        data-variant={variant}
        data-size={size}
        className={cn("isolate inline-flex", className)}
        {...props}
      />
    </SplitButtonContext.Provider>
  );
}

/**
 * SplitButtonAction — the primary command. A normal button, styled through
 * `buttonVariants` with `rounded-r-none` so its right edge is flat against the
 * Trigger. Inherits `variant`/`size` from the root, overridable locally.
 */
function SplitButtonAction({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & SplitButtonAxes) {
  const ctx = useContext(SplitButtonContext);
  const resolvedVariant = variant ?? ctx.variant;
  const resolvedSize = size ?? ctx.size;

  return (
    <button
      {...props}
      data-slot="split-button-action"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
        // join on the right + lift the focus ring above the Trigger
        "relative rounded-r-none focus-visible:z-10",
        className
      )}
    />
  );
}

/**
 * SplitButtonTrigger — the icon-only chevron secondary. Styled through
 * `buttonVariants` at the square icon size for the shared `size`, with
 * `rounded-l-none` and the 1px joining divider (`-ml-px` + a per-variant
 * `border-l` color). Composes as a menu trigger via Base UI's `render` prop:
 * `<DropdownMenuTrigger render={<SplitButtonTrigger />} />` — which is why props
 * are spread *first* here, so the menu's injected behavior (onClick,
 * `aria-haspopup`, `aria-expanded`, id, ref, keyboard handlers) flows through
 * while this part keeps its own identity/presentation attributes.
 *
 * Defaults to a down chevron and `aria-label="More options"`; both are
 * overridable (pass children to replace the glyph, `aria-label` to name it).
 */
function SplitButtonTrigger({
  className,
  variant,
  size,
  children,
  "aria-label": ariaLabel = "More options",
  ...props
}: ComponentProps<"button"> & SplitButtonAxes) {
  const ctx = useContext(SplitButtonContext);
  const resolvedVariant = variant ?? ctx.variant;
  const resolvedSize = size ?? ctx.size;

  return (
    <button
      {...props}
      data-slot="split-button-trigger"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      aria-label={ariaLabel}
      className={cn(
        buttonVariants({
          variant: resolvedVariant,
          size: triggerSizeBySize[resolvedSize],
        }),
        // join on the left, collapse the seam to 1px, lift the focus ring
        "relative -ml-px rounded-l-none border-l focus-visible:z-10",
        // per-variant divider color (reads on filled and outlined surfaces)
        dividerByVariant[resolvedVariant],
        className
      )}
    >
      {children ?? <SplitButtonChevron />}
    </button>
  );
}

/**
 * The default chevron glyph — an inline `<svg>` (breadcrumb/pagination
 * precedent), sized 16px, inheriting `currentColor`. `aria-hidden` so the
 * button's `aria-label` is its only accessible name.
 */
function SplitButtonChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M6 8L10 12L14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { SplitButton, SplitButtonAction, SplitButtonTrigger };
