# Status and backlog

## Current status: v0.1.0

The foundation is complete and verified. What shipped in this pass:

- **9 components**: `avatar`, `badge`, `button`, `card`, `input`, `label`, `link`, `separator`, `spinner` — each with a component file, a test file, a registry fragment, and a preview route in the demo app.
- **`utils`** — the `cn()` class-merging helper (`clsx` + `tailwind-merge`), shipped as its own registry item and imported by every component.
- **`theme`** — the full Fluent 2 → shadcn token system (`packages/react/src/styles/tokens.css`): light, dark, and high-contrast CSS custom properties plus a Tailwind v4 `@theme inline` bridge, shipped as a `registry:theme` item.
- **Registry pipeline** — `registry/items/*.json` fragments → `scripts/build-registry.mjs` → `apps/demo/public/r/*.json`, wired into the Vercel build (`pnpm build`). See [`docs/registry.md`](registry.md).
- **155 tests, 12 test files, all passing** — Vitest + Testing Library + `user-event` + `axe-core`. Every component's test file verifies rendering, `data-slot`/variant/size attributes, className merging, primary interaction, disabled state, keyboard activation, `asChild` (where applicable), ref forwarding, the variants helper function, and an axe accessibility check on at least two states (default + one secondary state). Confirmed by re-running `pnpm test` after this documentation pass — still 155/155 green.
- **Demo/showcase app** — a Next.js app (`apps/demo`) deployed via the Vercel Git integration, with a landing page (hero, a composed sample built entirely from kit components, a component grid, and a registry-install snippet) plus one `/preview/<name>` route per item rendering every variant × size.

What was verified this pass specifically: `pnpm build` (package → registry → demo) and `pnpm test` both run clean with no changes to any code, test, or non-README doc file — this was a documentation-only pass.

## Backlog

### Near-term components

Straightforward additions that follow the existing conventions ([`docs/component-conventions.md`](component-conventions.md)) directly — no new architectural pattern required:

- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Tabs
- Dialog
- Tooltip
- Dropdown Menu
- Skeleton
- Alert
- Toast / Sonner-equivalent
- Progress
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
- **`version` is duplicated.** `packages/react/package.json` (`"version": "0.1.0"`) and `packages/react/src/index.ts` (`export const version = "0.1.0"`) are two independent hand-maintained copies of the same value. Should be automated (e.g. generate `index.ts`'s export from `package.json` at build time) so they can't drift.
- **Fluent Divider inset/labeled variants.** The current `Separator` is a single 1px-stroke divider (horizontal/vertical only) — Fluent's inset and labeled-divider variants are not implemented.
- **Interactive/selectable Card states.** `Card` currently has no built-in hover/selected/interactive visual state — only its static resting elevation (`shadow-4`).
- **Avatar sizes/shapes/presence badges.** `Avatar` ships at a single implicit size (consumers resize via `className`, e.g. `size-10`) with no dedicated `size` prop, no shape variant, and no Fluent-style presence badge. Explicitly called out as out-of-scope in the component's own doc comment.
- **Input size variants.** `Input` ships one size only; Fluent's small/large field sizes are not implemented.
- **Badge tint appearance family.** `Badge` currently ships 6 filled/outline variants (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`); Fluent's separate "tint" (soft-fill) appearance family is not implemented.
- **`--shadow-brand-*` primitives shipped without utilities.** `tokens.css` defines `--shadow-brand-ambient` / `--shadow-brand-key` (for branded elevated surfaces) but no component or Tailwind utility currently consumes them — reserved for a future branded-surface use case.
- **Status-extension tokens shipped ahead of their consuming components.** `--success-subtle`, `--warning-text`, `--warning-subtle`, `--destructive-subtle`, and the `*-border` variants exist in the token layer today with only `Badge` consuming a subset of them — the intended primary consumers (`Alert`, `Toast`) are on the near-term component backlog above.
- **Deeper Windows forced-colors testing.** The `@media (forced-colors: active)` layer in `tokens.css` has not been validated against real Windows High Contrast themes beyond the token definitions themselves.
- **Per-component visual validation against the Fluent 2 Figma.** No component has been pixel-checked against the official Fluent 2 Figma file — doing so requires the Figma desktop app with Dev Mode MCP access, which wasn't available for this pass.

## Related docs

- [`docs/component-conventions.md`](component-conventions.md) — the contract new components (near-term or long-term) must follow.
- [`docs/registry.md`](registry.md) — detail on the `REGISTRY_BASE_URL` TODO and the directory submission step.
- [`docs/tokens.md`](tokens.md) — detail on the token-layer backlog items (`--shadow-brand-*`, status extensions).
- [`docs/contributing.md`](contributing.md) — how to pick up a backlog item and submit it.
