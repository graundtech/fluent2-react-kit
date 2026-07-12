import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Progress — Fluent 2-styled, shadcn-API progress bar.
 *
 * Base UI ships a Progress primitive (`@base-ui/react/progress`, imported as
 * a namespace exposing `Root` / `Track` / `Indicator` / `Label` / `Value`,
 * matching the actual export shape in node_modules — same pattern as
 * `avatar.tsx`). This is the batch's Base UI case (conventions §9): value→
 * percentage math, `role="progressbar"`, `aria-valuemin`/`aria-valuemax`/
 * `aria-valuenow`/`aria-valuetext` wiring, and indeterminate detection
 * (`aria-valuenow` correctly omitted when `value` is `null`/`undefined`) are
 * exactly the kind of genuine behavior a primitive should own rather than
 * hand-rolling ARIA math. `Root`, `Track`, and `Indicator` are composed
 * internally into a single `Progress` export to match shadcn's flat API
 * (`<Progress value={33} />`) — the sub-parts are not re-exported, since the
 * spec calls for one component, not shadcn's newer multi-part variant.
 *
 * `"use client"` is intentionally omitted, mirroring `avatar.tsx`'s
 * reasoning: Base UI's Root/Track/Indicator modules each carry their own
 * `'use client'` directive at the source level, so they are already client
 * boundaries on their own. This wrapper file has no hooks/handlers of its
 * own — it only forwards props and branches on a plain value comparison — so
 * it stays a plain (server-renderable) module per conventions §2. Confirmed
 * via `pnpm typecheck` + the test suite.
 *
 * Aesthetics follow Fluent 2's ProgressBar, which is thin — 2px (`h-0.5`),
 * not shadcn's 8px `h-2` default. This is a deliberate, documented deviation
 * from the shadcn reference; consumers who want the shadcn-thick bar (or any
 * other height) can override via `className` (`cn` + tailwind-merge resolve
 * the conflict, last utility wins). Track is `bg-secondary` (flat neutral
 * fill) with `rounded-full overflow-hidden`; the indicator is `bg-primary`,
 * also `rounded-full`, and its width is driven by Base UI's own computed
 * `style.width` percentage (`ProgressIndicator` reads `value`/`min`/`max`
 * from context and sets `width: ${percent}%` — this is "the cleaner" of the
 * two width strategies the spec allows: it needs no manual percent math on
 * our side, unlike shadcn's classic `translateX(-${100 - value}%)` recipe).
 * `transition-[width]` (not `transition-all`/`transform`, since Base UI
 * animates `width` directly) plus the token duration/easing pair animates
 * value changes; reduced motion is handled automatically by the token layer
 * (conventions §3.5) since `duration-normal`/`ease-ease` are token-driven.
 *
 * Indeterminate (`value` is `null`/undefined): Fluent's real indeterminate
 * ProgressBar slides a segment back and forth via `@keyframes`, which this
 * kit cannot add (no editing `tokens.css`/`globals.css` — conventions §10).
 * As a stand-in, the indicator renders a static `w-1/3` segment with
 * `animate-pulse` (a Tailwind v4 default-theme utility/keyframe — ships in
 * `tailwindcss/theme.css` already, so this adds zero custom CSS). The real
 * sliding animation is backlog, flagged alongside this component.
 *
 * Under `prefers-reduced-motion` the pulse is fully stopped via
 * `motion-reduce:animate-none` (same call as `skeleton.tsx`, not `spinner.tsx`'s
 * slow-down): the pulse carries no information a reduced-motion user would
 * lose by holding it still — the indeterminate/busy state is conveyed by the
 * `role="progressbar"` + omitted `aria-valuenow` to assistive tech and by the
 * bar's presence to sighted users — and a persistently animating region is
 * exactly what `prefers-reduced-motion` asks apps to avoid. `motion-reduce:
 * animate-none` is a plain Tailwind utility (not a `duration-*` token), so it
 * isn't covered by the automatic duration collapse `tokens.css` applies and
 * has to be declared here explicitly.
 *
 * `role="progressbar"` requires an accessible name; Base UI does not default
 * one. Pass `aria-label` (forwarded straight through to the root via
 * `...props`) or compose Base UI's own `Progress.Label` alongside this
 * component — consumers must supply one or the other.
 */
function Progress({
  className,
  value,
  ...props
}: Omit<ComponentProps<typeof ProgressPrimitive.Root>, "value"> & {
  /**
   * 0–100 (relative to `min`/`max`, both default 0/100). Omit or pass `null`
   * for the indeterminate state — Base UI's Root then correctly omits
   * `aria-valuenow` and this wrapper renders the pulsing stand-in indicator.
   */
  value?: number | null;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value ?? null}
      className={cn(
        "relative h-0.5 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="relative h-full w-full"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-normal ease-ease",
            value == null && "w-1/3 animate-pulse motion-reduce:animate-none"
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
