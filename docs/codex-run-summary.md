# Run Summary — Foundation build of `@graundtech/fluent2-react-kit`

**Date:** 2026-07-11
**Execution model:** orchestrated multi-agent run — one orchestrator (Claude Fable 5) planning, delegating, and verifying; implementation delegated to Opus 4.8 and Sonnet 5 subagents. 17 tracked tasks, ~28 subagent executions (15 builders, 8 review finders, 5 review verifiers, 1 fix agent, 1 docs agent). Every delivery was independently verified by the orchestrator (test/build re-runs, file inspection, live browser checks) before the next phase was unblocked.

---

## 1. What was implemented

- **Monorepo foundation** on the pre-existing Vercel-safe scaffold (`apps/demo` + `packages/react`, pnpm workspaces, tsup, TypeScript 6 strict). All Vercel pipeline invariants were preserved; the build chain gained a registry step (package → registry → demo).
- **Fluent 2-derived token system** (`packages/react/src/styles/tokens.css`, 430+ lines): shadcn-compatible core set + brand ramp `--brand-10..160` + status extensions, radius/shadow/typography/motion/focus scales, `.dark`, `.light` (re-scope), `.high-contrast`, `forced-colors`, `color-scheme`, `prefers-reduced-motion`, and a Tailwind v4 `@theme inline` bridge. Exported as `@graundtech/fluent2-react-kit/tokens.css` and as the `theme` registry item.
- **shadcn-compatible registry**: per-item fragments (`registry/items/*.json`) merged by a zero-dependency build script (`scripts/build-registry.mjs`) into schema-conformant JSON served from `apps/demo/public/r/` (11 items). The script inlines source, rewrites `../../lib/utils` → `@/lib/utils` (so the shadcn CLI's alias transform works in consumer projects), and rewrites bare `registryDependencies` into absolute URLs (so dependencies resolve against *this* registry, not ui.shadcn.com).
- **9 components** (see §3) + `cn()` utility, all exported from the package barrel (`v0.1.0`).
- **Demo/showcase app** (Next.js 16 + Tailwind v4): composed product-snippet showcase, per-component preview routes (`/preview/<name>`) with light/dark panels, an accessible Light/Dark/High-contrast theme switcher (radiogroup, roving tabindex, pre-hydration anti-flash script), and the registry install section.
- **Documentation suite**: rewritten `README.md` (with non-affiliation disclaimer), `docs/vision.md`, `docs/registry.md`, `docs/tokens.md`, `docs/status-and-backlog.md`, `docs/contributing.md`, plus the pre-existing normative `docs/component-conventions.md` and `docs/design/tokens-research.md`.

## 2. Decisions made (consolidated)

**Architecture / tooling**
- `@base-ui/react@1.6.0` instead of the deprecated `@base-ui-components/react` (official npm rename).
- Custom `toHaveNoAxeViolations` matcher on first-party `axe-core` instead of the unmaintained `vitest-axe`.
- Tailwind not added as a dependency of `packages/react` — consumers compile utilities; the package ships CSS + class strings only.
- Registry design: **fragments per item** so parallel component agents never touch a shared JSON; aggregation happens at build time.
- `@source "../../packages/react/src"` in the demo's `globals.css` — Turbopack's native Tailwind integration only scans the app's own files, so workspace-package utilities were being dropped.

**Tokens** (full rationale in `docs/design/tokens-research.md` §12)
- Brand anchor `#0f6cbd` (Fluent web brand ramp); dark `--primary` = brand[70] `#115ea3`.
- Neutrals re-pointed to Fluent's published dark slots (not hex inversion); dark elevation via tonal delta (canvas `#242424`, card `#292929`).
- `--radius: 6px` so `rounded-md` = Fluent's 4px control radius.
- Warning = Fluent darkOrange (with a separate `--warning-text` for AA text); `--accent` kept neutral; values authored in hex; system font stack (no bundled Segoe UI); motion exposed as both custom properties and Tailwind utilities.
- `color-scheme` set per theme class; `.light` re-scope class added (selector `:root, .light`, dark variant `(&:is(.dark *):not(.light *))`).

**Component API**
- shadcn naming everywhere (`variant`/`size`/`asChild`, no `Fluent` prefixes); React 19 style (ref-as-prop, no `forwardRef`); `data-slot` on every part; server-safe by default (`"use client"` only where required — currently nowhere in the kit itself).
- Button sizes mapped to Fluent metrics (24/32/40px + icon squares); disabled = opacity recipe; `type` not forced (shadcn parity).
- Badge hover states gated with `[a&]:` (only interactive badges get hover feedback).
- Input focus = Fluent bottom brand accent via inset box-shadow (no reflow), swapping to destructive when invalid+focused; promoted to a named recipe in conventions §4.
- Avatar is the only Base UI-backed component in this batch (image loading state); fallback uses brand-tint AA-verified pairs.
- Link is a Fluent-driven addition (shadcn has none): `default`/`inline` variants, `aria-disabled` treated honestly (documented tab-stop caveat).

## 3. Components created (all with variants, states, tests, axe checks, registry item, preview page)

| Component | Tests | Notes |
|---|---|---|
| Button | 26 | Reference component; 6 variants × 6 sizes, brand state ramp |
| Badge | 14 | default/secondary/destructive/outline/success/warning |
| Label | 12 | `required` indicator, clean accessible name |
| Separator | 12 | APG-strict ARIA (`role`, conditional `aria-orientation`) |
| Spinner | 18 | Fluent arc SVG, `role="status"`, reduced-motion handling |
| Card | 21 | 7 parts incl. `CardAction`; Fluent `shadow-4` elevation |
| Input | 13 | Fluent focus underline; aria-invalid compound state |
| Avatar | 9 | Base UI primitives; brand-tint fallback |
| Link | 15 | `inline` variant; asChild for framework links |

Plus `utils` (`cn()`) and `theme` (tokens) registry items — **11 registry items** total.

## 4. Tokens created

Core shadcn set (light/dark), chart 1–5, sidebar set, brand ramp (16 stops), status extensions (`--success*`, `--warning*`, `--destructive-subtle/-border`), shadow primitives + `--shadow-2..64`, font stacks + weights + custom text sizes, stroke widths, focus-ring variables, motion durations (8) + easings, `--radius`. Themes: `:root`/`.light`, `.dark`, `.high-contrast`, `forced-colors`, `prefers-reduced-motion`, `color-scheme` per theme.

## 5. Tests added / executed

- **155 tests across 12 files** (Vitest + Testing Library + axe-core matcher): 140 component tests (table above), 5 `cn()` tests, 1 a11y-pipeline sanity test, 9 tokens.css structural-invariant tests.
- Executed repeatedly throughout the run; final state: **155/155 passing**, `pnpm typecheck` clean (package + demo), `pnpm build` green end-to-end (tsup → registry → `next build`, 12 static routes), `pnpm install --frozen-lockfile` clean.
- Browser-level verification (orchestrator): showcase and previews in light/dark/high-contrast, `.light` panel behavior under global dark (computed styles asserted), theme radiogroup keyboard interaction (arrow-key roving + selection + persistence).
- **Not set up:** Playwright e2e (backlog).

## 6. Code review performed (and fixes applied)

A high-effort multi-agent review (8 finder angles → 5 verifier agents, every verdict evidence-backed against shadcn CLI source / WAI-ARIA APG / runtime repro) produced **10 confirmed findings — all fixed** in the same run. Highlights:

1. **(critical)** Registry shipped raw relative imports the shadcn CLI never rewrites → build-time import rewriting added.
2. **(critical)** Bare `registryDependencies` resolved against ui.shadcn.com instead of this registry → absolute-URL rewriting added.
3. Theme item docs pointed consumers at a nonexistent `@import` path → corrected (`../styles/…` + Vite note).
4. `color-scheme` regression (native controls stayed light in dark theme) → fixed at token layer.
5. Spinner `label=""` produced an unnamed `role="status"` region → `||` fallback + regression test.
6. Preview "Light" panels rendered dark under the global dark theme → `.light` re-scope class + dark-variant exclusion.
7. Theme toggle used `aria-pressed` for a one-of-N choice → proper radiogroup with roving tabindex.
8–10. Theme-constants duplication (single-sourced in `apps/demo/lib/theme.ts`), `Panel` copy-paste across 9 preview pages (deduplicated into `PreviewPanel`), stale `index.tsx` reference in the Vercel pipeline doc (corrected). Registry homepage drift and build-script double-reads were also fixed.

## 7. Issues / TODOs created

Tracked in **`docs/status-and-backlog.md`**. Key items:
- Replace the `REGISTRY_BASE_URL` placeholder (`https://fluent2-react-kit.vercel.app`) in its **2 coordinated spots** (`apps/demo/app/page.tsx`, `scripts/build-registry.mjs`) once the real deployment URL exists; then E2E-test a real `npx shadcn add` against it.
- Submit to the shadcn Registry Directory post-deployment.
- Playwright e2e setup; `version` const/package.json duplication (automate); Fluent Divider inset/labeled variants; interactive Card states; Avatar sizes/shapes/presence; Input size variants; Badge tint family; Windows forced-colors testing; Figma-based visual validation (requires Figma desktop Dev Mode MCP).
- Near-term component batch (17 listed) and long-term complex components (Data Table, Date Picker, Calendar, Command Menu, Tree View, Navigation, File Upload, Multi Select, advanced Combobox).

## 8. Blocking questions

None at run end. (During the run, Figma MCP access required user-side authentication + Figma desktop Dev Mode; work proceeded on public Fluent 2 documentation without blocking.)

## 9. Non-blocking questions

- Warning hue: Fluent-true darkOrange sits visually close to danger red — revisit if users confuse warning with error (amber alternative documented in the research doc).
- Segoe UI licensing: system-stack only today; decide whether pixel-parity on non-Windows ever justifies licensing Segoe UI Variable.
- Whether the npm-package consumption path (vs registry) should be de-emphasized further in docs.

## 10. Next recommended steps

1. Review the working tree and **commit** (nothing was committed during the run, by design).
2. Push to `main` → Vercel deploys demo + registry; then update `REGISTRY_BASE_URL` (2 spots) and redeploy.
3. Validate a real `npx shadcn@latest add <url>/r/theme.json && … button.json` install into a fresh Next.js and a Vite app.
4. Submit the registry to the shadcn Registry Directory.
5. Next component batch (Textarea, Select, Checkbox, Radio Group, Switch, Tabs, Dialog, Tooltip, Dropdown Menu) reusing the same orchestration pattern — conventions doc + parallel agents + integration + review.
6. Add Playwright smoke tests against the deployed demo.

---

# Addendum — Batch 2 (same day, second orchestrated run)

**Scope:** 8 form/feedback components on top of the v0.1.0 foundation → **v0.2.0, 17 components, 278 tests / 20 files.**

## Delivered
- **Components:** Textarea (13 tests), Select (18 — the kit's first popup/overlay; establishes the portal→positioner→popup pattern, `shadow-16` flyout elevation, open/close motion, and the jsdom popup-testing recipe for future Dialog/Tooltip/Dropdown), Checkbox (14), Radio Group (11), Switch (16), Alert (21 — first consumer of the status-extension tokens), Skeleton (8), Progress (19). Same parallel-agent model as batch 1 (Opus for Select, Sonnet for the rest); zero cross-agent conflicts again.
- **Registry:** 19 items served from the live registry at `https://fluent2-react-kit.graund.io/r/` (deployment URL was resolved by the maintainer between batches).

## Key decisions / discoveries
- **`@fluentui/react-icons` forces `"use client"`** — the icons package calls `@griffel/react`'s client-only `__styles()` at module scope, so any component importing it breaks `next build` as a Server Component. Select and Checkbox carry the directive; the rule is now normative in `component-conventions.md` §2/§9.
- **`--destructive-text` token added** (light `#b10e1c` 6.68:1, dark `#ff9a90` 8.02:1 on the destructive-subtle surfaces): Alert's contrast math exposed that `--destructive` (same hex both themes) fails AA (≈3.3:1) as text on the dark subtle background. Mirrors the pre-existing `--warning-text` approach.
- **Base UI adaptation conventions:** span-based controls use `data-[checked]:`/`data-[disabled]:` (bracket form now canonical, conventions §4) instead of `:disabled`/`data-state`; generics pinned to `string` to keep shadcn's string-only `onValueChange` API; `onCheckedChange` carries Base UI's extra event argument (documented deviation).

## Review (4 angles + orchestrator manual pass) → 12 findings, 11 fixed, 1 accepted
Highlights: `.high-contrast` was missing overrides for the status-extension tokens and the brand stops Alert/Avatar consume (now mapped to `Canvas`/`CanvasText`; the fix agent corrected the orchestrator's own proposed mapping for the dual-role brand-140/70 stops); Skeleton's `bg-accent` mapped to the system `Highlight` (selection) color in HC — switched to `bg-secondary` (`ButtonFace`); Alert's `role="alert"` is now an overridable default with polite `role="status"` documented; Progress indeterminate gained `motion-reduce:animate-none`; Select preview labeling now composes `aria-labelledby="label-id trigger-id"` so the selected value stays in the accessible name (recipe documented in select.tsx). Accepted tradeoff: Progress's accessible-name requirement stays JSDoc-only (shadcn parity).

## Verification
Full chain green and orchestrator-verified: `pnpm build` (20/20 routes), `pnpm typecheck`, `pnpm test` (278), frozen lockfile clean; Select open/select/close and the Alert contrast fix verified live in the browser; `.high-contrast` token remaps verified via computed styles at document level.

## Next steps
Commit + push (deploys v0.2.0 to the live registry); then the overlay batch (Dialog, Tooltip, Dropdown Menu, Popover) reusing Select's popup pattern, plus Tabs/Accordion/Breadcrumb/Pagination/Toast.
