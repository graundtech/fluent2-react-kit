# Status and backlog

## Current status: v0.2.0

The foundation plus a second batch of form/status/feedback components are complete and verified. What shipped across the two passes:

- **17 components**: `alert`, `avatar`, `badge`, `button`, `card`, `checkbox`, `input`, `label`, `link`, `progress`, `radio-group`, `select`, `separator`, `skeleton`, `spinner`, `switch`, `textarea` — each with a component file, a test file, a registry fragment, and a preview route in the demo app.
- **`utils`** — the `cn()` class-merging helper (`clsx` + `tailwind-merge`), shipped as its own registry item and imported by every component.
- **`theme`** — the full Fluent 2 → shadcn token system (`packages/react/src/styles/tokens.css`): light, dark, and high-contrast CSS custom properties plus a Tailwind v4 `@theme inline` bridge, shipped as a `registry:theme` item. The v0.2.0 pass added `--destructive-text` (light `#b10e1c`, dark `#ff9a90`) alongside the existing `--warning-text`, fixing an AA contrast failure in `Alert`'s destructive variant — see the "Known TODOs" entry below.
- **Registry pipeline** — `registry/items/*.json` fragments → `scripts/build-registry.mjs` → `apps/demo/public/r/*.json`, wired into the Vercel build (`pnpm build`). 19 registry items total (17 components + `utils` + `theme`). See [`docs/registry.md`](registry.md).
- **278 tests, 20 test files, all passing** — Vitest + Testing Library + `user-event` + `axe-core`. Every component's test file verifies rendering, `data-slot`/variant/size attributes, className merging, primary interaction, disabled state, keyboard activation, `asChild` (where applicable), ref forwarding, the variants helper function, and an axe accessibility check on at least two states (default + one secondary state).
- **Demo/showcase app** — a Next.js app (`apps/demo`) deployed via the Vercel Git integration, with a landing page (hero, a composed sample built entirely from kit components, a component grid, and a registry-install snippet) plus one `/preview/<name>` route per item rendering every variant × size.

## Consumer validation (2026-07-11)

Real consumer installs were run against fresh Next.js 16 and Vite projects (`shadcn` CLI 4.13.0, both completed), to validate the registry from a cold start rather than this repo's own test suite. **Registry mechanics passed on both platforms** — fragment schema, file targets, import rewriting (`@/lib/utils`), and `registryDependencies` resolution all worked as designed. The docs, however, caused three real installation failures, all now fixed:

