import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "../../lib/utils";

/**
 * RadioGroup / RadioGroupItem — Fluent 2-styled, shadcn-API radio group.
 *
 * This is a Base UI case (conventions §9): roving tabindex, arrow-key
 * selection and the checked/unchecked state machine are genuine behavior a
 * `<div>` + `<input type="radio">` can't express on their own without
 * reimplementing Base UI's composite-focus logic, so the two parts wrap
 * `@base-ui/react/radio-group` (`RadioGroup`, imported and re-exported as
 * `RadioGroupPrimitive`) and `@base-ui/react/radio` (`Radio`, imported as a
 * namespace exposing `Radio.Root` / `Radio.Indicator` — matches the actual
 * `export * as Radio from "./index.parts.js"` shape in node_modules, same
 * pattern `avatar.tsx` uses for `@base-ui/react/avatar`). Arrow-key
 * roving/selection, click-to-select, and the hidden native
 * `<input type="radio">` (native form participation) all come from Base UI —
 * none of it is reimplemented here.
 *
 * `"use client"` is intentionally omitted here, same reasoning as
 * `avatar.tsx`: `@base-ui/react/radio-group`'s `RadioGroup` and
 * `@base-ui/react/radio`'s `Radio.Root` / `Radio.Indicator` each carry their
 * own `'use client'` directive at the compiled-source level (verified in
 * `node_modules/@base-ui/react/{radio-group/RadioGroup.js,radio/root/RadioRoot.js,radio/indicator/RadioIndicator.js}`),
 * so they are already client boundaries on their own. This wrapper file has
 * no hooks/handlers of its own — it only forwards props into those parts —
 * so per conventions §2 it can stay a plain (server-renderable) module; a
 * Server Component tree can render a Client Component child without the
 * parent re-declaring the directive. Confirmed via `pnpm typecheck` + the
 * test suite; add the directive here only if that stops holding true.
 *
 * Layout: shadcn's reference implementation defaults `RadioGroup` to
 * `"grid gap-3"`. This kit ships `"grid gap-2"` instead — a deliberate,
 * spec-directed deviation to match this component family's spacing scale (a
 * 16px control at `gap-2` == 8px reads as a tighter, denser Fluent list than
 * shadcn's 12px gap). Callers needing shadcn's exact spacing can override via
 * `className="gap-3"` (later utility wins through `cn`'s `tailwind-merge`).
 *
 * Checked indicator: shadcn fills a `lucide-react` `CircleIcon` positioned
 * absolutely inside the indicator. Fluent 2's RadioGroup instead shows a
 * brand-colored **ring** (the whole circle's border turns brand) with a
 * small brand **dot** centered inside — no checkmark glyph. This
 * implementation matches that: the item's border switches to
 * `border-primary` when `data-checked` is present, and the indicator renders
 * a plain `size-2 rounded-full bg-primary` `<span>` (flex-centered, no icon
 * import needed — a filled circle needs no glyph, so pulling in
 * `@fluentui/react-icons` for this would add a dependency for no visual
 * gain). `Radio.Indicator` only mounts while the radio is checked (Base UI
 * unmounts it otherwise, per `RadioIndicator.js`'s `shouldRender` check), so
 * the dot itself needs no extra checked-conditional styling — but it does
 * ramp its color alongside the ring (see below).
 *
 * Borders + interaction ramp: the unchecked ring outlines with Fluent's
 * `NeutralStrokeAccessible` ramp — rest `#616161` (`border-stroke-accessible`),
 * hover `#575757`, pressed `#4d4d4d` — the higher-contrast neutral spec for
 * interactive control outlines (extracted from the Figma radio), NOT the
 * lighter `border-input` grey the item previously used. When checked, the ring
 * (border) and dot step through `CompoundBrandStroke`/`CompoundBrandForeground1`
 * Hover/Pressed (`brand-70`/`brand-60`; dark hover `brand-80`), mirroring
 * Button's per-theme brand ramp (conventions §4). The ring uses
 * `data-[checked]:hover:`/`:active:` (which outrank the neutral hover/active
 * border by specificity); the dot, having no `data-checked` of its own, rides
 * the root's `group` hover/press instead.
 *
 * States: `data-checked`/`data-unchecked` and `data-disabled` are Base UI's
 * own presence attributes on `Radio.Root`'s rendered `<span>` (see
 * `RadioRootDataAttributes` in node_modules — boolean presence, not a
 * `data-state="checked"` value pair like Radix), matched here via Tailwind's
 * `data-[checked]:` / `data-[disabled]:` arbitrary-attribute variants (there
 * is no native `:disabled` pseudo-class to reach for — the rendered element
 * is a `<span role="radio">`, not a real `<input>`/`<button>`, so the
 * opacity/pointer-events disabled recipe from conventions §4 is re-expressed
 * against `data-[disabled]:` instead of `disabled:`). Focus, per conventions
 * §4, stays the generic offset-ring recipe (not the field bottom-accent
 * variant — a radio is a selectable control, not a typed-into field).
 * `aria-invalid` is a bare ARIA attribute Base UI passes through untouched,
 * so the standard `aria-invalid:` recipe applies as-is.
 *
 * Typing: Base UI's `RadioGroup`/`Radio.Root` are generic over the radio
 * value type (`Value = any` upstream). `ComponentProps<typeof X>` on a
 * generic function component collapses that parameter to `unknown` (it has
 * no call site to infer from), which would force every consumer to cast in
 * `onValueChange`. Both parts pin `Value` to `string` instead via each
 * primitive's own namespace type (`RadioGroupPrimitive.Props<string>`,
 * `Radio.Root.Props<string>` — available because Base UI declaration-merges
 * a namespace onto each component, matching shadcn/Radix's own radio API,
 * which is string-only, not generic) so callers get a plain, un-cast
 * `value`/`onValueChange: (value: string, …) => void` surface.
 */
