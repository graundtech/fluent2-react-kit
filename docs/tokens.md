# Design tokens

`@graundtech/fluent2-react-kit` ships one CSS file, `packages/react/src/styles/tokens.css`, that carries the entire Fluent 2 → shadcn token system: raw CSS custom properties plus a Tailwind v4 `@theme inline` bridge that turns every token into a utility class (`bg-primary`, `rounded-md`, `shadow-8`, `duration-fast`, …). Every component in the kit is styled exclusively through these tokens — no hardcoded colors, no one-off values (enforced in [`docs/component-conventions.md`](component-conventions.md) §3).

This doc covers the token system from a **consumer's** point of view: how to import it, what each layer contains, how theming works, and how to customize it. For the research behind *why* each value was chosen, see [`docs/design/tokens-research.md`](design/tokens-research.md) §12 (the final decisions) — this doc doesn't repeat that reasoning.

## Importing the tokens

### Via the npm package

```css
/* globals.css */
@import "tailwindcss";
@import "@graundtech/fluent2-react-kit/tokens.css";
```

The token import **must** come after `@import "tailwindcss";` and before your own rules — `tokens.css` itself doesn't import Tailwind (the consumer owns that), so the order matters for cascade and for Tailwind's `@theme inline` block to see the variables it's re-exporting.

### Via the registry (`theme` item)

```bash
npx shadcn@latest add <registry-url>/r/theme.json
```

This copies `tokens.css` into your project as `styles/fluent2-tokens.css`. Because it lands **one level above** `app/` (at the project root, beside it, not inside it), the import path from `app/globals.css` in a Next.js App Router project needs to climb one directory:

```css
@import "tailwindcss";
@import "../styles/fluent2-tokens.css";
```

If your project has no `app/` folder — a common Vite layout where `globals.css` lives directly in `src/` next to `src/styles/` — drop the `../`:

```css
@import "tailwindcss";
@import "./styles/fluent2-tokens.css";
```

Install `theme` **before** any component item — every component assumes these tokens already exist and will render unstyled (or fall back to browser defaults) without them.

## The layer map

`tokens.css` is organized in the order below (light values on `:root, .light`; dark overrides on `.dark`; then the two high-contrast mechanisms; then the Tailwind bridge):

| Layer | What it covers | Example vars |
| --- | --- | --- |
| **shadcn core set** | The exact variable names every shadcn/ui component expects — background/foreground pairs for `background`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, plus `border`, `input`, `ring` | `--background`, `--primary`, `--primary-foreground`, `--border`, `--ring` |
| **Chart & sidebar** | shadcn's chart palette (`--chart-1..5`) and sidebar/nav-rail color set | `--chart-1`, `--sidebar-accent` |
| **Brand ramp** | The full 16-stop Fluent `brandWeb` blue ramp, exposed globally (same hex in light and dark) so components can express hover/pressed/selected states shadcn's single `--primary` can't | `--brand-10` … `--brand-160` (utilities: `bg-brand-80`, `text-brand-70`, …) |
| **Status extensions** | Success/warning color families beyond shadcn's lone `--destructive`, each with a fill, a foreground, a `-subtle` background tint, and a `-border` tint; `--warning-text` and `--destructive-text` are separate AA-safe text colors from their respective fills (the fill alone doesn't clear 4.5:1 against the `-subtle` background in both themes) | `--success`, `--success-subtle`, `--warning`, `--warning-text`, `--destructive-subtle`, `--destructive-text` |
| **Radius** | Single base `--radius: 6px` (Fluent "large"); `rounded-sm/md/lg/xl` derive from it via the standard shadcn `calc()` offsets, landing `rounded-md` on Fluent's medium (4px) — the radius most controls (buttons, inputs, badges) use | `--radius`, `--radius-md`, `--radius-full` |
| **Shadows** | Fluent's key+ambient layered elevation model, six steps from `shadow-2` (cards at rest) to `shadow-64` (dialogs/modals); flat by default — Fluent controls carry no shadow, only genuinely floating surfaces do. `--shadow-brand-*` primitives are also shipped for branded elevated surfaces | `--shadow-2` … `--shadow-64`, `--shadow-brand-ambient`, `--shadow-brand-key` |
| **Typography** | Segoe UI-first font stack with cross-platform fallbacks (`-apple-system`, Roboto), a monospace stack, a numeric-tabular stack, and the four Fluent font weights | `--font-sans`, `--font-mono`, `--font-weight-semibold` |
| **Motion** | Eight Fluent durations (50ms–500ms) and nine Fluent cubic-bezier easings (accelerate/decelerate/ease/linear families), exposed both as raw custom properties and as Tailwind `duration-*`/`ease-*` utilities. Automatically collapses to near-zero under `prefers-reduced-motion: reduce` | `--duration-fast`, `--ease-ease`, `--ease-decelerate-mid` |
| **Focus** | The brand-ring recipe used by default (`ring-2 ring-ring ring-offset-2`), plus a Fluent-authentic neutral double-stroke variant (`--stroke-focus-outer/inner`) available for components that want the literal Fluent look | `--ring`, `--stroke-focus-outer`, `--stroke-focus-inner` |

## Theming

### `.dark`

Dark mode is **not** a hex inversion of the light values. Each alias is re-pointed at a different Fluent-published dark slot — the same method Fluent itself uses to derive its dark theme — so contrast behavior matches Fluent's own dark theme rather than an automated inversion. The brand ramp itself is unchanged (it's global); only *which stop* an alias like `--primary` points to differs (`brand-80` in light, `brand-70` in dark). Toggle by adding/removing the `dark` class on `<html>` or any ancestor.

