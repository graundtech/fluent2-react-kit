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
 * Base classes match current shadcn/ui (`flex items-center text-sm leading-none
 * select-none`, plus the `peer-disabled`/`group-data-[disabled=true]`
 * ergonomics). Weight is `font-normal` (Regular 400): Fluent 2's Label defaults
 * to Regular, with Semibold (600) offered as an explicit `type="Semibold"`
 * opt-in — confirmed against the Figma Label component set, whose default
 * variant is literally `Type=Regular (Default)`. (An earlier version of this
 * file claimed "Fluent 2's Label type ramp is 14px/600 (semibold)" and hard-set
 * `font-semibold`; that premise was wrong — it made every label render heavier
 * than the Fluent default.) Consumers wanting the Semibold emphasis pass
 * `className="font-semibold"`, which wins through `cn`'s tailwind-merge.
 *
 * Fluent 2 extension: a `required` prop renders a `text-destructive` asterisk
 * after the label's children, separated by `gap-1` (4px = Fluent
 * `spacingHorizontalXS`). The asterisk inherits the label's Regular weight
 * (matching Fluent, which keeps the asterisk Regular even on Semibold labels)
 * and stays `text-destructive` per the kit's single-red policy
 * (tokens-research.md §12.9). It is purely visual — wrapped in
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
        "flex items-center gap-1 text-sm leading-none font-normal select-none",
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
