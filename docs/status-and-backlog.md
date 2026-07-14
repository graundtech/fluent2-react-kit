# Status and backlog

## In progress: Ribbon initiative (v0.6.0-dev)

An Office-style Ribbon component family, built in phases. Scope decisions and
the live-reference workflow are documented in
[`docs/design/ribbon-behavior-spec.md`](design/ribbon-behavior-spec.md) — the
behavioral source of truth, captured from Word Online's real ribbon (both
layout modes, resize ladders, overflow-menu anatomy), since Ribbon exists in
neither the Fluent 2 Figma kit nor Fluent UI React v9.

- **Phase 1 (done)** — three standalone primitives, each a full 4-artifact
  kit item: `toolbar` (wraps `@base-ui/react/toolbar`; note Base UI does not
  enable Home/End on its composite — arrow keys wrap instead), `toggle`
  (shadcn `toggle` API over `@base-ui/react/toggle`, Fluent ToggleButton
  pressed look), and `split-button` (kit-original composition over
  `buttonVariants`, menu via DropdownMenu `render`-prop, per-variant divider
  tokens). Registry: 34 items. Known follow-ups: Playwright e2e specs for the
  three (batch precedent), and the split-button focus-ring `ring-offset`
  overlapping its joined sibling by ~2px when packed tightly.
