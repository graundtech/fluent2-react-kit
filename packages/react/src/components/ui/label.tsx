import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Label — Fluent 2-styled, shadcn-API form label.
 *
 * A plain native `<label>`. Unlike the current shadcn/ui implementation (which
 * wraps a Radix/Base UI `Label` primitive), no JS primitive is needed here: the
 * native element already provides the `htmlFor`/`id` association and
 * click-to-focus behavior a "Label" primitive exists to simulate. Server-safe:
 * no `"use client"`, no hooks — the React import is type-only.
 *
 * Base classes match current shadcn/ui (`flex items-center gap-2 text-sm
 * leading-none select-none`, plus the `peer-disabled`/`group-data-[disabled=true]`
 * ergonomics) with one deliberate deviation: `font-semibold` instead of shadcn's
 * `font-medium`, because Fluent 2's Label type ramp is 14px/600 (semibold), not
 * 500 (medium).
 *
 * Fluent 2 extension: a `required` prop renders a `text-destructive` asterisk
 * after the label's children. The asterisk is purely visual — it is wrapped in
 * `aria-hidden="true"` so it never pollutes the computed accessible name.
 * Screen readers announce "required" from the associated form control instead,
 * so pair `required` here with the real `required`/`aria-required="true"`
 * attribute on the input/select/textarea this label is for.
 */
function Label({
  className,
  required = false,
  children,
  ...props
}: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-semibold select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
}

export { Label };
