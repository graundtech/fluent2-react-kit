# Ribbon validation — kit vs. live Word Online

Phase-4 validation of the `ribbon` composite (single-line mode) against the
real Word Online ribbon ("Faixa de Opções de Linha Única"), driven live in a
logged-in browser on 2026-07-13 at 1440px. Method: the OOPIF blocks DOM/ARIA
reads, so Word-side numbers come from calibrated 1:1 screenshot measurement
(the viewport maps 1:1 to CSS px); kit-side numbers from
`getComputedStyle`/`getBoundingClientRect` on `/preview/ribbon`. This is the
Ribbon counterpart of `figma-visual-validation.md` — Ribbon has no Fluent 2
Figma entry, so live Word is the visual reference of record (see
`ribbon-behavior-spec.md`).

## Findings

| # | Severity | Area | Word (observed) | Kit | Verdict / action |
|---|---|---|---|---|---|
| 1 | **MAJOR** | Tab strip height | ≈36px guide row | 44px (kit `Tabs` default, Fluent "medium" tab) | **Fix**: `RibbonTab` gets a compact `h-9` (36px) default; kit `Tabs` itself untouched (its 44px is Figma-validated for standalone use) |
| 2 | **MAJOR** (demo fidelity) | Preview priorities | Paste survives to the narrowest widths (only Dictate/mic drops before the N-I-S tier); survivors ≈ undo, paste, painter, N/I/S, bullets, align, styles, search | Preview demotes Colar to priority 44 (deliberate phase-3 choice to demo `overflowRender`) | **Fix**: retune `/preview/ribbon` priorities to Word's survivor ladder; the submenu-in-overflow path stays covered by unit/e2e tests |
| 3 | OK | Command row height | ≈38–40px band | 40px | Match |
| 4 | OK | Control size / shape | ≈32px, ~4px radius, subtle gray hover (rounded) | 32px, 4px radius, ghost hover via tokens | Match |
| 5 | OK | Group separators | Thin vertical hairlines between logical groups | `ToolbarSeparator`, `--border` hairline | Match |
| 6 | OK | Overflow menu anatomy | Hidden commands grouped under source-group section headers, icon + full-label rows, split buttons keep a `❯` submenu, combos become labeled fields | Same (verified live in the preview: 6 hidden → 6 menu rows under their group headers; Colar submenu works inside the menu) | Match |
| 7 | OK | Overflow ranking | Priority beats DOM position (e.g. font combos drop before N/I/S despite sitting to their left) | Same (`priority` > DOM tie-break) | Match |
| 8 | minor, documented | Active-tab underline | ≈3px brand underline | 2px (kit `Tabs` indicator, per the Fluent 2 Figma validation) | Keep 2px — Figma token truth wins for kit-wide consistency; divergence noted |
| 9 | minor, documented | "…" trigger steady state | Permanently visible (some commands never fit, e.g. Suplementos) | Hidden when nothing overflows | Same mechanism, different steady state; a consumer reproducing Word exactly can add a permanent low-priority tail group |
| 10 | **RESOLVED (v2 C4)** | Layout switcher | Chevron pinned at the ribbon's far right (outside the overflow budget), opening layout + show-mode options | `RibbonLayoutSwitcher` ships (v2 C4): far-right pinned chevron, exact pt-BR copy, via `RibbonTabList`'s `actions` slot (outside the tablist + outside the overflow budget). Two cosmetic divergences documented below. | Closed — see the v2 classic-mode validation section |

## Fix status

Findings #1 and #2 are **fixed** (RibbonTab `h-9`; preview priorities retuned
to the Word survivor ladder, with a new low-priority "Realce" split button
carrying the submenu-in-overflow demo — faithful to Word, where highlight is
a split button that drops early). E2e specs were recalibrated and the full
Playwright suite passes (135/135).

## E2e cross-findings (phase-4 batch)

The e2e pass surfaced three additional items, all resolved or dispositioned:

- **Toggle outline pressed fill in dark (real bug, fixed)** — the variant's
  resting `dark:bg-input/30` outranked the unscoped pressed fill in the
  cascade; `dark:data-[pressed]:bg-secondary` re-asserts it. Regression is
  asserted in `e2e/toggle.spec.ts`.
- **Toolbar `render` composition caveat (documented)** — an inner
  `render={<Button variant=…/>}` participates in roving focus but the outer
  `ToolbarButton`'s variant/size win the class merge; styled toolbar items
  should set variant/size on `ToolbarButton` itself. Noted in the preview and
  here; same family as the known data-slot merge-order TODO.