- **Phase 2 (done)** — `overflow`: headless priority-overflow system (the
  single-line ribbon's core). Framework-agnostic `createOverflowManager`
  (importance-ordered greedy prefix: pinned → `priority` → DOM-edge tie-break,
  ResizeObserver, size caching that survives `display:none`, "…"-trigger
  budget reserved only when something overflows, `minimumVisible` floor that
  excludes pinned) + React bindings on `useSyncExternalStore`
  (`Overflow`/`OverflowItem`/`OverflowDivider`,
  `useOverflowMenu`/`useIsOverflowItemVisible`/`useIsOverflowGroupVisible`/
  `useOverflowCount`) with referentially-stable snapshots and an
  all-visible SSR path. Reimplements the *pattern* of Fluent's
  priority-overflow — no Fluent source consulted. Registry: 35 items. The
  `/preview/overflow` page is a working mini-ribbon proof (Toolbar + groups +
  "…" DropdownMenu with per-group section headers). Phase-3 notes recorded by
  the build: flex gaps are absorbed by the `padding` option (consider
  rect-extent measuring for pixel-exact drop points), and focus should move to
  the "…" trigger when the focused item overflows (roving tabindex +
  `display:none` can drop focus).
- **Phase 3 (done)** — the `ribbon` composite (single-line mode v1):
  `Ribbon`/`RibbonTabList`/`RibbonTab`/`RibbonContent`/`RibbonGroup`/
  `RibbonItem`/`RibbonOverflowMenu`/`RibbonSeparator` over kit Tabs + Toolbar +
  Overflow. `RibbonItem` carries `id`+`label` (+`icon`, `priority`, `pinned`,
  `onSelect`, `overflowRender`) for dual presentation — bar control vs
  icon+label menu row inside the prewired "…" menu, grouped under
  source-group section headers, source order preserved. Root axes:
  `value`/`collapsed` (controlled/uncontrolled); `layout` accepts only
  `"single-line"` (v2's `"classic"` reserved, as is `autoAdjust`); collapsed
  mode has no overlay flyout (documented divergence from desktop Office).
  Focus moves to the "…" trigger when the focused command overflows.
  `RibbonContent` keeps panels mounted across tab switches (`keepMounted`) —
  cheaper (no re-measure) and immune to remount edge cases. The build also
  surfaced a real Phase-2 bug, fixed at the root in `overflow.tsx`: React 19
  StrictMode's dev double-mount destroyed the useState-held manager with no
  revival path (every item then hid against an empty snapshot) — `destroy()`
  is now disposal-not-tombstone (any `register`/`setContainer`/
  `setOverflowMenu` revives, observer re-attaches on same-node re-attach),
  with core + StrictMode regression tests. Registry: 36 items; 630 tests.
  Phase-4 note: preview priorities are illustrative (Colar deliberately
  mid-priority to demo the submenu-in-overflow path) — tune against live Word.
- **Phase 4 (done)** — validation + e2e. Live-Word validation report:
  [`docs/design/ribbon-validation.md`](design/ribbon-validation.md) — 7/10
  aspects match outright; 2 MAJOR findings fixed (RibbonTab compact `h-9`
  strip; preview priorities retuned to Word's survivor ladder, with a new
  low-priority "Realce" split button carrying the submenu-in-overflow demo);
  3 divergences documented as intentional (2px underline per Figma tokens,
  auto-hiding "…" trigger, no built-in layout switcher in v1). Playwright
  e2e: 5 new specs, 30 tests — full suite **135/135** — including the
  focus-moves-to-"…"-trigger-on-overflow marquee assertion in a real
  browser. The e2e pass also found and got fixed: a real Toggle bug
  (outline pressed fill lost in dark to the resting `dark:bg-input/30` —
  now `dark:data-[pressed]:bg-secondary`), a stale smoke-test count, and
  under-reserved overflow `padding` (overflow preview now 64px and asserts
  no clipping at every settled width). The residual clipping was
  closed by the **overflow v1.1** follow-up: the manager now models the
  computed flex gap, dividers (registered, measured participants), the
  trigger's gap share, and the container's own inline padding, backed by a
  hide-only post-layout safety net (`scrollWidth` check, oscillation-guarded,
  capped, floor-respecting). `padding` is pure consumer slack now (default
  0); both previews dropped their hand-tuned reserves and the ribbon e2e
  asserts zero clipping at every settled width. New injectables `getGap`/
  `getOverflowSize` + `registerDivider`/`settle()` on the manager. 639 unit
  tests, 136 e2e. Also documented: Toolbar `render`-prop
  composition caveat (outer ToolbarButton's variant/size win the merge).
- **v2 (in progress — see [`docs/design/ribbon-v2-plan.md`](design/ribbon-v2-plan.md))** —
  classic/expanded layout in 4 phases. Scope decisions locked 2026-07-13:
  Word-web collapse model (whole-group → dropdown; the desktop per-item
  SizeDefinition ladder is a possible v2.1), gallery deferred to a
  standalone future `gallery` component, single shared tree across layouts.
  - **C1 (done)** — `ribbon-collapse`: headless group-collapse manager,
    sibling of the v1.1 overflow manager (same accounting/`settle()`/
    StrictMode-revivable foundations) but per-GROUP state. Groups collapse
    highest-`collapsePriority`-first (Parágrafo before Fonte, matching
    Word), then a `scrollMode` flag escalates when all are collapsed and it
    still overflows. `createGroupCollapseManager` + `GroupCollapse`/
    `CollapseGroup` + `useGroupMode`/`useIsScrollMode`; snapshot
    `{ groupModes, scrollMode }`, referentially stable, all-expanded SSR
    path. Registry: 37 items; 674 tests. Browser-verified: 620px all
    expanded → 520px Fonte+Parágrafo collapsed (order beats DOM) → 300px
    all collapsed + scrollMode. C2-handoff notes recorded in the plan
    (collapsed-form must be ref-forwarding DOM; focus-on-collapse is C2;
    `collapsedEstimate` default; separator modeling).
  - **C2 (done)** — classic presentation. `layout="classic"` is real:
    `RibbonContent` swaps the Overflow row for a `GroupCollapse`-wrapped
    Toolbar (~96px band, same tab labelling; no "…" menu — Word classic has
    none, its fallback is scroll); `RibbonGroup` gains
    `collapsePriority`/`icon`/`launcher`/`onLauncherClick` and renders the
    classic anatomy (children cluster + centered muted label + ↘ launcher +
    trailing hairline) with a collapsed form (icon+label+chevron
    ToolbarButton in the roving composite) whose Popover flyout holds the
    group's SAME children — single subtree, lives in exactly one place per
    mode (mode flip remounts; ribbon commands are stateless, documented).
    Group-level focus-on-collapse mirrors the v1 focus-to-trigger pattern.
    `layouts` escape hatch on RibbonItem/RibbonGroup (per-layout content;
    absent parts don't register in the single-line overflow registry
    either). New parts: `RibbonLargeButton`, `RibbonRow`, `RibbonColumn`.
    `priority`/`pinned`/`overflowRender`/`onSelect` documented as
    single-line-only. Registry deps += popover, ribbon-collapse. 687 unit
    tests; full e2e 136/136 with the v1 ribbon spec untouched (the one-tree
    regression proof). Browser-verified: classic band anatomy, collapse
    ladder by priority, collapsed-group flyout operable, classic-only
    escape-hatch item. C3/C4 notes: classic roving skips bare (non-Toolbar)
    buttons — consider a render-based composite variant in C4 polish; C4
    should unify the preview's two per-layout trees into one via `layouts`.
  - **C3 (done)** — the fallbacks. (1) Classic **scroll UI**: when
    `useIsScrollMode()` fires (all groups collapsed, band still overflows),
    the band scrolls horizontally with edge `‹ ›` arrow buttons (rendered
    OUTSIDE the Toolbar so they stay out of the roving order; aria-labelled
    "Rolar comandos para a esquerda/direita"; appear only when that side is
    clipped; smooth scrollBy, reduced-motion aware). (2) **Tab-strip
    overflow**: `RibbonTabList` reuses the v1 Overflow machinery — trailing
    tabs fold behind a `⌄` chevron menu listing the hidden tabs; the active
    tab is pinned so it never folds. The chevron is a SIBLING of the
    `role="tablist"` (a non-tab child fails axe `aria-required-children`) —
    the tablist wraps in a flex viewport that is the measured Overflow
    container. Applies to both layouts. (3) `autoAdjust` (classic-only,
    default true): `false` = no group collapse, straight to scroll.
    Browser-verified: tab fold at 420px (Ajuda → "1 guia oculta" menu),
    classic scroll arrow at 260px (all groups collapsed), autoAdjust-off
    keeps groups expanded and scrolls. 697 unit tests; full e2e 136/136
    untouched. (Solo Opus builder hit a session limit mid-run; orchestrator
    finished the two unfinished test typecheck spots, the axe fix moving the
    chevron out of the tablist, and the preview autoAdjust toggle + 3 tabs.)
  - **C4 (code done; live-Word validation pending)** — `layout` is now
    controllable (`defaultLayout`/`onLayoutChange`, mirroring `collapsed`;
    `autoAdjust` made controllable too), and **`RibbonLayoutSwitcher`** ships:
    a far-right pinned chevron opening a DropdownMenu with Word's two pt-BR
    sections — "Layout da Faixa de Opções" (radio: Clássica / Linha Única) and
    "Mostrar Faixa de Opções" (radio on `collapsed`: Sempre mostrar / Mostrar
    apenas as guias, + an "Ajustar automaticamente" checkbox on `autoAdjust`,
    disabled in single-line). Placed via a new `RibbonTabList` `actions` slot
    that renders far-right OUTSIDE the `role="tablist"` (axe) and OUTSIDE the
    tab-overflow budget (the Overflow viewport is `flex-1 min-w-0`), so tabs
    fold before colliding with it — exactly Word's pinned chevron. Closes
    validation finding #10. Classic roving fixed: `RibbonLargeButton` gained a
    `render` prop so `render={<ToolbarButton variant="ghost"/>}` makes it a
    composite item arrow-roving reaches (can't be automatic — the same element
    also renders inside a collapsed-group Popover flyout where a hard
    Toolbar.Button dep would throw). Preview unified into ONE Início tree
    (classic-only groups `layouts={["classic"]}` + the verbatim v1 single-line
    groups `layouts={["single-line"]}`, so the single-line projection is
    byte-identical and `e2e/ribbon.spec.ts` stays green); local layout toggle
    replaced by the switcher. New `e2e/ribbon-classic.spec.ts` (6 tests):
    collapse ladder, flyout, scroll arrows, tab overflow, switcher round-trip,
    autoAdjust off. 707 unit tests; full e2e **142/142** (136 untouched + 6).
    Orchestrator cross-checks queued for the live-Word pass: checkmark vs
    radio-dot indicator, close-on-select vs stays-open, actual collapse
    breakpoint widths.
  - Still backlog beyond v2: KeyTips, QAT, contextual tabs.

## Current status: v0.5.1

v0.5.1 is a package-infrastructure release — no component changes — that makes the npm modality real (the README's "Option B" had never actually been published):

- **Build now preserves per-file `"use client"` directives.** `tsup` moved from a single bundle (which silently dropped every directive — client components would crash in a Next.js App Router tree) to per-file transpilation (`bundle: false`), plus a post-build script (`packages/react/scripts/fix-esm-extensions.mjs`) that appends `.js` to relative specifiers so the output is spec-compliant strict-Node ESM. The 10 client components keep their directive; the 19 server-safe ones stay directive-free, so `buttonVariants()`-style calls from Server Components keep working. Known non-blocker: `@fluentui/react-icons` itself ships extensionless ESM upstream, so the icon-importing modules need a bundler — which Tailwind consumers have anyway.
- **npm publish prep** — `packages/react/README.md` (the npm package page), `LICENSE` copied into the package dir, `publishConfig.access: public`, `sideEffects: ["**/*.css"]`, `./package.json` export. Tarball audited via `npm pack` (98 files, ~165 kB) and validated end-to-end: installed into a scratch project, bundled with esbuild, SSR-rendered.
- **`@source` documented for the npm modality** — Tailwind v4 doesn't scan `node_modules`, so npm consumers need `@source "../node_modules/@graundtech/fluent2-react-kit/dist";` in their global CSS or everything renders unstyled. Added to the README Option B and `docs/tokens.md`. It deliberately does NOT live inside `tokens.css`: the registry inlines that file into consumer projects where the path wouldn't exist.
- **Publish pipeline** — `.github/workflows/publish.yml` publishes to npm on a GitHub release via trusted publishing (OIDC, no token secret, automatic provenance), with a tag-vs-package-version guard. The first-ever publish must be manual (`npm publish` from `packages/react`) because npm's trusted publisher is configured on an existing package's settings.

## v0.5.0

The foundation, a second batch of form/status/feedback components, a third batch of overlays, a fourth batch of navigation/disclosure/notification components, and the first long-term wave (the filter-list family) are complete and verified. What shipped across the five passes:

- **29 components**: `accordion`, `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `combobox`, `command`, `dialog`, `dropdown-menu`, `input`, `label`, `link`, `multi-select`, `pagination`, `popover`, `progress`, `radio-group`, `select`, `separator`, `skeleton`, `spinner`, `switch`, `tabs`, `textarea`, `toast`, `tooltip` — each with a component file, a test file, a registry fragment, and a preview route in the demo app.
- **Filter-list family (v0.5.0)** — `combobox` (the reference: real composable part family on `@base-ui/react/combobox`, field chrome shared with Input, popup shared with Select; shadcn has no combobox component, only a Popover+Command recipe — divergences documented in the doc comment, including the combobox-vs-autocomplete boundary), `multi-select` (chips field on Base UI's `Combobox.Chips`/`Chip`/`ChipRemove`, popup parts re-exported from `combobox` with `registryDependencies: ["utils","combobox"]`; Base UI supplies chip keyboard behavior — Backspace-on-empty removes last, arrow-navigation over chips), and `command` (cmdk-style palette WITHOUT the cmdk dependency, on `@base-ui/react/autocomplete` with `inline open` + `selectionMode: 'none'` — items fire `onClick` actions, no fake selection model; `CommandDialog` composes the kit Dialog with an sr-only title; `CommandInput` sets `aria-expanded` in inline mode to clear a real axe violation Base UI leaves open). The three preview pages are Client Components (documented §8 deviation, toast precedent): the family's render-function filtering API can't cross the RSC boundary.
- **Navigation/feedback batch (v0.4.0)** — `tabs`, `accordion`, `breadcrumb`, `pagination`, `toast`. Notable deliberate divergences, documented in the component doc comments: Tabs is Fluent's transparent underline TabList (sliding 2px brand `Tabs.Indicator` via `--active-tab-left/width`), not shadcn's `bg-muted` pill, and keeps Base UI's manual activation default (arrows move focus, Enter/Space selects; `activateOnFocus` opts into automatic); Accordion passes Base UI's `multiple?: boolean`/array-value model through (no Radix `type` shim) and animates height via `--accordion-panel-height`; Breadcrumb and Pagination stay Server Components by using inline SVG glyphs instead of `@fluentui/react-icons` (which would force `"use client"`); Pagination reuses `buttonVariants` (registry dep on `button`); Toast keeps Base UI's manager model (`useToast` = `useToastManager`, no global `toast()`), consumes the Alert status-extension tokens for its 5 variants, and is the sanctioned §3.5 motion exception (Base UI drives stacking through the `transform` shorthand via `--toast-*` vars, so no `scale-*`/`translate-*` split applies).
- **Overlay batch (v0.3.0)** — `dialog`, `dropdown-menu`, `popover`, `tooltip` on Base UI, reusing the portal → positioner → popup pattern Select established (`shadow-16` flyouts, `shadow-64` dialog, `data-starting-style`/`data-ending-style` motion). Notable deliberate divergences, each documented in the component doc comments: Tooltip is a neutral elevated surface (`bg-popover` + `shadow-16`), not shadcn's inverted `bg-primary` bubble, per Fluent 2; trigger composition uses Base UI's `render` prop, not `asChild`; Base UI's Popover popup is forced to `role="dialog"`, so `PopoverContent` requires an accessible name from the consumer (`aria-label`/`aria-labelledby`) — axe fails without one; Base UI's Tooltip does not auto-wire `aria-describedby` (its docs call the part "visual-only"), so the kit adds `role="tooltip"` and documents a manual `id`/`aria-describedby` recipe; every popup animates `transition-[opacity,scale]` because Tailwind v4 emits `translate-*`/`scale-*` as independent CSS properties — a `transform`-based transition list leaves the zoom snapping (originally caught for Dialog; Select/Dropdown Menu/Popover/Tooltip were fixed in a follow-up after transition instrumentation showed their scale never animated).
- **`utils`** — the `cn()` class-merging helper (`clsx` + `tailwind-merge`), shipped as its own registry item and imported by every component.
- **`theme`** — the full Fluent 2 → shadcn token system (`packages/react/src/styles/tokens.css`): light, dark, and high-contrast CSS custom properties plus a Tailwind v4 `@theme inline` bridge, shipped as a `registry:theme` item. The v0.2.0 pass added `--destructive-text` (light `#b10e1c`, dark `#ff9a90`) alongside the existing `--warning-text`, fixing an AA contrast failure in `Alert`'s destructive variant — see the "Known TODOs" entry below.
- **Registry pipeline** — `registry/items/*.json` fragments → `scripts/build-registry.mjs` → `apps/demo/public/r/*.json`, wired into the Vercel build (`pnpm build`). 31 registry items total (29 components + `utils` + `theme`). See [`docs/registry.md`](registry.md).
- **494 tests, 32 test files, all passing** — Vitest + Testing Library + `user-event` + `axe-core`. Every component's test file verifies rendering, `data-slot`/variant/size attributes, className merging, primary interaction, disabled state, keyboard activation, `asChild` (where applicable), ref forwarding, the variants helper function, and an axe accessibility check on at least two states (default + one secondary state).
- **Demo/showcase app** — a Next.js app (`apps/demo`) deployed via the Vercel Git integration, with a landing page (hero, a composed sample built entirely from kit components, a component grid, and a registry-install snippet) plus one `/preview/<name>` route per item rendering every variant × size.

## Consumer validation (2026-07-11)

Real consumer installs were run against fresh Next.js 16 and Vite projects (`shadcn` CLI 4.13.0, both completed), to validate the registry from a cold start rather than this repo's own test suite. **Registry mechanics passed on both platforms** — fragment schema, file targets, import rewriting (`@/lib/utils`), and `registryDependencies` resolution all worked as designed. The docs, however, caused three real installation failures, all now fixed:

- **F1 (critical).** `shadcn init`'s default `base-nova` preset seeds the consumer's global CSS with a full competing theme (`:root`, `.dark`, `@theme inline`, `@custom-variant dark`, `@layer base`, plus `@import "shadcn/tailwind.css"` / `@import "tw-animate-css"`) that defines the same variable names as this kit's tokens and silently wins the cascade — consumers got shadcn's neutral gray theme, not Fluent blue, on both platforms. The stray `@custom-variant dark` also defeats the kit's `.light`-inside-`.dark` guard. Documented as a required post-`init` cleanup step: [`docs/registry.md`](registry.md#cleaning-up-after-shadcn-init) (full before/after), [`docs/tokens.md`](tokens.md), `registry/items/theme.json`'s `docs` field (CLI-printed), and the README quick start.
- **F2 (high).** Any consumer usage of `@fluentui/react-icons` inside their own React Server Component fails `next build` (the icons package calls a client-only Griffel styling API at module scope). Kit components that need icons already carry `"use client"` — documented the rule for consumer-authored usage in a warning box in the README quick start.
- **F3 (medium).** `npx shadcn add <url> --yes` does not suppress the per-file overwrite prompts `init` leaves behind (it pre-creates `button.tsx` and `lib/utils.ts`); interactively the default is `N` (silently keeps the preset's file), non-interactively the batch hangs or skips. Documented `--yes --overwrite` together as required for scripted/CI and recommended for first-run installs.
- **F4 (low).** Removed stale `--base-color` init guidance — CLI 4.13 is preset-based and the flag no longer exists.
- **F5 (low).** `select`'s `aria-labelledby` labeling recipe needs the kit's `label` item, which is intentionally not a `registryDependency` of `select` (kept opt-in) — documented in `select.json`'s new `docs` field and a one-line addition to `select.tsx`'s doc comment.
- **F6 (QoL).** Documented the shadcn named-registry alias so consumers can run `npx shadcn add @fluent2-react-kit/button`: `components.json` → `"registries": { "@fluent2-react-kit": "https://fluent2-react-kit.graund.io/r/{name}.json" }`, verified against the [shadcn namespace docs](https://ui.shadcn.com/docs/registry/namespace).
- **F7 (footnote).** Noted the upstream TS5101 `baseUrl`-deprecation error hit when following the official shadcn Vite guide, with the `"ignoreDeprecations": "6.0"` workaround, clearly marked as not this kit's issue.

No component or registry-mechanics code changed to fix any of the above — only the `docs` string fields in `registry/items/theme.json` and `registry/items/select.json` (both CLI-printed text) plus a one-line doc-comment addition in `select.tsx`.

## Backlog

### Near-term components

Straightforward additions that follow the existing conventions ([`docs/component-conventions.md`](component-conventions.md)) directly — no new architectural pattern required:

- (none left — the near-term list is fully shipped: Dialog, Tooltip, Dropdown Menu, and Popover in v0.3.0; Tabs, Accordion, Breadcrumb, Pagination, and Toast in v0.4.0. Next components come from the long-term list below.)

### Long-term / complex components

From the project brief — these need real design work (state machines, virtualization, or composite interaction patterns) beyond the current component template:

- Data Table
- Date Picker
- Calendar
- Tree View
- Navigation
- File Upload

(Advanced Combobox, Multi Select, and Command Menu shipped in v0.5.0 as the filter-list family.)

### Known TODOs from this run

- ~~**Figma visual validation for the v0.3.0 overlays and v0.4.0 batch.**~~ Resolved — all nine post-pass-1 components were validated against the Fluent 2 Web Figma kit (pass 2, 2026-07-12): 9 MAJOR findings, 7 fixed (Dropdown Menu section header, Tooltip border+elevation, Tabs geometry ×3, Accordion title weight, Breadcrumb button-pill items), 1 documented deviation (Toast tinted variants vs Fluent's flat card + status icon), 1 N/A (Pagination has no Fluent counterpart). Added the `--foreground-2` (`NeutralForeground2`) token. Full report: [`docs/design/figma-visual-validation.md`](design/figma-visual-validation.md) pass-2 section, including the new backlog items it spawned (Toast flat+icon appearance, Tabs/Accordion/Breadcrumb size axes, Dialog size variants, Menu/Select rest-text color).
- **`data-slot` loses to the `render`-prop element's own slot.** Composing a trigger with a kit component (`<DialogTrigger render={<Button …/>} />`) makes Base UI merge props so the rendered element's `data-slot="button"` wins over `data-slot="dialog-trigger"` (observed in the browser on the preview pages). Consumers targeting `[data-slot="dialog-trigger"]` won't match composed triggers. Needs a decision: reverse the merge order for `data-slot` in the wrappers, or document the behavior as-is.
- **Tooltip `aria-describedby` is a manual recipe, not automatic.** Base UI's Tooltip is explicitly "visual-only" (no auto `role`/`aria-describedby` wiring, unlike Radix). The kit adds `role="tooltip"` statically and documents a manual `id` + `aria-describedby` recipe in the doc comment; automatic wiring would need id-sharing context that forces `"use client"` onto the wrapper. Revisit if consumers trip on it.

- ~~**Vercel deployment URL placeholder (2 coordinated spots).**~~ Resolved — `apps/demo/app/page.tsx` and `scripts/build-registry.mjs` both now point `REGISTRY_BASE_URL` at the real production domain, `https://fluent2-react-kit.graund.io`. Still two independent hand-maintained constants, not wired to a shared env var — keep them in sync on any future domain change (see [`docs/registry.md`](registry.md#the-registry_base_url-placeholder-caveat)).
- **Resubmit to the shadcn Registry Directory once the logo is final.** A submission was prepared, validated, and opened as [shadcn-ui/ui#11137](https://github.com/shadcn-ui/ui/pull/11137) (2026-07-11), then **withdrawn by the maintainer because the project logo isn't final yet** — the entry shipped a placeholder "F2" monogram. Everything else is done and reusable: the registry passes all four directory requirements (open source, schema-valid `registry.json`, flat `/r/{name}.json` structure with all items reachable, no `content` in the index), the entry passes the `validate-registries.mts` zod schema, and the prepared branch lives at `oggbarcelos/ui` → `feat/add-fluent2-react-kit-registry`. To resubmit: rebase that branch on upstream `main`, replace the `logo` field in the `@fluent2-react-kit` entry of `apps/v4/registry/directory.json` with the final SVG (inline, single-color via `var(--foreground)`/`var(--background)`), re-run the name/URL/description/logo schema check, and open a fresh PR titled `feat(registry): add @fluent2-react-kit to registry directory`. See [`docs/registry.md`](registry.md#publishing-to-the-shadcn-registry-directory).
- ~~**Playwright e2e is not set up.**~~ Resolved — a root-level Playwright (Chromium) suite now runs in a real browser against the demo served in production mode (`next start` on a dedicated port). `@playwright/test` is a root devDependency only, config lives in `playwright.config.ts`, specs in `e2e/`, run via `pnpm test:e2e`. The `webServer` builds the demo (`pnpm --filter fluent2-react-kit-demo build`) and serves it; nothing in the app/package build scripts, `vercel.json`, or `pnpm-workspace.yaml` changed, so the Vercel deploy is unaffected. Covers `e2e/select.spec.ts` (every jsdom-untestable Select path — see the entry below), `e2e/smoke.spec.ts` (home renders, theme radiogroup toggles to dark and persists across reload), and — since v0.3.0 — `e2e/dialog.spec.ts`, `e2e/dropdown-menu.spec.ts`, `e2e/popover.spec.ts`, and `e2e/tooltip.spec.ts` (35 tests: centering/positioning, focus trap + return, scroll lock, collision flip, submenu hover/keyboard, hover-delay open, computed surfaces/shadows, hidden-not-unmounted close assertions; real-browser findings documented in each spec's header, e.g. the dialog focus trap's sentinel-span guards and the oklab-encoded `bg-black/40` backdrop). v0.4.0 added `e2e/tabs.spec.ts`, `e2e/accordion.spec.ts`, and `e2e/toast.spec.ts` (21 tests: sliding indicator geometry + manual activation, real height tween + close-completion — which also proved the "stuck closed panel" seen in a throttled embedded browser is a rAF-suspension artifact, not a component bug — toast stacking/auto-dismiss/hover-pause/F6 landmark; notable findings in the headers: Accordion **unmounts** closed panels so `toHaveCount(0)` is correct there, contra the Select precedent, and Tailwind v4's `rotate-180` compiles to the independent `rotate` property, same family as the §3.5 scale finding). v0.5.0 added `e2e/combobox.spec.ts`, `e2e/multi-select.spec.ts`, and `e2e/command.spec.ts` (33 tests: pointer open/commit/clear, real-browser filtering, anchor-width geometry, chips add/remove/wrap + chip keyboard, palette highlight/Enter/dialog flows; headline findings in the headers — Combobox popups UNMOUNT on close, contra Select's hide; `--anchor-width` measures the inner input, not the field wrapper; Base UI's chips `role="toolbar"` only appears once a chip exists; Command's engine filtering/highlight requires the `items` prop — static children are pointer-only). 105 e2e tests total. Setup/scripts documented in [`docs/contributing.md`](contributing.md#end-to-end-tests-playwright).
- ~~**`version` is duplicated.**~~ Resolved via drift guard — `src/version.test.ts` asserts the `index.ts` export equals `package.json`'s version, so bumping one without the other fails the suite (build-time generation wasn't worth the tooling: the value must live in source for the `@kit` alias consumers).
- **Fluent Divider inset/labeled variants.** The current `Separator` is a single 1px-stroke divider (horizontal/vertical only) — Fluent's inset and labeled-divider variants are not implemented.
- ~~**Interactive/selectable Card states.**~~ Partially resolved — `Card` now takes an `interactive` prop (hover raises `shadow-4` → `shadow-8`, pointer cursor, `data-interactive` hook; visual-only, semantics come from composition). A dedicated *selected* visual state remains unimplemented.
- **Avatar sizes/shapes/presence badges.** `Avatar` ships at a single implicit size (consumers resize via `className`, e.g. `size-10`) with no dedicated `size` prop, no shape variant, and no Fluent-style presence badge. Explicitly called out as out-of-scope in the component's own doc comment.
- **Input size variants.** `Input` ships one size only; Fluent's small/large field sizes are not implemented.
- **Badge tint appearance family.** `Badge` currently ships 6 filled/outline variants (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`); Fluent's separate "tint" (soft-fill) appearance family is not implemented.
- **`--shadow-brand-*` primitives shipped without utilities.** `tokens.css` defines `--shadow-brand-ambient` / `--shadow-brand-key` (for branded elevated surfaces) but no component or Tailwind utility currently consumes them — reserved for a future branded-surface use case.
- ~~**Status-extension tokens now consumed by `Alert`, `Toast` still pending.**~~ Resolved in v0.4.0 — `Toast` shipped with the same five status variants as `Alert`, consuming `--success-subtle`, `--warning-text`, `--warning-subtle`, `--destructive-subtle`/`--destructive-text`, and the `*-border` variants. All planned consumers of the status-extension tokens now exist (`Badge`, `Alert`, `Toast`).
- **`--destructive-text` added to fix an AA contrast failure.** `Alert`'s destructive variant originally accented its icon/title with the raw `--destructive` fill (`#d13438`, same hex in both themes), which measured ~4.6:1 against `--destructive-subtle` in light (barely AA) but only ~3.3:1 in dark (fails the 4.5:1 AA body-text minimum). Added `--destructive-text` to `tokens.css` (light `#b10e1c`, ~6.68:1; dark `#ff9a90`, ~8.02:1 — both comfortably AA) mirroring the existing `--warning`/`--warning-text` split, and switched `alert.tsx`'s destructive variant over to it. `--destructive` itself is untouched (badges/buttons/other future consumers of the raw fill are unaffected).
- ~~**Fluent shimmer keyframes for `Skeleton`.**~~ Resolved — `tokens.css` now ships `--animate-shimmer` (background-position sweep) and `skeleton.tsx` paints the Fluent wave: a 200%-wide `--secondary`-base gradient with an `--input`-grey crest (theme-aware in dark, where secondary/accent are the same hex and couldn't carry a wave).
- ~~**Progress indeterminate slide animation.**~~ Resolved — `tokens.css` ships `--animate-progress-indeterminate` (the `w-1/3` segment translates from `-100%` to `300%` of its own width, clipped by the root) and `progress.tsx` uses it in place of the `animate-pulse` stand-in.
- ~~**Select Playwright coverage.**~~ Resolved — `e2e/select.spec.ts` covers every path `select.test.tsx` had to defer: pointer click-to-open + commit, close/hide after the exit transition, click-outside/Escape close, below-trigger positioning with the `--anchor-width` min-width, collision flip-above, internal list scrolling with the scroll arrows, keyboard parity + scroll-into-view, the computed visual states (focus accent, highlight, check indicator, disabled, invalid), the dark popover surface, and the open scale+fade animation. Two real-browser findings corrected assumptions and are documented in the spec's header comment: (1) **the popup is hidden (`display:none`), not unmounted**, on close in Base UI 1.6.0 — so the assertion is that the `listbox` role leaves the accessibility tree and the popup computes to `display:none` (stronger than jsdom's `aria-expanded="false"`), not `toHaveCount(0)` DOM removal; (2) **`Select.Portal` mounts to `document.body`**, so the demo's `.dark` PreviewPanel does not theme the portalled popup — real dark theming is driven by the root `.dark` class (tested both ways). The scroll-up/down arrows **do** render on overflow, directionally (down at the top of the list, up after scrolling down).
- ~~**Select trigger `size` prop.**~~ Resolved — `SelectTrigger` now takes `size="sm" | "default" | "lg"` (24/32/40px) on the Button height scale, surfaced as `data-size`.
- **Deeper Windows forced-colors testing.** The `@media (forced-colors: active)` layer in `tokens.css` has not been validated against real Windows High Contrast themes beyond the token definitions themselves.
- ~~**Per-component visual validation against the Fluent 2 Figma.**~~ Resolved — all 17 components were validated against the official Fluent 2 Web Community Figma kit via Dev Mode MCP. 17/17 validated, 7 MAJOR findings, all fixed. Full report: [`docs/design/figma-visual-validation.md`](design/figma-visual-validation.md).
- **Spinner `Subtle` style + full 8-size set.** Fluent's Spinner ships a `Subtle` style axis (near-white arc/track, for spinners on colored surfaces) and 8 sizes (16/20/24/28/32/36/40/44px); this kit exposes only the brand-arc style and 4 of the 8 sizes (`sm`/`default`/`lg`/`xl` = 16/24/32/40px), with the inner `<circle>` classes hardcoded so `Subtle` can't be reached via `className` override either. Surfaced by the Figma visual validation pass.
- ~~**Progress `size`/large variant.**~~ Resolved — `Progress` now ships the Fluent `Size` axis (`default` 2px / `lg` 4px) with a `data-size` hook.
- **Alert status-extension hex precision (partially resolved).** `--warning-text` now uses the Figma instance's exact `#bc4b09` (4.74:1 on `--warning-subtle`, still AA). The remaining four (`--warning-subtle`/`--warning-border`, `--destructive-subtle`/`--destructive-border`) stay as-is: the validation passes never recorded their exact local Figma values, so changing them would be guessing — re-read them from the Message-bar instance on a future Figma pass before touching.

## Related docs

- [`docs/component-conventions.md`](component-conventions.md) — the contract new components (near-term or long-term) must follow.
- [`docs/registry.md`](registry.md) — detail on the `REGISTRY_BASE_URL` TODO and the directory submission step.
- [`docs/tokens.md`](tokens.md) — detail on the token-layer backlog items (`--shadow-brand-*`, status extensions).
- [`docs/contributing.md`](contributing.md) — how to pick up a backlog item and submit it.
