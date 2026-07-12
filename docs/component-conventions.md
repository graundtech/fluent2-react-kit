# Component conventions — `@graundtech/fluent2-react-kit`

The contract every component in this kit follows. It was extracted from the
reference implementation (`Button`) and is **normative**: match it exactly so the
library reads as one system. When in doubt, open
`packages/react/src/components/ui/button.tsx` and copy its shape.

The library is **Fluent 2 in looks, shadcn/ui in API**. Not affiliated with
Microsoft; Fluent 2 is a visual/behavioral reference only — never copy Fluent UI
source.

---

## 0. TL;DR for a new component `<name>`

1. Component → `packages/react/src/components/ui/<name>.tsx`
2. Test → `packages/react/src/components/ui/<name>.test.tsx`
3. Registry fragment → `registry/items/<name>.json`
4. Preview route → `apps/demo/app/preview/<name>/page.tsx`
5. Run, from the repo root, and get all green:
   `pnpm typecheck && pnpm test && pnpm build:registry && pnpm build`

You add **only** the four files above (plus your own preview dir). You touch
nothing else — see §10.

---

## 1. File locations

| Artifact | Path |
| --- | --- |
| Component | `packages/react/src/components/ui/<name>.tsx` |
| Test | `packages/react/src/components/ui/<name>.test.tsx` |
| Registry fragment | `registry/items/<name>.json` |
| Preview page | `apps/demo/app/preview/<name>/page.tsx` |

Filenames are kebab-case (`button.tsx`, `input-otp.tsx`). The registry fragment
stem **must** equal its `name` field (`button.json` ↔ `"name": "button"`), or the
registry build fails.

---

## 2. Component authoring pattern

Copy this shape verbatim (this is `Button`, trimmed):

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