- **`padding` reserve tuning — RESOLVED in overflow v1.1** — the manager now
  models every real cost (computed flex gap per visible slot, dividers as
  measured participants, the trigger's gap share, the container's own inline
  padding) and backs it with a hide-only post-layout safety net
  (`scrollWidth` check with an oscillation guard). `padding` is now pure
  consumer slack, default 0 — both previews dropped their hand-tuned
  reserves, and `e2e/ribbon.spec.ts` asserts zero clipping on the dense
  Início row at every settled slider width (the former ~47px overrun is
  gone; the only exclusion is the 240px floor, where `minimumVisible`
  legitimately forces pinned Desfazer + one command past the width).

## v2 classic-mode validation (phase C4, 2026-07-14)

Validation of the classic (expanded) layout + `RibbonLayoutSwitcher` against
the documented live-Word ground truth (the classic band anatomy + resize
ladder captured live in `ribbon-behavior-spec.md`, and the layout-switcher
menu captured live during phase-0 recon). Kit side driven on the demo
`/preview/ribbon`; classic interactive behavior (collapse ladder, flyout,
scroll, switcher round-trip) is proven by `e2e/ribbon-classic.spec.ts` in real
Chromium — the embedded browser pane suspends rAF, freezing Base UI menu
interactions and layout reads, so Playwright is the source of truth for
geometry and menu behavior (a recurring caveat across every phase).

| # | Severity | Area | Word (documented) | Kit | Verdict |
|---|---|---|---|---|---|
| C-1 | OK | Switcher copy | Two sections: "Layout da Faixa de Opções" (Faixa de Opções Clássica / Faixa de Opções de Linha Única); "Mostrar Faixa de Opções" (Sempre mostrar faixa de opções / Mostrar apenas as guias / Ajustar automaticamente) | Byte-identical copy, both section headers, all 5 items (verified in the demo menu) | Match |
| C-2 | OK | Switcher position | Chevron pinned far-right of the tab strip, outside the overflow budget | `RibbonTabList` `actions` slot: far-right, outside `role="tablist"`, outside the `flex-1 min-w-0` Overflow viewport so tabs fold before colliding | Match |
| C-3 | OK (better) | Switcher a11y | (native desktop control) | Proper ARIA: `menuitemradio ×4` + `menuitemcheckbox ×1`, trigger is a labelled button OUTSIDE the tablist (axe `aria-required-children` clean) | Kit is more semantic than a checkmark list |
| C-4 | OK | autoAdjust exposure | "Ajustar automaticamente" is a classic-only option | The checkbox item is **disabled in single-line** (Word only exposes it for classic) | Match |
| C-5 | minor, documented | Active-item indicator | Checkmark (✓) on the active layout item AND on Ajustar automaticamente | Radio-dot (●) on the layout/show radios; checkmark (✓) on the autoAdjust checkbox | **Keep** — the kit's `DropdownMenuRadioItem` renders a radio marker (semantically correct for a mutually-exclusive choice), consistent kit-wide; Word's checkmark-on-radio is a Word-ism. Same precedent as finding #8. |
| C-6 | minor, documented | Menu on select | Word **closes** the menu when a layout is picked | The switcher menu **stays open** (`closeOnClick=false`, settings-panel idiom) so layout + show-options can be adjusted together | **Keep for now** — a defensible UX improvement; possible future refinement to close-on-layout-select. Divergence noted. |
| C-7 | OK | Classic band anatomy | ~96px band; groups = controls over a centered muted label, ↘ launcher, hairline separators; whole groups collapse to a labelled dropdown that opens the group in a flyout | Same (C2): `~h-24` band, `RibbonGroup` classic anatomy + `collapsePriority` collapse to a dropdown whose `Popover` flyout holds the group's same children | Match (structural; live pixel/dark-mode pass optional) |
| C-8 | OK | Collapse ladder order | Parágrafo collapses before Fonte; scroll fallback after group collapse exhausts; tab strip folds at extreme widths | Same — `collapsePriority` order proven, scroll arrows + tab-strip overflow proven (`e2e/ribbon-classic.spec.ts`). Demo's compact groups stage the ladder in a tighter width band than Word's wider groups (a demo-content artifact, not a component trait). | Match |

Two cosmetic divergences (C-5 radio-dot vs checkmark; C-6 stays-open vs
closes) are the only gaps, both deliberate and consistent with the kit's own
idioms — the same "kit truth wins over literal Word mimicry, documented"
stance taken for the 2px underline (#8) and the auto-hiding trigger (#9).
Finding #10 is closed. A fresh live-Word **dark-mode** pixel comparison of the
classic band is the one nicety deferred (the classic anatomy is already
validated structurally and against the phase-0 live capture).

## Environment notes (for future validation passes)

- The Word editor OOPIF accepts synthetic input normally **as long as the
  Chrome window is visibly frontmost**; `visibilityState: "hidden"` freezes
  rendering (rAF suspension) and clicks appear dead — front the window before
  diagnosing anything as broken.
- Word restored to "Faixa de Opções Clássica" + "Ajustar automaticamente"
  after the session (Gabriel's original preference).