### `.light`

A `.light` class exists purely to **re-scope light mode onto a subtree**, even when that subtree sits under a `.dark` ancestor. It carries the identical declarations as `:root` (no duplication in intent — an element's own variable declarations simply beat inherited ones), so a `.light` block anywhere in the tree forces everything under it back to light values. This matters because the kit's `dark:` Tailwind variant is defined as `@custom-variant dark (&:is(.dark *):not(.light *));` — the `:not(.light *)` guard stops `dark:` utilities from firing inside a `.light`-scoped subtree, so a locally-forced-light region doesn't get dark-mode overrides leaking back in from its `.dark` ancestor. Use it when a consumer app needs one region (e.g., an embedded light-only preview pane) to stay light regardless of the app-wide theme.

### `.high-contrast` and `forced-colors`

Two independent, both-shipped mechanisms:

1. **`@media (forced-colors: active)`** — automatic, for Windows/OS-level forced-colors mode. Hands control to the OS palette: `--ring`/`--border`/`--input` swap to `Highlight`/`CanvasText`, focus outlines are guaranteed visible and immune to `forced-color-adjust`, and one interactive brand surface (`.btn-primary`) is explicitly opted back into painting via `forced-color-adjust: none` so its meaning (this is the primary action) survives the system palette.
2. **`.high-contrast` class** — an explicit, author-controlled, cross-platform theme (works outside Windows too) that mirrors Fluent's own `highContrast` theme using CSS system-color keywords (`Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `ButtonFace`, `ButtonText`, `GrayText`, `LinkText`). Toggle it the same way as `.dark` — add/remove the class on `<html>` or an ancestor. Because it paints entirely in system colors that resolve against whatever the OS is currently showing, it declares `color-scheme: light dark` (it isn't inherently either).

Both mechanisms follow the same rule the component conventions enforce elsewhere: **never convey state by color alone** in high-contrast contexts (pair with an icon, underline, or border), and focus rings stay at a 2px minimum.

### `color-scheme`

`:root`/`.light` sets `color-scheme: light`, `.dark` sets `color-scheme: dark`, and `.high-contrast` sets `color-scheme: light dark`. This is what makes native UA chrome — form control chrome, scrollbars, spellcheck underlines — track the active theme automatically, with no separate opt-in from the consumer app.

## Key derivation decisions

The full research and rationale for every value lives in [`docs/design/tokens-research.md`](design/tokens-research.md); §12 is the final, orchestrator-approved decision record this kit implements. The headline decisions:

1. **Radius base = 6px** (Fluent "large"), so the derived `rounded-md` lands exactly on Fluent's medium (4px) — the radius the most-used controls (buttons, inputs, badges) actually use.
2. **Dark mode uses a tonal elevation delta** — canvas `#242424`, cards/popovers `#292929` — rather than a flat dark canvas, so content surfaces read as subtly raised without shadows (matching how Fluent's own dark theme works).
3. **Dark `--primary` = `brand-70` (`#115ea3`)** with white foreground — Fluent's actual dark-mode filled-brand-button color, not just the brightest ramp stop.
4. **Warning = Fluent darkOrange** (`#da3b01`), not yellow — with a separate `--warning-text` stop for AA-safe warning text on light surfaces, since the fill color alone doesn't pass contrast for text.
5. **`--accent` stays neutral grey**; the brand-tinted "selected" look lives on `--sidebar-accent` instead, so ghost/menu hover states don't default to a brand tint everywhere.
6. **Variables are authored in hex** (canonical); OKLCH values in the research doc are reference-only conversions.
7. **System font stack only** — no bundled/self-hosted Segoe UI (licensing).
8. **Motion is exposed both ways** — as raw `--duration-*`/`--ease-*` custom properties for component CSS, and as Tailwind `duration-*`/`ease-*` utilities for consumer use.

## Customization

Because every component reads tokens through CSS variables (never hardcoded values), the supported way to reskin the kit is **overriding the custom properties**, not editing component source:

```css
/* After importing tokens.css */
:root {
  --primary: #6b2fb3;         /* swap the brand color */
  --primary-foreground: #ffffff;
  --radius: 4px;               /* tighter corners across the whole kit */
}

.dark {
  --primary: #9a6fd6;
}
```

Any override placed after the `tokens.css` import wins the cascade. This works at any scope — `:root` for a global change, or a class/attribute selector on a subtree for a scoped one (the same mechanism `.dark`/`.light`/`.high-contrast` themselves use). Prefer overriding the semantic aliases (`--primary`, `--border`, …) over the raw brand ramp (`--brand-*`) unless you specifically want to replace Fluent's brand ramp itself — components read the aliases, and the ramp exists to give the aliases (and the interactive-state recipes in [`docs/component-conventions.md`](component-conventions.md) §4) somewhere to point.

## Related docs

- [`docs/design/tokens-research.md`](design/tokens-research.md) — full provenance, every value's Fluent source, and the decision record (§12).
- [`docs/component-conventions.md`](component-conventions.md) — how components are required to consume tokens (§3–4).
- [`docs/registry.md`](registry.md) — how the `theme` registry item is built and installed.
- [`docs/status-and-backlog.md`](status-and-backlog.md) — token-adjacent backlog items (e.g. `--shadow-brand-*` shipped without utilities yet, status-extension tokens shipped ahead of their consuming components).
