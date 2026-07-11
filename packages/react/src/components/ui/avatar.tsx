import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Avatar — Fluent 2-styled, shadcn-API avatar.
 *
 * This is the batch's Base UI case (conventions §9): an image-with-fallback
 * loading state is genuine behavior, not something plain markup can express,
 * so the three parts wrap `@base-ui/react/avatar` (`Avatar.Root`,
 * `Avatar.Image`, `Avatar.Fallback` — imported as a namespace from the
 * `@base-ui/react/avatar` subpath, matching the actual export shape in
 * node_modules) instead of a raw `<span>`/`<img>`.
 *
 * `"use client"` is intentionally omitted here. Base UI's Root/Image/Fallback
 * modules each carry their own `'use client'` directive at the source level
 * (verified in the compiled package output), so they are already client
 * boundaries on their own. This wrapper file contains no hooks/handlers of
 * its own — it only forwards props into those parts — so it can stay a plain
 * (server-renderable) module per conventions §2: a Server Component tree can
 * render a Client Component child without the parent re-declaring the
 * directive. Confirmed via `pnpm typecheck` + the test suite; add the
 * directive here only if that stops holding true.
 *
 * Aesthetics follow Fluent 2 (32px medium avatar, circular, brand-tinted
 * initials fallback); the prop surface (`Avatar` / `AvatarImage` /
 * `AvatarFallback`, no `size` prop — consumers resize via `className`, e.g.
 * `size-10`) follows the classic shadcn/ui avatar API. Fluent's
 * sized/shape/presence-badge variants are out of scope for this pass — see
 * backlog notes returned alongside this component.
 */
function Avatar({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

/**
 * Fluent-inspired brand-tinted initials fallback. Contrast checked against
 * WCAG AA (4.5:1, since 14px/600 does not clear the "large text" bold
 * threshold): light `brand-160`/`brand-70` ≈ 5.95:1; dark `brand-40`/`brand-140`
 * ≈ 7.73:1. Both comfortably pass.
 */
function AvatarFallback({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-brand-160 text-sm font-semibold text-brand-70 select-none",
        "dark:bg-brand-40 dark:text-brand-140",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
