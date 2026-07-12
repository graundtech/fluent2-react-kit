import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

/**
 * Pagination — Fluent 2-styled, shadcn-API pagination family.
 *
 * Structure matches shadcn/ui's Pagination: `Pagination` (nav landmark),
 * `PaginationContent` (list), `PaginationItem` (list item), `PaginationLink`
 * (page control, styled via `buttonVariants`), `PaginationPrevious` /
 * `PaginationNext` (labeled link + chevron), and `PaginationEllipsis`
 * (decorative truncation marker). Every part is a plain function component —
 * there is no open/close or selection state to manage, so this stays pure
 * markup, same as `Card`.
 *
 * `PaginationLink` reuses `Button`'s `buttonVariants` (outline when
 * `isActive`, ghost otherwise) so page controls read as part of the same
 * button system instead of a bespoke look.
 *
 * Divergence from shadcn: shadcn's chevrons and the ellipsis dots come from
 * `lucide-react`. This kit uses `@fluentui/react-icons` for iconography
 * elsewhere, but importing it forces `"use client"` onto every file that
 * touches it (see `docs/component-conventions.md` §9 — the icon package's
 * sizing module calls `@griffel/react`'s `__styles()` at module scope without
 * its own `"use client"`, which breaks `next build`'s RSC graph). Pagination
 * has no state of its own and should stay a server component, so the
 * chevrons/dots are inline `<svg>` instead — a deliberate, documented
 * divergence from both shadcn (lucide) and the rest of this kit (Fluent
 * icons).
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only.
 */

function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<VariantProps<typeof buttonVariants>, "size"> &
  ComponentProps<"a">;

function PaginationLink({
  className,
  isActive = false,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="size-4"
      >
        <path
          d="M12.5 5L7.5 10L12.5 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="size-4"
      >
        <path
          d="M7.5 5L12.5 10L7.5 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn("flex size-8 items-center justify-center", className)}
      {...props}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="size-4"
      >
        <circle cx="4" cy="10" r="1.25" fill="currentColor" />
        <circle cx="10" cy="10" r="1.25" fill="currentColor" />
        <circle cx="16" cy="10" r="1.25" fill="currentColor" />
      </svg>
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