function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.Props<string>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: Radio.Root.Props<string>) {
  return (
    <Radio.Root
      data-slot="radio-group-item"
      className={cn(
        // layout — Fluent 16px circle. `group` lets the checked dot (a child
        // span) pick up the root's hover/press to ramp alongside the ring.
        "group aspect-square size-4 shrink-0 cursor-pointer rounded-full border bg-background",
        // motion
        "outline-none transition-colors duration-fast ease-ease",
        // unchecked — Fluent NeutralStrokeAccessible rest/hover/pressed ramp
        "border-stroke-accessible hover:border-stroke-accessible-hover active:border-stroke-accessible-pressed",
        // checked — Fluent brand ring (the dot itself lives in the indicator),
        // stepping through CompoundBrandStroke Hover/Pressed; dark hover
        // brightens to brand-80 (Button's per-theme ramp). These outrank the
        // neutral hover/active border by specificity so the ring stays brand.
        "data-[checked]:border-primary data-[checked]:hover:border-brand-70 data-[checked]:active:border-brand-60 dark:data-[checked]:hover:border-brand-80",
        // disabled — opacity-based (conventions §4), re-expressed against
        // Base UI's data-disabled presence attribute (this renders a
        // <span>, not a native disableable element)
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // focus — generic offset-ring recipe (conventions §4)
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // invalid — shadcn aria-invalid treatment (conventions §4)
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      <Radio.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        {/* dot — brand fill, ramping with the ring via the root's `group`
            hover/press (CompoundBrandForeground1 Hover/Pressed). */}
        <span className="size-2 rounded-full bg-primary transition-colors duration-fast ease-ease group-hover:bg-brand-70 group-active:bg-brand-60 dark:group-hover:bg-brand-80" />
      </Radio.Indicator>
    </Radio.Root>
  );
}

export { RadioGroup, RadioGroupItem };
