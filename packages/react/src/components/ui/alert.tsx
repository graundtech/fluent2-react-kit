import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Alert — Fluent 2-styled (MessageBar look), shadcn-API alert family.
 *
 * Structure matches shadcn/ui's current Alert (three parts: `Alert`,
 * `AlertTitle`, `AlertDescription` — see
 * https://ui.shadcn.com/docs/components/alert): a two-column CSS grid
 * (`grid-cols-[0_1fr]`, collapsing to a real icon column via
 * `has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]` only when an `<svg>`
 * child is present) so title/description always sit in column 2 and an
 * optional leading icon occupies column 1 without extra markup. No `asChild`
 * — current shadcn doesn't offer one for Alert either.
 *
 * Fluent 2 visual reference: MessageBar
 * (https://storybooks.fluentui.dev/react/?path=/docs/components-messagebar--docs)
 * — a subtle intent-tinted background + intent-colored border + intent-colored
 * icon, with the running body copy staying regular foreground (not tinted).
 * That's a deliberate split from vanilla shadcn's `destructive` variant (which
 * tints the *entire* alert text `text-destructive` and only softens the
 * description). Here only the icon and `AlertTitle` pick up the intent color
 * (via `[&>svg]:text-*` and `*:data-[slot=alert-title]:text-*`);
 * `AlertDescription` always stays `text-muted-foreground` so status is
 * conveyed by icon + border + title color together, never by body-text color
 * alone (accessibility checklist §5).
 *
 * Deviations from current shadcn, both deliberate:
 * - `rounded-md` (Fluent "medium", 4px) instead of shadcn's `rounded-lg`.
 *   Per docs/component-conventions.md §3.4, `rounded-md` is this kit's
 *   default *control* radius (buttons, inputs, badges) and `rounded-lg` is
 *   reserved for card/dialog-scale surfaces; an inline notification bar reads
 *   as the former.
 * - `AlertTitle` is `font-semibold` instead of shadcn's `font-medium`, for
 *   consistency with `CardTitle` (also `font-semibold`) elsewhere in this kit.
 *
 * Token usage:
 * - `default`: neutral — `bg-card`/`text-card-foreground` (matches `Card`),
 *   with a muted (not accent-colored) icon.
 * - `destructive` / `success` / `warning`: the status-extension tokens
 *   (`*-subtle` background, `*-border` border) added to tokens.css for this
 *   component. `destructive` and `warning` both intentionally accent with a
 *   dedicated `*-text` token instead of the raw status color —
 *   `--destructive`/`--warning` are the *fill* colors (meant for
 *   `Badge`-style filled surfaces with a matching `*-foreground` on top);
 *   as running/title text on a subtle surface neither clears AA in both
 *   themes on its own. `--destructive-text`/`--warning-text` exist
 *   specifically to fix that. Manual sRGB contrast checks against the token
 *   hex values in tokens.css (this environment can't run real axe
 *   color-contrast checks — see the component's test file for why):
 *     - destructive icon/title (`--destructive-text`) vs
 *       `--destructive-subtle`: light `#b10e1c` on `#fdf6f6` ~6.68:1, dark
 *       `#ff9a90` on `#3b1212` ~8.02:1 — both pass AA comfortably. (Plain
 *       `--destructive`, `#d13438` in both themes, was ~4.6:1 light /
 *       ~3.3:1 dark — the dark case failed the 4.5:1 AA body-text minimum,
 *       which is why `--destructive-text` was added at the token layer
 *       rather than re-tuning `--destructive` itself, mirroring how
 *       `--warning-text` sits alongside `--warning`.)
 *     - success icon/title vs `--success-subtle`: light ~5.0:1, dark ~6.5:1
 *       — both pass AA comfortably.
 *     - warning icon/title (`--warning-text`) vs `--warning-subtle`: light
 *       ~5.1:1, dark ~10.6:1 — both pass AA comfortably.
 * - `info`: brand-tinted, using the brand ramp directly since it has no
 *   dedicated status-extension tokens. Light picks `bg-brand-160`
 *   (`#ebf3fc`, the same "selected nav" tint `--sidebar-accent` already
 *   uses) with `text-brand-80` (`#0f6cbd`, `= --primary` in light) for the
 *   icon/title — ~4.8:1 against the tint. The brand ramp is global (same hex
 *   in both themes per spec §2), so dark needs explicit overrides:
 *   `dark:bg-brand-30` keeps the tint dark instead of blinding-light, and
 *   `dark:text-brand-100` (not `--primary`'s dark value, `brand-70`, which
 *   only clears ~2.1:1 against `brand-30`) is picked for ~5.0:1 contrast —
 *   `brand-100` is also already `--ring`'s dark-mode color, so it reads as
 *   "the" visible accent blue in dark surfaces elsewhere in this kit.
 *   `border-brand-140` / `dark:border-brand-70` sit as a midtone between
 *   each theme's subtle background and accent stop, mirroring how
 *   `*-border` sits between `*-subtle` and the icon/title accent for the
 *   status-extension trio above.
 *
 * Role: `role="alert"` is applied as a *default* — it sits before the
 * `{...props}` spread, so a consumer can override it and a passed
 * `role="status"` wins. Choose deliberately: `role="alert"` is an *assertive*
 * live region (it interrupts the screen reader) and is only *announced* when
 * the alert is mounted dynamically after first paint — a statically-rendered
 * alert present at load isn't announced under either role. Use `role="status"`
 * (polite — queued, not interrupting) for success/info or other non-urgent
 * updates, and keep the assertive default for genuinely urgent/destructive
 * messages. The default stays `role="alert"` (shadcn parity).
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only.
 */
const alertVariants = cva(
  [
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-md border px-4 py-3 text-sm",
    "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3",
    "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  ],
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground [&>svg]:text-muted-foreground",
        destructive:
          "bg-destructive-subtle border-destructive-border text-foreground [&>svg]:text-destructive-text *:data-[slot=alert-title]:text-destructive-text",
        success:
          "bg-success-subtle border-success-border text-foreground [&>svg]:text-success *:data-[slot=alert-title]:text-success",
        warning:
          "bg-warning-subtle border-warning-border text-foreground [&>svg]:text-warning-text *:data-[slot=alert-title]:text-warning-text",
        info: "bg-brand-160 border-brand-140 text-foreground [&>svg]:text-brand-80 *:data-[slot=alert-title]:text-brand-80 dark:bg-brand-30 dark:border-brand-70 dark:[&>svg]:text-brand-100 dark:*:data-[slot=alert-title]:text-brand-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant = "default",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
