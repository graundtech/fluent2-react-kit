import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Breadcrumb — Fluent 2-styled, shadcn-API breadcrumb family.
 *
 * Pure markup, matching shadcn/ui's Breadcrumb structure exactly: `Breadcrumb`
 * (`<nav aria-label="breadcrumb">`), `BreadcrumbList` (`<ol>`), `BreadcrumbItem`
 * (`<li>`), `BreadcrumbLink` (`<a>`, `asChild`-capable via Radix `Slot`),
 * `BreadcrumbPage` (`<span role="link" aria-current="page">` for the
 * non-interactive current step), `BreadcrumbSeparator` (`<li
 * role="presentation" aria-hidden="true">`) and `BreadcrumbEllipsis` (same
 * presentation pattern, for a collapsed run of items) —
 * https://ui.shadcn.com/docs/components/breadcrumb.
 *
 * Two deliberate divergences from shadcn, both driven by this kit's
 * conventions doc (§9):
 *
 * 1. `BreadcrumbSeparator`'s default glyph and `BreadcrumbEllipsis`'s dots are
 *    inline `<svg>`, not lucide's `ChevronRight`/`MoreHorizontal` (shadcn) or
 *    `@fluentui/react-icons` (this kit's usual icon source). Importing from
 *    `@fluentui/react-icons` forces `"use client"` onto the whole file (its
 *    icon sizing module calls a client-only Griffel API at module scope — see
 *    conventions §9 / `select.tsx`), which would needlessly turn this static
 *    markup component into a client boundary. An inline SVG keeps `Breadcrumb`
 *    a Server Component, matching `Card`/`Separator`.
 * 2. `BreadcrumbLink`'s hover treatment intentionally mirrors this kit's own
 *    `Link` component's `default` variant (`hover:text-foreground`, color
 *    transition only, underline only on hover via the surrounding
 *    `hover:underline` here is *not* applied — shadcn's breadcrumb link has no
 *    underline at all, even on hover, since it sits in a compact trail rather
 *    than prose) rather than inventing a new recipe: `hover:text-foreground
 *    transition-colors duration-fast ease-ease` plus the standard
 *    focus-visible ring (conventions §4). Kept text-only (no underline) to
 *    match shadcn's breadcrumb parity goal; reach for `Link` directly if a
 *    consumer wants the underlined treatment.
 *
 * No `variant`/`size` props and no `cva` table — shadcn's Breadcrumb ships
 * none, so every part is a plain function component (matches `Card`).
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only.
 */

function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:gap-2.5",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild = false,
  className,
  ...props
}: ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        "rounded-xs outline-none transition-colors duration-fast ease-ease hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 3.5L10 8L6 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-6 items-center justify-center", className)}
      {...props}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="size-4"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="2.5" cy="8" r="1.25" fill="currentColor" />
        <circle cx="8" cy="8" r="1.25" fill="currentColor" />
        <circle cx="13.5" cy="8" r="1.25" fill="currentColor" />
      </svg>
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
