"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { DismissRegular } from "@fluentui/react-icons";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Dialog — Fluent 2-styled, shadcn-API modal dialog.
 *
 * Follows the overlay patterns set by `select.tsx` (portal → popup surface,
 * `data-starting-style`/`data-ending-style` motion with token durations and
 * easings) with dialog-specific elevation: `shadow-64` + `rounded-xl`
 * (conventions §3.4/§3.6 — dialogs are the kit's highest floating surface).
 *
 * ## Base UI mapping (conventions §9)
 * Behavior — focus trapping, portalling, open/close state, scroll locking,
 * outside-press and Escape dismissal — genuinely needs a primitive, so the
 * parts wrap `@base-ui/react/dialog` (namespace import, matching the actual
 * export shape in node_modules, exactly like `select.tsx`). shadcn part names
 * are mapped onto Base UI's model:
 *
 * | Exported (shadcn name) | Base UI primitive                                   |
 * | ---------------------- | --------------------------------------------------- |
 * | `Dialog`               | `Dialog.Root`                                       |
 * | `DialogTrigger`        | `Dialog.Trigger`                                    |
 * | `DialogPortal`         | `Dialog.Portal`                                     |
 * | `DialogOverlay`        | `Dialog.Backdrop`  ← see divergence 1               |
 * | `DialogContent`        | `Dialog.Portal` + `Dialog.Backdrop` + `Dialog.Popup` (+ built-in ✕ `Dialog.Close`) |
 * | `DialogHeader`         | plain `<div>` (shadcn parity — no Base UI part)     |
 * | `DialogFooter`         | plain `<div>` (shadcn parity — no Base UI part)     |
 * | `DialogTitle`          | `Dialog.Title` (renders `<h2>`)                     |
 * | `DialogDescription`    | `Dialog.Description` (renders `<p>`)                |
 * | `DialogClose`          | `Dialog.Close`                                      |
 *
 * Base UI wires the popup's `aria-labelledby` to `DialogTitle` and
 * `aria-describedby` to `DialogDescription` automatically — no manual ids.
 *
 * ## Divergences from the shadcn/Radix Dialog API (all deliberate)
 * 1. **`DialogOverlay` wraps Base UI `Dialog.Backdrop`, not a Radix `Overlay`.**
 *    Same role (the dimming layer under the popup), different primitive name.
 *    Note Base UI skips rendering the backdrop for *nested* dialogs unless
 *    `forceRender` is set — parent smoke already covers the viewport.
 * 2. **`modal` defaults to `true`** (focus trap + page scroll lock + outside
 *    pointer interactions disabled), matching Radix. Base UI adds a third mode,
 *    `modal="trap-focus"` (trap focus without scroll lock), which passes
 *    straight through.
 * 3. **`DialogContent` composes `Portal` + `Backdrop` + `Popup`** and appends a
 *    top-right ✕ close button (shadcn parity — shadcn composes the same three
 *    Radix parts). Pass `showCloseButton={false}` to omit the ✕ (matching
 *    current shadcn's `DialogContent` prop).
 * 4. **No `asChild`.** Base UI composes via the `render` prop instead — e.g.
 *    `<DialogTrigger render={<Button variant="secondary" />}>Open</DialogTrigger>`.
 *    Every part forwards it.
 * 5. **`onOpenChange(open, eventDetails)`** — Base UI passes a second
 *    `eventDetails` argument (reason + native event). The first argument is the
 *    boolean Radix passes, so existing shadcn call sites work unchanged.
 * 6. **`Dialog.Viewport` is not re-exported.** It's a Base UI layout helper for
 *    scrollable full-viewport dialogs with no shadcn equivalent; the kit centers
 *    the popup with fixed positioning like shadcn. Compose it manually from
 *    `@base-ui/react/dialog` if you need it.
 *
 * ## Smoke layer (`bg-black/40`) — sanctioned hardcoded color
 * The backdrop is black at 40% opacity in *both* themes, per Fluent's smoke
 * layer (it dims light and dark surfaces alike). Conventions §3.7 bans
 * hardcoded colors so a shade can't drift from the token set, but the smoke
 * layer is intentionally theme-invariant — there is no token for it and
 * inventing one would imply it re-points in dark mode, which it must not.
 * `bg-black/40` is the sanctioned exception here.
 *
 * ## Motion note — the popup zoom animates `scale`, not `transform`
 * Tailwind v4 emits `translate-*` and `scale-*` as the independent CSS
 * `translate:`/`scale:` properties (not a shared `transform:`), so the
 * -50%/-50% centering translate and the open/close zoom coexist without
 * clobbering each other — but it also means the popup's transition must target
 * `transition-[opacity,scale]` (a `transition-[transform,opacity]` list would
 * leave the zoom snapping — every popup in the kit uses `[opacity,scale]` for
 * this reason).
 *
 * ## `"use client"` — required
 * Two reasons. The Base UI Dialog parts manage client state (each part module
 * carries its own `'use client'`), and — decisively — `DismissRegular` from
 * `@fluentui/react-icons` must stay inside a client boundary: the package's
 * shared icon-sizing module calls `@griffel/react`'s client-only `__styles()`
 * at module scope without its own directive, so importing an icon from a
 * Server Component breaks `next build`. See conventions §9; `select.tsx` and
 * `checkbox.tsx` are the precedents.
 *
 * ## data-slot note
 * `Dialog` (Root) renders no DOM element of its own, so it carries no
 * `data-slot`. Every part that renders an element does — `dialog-trigger`,
 * `dialog-overlay`, `dialog-content`, etc.
 */

function Dialog<Payload>(props: DialogPrimitive.Root.Props<Payload>) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/**
 * Overlay — Fluent's smoke layer: black at 40% opacity over the full viewport
 * in both themes (see the smoke-layer note above), fading in/out via Base UI's
 * `data-starting-style`/`data-ending-style` hooks with token durations/easings.
 */
function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40",
        // motion — fade on open (enter) / close (exit)
        "transition-opacity duration-normal ease-decelerate-mid",
        "data-starting-style:opacity-0",
        "data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
        className
      )}
      {...props}
    />
  );
}

/**
 * Content — the modal surface: `Portal` → `Backdrop` → `Popup`, centered with
 * fixed positioning, on `bg-background` with `rounded-xl` + `shadow-64`
 * (dialog elevation, conventions §3.6). A fade + slight zoom rides the
 * `data-starting-style`/`data-ending-style` hooks; the zoom animates the CSS
 * `scale` property (see the motion note above). The built-in ✕ close button
 * sits top-right (`showCloseButton={false}` omits it).
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Popup> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          // layout — centered fixed surface, dialog radius + elevation
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-background p-6 text-foreground shadow-64 outline-none",
          // motion — fade + slight zoom; `scale`, not `transform` (see doc note)
          "transition-[opacity,scale] duration-normal ease-decelerate-mid",
          "data-starting-style:scale-95 data-starting-style:opacity-0",
          "data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-accelerate-mid",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              "absolute top-4 right-4 flex size-8 items-center justify-center rounded-md text-muted-foreground",
              "cursor-pointer outline-none transition-colors duration-fast ease-ease",
              "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/70",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            <DismissRegular className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogClose({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn(className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
