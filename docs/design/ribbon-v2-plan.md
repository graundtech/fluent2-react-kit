# Ribbon v2 plan — classic (expanded) layout

Approved 2026-07-13. Scope decisions made by Gabriel (each was the
recommended option):

1. **Collapse model = Word web**: whole groups collapse to a dropdown button
   (no per-item large→medium→small stages). The desktop-style
   `SizeDefinition` ladder (DevExpress/Fluent.Ribbon lineage) is a possible
   v2.1 extension, out of scope here — it has no live reference to validate
   against (Word web doesn't do it).
2. **Gallery deferred**: the shrinking preview gallery (Word's "Estilos") is
   NOT part of v2 — classic groups use a regular dropdown in its place. A
   standalone `gallery` kit component (valuable beyond the Ribbon; absent
   from both shadcn and Fluent v9) is its own future initiative.
3. **One tree, two layouts + escape hatch**: the same
   `RibbonGroup`/`RibbonItem` tree renders in both layouts, with form
   components adapting to the root's `layout`; optional per-layout slots
   cover the cases where Word genuinely shows different content per mode.

Behavioral source of truth: `ribbon-behavior-spec.md` ("Classic mode" —
captured live: Parágrafo collapses at 1240px, Fonte at 1000px, scroll
fallback at 840px, tab-strip overflow at 680px; group anatomy with bottom
label, launcher ↘, separators). Validation reference: live Word Online in
"Faixa de Opções Clássica".

## Phases

### C1 — Group-collapse manager (the hard part)

A sibling of the v1.1 overflow manager, reusing its proven foundations
(subscribe/getSnapshot store with referential stability, ResizeObserver,
injectable `getSize`/`getGap`/`getOverflowSize`, the hide-only `settle()`
safety net, StrictMode-revivable lifecycle) but with per-GROUP state instead
of per-item visibility:

- Groups register `{ groupId, collapsePriority, expandedElement,
  collapsedElement }`. Both forms stay mounted; the inactive form is
  `display:none` (sizes cached on first measure while visible; estimates +
  the settle net cover the not-yet-measured collapsed form — the v1.1
  mechanism makes optimistic estimates safe).
- Compute: all expanded → while over budget, collapse the next group by
  `collapsePriority` (higher collapses FIRST — matching the observed Word
  order, Parágrafo before Fonte) → all collapsed and still over budget →
  **scroll mode** flag in the snapshot (C3 renders it).
- Same accurate accounting as v1.1: computed gap × slots, separators as
  measured participants, container inline padding.
- Snapshot: `{ groupModes: Record<groupId, "expanded"|"collapsed">,
  scrollMode: boolean }`, referentially stable.
- Deliverable shape: extend `overflow.tsx`'s core or a new headless module —
  builder decides after reading both; unit tests with synthetic sizes
  (ladder order, floors, settle, revival), same jsdom injection strategy.

### C2 — Classic presentation (the visible part)

- `RibbonContent` renders a classic band when the root `layout="classic"`:
  ~96px content area + group labels row; groups separated by hairlines.
- `RibbonGroup` classic anatomy: children in the content area, centered
  muted label below (~11px), optional `launcher` slot (↘ button, fires
  `onLauncherClick`), and the **collapsed form**: an icon + label + chevron
  dropdown button that opens the group's SAME children inside a Popover
  flyout (the v1 dual-presentation trick at group level — children are
  React nodes, they just render into a different container; no
  re-measurement problem because the flyout has its own layout).
  New props: `collapsePriority`, `icon` (for the collapsed button).
- New form components: `RibbonLargeButton` (stacked icon-over-label, Colar
  style, composes SplitButton semantics where needed), `RibbonRow`/
  `RibbonColumn` layout helpers for the 2×3 small-button grids.
- **One-tree adaptation**: in `layout="single-line"` these same groups/items
  render exactly as v1 does today (regression-proof: the v1 e2e suite must
  stay green untouched). Escape hatch: `RibbonItem`/`RibbonGroup` accept
  `layouts?: ("single-line" | "classic")[]` to appear in only one mode
  (Word parity: the two modes show different command sets).

### C3 — Fallbacks

- **Scroll mode**: when the snapshot says so, the band scrolls horizontally
  with edge arrow buttons (Word: `>` on the clipped edge), keyboard
  accessible, arrows auto-hide at the ends.
- **Tab-strip overflow**: trailing tabs fold behind a chevron menu at
  extreme widths — direct reuse of the v1 `Overflow` machinery on the
  `RibbonTabList` (tabs as `OverflowItem`s + a menu rendering hidden tabs).
- **`autoAdjust` implemented** (classic only, as in Word): `true` (default)
  = staged collapse then scroll; `false` = no collapse, straight to scroll.

### C4 — Switcher, validation, e2e

- `RibbonLayoutSwitcher` (optional, composable): the far-right pinned
  chevron menu with "Layout da Faixa de Opções" (Clássica / Linha Única)
  and "Mostrar Faixa de Opções" (Sempre / Apenas guias / Ajustar
  automaticamente) — closes validation finding #10. Controlled via the
  existing root props (`layout` becomes controllable:
  `layout`/`defaultLayout`/`onLayoutChange`).
- `/preview/ribbon` gains the switcher and classic content (same tree).
- Validation vs live Word classic (ladder widths, group anatomy, collapsed
  flyout, scroll arrows) → report appended to `ribbon-validation.md`.
- E2e: classic ladder (collapse order at the captured breakpoints), collapsed
  group flyout (children usable inside), scroll mode + arrows, tab-strip
  overflow, layout switching round-trip with state preserved, `autoAdjust`
  off behavior. v1 specs untouched and green.

## Design risks (watch during C1/C2)

- **Group double-mounting cost**: both forms mounted per group (hidden one
  `display:none`) — fine for ~10 groups; document it; virtualize never.
- **Focus during collapse**: a focused control whose group collapses must
  move focus to the group's collapsed dropdown button (the v1
  focus-to-trigger pattern at group level). Must be e2e-asserted.
- **Layout switch churn**: switching layouts remounts the band — acceptable
  (Word reloads its whole ribbon too); keep tab/collapsed state.
- **`RibbonItem` semantics per layout**: `priority`/`pinned` are single-line
  concepts; in classic they are ignored (the group's `collapsePriority`
  rules). Document loudly.

## Execution model

Same as v1: one solo Opus builder per phase, full-gate verification by the
orchestrator between phases, live-Word validation with Gabriel's Chrome
window frontmost, per-phase commits. C1 and C2 are sequential (C2 consumes
C1's snapshot); C3 can partially overlap C2; C4 is the closer.
