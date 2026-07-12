import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/**
 * Switch — Fluent 2-styled, shadcn-API on/off toggle.
 *
 * This is a Base UI case (conventions §9): checked/unchecked state, the
 * hidden `<input type="checkbox">` + form bridge, and the `role="switch"` +
 * `aria-checked` wiring are genuine interactive behavior plain markup can't
 * express, so this wraps `@base-ui/react/switch`'s `Switch.Root`/
 * `Switch.Thumb` (imported as the `Switch` namespace from the
 * `@base-ui/react/switch` subpath — that module is literally
 * `export * as Switch from "./index.parts.js"`, matching Avatar's precedent)
 * instead of a raw `<button>`/`<span>` pair. `Switch.Root` renders a `<span
 * role="switch">` (not a native `<button>`/`<input>`) plus a visually-hidden
 * `<input type="checkbox">` for form submission.
 *
 * `"use client"` is intentionally omitted, same reasoning as `avatar.tsx`:
 * `SwitchRoot`/`SwitchThumb` each carry their own `'use client'` directive at
 * the source level (verified in the compiled package output under
 * `@base-ui/react/switch/root/SwitchRoot.mjs` and `.../thumb/SwitchThumb.mjs`),
 * so they are already client boundaries on their own. This wrapper has no
 * hooks/handlers of its own — it only forwards props into those parts — so a
 * Server Component tree can render it unchanged (a Server Component may
 * render an already-client child without re-declaring the directive itself).
 * Confirmed via `pnpm typecheck` + the test suite; add the directive here
 * only if that stops holding true.
 *
 * Aesthetics follow Fluent 2's Toggle Switch (verified against the live
 * Storybook at storybooks.fluentui.dev, DOM-inspected directly since the
 * docs page itself carries no static spec text): a 40x20px (`h-5 w-10`) pill
 * track with a circular thumb — Fluent's own thumb measures ~18px against an
 * 18px content box (nearly flush); this kit intentionally uses the smaller
 * 14px (`size-3.5`) thumb specified for this component, leaving a visible
 * ~2px gap, which reads cleanly at this track size. Fluent's *unchecked*
 * track is outlined + transparent (measured: 1px solid `#616161`, background
 * transparent) — NOT gray-filled like shadcn's default Radix implementation
 * (`data-[state=unchecked]:bg-input`). This kit now binds that outline to the
 * `NeutralStrokeAccessible` ramp (`border-stroke-accessible` = `#616161` rest,
 * `#575757` hover, `#4d4d4d` pressed): spec-true to the measured Fluent value,
 * so this is no longer the earlier `border-input` (`#d1d1d1`) substitution —
 * that documented deviation is retired. The *checked* track measured exactly
 * `#0f6cbd` — this kit's `--primary`/`bg-primary` token — with a white thumb
 * (`#ffffff`, this kit's `--primary-foreground` token in both themes); on
 * hover/press the on-track steps through Fluent's `CompoundBrandBackground`
 * (border+fill `brand-70`/`brand-60`; dark hover `brand-80`), mirroring
 * Button's per-theme brand ramp (conventions §4).
 *
 * The prop surface (`Switch`, `checked`/`defaultChecked`/`onCheckedChange`,
 * no `size` prop) follows the classic shadcn/ui switch API. Note Base UI's
 * state data-attributes differ from Radix's: it emits presence-only
 * `data-checked`/`data-unchecked` (and `data-disabled`/`data-readonly`/
 * `data-required`), not Radix's `data-state="checked" | "unchecked"` — the
 * classes below target Base UI's actual output via Tailwind's presence-based
 * `data-[checked]:` variant.
 */
function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // layout — Fluent medium toggle: 40x20 pill track, thumb centered via flex
        "inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border px-0.5",
        // motion — border/bg color transition on check/uncheck
        "outline-none transition-colors duration-fast ease-ease",
        // off (unchecked) — Fluent's outlined/transparent track, bound to the
        // NeutralStrokeAccessible ramp (spec-true measured #616161 rest ->
        // #575757 hover -> #4d4d4d pressed), see file header.
        "border-stroke-accessible bg-transparent hover:border-stroke-accessible-hover active:border-stroke-accessible-pressed",
        // on (checked) — brand fill (Fluent CompoundBrandBackground), stepping
        // border+fill through Hover/Pressed; dark hover brightens to brand-80.
        // The data-[checked]:hover/active selectors outrank the neutral
        // hover/active border by specificity so the on-track stays brand.
        "data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:hover:border-brand-70 data-[checked]:hover:bg-brand-70 data-[checked]:active:border-brand-60 data-[checked]:active:bg-brand-60 dark:data-[checked]:hover:border-brand-80 dark:data-[checked]:hover:bg-brand-80",
        // focus — Fluent double-stroke approximation (conventions §4)
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // invalid — shadcn aria-invalid treatment (conventions §4); harmless
        // unless the caller pairs this with a Field/validation integration
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        // disabled — opacity read (conventions §4), keyed off Base UI's
        // `data-disabled` rather than the CSS `disabled:` pseudo-class: this
        // control renders a <span role="switch">, not a native
        // <button>/<input>, so `:disabled` never matches it.
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-full",
          "transition-transform duration-fast ease-ease",
          // off — neutral thumb, matches Fluent's measured `#616161`
          "bg-muted-foreground",
          // on — white thumb via the `primary-foreground` token (`#ffffff`
          // in both themes) rather than a literal `bg-white`, per
          // conventions §3.7 (never hardcode a color). Travel distance is
          // the track's content-box width (40 - 2×1px border - 2×2px
          // padding = 34px) minus the 14px thumb = 20px = `translate-x-5`.
          "data-[checked]:translate-x-5 data-[checked]:bg-primary-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
