"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { DismissRegular } from "@fluentui/react-icons";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Toast — Fluent 2-styled, shadcn-API toast notifications.
 *
 * Follows the overlay patterns set by `select.tsx`/`dialog.tsx` (portal + a
 * floating surface, Base UI `data-starting-style`/`data-ending-style` transition
 * hooks) and is the designated next consumer of the status-extension tokens the
 * `alert.tsx` variants introduced: the `variant` cva mirrors Alert's treatment
 * (`*-subtle` fills, `*-border` borders, `*-text`/status accents on the title),
 * so a toast reads as the transient sibling of the inline Alert.
 *
 * ## Base UI mapping (conventions §9)
 * Behavior — the toast queue/manager, auto-dismiss timers, priority-based
 * live-region announcement, F6 viewport landmark, portalling, swipe-to-dismiss,
 * and the stacking/offset CSS variables — genuinely needs a primitive, so the
 * parts wrap `@base-ui/react/toast` (namespace import, matching the actual
 * export shape in node_modules, exactly like `select.tsx`/`dialog.tsx`). shadcn
 * part names are mapped onto Base UI's model:
 *
 * | Exported (shadcn name) | Base UI primitive                                    |
 * | ---------------------- | ---------------------------------------------------- |
 * | `ToastProvider`        | `Toast.Provider`                                     |
 * | `ToastViewport`        | `Toast.Portal` + `Toast.Viewport`  ← see divergence 1 |
 * | `Toast`                | `Toast.Root` + `Toast.Content`     ← see divergence 2 |
 * | `ToastTitle`           | `Toast.Title` (renders `<h2>`)                       |
 * | `ToastDescription`     | `Toast.Description` (renders `<p>`)                  |
 * | `ToastAction`          | `Toast.Action` (renders `<button>`)                 |
 * | `ToastClose`           | `Toast.Close` (renders `<button>`, ✕ via `DismissRegular`) |
 * | `useToast`             | `Toast.useToastManager`            ← see divergence 3 |
 *
 * ## Firing a toast — how the wrapper maps to Base UI's manager (the API)
 * Unlike shadcn's sonner-based `toast()` global, Base UI has no
 * render-anywhere singleton: toasts live in a manager scoped to the nearest
 * `ToastProvider`, and each visible toast is rendered by a caller-owned map over
 * `useToast().toasts`. The kit keeps that model honest (same call as `select.tsx`
 * did with `SelectValue`) rather than papering a fake global over it:
 *
 * ```tsx
 * function ToastList() {
 *   const { toasts } = useToast();
 *   return toasts.map((toast) => (
 *     <Toast key={toast.id} toast={toast} variant={toast.data?.variant}>
 *       <ToastTitle />
 *       <ToastDescription />
 *       <ToastClose />
 *     </Toast>
 *   ));
 * }
 *
 * function Fire() {
 *   const { add } = useToast();
 *   return (
 *     <button onClick={() => add({
 *       title: "Saved",
 *       description: "Your changes were saved.",
 *       data: { variant: "success" },
 *     })}>Save</button>
 *   );
 * }
 * ```
 *
 * `useToast()` returns Base UI's `{ toasts, add, close, update, promise }`.
 * `add(options)` enqueues a toast and returns its id; `options.timeout` (ms,
 * default 5000 via the Provider, `0` disables) drives auto-dismiss;
 * `options.priority` (`'low'` polite / `'high'` assertive) drives the live-region
 * urgency; `options.data` carries arbitrary payload — the kit's convention is to
 * stash the visual `variant` there and read it back in the map (`toast.data?.
 * variant`). Empty `<ToastTitle />`/`<ToastDescription />` fall back to the
 * toast's `title`/`description` strings automatically (Base UI behavior), so the
 * list rarely needs children. `Toast.createToastManager()` (re-exported as
 * `createToastManager`) builds a manager usable outside React — pass it to
 * `<ToastProvider toastManager={…}>` to fire toasts from non-component code.
 *
 * ## Divergences from the shadcn/Radix Toast API (all deliberate)
 * 1. **`ToastViewport` folds `Toast.Portal` + `Toast.Viewport`.** shadcn's
 *    viewport is a bare positioned list; Base UI portals the viewport to
 *    `document.body` (so it escapes overflow/transform ancestors) and exposes it
 *    as a separate `Portal` part. The kit composes both, matching how
 *    `SelectContent` folds `Portal` + `Positioner` + `Popup`. Render it once,
 *    inside `ToastProvider`, with your `ToastList` map as its children.
 * 2. **`Toast` composes `Toast.Root` + `Toast.Content`; children render into the
 *    Content.** Base UI splits an individual toast into `Root` (the stacked,
 *    swipeable, height-animated box that carries the `toast` prop) and `Content`
 *    (the inner layout whose `data-behind`/`data-expanded` opacity fades the
 *    stacked-behind toasts back). Folding them keeps the shadcn-flat inner API —
 *    `<Toast><ToastTitle/><ToastDescription/><ToastClose/></Toast>` — while
 *    preserving the fade. `ToastClose` is absolutely positioned (shadcn parity),
 *    so it can be a direct child. The **required** `toast` prop is Base UI's per-
 *    toast object from the `useToast().toasts` map.
 * 3. **`useToast` is Base UI's `useToastManager`, not shadcn's `useToast()`.**
 *    shadcn's hook returns `{ toast, dismiss, toasts }` where `toast()` is a
 *    global fire-and-forget; Base UI's returns `{ toasts, add, close, update,
 *    promise }` scoped to the Provider. The kit re-exports it under the familiar
 *    `useToast` name but keeps Base UI's shape — call `add()` (not `toast()`) to
 *    fire, and render the `toasts` array yourself (divergence 2). See the firing
 *    recipe above.
 *
 * ## Motion note — the toast stack animates `transform`, NOT the popup `scale`
 * The kit's other overlays (`select`/`dialog`) forbid `transition-[transform,
 * opacity]` and require `transition-[opacity,scale]` (conventions §3.5): their
 * zoom rides Tailwind's `scale-*`/`translate-*` utilities, which v4 compiles to
 * the independent `scale:`/`translate:` CSS properties, so a `transform`-based
 * transition list would leave the zoom snapping. Toast is the **sanctioned
 * exception**: Base UI drives the entire stack — index offset, peek, scale-back,
 * swipe displacement, and enter/exit slide — through the `transform` *shorthand*
 * built from its `--toast-*` CSS variables (`--toast-index`, `--toast-offset-y`,
 * `--toast-height`, `--toast-swipe-movement-x/y`), so the recipe here is an
 * explicit `[transform:…]` arbitrary value with a matching `[transition:transform
 * …]` — Base UI's documented styling recipe, adapted to kit tokens. This is not
 * a §3.5 violation: no Tailwind `scale-*`/`translate-*` utility is used, so there
 * is no independent-property split to break. Opacity/height animate alongside in
 * the same explicit transition list because Base UI needs three coordinated
 * durations the token utilities can't express.
 *
 * ## `"use client"` — required
 * Two reasons, same as `dialog.tsx`. The Base UI Toast parts manage client
 * state (the manager context, timers, swipe listeners — each part module carries
 * its own `'use client'`), and — decisively — `DismissRegular` from
 * `@fluentui/react-icons` must stay inside a client boundary: the package's
 * shared icon-sizing module calls `@griffel/react`'s client-only `__styles()` at
 * module scope without its own directive, so importing an icon from a Server
 * Component breaks `next build`. See conventions §9; `select.tsx`/`checkbox.tsx`
 * are the precedents.
 *
 * ## data-slot note
 * `ToastProvider` renders no DOM element of its own (context only), so it
 * carries no `data-slot`. Every part that renders an element does —
 * `toast-viewport`, `toast` (Root), `toast-content`, `toast-title`, etc.
 */

function ToastProvider(props: ComponentProps<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider {...props} />;
}

/**
 * Viewport — the fixed bottom-right stack region, portalled to `document.body`.
 * `w-[22.5rem]` (matching Base UI's demo) on a comfortable viewport, collapsing
 * to `calc(100vw-2rem)` on narrow screens; `z-50` over app content. The stacked
 * toasts inside position themselves absolutely against this box (see `Toast`).
 */
function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className={cn(
          "fixed right-4 bottom-4 z-50 mx-auto flex w-[calc(100vw-2rem)] sm:right-6 sm:bottom-6 sm:w-[22.5rem]",
          className
        )}
        {...props}
      />
    </ToastPrimitive.Portal>
  );
}

/**
 * Toast surface variants — mirror `alert.tsx`'s token usage exactly. `default`
 * is the neutral floating popover surface (`bg-popover`); the four status
 * variants reuse the status-extension tokens (`*-subtle` fill, `*-border`
 * border) with the intent color carried by the *title* (`ToastTitle`) and the
 * body left as `text-muted-foreground`, so status is never conveyed by
 * body-text color alone (conventions §5). See `alert.tsx`'s doc comment for the
 * per-variant contrast math against these same token pairs. The title accent is
 * targeted with a descendant selector (`[&_[data-slot=toast-title]]`) because
 * the title sits inside the folded `Content`, not as a direct Root child.
 */
const toastVariants = cva(
  [
    // --- Base UI stacking / swipe / enter-exit recipe (adapted from the Base UI
    // Toast docs' bottom-right demo; the --toast-* vars are Base UI's contract).
    // See the "Motion note" above for why this uses the `transform` shorthand.
    "[--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
    "absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 w-full origin-bottom",
    "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
    // an invisible bridge below the toast so the pointer can move between stacked
    // toasts without leaving the hover (Base UI recipe)
    "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
    "h-[var(--height)] data-expanded:h-[var(--toast-height)]",
    "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))]",
    // enter (starting) / exit (ending) slide + fade, plus the swipe-out offsets
    "data-starting-style:[transform:translateY(150%)]",
    "data-ending-style:opacity-0 data-limited:opacity-0",
    "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
    "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
    "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
    "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
    "[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s]",
    // --- Fluent surface: flat floating card, medium radius, flyout elevation.
    "rounded-md border shadow-16 select-none",
    // F6-navigable; keyboard focus ring (conventions §4)
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ],
  {
    variants: {
      variant: {
        default: "border-border bg-popover text-popover-foreground",
        destructive:
          "border-destructive-border bg-destructive-subtle text-foreground [&_[data-slot=toast-title]]:text-destructive-text",
        success:
          "border-success-border bg-success-subtle text-foreground [&_[data-slot=toast-title]]:text-success",
        warning:
          "border-warning-border bg-warning-subtle text-foreground [&_[data-slot=toast-title]]:text-warning-text",
        info: "border-brand-140 bg-brand-160 text-foreground [&_[data-slot=toast-title]]:text-brand-80 dark:border-brand-70 dark:bg-brand-30 dark:[&_[data-slot=toast-title]]:text-brand-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Toast — one notification. Wraps `Toast.Root` (the stacked/swipeable/height-
 * animated box carrying the required `toast` prop and the `variant` surface) and
 * folds a `Toast.Content` inside (the inner flex layout whose
 * `data-behind`/`data-expanded` opacity fades stacked-behind toasts). `children`
 * (ToastTitle/Description/Action/Close) render into the Content; `ToastClose` is
 * absolutely positioned, so `pr-10` reserves room for it.
 */
function Toast({
  className,
  variant = "default",
  children,
  ...props
}: ComponentProps<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-variant={variant}
      className={cn(toastVariants({ variant, className }))}
      {...props}
    >
      <ToastPrimitive.Content
        data-slot="toast-content"
        className={cn(
          "relative flex h-full flex-col gap-1 overflow-hidden p-4 pr-10",
          // fade the stacked-behind content back in only when the viewport expands
          "transition-opacity duration-normal ease-decelerate-mid data-behind:opacity-0 data-expanded:opacity-100"
        )}
      >
        {children}
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  );
}

function ToastTitle({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Action — an optional in-toast button (e.g. "Undo"). Styled as the kit's
 * neutral outline button in miniature (conventions §4 neutral ramp), sitting
 * left-aligned under the message. Base UI closes the toast after the action
 * fires unless the handler prevents it.
 */
function ToastAction({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "mt-1 inline-flex h-8 w-fit shrink-0 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium",
        "cursor-pointer outline-none transition-colors duration-fast ease-ease",
        "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:bg-input/30 dark:hover:bg-input/50 dark:active:bg-input/70",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Close — the icon-only ✕ dismiss button, absolutely positioned top-right (like
 * `dialog.tsx`'s built-in close). Accessible name comes from the `sr-only` span;
 * ✕ glyph is `DismissRegular` (which is what forces `"use client"`, §9). Base UI
 * marks it non-swipe-triggering automatically.
 */
function ToastClose({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(
        "absolute top-3 right-3 flex size-7 items-center justify-center rounded-md text-muted-foreground",
        "cursor-pointer outline-none transition-colors duration-fast ease-ease",
        "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/70",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <DismissRegular />
      <span className="sr-only">Close</span>
    </ToastPrimitive.Close>
  );
}

const useToast = ToastPrimitive.useToastManager;
const createToastManager = ToastPrimitive.createToastManager;

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  useToast,
  createToastManager,
  toastVariants,
};
