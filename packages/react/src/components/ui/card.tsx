import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Card — Fluent 2-styled, shadcn-API card family.
 *
 * Structure matches shadcn/ui's current Card exactly: seven composable parts
 * (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`,
 * `CardContent`, `CardFooter`), each a plain `<div>` carrying its own
 * `data-slot`. `CardHeader` is a grid so an optional `CardAction` can sit in
 * its own column/row-span without extra markup (shadcn's `has-data-[slot=...]`
 * trick) — see https://ui.shadcn.com/docs/components/card.
 *
 * Fluent 2 aesthetics layered on top of that skeleton:
 * - `rounded-lg` + `border` + `shadow-4` (Fluent's resting elevation for a
 *   filled card — https://storybooks.fluentui.dev/react/?path=/docs/components-card--docs)
 *   instead of shadcn's default `rounded-xl` + `shadow-sm`.
 * - `bg-card text-card-foreground` (shadcn semantic tokens, re-pointed for
 *   dark mode by tokens.css).
 * - `CardTitle` is `font-semibold` (Fluent card titles are weight 600).
 * - Spacing: Fluent's own medium card padding is 12px (`p-3`), noticeably
 *   tighter than shadcn's 24px (`p-6`) default. We split the difference and
 *   land on 16px (`gap-4` / `p-4` / `px-4`) — visibly tighter than shadcn so
 *   the Fluent influence reads, while keeping enough breathing room that the
 *   header/content/footer rhythm still feels like the familiar shadcn
 *   composition (a straight 12px port felt cramped next to Button's 32px
 *   controls). Document this if you change it.
 *
 * No `variant`/`size` props: shadcn's Card ships none, so there is no `cva`
 * table here (unlike Button) — every part is a plain function component.
 * Interactive/selectable card states (Fluent has them) are intentionally not
 * implemented — see the component's test file / PR notes for backlog.
 *
 * Server-safe: no `"use client"`, no hooks — the React import is type-only.
 */

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card py-4 text-card-foreground shadow-4",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 [.border-t]:pt-4", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
