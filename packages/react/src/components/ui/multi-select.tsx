"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { DismissRegular } from "@fluentui/react-icons";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/utils";
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "./combobox";

/**
 * Multi Select — Fluent 2-styled multiple-selection combobox with a chips field.
 *
 * Built DIRECTLY on the kit's `Combobox` reference (`./combobox`). Base UI's
 * `Combobox.Root` already carries the multiple-selection engine — passing
 * `multiple` turns `value`/`onValueChange` into arrays and unlocks the chips
 * parts (`Combobox.Chips`/`Chip`/`ChipRemove`). This file's only NEW surface is
 * the **chips field** (`MultiSelectInput` + `MultiSelectChip`); everything on the
 * popup side is re-exported from `combobox.tsx` unchanged.
 *
 * ## Reuse model — what is new vs a pass-through
 * | Exported (kit name)   | Source                                              |
 * | --------------------- | --------------------------------------------------- |
 * | `MultiSelect`         | `Combobox.Root` with `multiple` defaulted to `true` |
 * | `MultiSelectInput`    | **NEW** chips field: `Combobox.Chips` (field chrome) wrapping a `Combobox.Value` chip flow + `Combobox.Input` |
 * | `MultiSelectChip`     | **NEW** one selected-value chip: `Combobox.Chip` + `Combobox.ChipRemove` |
 * | `MultiSelectContent`  | pass-through re-export of `ComboboxContent`          |
 * | `MultiSelectList`     | pass-through re-export of `ComboboxList`             |
 * | `MultiSelectItem`     | pass-through re-export of `ComboboxItem`             |
 * | `MultiSelectGroup`    | pass-through re-export of `ComboboxGroup`            |
 * | `MultiSelectLabel`    | pass-through re-export of `ComboboxLabel`            |
 * | `MultiSelectEmpty`    | pass-through re-export of `ComboboxEmpty`            |
 * | `MultiSelectSeparator`| pass-through re-export of `ComboboxSeparator`        |
 *
 * ## Divergences (all deliberate)
 * 1. **The popup parts are literal re-exports, so they keep their
 *    `data-slot="combobox-…"` values** — they ARE the Combobox parts, aliased for
 *    a coherent `MultiSelect*` call site. Only the two parts this file owns get
 *    `data-slot="multi-select-…"` (`multi-select-input-wrapper`,
 *    `multi-select-input`, `multi-select-chip`, `multi-select-chip-remove`). This
 *    avoids forking identical popup markup and keeps the registry item lean
 *    (`registryDependencies: ["utils", "combobox"]`, like `pagination` depends on
 *    `button`). Selected items still render the right-side `CheckmarkRegular` from
 *    `ComboboxItem` — in `multiple` mode Base UI mounts the indicator for every
 *    selected option.
 * 2. **`MultiSelectInput` is NOT `ComboboxInput`.** `ComboboxInput` is the
 *    single-line surface (h-8, one `<input>` + Clear + chevron). The chips field
 *    is a wrapping token field: `min-h-8` + `flex-wrap` + `gap-1` + `py-1` so
 *    chips reflow to multiple rows, with the text `<input>` sitting inline at the
 *    end. It reuses `combobox-input-wrapper`'s field-chrome recipe verbatim — the
 *    `border-input`/`border-b-stroke-accessible` rest edge, the
 *    `has-[input:focus-visible]` bottom brand accent, the
 *    `has-[input[aria-invalid]]` destructive form, the `has-[input:disabled]`
 *    opacity — because focus/invalid/disabled all still land on the inner input.
 * 3. **No baked-in Clear or chevron `Trigger`.** The single-select field bakes a
 *    `Combobox.Clear` + chevron in; a tags picker's affordances are the chips
 *    themselves (each removable) and Backspace-clears-last, so the chips field
 *    stays chrome-light. Open with focus + type or `ArrowDown`. Consumers who want
 *    a clear-all/chevron can compose `@base-ui/react/combobox`'s `Clear`/`Trigger`
 *    directly.
 * 4. **Chip visuals are Fluent Tag (Small, Filled), Badge-adjacent.** A chip is
 *    `bg-secondary` `text-foreground-2`, `rounded-md`, `h-6`, `px-1.5`, `text-xs` — the
 *    neutral filled look of `Badge variant="secondary"` but sized for an inline
 *    token (Badge is a static 20px caption chip; a removable token needs the extra
 *    height + a trailing dismiss target). The remove button hover matches Fluent
 *    Tag's `.Secondary action` Hover (node `9112:11155`, captured in the Figma
 *    re-pass 2026-07-14): brand glyph (`--primary`) over a subtle neutral fill
 *    (`--accent`), NOT destructive-red — Fluent treats tag dismiss as a normal,
 *    reversible interactive control; the `DismissRegular` glyph carries the meaning
 *    (conventions §5). (The earlier `text-destructive` was a provisional choice
 *    kept while Pass 3's Figma read was rate-limited; the reference now adjudicates
 *    it.)
 *
 * ## Chips wiring — what Base UI provides vs what is wired here
 * The chip flow is rendered from `Combobox.Value`'s render-function child, which
 * receives the live `selectedValue` array and re-renders on every selection — so
 * an UNCONTROLLED `MultiSelect` (the preview / RSC case) shows chips without any
 * consumer `useState`. Base UI owns the keyboard model for free:
 * - **Backspace on an empty input removes the last chip** (Base UI `ComboboxInput`).
 * - **ArrowLeft/Right move between chips; Backspace/Delete on a focused chip
 *   removes it** (Base UI `ComboboxChip`).
 * - **Clicking a `ChipRemove` deselects that value and refocuses the input**
 *   (Base UI `ComboboxChipRemove`).
 * - **The popup stays OPEN after selecting** in `multiple` mode (Base UI default),
 *   so several tags can be picked in a row.
 * This file only styles those parts and maps each value to a chip.
 *
 * ## `"use client"` — required
 * `@fluentui/react-icons` forces it (the `DismissRegular` import): the package's
 * shared icon-sizing module calls `@griffel/react`'s `__styles()` at module scope
 * without its own directive, so importing an icon into a Server Component breaks
 * `next build` (conventions §9; same fix as `select.tsx`/`combobox.tsx`).
 */

