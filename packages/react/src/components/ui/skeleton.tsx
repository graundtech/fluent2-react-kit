import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Skeleton — Fluent 2-styled, shadcn-API loading placeholder.
 *
 * A single `<div>` with no `cva` table (conventions §2 allows this for
 * leaf/static components — mirrors `Separator`): there is one visual
 * treatment, and every shape variation (line, avatar circle, button block,
 * card) is just a `className` override on width/height/radius, not a prop.
 *
 * **Fill color — `bg-secondary`, not `bg-accent`.** Current shadcn ships
 * `bg-accent animate-pulse rounded-md`
 * (https://ui.shadcn.com/docs/components/skeleton); this kit deliberately
 * swaps in `bg-secondary` after weighing all three themes against `tokens.css`:
 * - Dark theme: `--accent` and `--secondary` are the *same* hex (`#333333`,
 *   grey[20]) — no visual difference at all.
 * - Light theme: `--secondary` is grey[96] (`#f5f5f5`) vs. `--accent`'s
 *   grey[94] (`#f0f0f0`) — a hair lighter, i.e. marginally less contrast
 *   against the white `--background`. The delta (96 vs 94) is negligible; a
 *   skeleton still reads clearly as "content pending" at either value.
 * - High contrast (`.high-contrast`): the deciding case. `--accent` maps to
 *   the system `Highlight` keyword (selection semantics), so an inert
 *   placeholder painted in `bg-accent` lights up in the OS *selection* color
 *   and reads as "this is selected" — wrong. `--secondary` maps to
 *   `ButtonFace`, a neutral surface, so `bg-secondary` stays a plain neutral
 *   block in HC. A component can't theme-scope its own class (there's no
 *   `high-contrast:` variant to swap the fill only in that theme), so the
 *   right call is the token that stays neutral in *all three* themes —
 *   `--secondary`, not `--accent`.
 * `bg-muted` was also considered and rejected: it matches `--secondary` in
 * light mode but drops to grey[12] (`#1f1f1f`) in dark mode — visibly
 * dimmer than the `#242424` `--background` it sits on, i.e. *less* visible
 * exactly where contrast matters most.
 *
 * **Animation — `animate-pulse`, not a wave shimmer.** Fluent 2's own
 * Skeleton uses a moving gradient "wave" sweep
 * (https://storybooks.fluentui.dev/react/?path=/docs/components-skeleton--docs),
 * not a pulse. Reproducing that needs a `@keyframes` gradient-position
 * animation, which belongs in the shared `tokens.css` token layer (owned by
 * the maintainers, not editable by a single component's agent — conventions
 * §10). `animate-pulse` (Tailwind's built-in opacity keyframes) stands in for
 * now and is the same substitution shadcn itself ships. Backlog: add a
 * `--animate-shimmer` keyframe to `tokens.css` and switch this file over in a
 * follow-up pass once that token exists.
 *
 * **Reduced motion — `motion-reduce:animate-none`, full stop (not a slowed
 * animation).** This deliberately *contrasts* with `Spinner`, which slows to
 * `animation-duration: 3s` under `prefers-reduced-motion` instead of
 * stopping outright. The difference is what each animation communicates:
 * `Spinner`'s spin is the *only* signal that a background operation is still
 * in progress — freezing it would erase that information for a
 * reduced-motion user (its `role="status"` region only helps assistive tech,
 * not sighted users). `Skeleton` carries no such information: it is a static
 * placeholder shape whether or not it pulses, and content either has loaded
 * or hasn't — nothing is lost by holding it still, and a persistently
 * animating region is exactly what `prefers-reduced-motion` asks apps to
 * avoid. `motion-reduce:animate-none` is a plain Tailwind utility, not a
 * `duration-*` token, so it isn't covered by the automatic duration collapse
 * `tokens.css` already applies — it has to be declared per animated
 * component (see `Spinner`'s doc comment for the same note).
 *
 * **Accessibility — no `aria-hidden` here, by design.** A lone `<Skeleton>`
 * is inert markup (a styled `<div>`, no text, no role) that assistive tech
 * already has nothing to announce for, so forcing `aria-hidden="true"` on
 * every instance would be redundant — and current shadcn doesn't do it
 * either. Instead, wrap the *loading region* (the parent containing one or
 * more `Skeleton`s standing in for real content) in `aria-busy="true"` —
 * optionally with `aria-live="polite"` if the region should announce when
 * loading completes and real content replaces the skeletons. That's a
 * consumer-side decision (it depends on what the region becomes once
 * loaded), so it isn't baked into this component. Verified with axe: a
 * skeleton "card" composition (avatar circle + text lines) inside an
 * `aria-busy="true"` wrapper produces no violations — see
 * `skeleton.test.tsx`.
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only,
 * so this drops straight into an RSC tree.
 */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-secondary motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