- **F1 (critical).** `shadcn init`'s default `base-nova` preset seeds the consumer's global CSS with a full competing theme (`:root`, `.dark`, `@theme inline`, `@custom-variant dark`, `@layer base`, plus `@import "shadcn/tailwind.css"` / `@import "tw-animate-css"`) that defines the same variable names as this kit's tokens and silently wins the cascade — consumers got shadcn's neutral gray theme, not Fluent blue, on both platforms. The stray `@custom-variant dark` also defeats the kit's `.light`-inside-`.dark` guard. Documented as a required post-`init` cleanup step: [`docs/registry.md`](registry.md#cleaning-up-after-shadcn-init) (full before/after), [`docs/tokens.md`](tokens.md), `registry/items/theme.json`'s `docs` field (CLI-printed), and the README quick start.
- **F2 (high).** Any consumer usage of `@fluentui/react-icons` inside their own React Server Component fails `next build` (the icons package calls a client-only Griffel styling API at module scope). Kit components that need icons already carry `"use client"` — documented the rule for consumer-authored usage in a warning box in the README quick start.
- **F3 (medium).** `npx shadcn add <url> --yes` does not suppress the per-file overwrite prompts `init` leaves behind (it pre-creates `button.tsx` and `lib/utils.ts`); interactively the default is `N` (silently keeps the preset's file), non-interactively the batch hangs or skips. Documented `--yes --overwrite` together as required for scripted/CI and recommended for first-run installs.
- **F4 (low).** Removed stale `--base-color` init guidance — CLI 4.13 is preset-based and the flag no longer exists.
- **F5 (low).** `select`'s `aria-labelledby` labeling recipe needs the kit's `label` item, which is intentionally not a `registryDependency` of `select` (kept opt-in) — documented in `select.json`'s new `docs` field and a one-line addition to `select.tsx`'s doc comment.
- **F6 (QoL).** Documented the shadcn named-registry alias so consumers can run `npx shadcn add @fluent2/button`: `components.json` → `"registries": { "@fluent2": "https://fluent2-react-kit.graund.io/r/{name}.json" }`, verified against the [shadcn namespace docs](https://ui.shadcn.com/docs/registry/namespace).
- **F7 (footnote).** Noted the upstream TS5101 `baseUrl`-deprecation error hit when following the official shadcn Vite guide, with the `"ignoreDeprecations": "6.0"` workaround, clearly marked as not this kit's issue.

No component or registry-mechanics code changed to fix any of the above — only the `docs` string fields in `registry/items/theme.json` and `registry/items/select.json` (both CLI-printed text) plus a one-line doc-comment addition in `select.tsx`.

## Backlog

### Near-term components

Straightforward additions that follow the existing conventions ([`docs/component-conventions.md`](component-conventions.md)) directly — no new architectural pattern required:

- Tabs
- Dialog
- Tooltip
- Dropdown Menu
- Toast / Sonner-equivalent
- Breadcrumb
- Pagination
- Accordion
- Popover

### Long-term / complex components

From the project brief — these need real design work (state machines, virtualization, or composite interaction patterns) beyond the current component template:

- Data Table
- Date Picker
- Calendar
- Command Menu
- Tree View
- Navigation
- File Upload
- Multi Select
- Advanced Combobox

### Known TODOs from this run

- ~~**Vercel deployment URL placeholder (2 coordinated spots).**~~ Resolved — `apps/demo/app/page.tsx` and `scripts/build-registry.mjs` both now point `REGISTRY_BASE_URL` at the real production domain, `https://fluent2-react-kit.graund.io`. Still two independent hand-maintained constants, not wired to a shared env var — keep them in sync on any future domain change (see [`docs/registry.md`](registry.md#the-registry_base_url-placeholder-caveat)).
- **Submit to the shadcn Registry Directory** ([ui.shadcn.com/docs/directory](https://ui.shadcn.com/docs/directory)) now that the deployment URL above is real and stable — see [`docs/registry.md`](registry.md#publishing-to-the-shadcn-registry-directory).
- **Playwright e2e is not set up.** Test coverage today is Vitest (unit/component) + `axe-core` (accessibility) only — no browser-driven end-to-end suite exists yet.
- **`version` is duplicated.** `packages/react/package.json` (`"version": "0.2.0"`) and `packages/react/src/index.ts` (`export const version = "0.2.0"`) are two independent hand-maintained copies of the same value. Should be automated (e.g. generate `index.ts`'s export from `package.json` at build time) so they can't drift.
- **Fluent Divider inset/labeled variants.** The current `Separator` is a single 1px-stroke divider (horizontal/vertical only) — Fluent's inset and labeled-divider variants are not implemented.
- **Interactive/selectable Card states.** `Card` currently has no built-in hover/selected/interactive visual state — only its static resting elevation (`shadow-4`).
- **Avatar sizes/shapes/presence badges.** `Avatar` ships at a single implicit size (consumers resize via `className`, e.g. `size-10`) with no dedicated `size` prop, no shape variant, and no Fluent-style presence badge. Explicitly called out as out-of-scope in the component's own doc comment.
- **Input size variants.** `Input` ships one size only; Fluent's small/large field sizes are not implemented.
- **Badge tint appearance family.** `Badge` currently ships 6 filled/outline variants (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`); Fluent's separate "tint" (soft-fill) appearance family is not implemented.
- **`--shadow-brand-*` primitives shipped without utilities.** `tokens.css` defines `--shadow-brand-ambient` / `--shadow-brand-key` (for branded elevated surfaces) but no component or Tailwind utility currently consumes them — reserved for a future branded-surface use case.
- **Status-extension tokens now consumed by `Alert`, `Toast` still pending.** `--success-subtle`, `--warning-text`, `--warning-subtle`, `--destructive-subtle`/`--destructive-text`, and the `*-border` variants are consumed by `Badge` and, as of this pass, `Alert` (all five variants: default, destructive, success, warning, info) — `Toast` remains the one near-term consumer still on the backlog.
- **`--destructive-text` added to fix an AA contrast failure.** `Alert`'s destructive variant originally accented its icon/title with the raw `--destructive` fill (`#d13438`, same hex in both themes), which measured ~4.6:1 against `--destructive-subtle` in light (barely AA) but only ~3.3:1 in dark (fails the 4.5:1 AA body-text minimum). Added `--destructive-text` to `tokens.css` (light `#b10e1c`, ~6.68:1; dark `#ff9a90`, ~8.02:1 — both comfortably AA) mirroring the existing `--warning`/`--warning-text` split, and switched `alert.tsx`'s destructive variant over to it. `--destructive` itself is untouched (badges/buttons/other future consumers of the raw fill are unaffected).
- **Fluent shimmer keyframes for `Skeleton`.** `Skeleton` currently uses Tailwind's built-in `animate-pulse` (opacity pulse) as a stand-in; Fluent 2's own Skeleton uses a moving-gradient "wave" sweep instead. Needs a `--animate-shimmer` keyframe added to `tokens.css` (token-layer change, out of scope for the component itself per conventions §10) before `skeleton.tsx` can switch over.
- **Progress indeterminate slide animation.** `Progress`'s indeterminate state has no dedicated sliding-indicator animation yet — same constraint as the Skeleton shimmer above: needs a keyframe added to `tokens.css` first.
- **Select Playwright coverage.** `select.test.tsx` covers everything reachable in jsdom, but `packages/react/vitest.config.ts` runs without a real layout/paint engine, so several interaction paths are untestable there: pointer click-to-open (vs. keyboard-only), the popup unmounting after its exit transition, positioning/collision handling, the scroll-up/scroll-down buttons, and other visual-only states. These need a real browser — tracked against the "Playwright e2e is not set up" TODO above.
- **Select trigger `size` prop.** `SelectTrigger` currently ships one size only; a `size` prop (matching the multi-size pattern other controls use, e.g. `Button`) is not yet implemented.
- **Deeper Windows forced-colors testing.** The `@media (forced-colors: active)` layer in `tokens.css` has not been validated against real Windows High Contrast themes beyond the token definitions themselves.
- **Per-component visual validation against the Fluent 2 Figma.** No component has been pixel-checked against the official Fluent 2 Figma file — doing so requires the Figma desktop app with Dev Mode MCP access, which wasn't available for this pass.

## Related docs

- [`docs/component-conventions.md`](component-conventions.md) — the contract new components (near-term or long-term) must follow.
- [`docs/registry.md`](registry.md) — detail on the `REGISTRY_BASE_URL` TODO and the directory submission step.
- [`docs/tokens.md`](tokens.md) — detail on the token-layer backlog items (`--shadow-brand-*`, status extensions).
- [`docs/contributing.md`](contributing.md) — how to pick up a backlog item and submit it.