function MultiSelect<Value, Multiple extends boolean | undefined = true>({
  multiple,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple>) {
  return (
    <ComboboxPrimitive.Root
      multiple={(multiple ?? true) as Multiple}
      {...props}
    />
  );
}

/**
 * Chip — one selected value, rendered from `MultiSelectInput`'s chip flow (or
 * composed by a caller who passes their own render child). `Combobox.Chip` holds
 * the label; the trailing `Combobox.ChipRemove` button deselects it. Base UI maps
 * a chip to `selectedValue[index]` via its composite-list order, so chips must be
 * rendered in selection order (which `Combobox.Value`'s array is).
 */
function MultiSelectChip({
  className,
  children,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Chip>) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="multi-select-chip"
      className={cn(
        // Fluent Tag (Small, Filled): 24px, #f5f5f5 fill, 4px radius
        // (rounded-md), Caption-1 text in NeutralForeground2 (text-foreground-2)
        // — exact token values from Figma validation pass 3, node 9112:10360.
        "inline-flex h-6 items-center gap-1 rounded-md bg-secondary px-1.5 text-xs text-foreground-2 select-none",
        // highlighted (chip keyboard focus) + disabled
        "data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ChipRemove
        data-slot="multi-select-chip-remove"
        aria-label="Remove"
        className={cn(
          "-mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none",
          // hover — Fluent Tag `.Secondary action` Hover (node 9112:11155): the
          // dismiss glyph goes brand (`NeutralForeground2.BrandHover` #0f6cbd ==
          // --primary) over a subtle neutral fill (`NeutralBackground3.Hover`
          // #ebebeb ≈ --accent #f0f0f0). NOT destructive-red — removing a tag is a
          // reversible micro-action, and Fluent treats it as a normal interactive
          // control; the DismissRegular glyph carries the "remove" meaning (§5).
          "transition-colors duration-fast ease-ease hover:bg-accent hover:text-primary",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "[&_svg]:pointer-events-none [&_svg]:size-3"
        )}
      >
        <DismissRegular />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  );
}

/**
 * Input — the Fluent chips field (divergence 2). `Combobox.Chips` is the
 * field-chrome container (flex-wrap token row) holding the chip flow and the
 * inline text `<input>`. `children`, when given, is a render function
 * `(value) => ReactNode` that maps each selected value to its chip content —
 * use it to look up a label for `{ value, label }` items or to style the chip.
 * With no `children`, each value is rendered as a `MultiSelectChip` showing
 * `String(value)` (the flat-string case). `className`/`ref`/`...props` forward to
 * the inner `<input>`; style the field with `wrapperClassName`.
 */
function MultiSelectInput({
  className,
  wrapperClassName,
  children,
  ...props
}: Omit<ComponentProps<typeof ComboboxPrimitive.Input>, "children"> & {
  wrapperClassName?: string;
  children?: (value: unknown) => ReactNode;
}) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="multi-select-input-wrapper"
      className={cn(
        // layout — wrapping token field. min-h-8 (chips reflow to rows), flex-wrap,
        // gap-1, py-1. Resting bottom edge uses NeutralStrokeAccessible; the other
        // sides stay border-input. Focus + aria-invalid override it (below).
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md border border-input border-b-stroke-accessible bg-background px-1.5 py-1 text-sm",
        // motion — color + box-shadow so the focus accent animates (§4)
        "transition-[color,box-shadow] duration-fast ease-ease",
        // focus — Fluent bottom brand accent via inset box-shadow, no reflow (§4).
        // has-[input:focus-visible] because focus is on the inner input.
        "has-[input:focus-visible]:border-primary has-[input:focus-visible]:shadow-[inset_0_-2px_0_0_var(--brand-80)] dark:has-[input:focus-visible]:shadow-[inset_0_-2px_0_0_var(--brand-100)]",
        // invalid — shadcn aria-invalid treatment; after focus so it wins the border
        "has-[input[aria-invalid='true']]:border-destructive has-[input[aria-invalid='true']]:ring-destructive/20 dark:has-[input[aria-invalid='true']]:ring-destructive/40",
        "has-[input[aria-invalid='true']:focus-visible]:shadow-[inset_0_-2px_0_0_var(--destructive)]",
        // disabled — opacity read when the whole control is disabled
        "has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50",
        wrapperClassName
      )}
    >
      <ComboboxPrimitive.Value>
        {(selected: unknown) =>
          (Array.isArray(selected) ? selected : []).map((value, index) =>
            children ? (
              children(value)
            ) : (
              <MultiSelectChip key={index}>{String(value)}</MultiSelectChip>
            )
          )
        }
      </ComboboxPrimitive.Value>
      <ComboboxPrimitive.Input
        data-slot="multi-select-input"
        className={cn(
          "h-6 min-w-16 flex-1 bg-transparent px-1 outline-none",
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          className
        )}
        {...props}
      />
    </ComboboxPrimitive.Chips>
  );
}

// Popup-side parts are the Combobox parts, aliased for a MultiSelect* call site
// (divergence 1 — they keep their `data-slot="combobox-…"`).
const MultiSelectContent = ComboboxContent;
const MultiSelectList = ComboboxList;
const MultiSelectItem = ComboboxItem;
const MultiSelectGroup = ComboboxGroup;
const MultiSelectLabel = ComboboxLabel;
const MultiSelectEmpty = ComboboxEmpty;
const MultiSelectSeparator = ComboboxSeparator;

export {
  MultiSelect,
  MultiSelectInput,
  MultiSelectChip,
  MultiSelectContent,
  MultiSelectList,
  MultiSelectItem,
  MultiSelectGroup,
  MultiSelectLabel,
  MultiSelectEmpty,
  MultiSelectSeparator,
};