const <name>Variants = cva(
  [
    // base classes — layout, motion, disabled, focus, invalid, icon rules
  ],
  {
    variants: { variant: { /* ... */ }, size: { /* ... */ } },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function <Name>({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof <name>Variants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="<name>"
      data-variant={variant}
      data-size={size}
      className={cn(<name>Variants({ variant, size, className }))}
      {...props}
    />
  );
}

export { <Name>, <name>Variants };
```

Rules, non-negotiable:

- **Plain function component. No `React.forwardRef`.** React 19 passes `ref`
  through as a normal prop; `ComponentProps<"button">` already includes it.
- **Props type** = `ComponentProps<"el"> & VariantProps<typeof …Variants> & { asChild?: boolean }`.
  Use `import type { ComponentProps } from "react"` (type-only) so nothing pulls
  React in as a runtime value. `React.ComponentProps<"el">` is equivalent if you
  prefer the namespace form — either is fine, but keep the import type-only.
- **`data-slot="<name>"`** on the root element, always. It is the styling/testing
  hook consumers rely on. Also emit `data-variant` / `data-size` when the
  component is variant-driven (mirror `Button`).
- **`asChild`** via `@radix-ui/react-slot`'s `Slot` (already an installed dep of
  `packages/react`). `const Comp = asChild ? Slot : "el"`. Only add `asChild`
  where polymorphism is meaningful (a button-as-link, a card-as-`<a>`); skip it
  for leaf elements where it makes no sense.
- **`cn`** from `../../lib/utils` composes every class list (it runs
  `tailwind-merge`, so later utilities win over earlier ones — that is what makes
  `className` overrides work).
- **`cva`** holds all variants. Put shared classes in the base array; put only the
  differences in each variant/size. Always declare `defaultVariants`, and default
  the destructured props to those same values (`variant = "default"`) so
  `data-variant` is populated even when the prop is omitted.
- **Export both** `<Name>` and `<name>Variants` (named exports, no default). The
  variants helper lets consumers style a raw `<a>` like the component.

### `"use client"` — when it is allowed

`Button` has **no** `"use client"` and neither should any component that is pure
markup + classes. It stays a React Server Component so it drops into an RSC tree
unchanged.

Add `"use client"` **only** when the component itself uses client-only React
features: `useState`/`useReducer`, `useEffect`/`useLayoutEffect`, `useRef` for
imperative DOM work, `useContext`/a Provider, or event handlers defined *inside*
the component (not passed in by the caller — a caller's `onClick` does not force
`"use client"`). If you reach for a Base UI primitive that manages state
(§9), that file needs `"use client"`.

One non-obvious extra trigger: **importing from `@fluentui/react-icons` forces
`"use client"`** even when the component has no hooks/handlers of its own and
every Base UI part it wraps already carries its own directive. See §9 for the
root cause; `select.tsx` and `checkbox.tsx` are the precedents.

---

## 3. Token usage rules

Tokens live in `packages/react/src/styles/tokens.css` (do not edit it). Use them
through Tailwind utilities. Full semantics: `docs/design/tokens-research.md`.

1. **Semantic vars first.** Reach for the shadcn semantic utilities before
   anything else: `bg-background`/`text-foreground`, `bg-primary`/
   `text-primary-foreground`, `bg-secondary`, `bg-muted`/`text-muted-foreground`,
   `bg-accent`/`text-accent-foreground`, `bg-card`/`bg-popover`, `bg-destructive`,
   `border-border`, `border-input`, `ring-ring`. These re-point automatically in
   dark mode.
2. **Brand ramp for interactive states** of brand-filled surfaces. The full ramp
   is exposed as `bg-brand-10 … bg-brand-160` / `text-brand-*`. It is a **global**
   ramp — the same hex in light and dark — so state steps that must differ per
   theme need an explicit `dark:` override (see the primary recipe in §4).
3. **Status extensions:** `bg-success*`, `bg-warning*` (Fluent darkOrange, plus a
   separate `text-warning-text` for AA-safe warning text), `*-subtle` /
   `*-border` variants for `destructive`/`success`/`warning`.
4. **Radius:** `rounded-md` (= 4px, Fluent medium) is the default control radius —
   buttons, inputs, badges. `rounded-lg`/`rounded-xl` for cards/dialogs.
5. **Motion:** `duration-fast` (150ms) for hover/press color transitions;
   `duration-normal` (200ms) for larger moves. Easing utilities: `ease-ease`
   (default control curve), `ease-max`, `ease-decelerate-*` (enter),
   `ease-accelerate-*` (exit). Reduced motion is handled by the token layer
   automatically — do not add your own `motion-reduce:` duration hacks.
   **Popup/overlay enter-exit motion** rides Base UI's `data-starting-style`/
   `data-ending-style` hooks with a scale+fade, and the transition list is
   always `transition-[opacity,scale]` — **never** `transition-[transform,opacity]`.
   Tailwind v4 emits `scale-*`/`translate-*` as the independent `scale:`/
   `translate:` CSS properties (not `transform:`), so a `transform`-based list
   leaves the zoom snapping instead of animating; this shipped broken in four
   components before transition instrumentation caught it. Rationale and the
   translate/scale coexistence note live in `dialog.tsx`'s doc comment.
6. **Elevation:** Fluent controls are **flat**. Use `shadow-8`/`shadow-16`/
   `shadow-28`/`shadow-64` only for genuinely floating surfaces (popover, dialog,
   drawer). Buttons, inputs, cards-at-rest carry no shadow.
7. **Never hardcode a color.** No hex, no `rgb()`, no Tailwind palette colors
   (`bg-blue-600`, `text-gray-500`). If a shade you need is not a token, use the
   nearest semantic token or the brand ramp — do not invent one.

---

## 4. State recipes (copy these class strings)

These are the exact strings from `Button`. Reuse them so every component's
states behave identically.

**Base line** (goes in the cva base array of most interactive controls):

```
outline-none transition-colors duration-fast ease-ease
disabled:pointer-events-none disabled:opacity-50
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40
```

- **Focus** — Fluent's double-stroke look, approximated with a 2px brand ring plus
  a 2px surface-colored offset gap (`ring-offset-background`). Keyboard-only via
  `:focus-visible`. Minimum 2px, always. In forced-colors mode the token layer
  swaps the ring to `Highlight`.
- **Disabled** — **opacity-based** (`disabled:pointer-events-none disabled:opacity-50`).
  Chosen over token colors deliberately: it is uniform across every variant and
  every component (one line to replicate), and it reads as clearly disabled,
  whereas `text-muted-foreground` (#616161) is too dark to look disabled and the
  token set has no dedicated `--*-disabled` foreground. Use this line as-is.
- **Invalid** — the shadcn `aria-invalid:` treatment above. Include it on any
  control that can be form-invalid (inputs, selects, etc.); harmless on others.
- **Pressed** — use `active:` (not a data attribute).
- **Motion** — `transition-colors duration-fast ease-ease` for color/hover/press.
- **Data-attribute variants** — when a Base UI primitive exposes state as a
  presence data attribute (`data-checked`, `data-disabled`, `data-highlighted`,
  `data-placeholder`, …), target it with the **bracketed** Tailwind form
  (`data-[checked]:`, `data-[disabled]:`, `data-[highlighted]:`), never the bare
  `data-checked:` shorthand. Both compile identically in Tailwind v4; the
  bracket form is the kit's canonical spelling (checkbox, radio-group, switch,
  and select all use it) so class strings read the same across every component.

**Brand-filled interactive state ramp** (primary buttons, filled brand
surfaces). The ramp is global, so hover/press differ per theme (spec §2.5):

```
bg-primary text-primary-foreground hover:bg-brand-70 active:bg-brand-60 dark:hover:bg-brand-80
```

rest `brand-80` → hover `brand-70` → pressed `brand-60` in light; rest `brand-70`
→ hover `brand-80` → pressed `brand-60` in dark (`bg-primary` already carries the
per-theme rest color).

**Neutral interactive state ramp** (secondary/outline/ghost). Because the exposed
neutral tokens don't form a clean 3-step ramp in both themes, split by theme like
shadcn does:

- ghost: `hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/70`
- outline: `border border-input bg-transparent hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:bg-input/30 dark:hover:bg-input/50 dark:active:bg-input/70`
- secondary (filled neutral): `border border-border bg-secondary text-secondary-foreground hover:bg-accent active:bg-input dark:hover:bg-input dark:active:bg-input`

**Destructive:** `bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive` (there is no red ramp; opacity gives the state step and the ring turns red).

**Control stroke + interaction ramp** (selectable controls with an outlined
unchecked state that fills brand when on — checkbox, radio, switch). The
unchecked outline uses Fluent's `NeutralStrokeAccessible` ramp
(`--stroke-accessible` `#616161` rest → `#575757` hover → `#4d4d4d` pressed;
dark `#adadad`/`#b3b3b3`/`#bdbdbd`), **not** `border-input` — that lighter grey
reads too faint for an interactive control outline. When checked, the control
fills brand and its border+fill step through the Compound brand ramp on
hover/press. Exact strings, from `checkbox.tsx`:

```
border-stroke-accessible hover:border-stroke-accessible-hover active:border-stroke-accessible-pressed
data-[checked]:border-primary data-[checked]:bg-primary
data-[checked]:hover:border-brand-70 data-[checked]:hover:bg-brand-70 data-[checked]:active:border-brand-60 data-[checked]:active:bg-brand-60 dark:data-[checked]:hover:border-brand-80 dark:data-[checked]:hover:bg-brand-80
```

The `data-[checked]:hover:`/`:active:` selectors carry more specificity than the
plain `hover:`/`active:` neutral-border ones, so the checked state always wins
its border on hover — no source-order fragility. Radio omits the `bg-*` fills
(its checked state is a ring + centered dot, so only `border-*` ramps; the dot,
having no `data-checked` of its own, rides the root's `group` hover/press).
Switch adds the same recipe on its track. The related `--stroke-accessible`
family also paints the resting **bottom** edge of typed-into fields
(`Input`/`Select` trigger) via `border-b-stroke-accessible`, Fluent's signature
darker field underline at rest (focus/`aria-invalid` override it).

**Field focus (Fluent bottom accent)** — the sanctioned per-component deviation
from the offset ring, for field-like controls (`Input`, `Textarea`, `Select`).
It paints a 2px brand underline *inside* the border box via an inset box-shadow
(no reflow) and switches the border to `border-primary` so the whole field reads
as active. Exact strings, from `input.tsx`:

```
transition-[color,box-shadow] duration-fast ease-ease
focus-visible:border-primary focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-80)] dark:focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-100)]
aria-invalid:focus-visible:shadow-[inset_0_-2px_0_0_var(--destructive)]
```

Use it for controls the user **types into** — an offset ring around a text field
reads as floating outside it rather than "this field is active"; everything else
(buttons, links, triggers, checkboxes) keeps the offset ring recipe above. Note
the motion utility is `transition-[color,box-shadow]` (not `transition-colors`)
so the accent animates, the `--brand-*`/`--destructive` stops are read via
`var()` because the brand ramp is global (the light/dark split is just which
stop the inset shadow uses), and the `aria-invalid:focus-visible:` line comes
*after* the focus line so an invalid+focused field shows the destructive accent,
not a reassuring brand-blue one.

---

## 5. Accessibility checklist (mandatory)

- **axe test is required.** Every component's test file must render the default
  state and at least one important secondary state (e.g. disabled/open) and
  assert `await expect(container).toHaveNoAxeViolations()`. The matcher is set up
  globally in `src/test/setup.ts`.
- **Keyboard.** Interactive components must be operable by keyboard and have a
  visible `:focus-visible` ring (§4). Test the real activation path with
  `@testing-library/user-event` (Enter/Space for buttons, Arrow keys for
  composites, Escape to dismiss, etc.).
- **Semantics first, ARIA second.** Prefer a native element (`<button>`,
  `<a href>`, `<input>`, `<label>`). Add ARIA roles/states **only** when native
  semantics can't express the pattern (e.g. `role="tablist"`, `aria-selected`,
  `aria-expanded`). Icon-only controls need an accessible name
  (`aria-label`). Never add a `role` that duplicates a native one.
- **Don't convey state by color alone** (pair with text/icon/border) — matters in
  high-contrast mode.

---

## 6. Test checklist (minimum cases)

Vitest + Testing Library + `user-event`. See `button.test.tsx` for the template.
Minimum per component:

- renders children / accessible name; root element is the expected tag.
- `data-slot` (and `data-variant`/`data-size` when applicable) present.
- each **variant** produces its distinguishing class; each **size** likewise.
- caller `className` merges without dropping variant classes.
- primary interaction fires (`onClick`/selection) via `user-event`.
- disabled (or equivalent) blocks interaction.
- keyboard activation works (Enter/Space/Arrows as appropriate).
- `asChild` renders the child element with merged classes + props (when the
  component supports `asChild`).
- `ref` reaches the underlying DOM node.
- `<name>Variants(...)` returns a class string.
- **axe**: default + one secondary state, both `toHaveNoAxeViolations()`.

`type` attribute note: **do not force `type="button"`.** shadcn doesn't, so we
don't — a bare `<Button>` has no `type` (native default applies), and callers
pass `type` when they need it. Test asserts `not.toHaveAttribute("type")` for the
default and forwarding for an explicit value.

---

## 7. Registry fragment checklist

One file: `registry/items/<name>.json`. Format is documented in
`registry/items/README.md`. Checklist:

- `name` = filename stem, kebab-case.
- `type`: `registry:ui` for a component.
- `title`, `description`: present and human-readable.
- `dependencies`: the **npm** packages the copied file imports — e.g.
  `class-variance-authority`, and `@radix-ui/react-slot` if you use `asChild`.
  (Do **not** list `clsx`/`tailwind-merge`; they arrive via the `utils` registry
  dep.) Pin a version only if truly required.
- `registryDependencies`: `["utils"]` (everything uses `cn`). Add other kit item
  names here if your component imports them.
- `files`: one entry, `path` = repo-relative source
  (`packages/react/src/components/ui/<name>.tsx`), `target` =
  `components/ui/<name>.tsx`.

Reference: `registry/items/button.json`. Verify with `pnpm build:registry`.

---

## 8. Preview page pattern

`apps/demo/app/preview/<name>/page.tsx`. A plain Server Component that renders
every variant × size plus edge rows (disabled, with-icon, `asChild`), on
`bg-background`.

Import through the **`@kit/*` alias** (added to `apps/demo/tsconfig.json`,
resolves to `packages/react/src/*`), which Next resolves via `transpilePackages`:

```tsx
import { <Name> } from "@kit/components/ui/<name>";
```

Do **not** import from the package index (`@graundtech/fluent2-react-kit`) — it
does not re-export UI components; integration happens in a later phase. Keep
example icons inline as `<svg>` (don't add an icon dependency to the demo).

> **Preview styling prerequisite (infra, not yours to fix).** Under Next's
> Turbopack, Tailwind only scans files inside `apps/demo`, so utilities used
> *only* in a component (e.g. `size-8`, `hover:bg-accent`) are dropped and the
> preview renders half-styled. Fixing this requires an `@source` line in
> `apps/demo/app/globals.css` pointing at `../../../packages/react/src` — a
> reserved file owned by the maintainers. **Do not touch globals.css and do not
> try to work around this in your preview.** Your page still must *build*; full
> styling depends on that one-time infra fix. Flag it if your preview looks
> unstyled; don't patch it.

---

## 9. Base UI usage policy

`@base-ui/react` is installed in `packages/react`. Use its unstyled primitives
when a component's **behavior** genuinely needs them — focus management, portals,
open/close state, roving tabindex, an image-with-fallback loading state (Avatar),
etc. In those cases the component is client-side (`"use client"`), you style Base
UI's parts with our token utilities, and you keep our shadcn-style prop surface on
the outside.

Do **not** wrap Base UI when plain markup + classes suffice (Button, Badge,
Card, Separator, most static UI). Reaching for a primitive you don't need adds a
client boundary and bundle weight for nothing.

`@fluentui/react-icons` is also available in `packages/react` if a component needs
built-in icons — but do not add it to the demo app.

**Icons force `"use client"`.** Any component that imports from
`@fluentui/react-icons` **must** start with `"use client"`, even if it has no
hooks/handlers and every Base UI part it uses is already its own client
boundary. Root cause: the icons package's shared sizing module
(`createFluentIcon.styles.js`) calls `@griffel/react`'s `__styles()` at *module
scope* without its own `"use client"` directive, even though `__styles` is
client-only. Importing any icon into a Server Component pulls that module into
the server's RSC graph, and `next build` (Turbopack) then fails collecting page
data with "Attempted to call `__styles()` from the server but `__styles` is on
the client" — reproduced against `@fluentui/react-icons@2.0.333` /
`@griffel/react@1.7.5`, and it poisons every route sharing Turbopack's chunk for
those icons, not just the offending one. Declaring `"use client"` at the top of
the component keeps the icon imports inside a client boundary so they're never
evaluated on the server. Precedents: `select.tsx` and `checkbox.tsx` both carry
this fix (their doc comments explain it inline).

---

## 10. Shared-files rule (hard boundaries)

You are one of several parallel agents. To avoid conflicts, **only** create/edit:

- `packages/react/src/components/ui/<name>.tsx`
- `packages/react/src/components/ui/<name>.test.tsx`
- `registry/items/<name>.json`
- `apps/demo/app/preview/<name>/page.tsx`

**Never touch:**

- `packages/react/src/index.ts` (the package barrel — integration is a later phase)
- `packages/react/src/lib/**`, `src/styles/**`, `src/test/setup.ts`
- any other `registry/items/*.json`
- `apps/demo/app/` outside your own `preview/<name>/` dir — especially
  `page.tsx`, `layout.tsx`, `globals.css`
- `apps/demo/tsconfig.json`, `apps/demo/next.config.mjs`,
  `apps/demo/postcss.config.mjs` (the `@kit` alias + Tailwind setup already exist)
- any `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `scripts/**`

**New npm dependencies are forbidden.** Everything you need is installed:
`class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`,
`@base-ui/react`, `@fluentui/react-icons`. If you think you need another package,
you almost certainly don't — re-read this doc; if you truly do, stop and escalate
rather than editing `package.json`.

---

## 11. Naming rules

- **Follow shadcn names**, not Fluent's. It's `Button` not `FluentButton`;
  `variant="ghost"` not `variant="subtle"`; `variant="secondary"` not
  `"standard"`. No `Fluent`/`F` prefixes anywhere — component names, files, props,
  or data attributes.
- Variant/size prop **values** follow shadcn too: `default | secondary | outline |
  ghost | destructive | link`; sizes `sm | default | lg` and `icon-sm | icon |
  icon-lg` for square controls. Map Fluent's aesthetics onto these names; don't
  rename the API.
- Components are `PascalCase`; files, registry names, and `data-slot` values are
  `kebab-case`.
```
