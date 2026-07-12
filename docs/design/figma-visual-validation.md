# Figma visual validation — Fluent 2 vs. `@graundtech/fluent2-react-kit`

**Date:** 2026-07-11
**Method:** Figma Dev Mode MCP against the official Microsoft Fluent 2 Web
Community kit — per-component `get_metadata`/`get_screenshot`/
`get_variable_defs` calls against the live Figma file, compared to this kit's
rendered `/preview/<name>` routes and source (`packages/react/src/components/ui/*.tsx`).
All 17 shipped components were checked.

**Disclaimer:** this is a validation against a *public design reference*, not
an audit performed by or affiliated with Microsoft. `@graundtech/fluent2-react-kit`
is an independent, community project "visually inspired by" Fluent 2 (see
[`docs/design/tokens-research.md`](tokens-research.md)); Figma variable values
quoted below are read directly from that community kit file and may drift from
Microsoft's canonical Fluent 2 spec or from future revisions of the Figma file
itself.

## Summary

| Component | Figma page | Verdict (pre-fix) | MAJOR findings | Status |
|---|---|---|---|---|
| Alert | `8934:8` "Message bar" | MAJOR (1) | `default` used `bg-card` (`#ffffff`, same as page bg) instead of Fluent's grey-filled Informative surface | **Fixed** (M1) |
| Avatar | `8911:3185` "Avatars" | MINOR | — | Documented deviation |
| Badge | `8911:3186` "Badge" | MAJOR (4) | Pill shape vs. 4px chip radius; 2× padding; one type-size step too large; Warning wrong hue + foreground polarity | **Fixed** (M5) |
| Button | `8911:3188` "Button" | MATCH | — | **Fixed** (link ramp, cascaded from M7) |
| Card | `8911:3189` "Card" | MATCH | — | No change |
| Checkbox | `8911:3190` "Checkbox" | MAJOR (2) | Undocumented rest-border color (`#d1d1d1` vs. spec `#616161`); no hover/pressed ramp | **Fixed** (M3) |
| Input | `8934:4` "Input" | MATCH | — | **Fixed** (N1, minor) |
| Label | `8934:5` "Label" | MAJOR (1) | Hardcoded 600 weight vs. Fluent's Regular-400 default | **Fixed** (M6) |
| Link | `8934:6` "Link" | MAJOR (1) | Brand ramp one full step too light across rest/hover/pressed | **Fixed** (M7) |
| Progress | `8934:12` "Progress bar" | MAJOR (1) | No Success/Warning/Error intent variant despite Fluent's `State` axis | **Fixed** (M2) |
| Radio Group | `8934:13` "Radio group" | MAJOR (2) | Same as Checkbox: undocumented border color + no hover/pressed ramp | **Fixed** (M4) |
| Select | `8911:3194` "Dropdown" | MATCH | — | **Fixed** (N1 trigger, N4 item radius) |
| Separator | `8911:3192` "Divider" | MINOR | — | Documented deviation (N3) |
| Skeleton | `8934:14` "Skeleton" | MATCH | — | No change |
| Spinner | `8934:17` "Spinner" | MINOR (3) | — | Partially fixed (N2 track color); size-set + Subtle style → backlog |
| Switch | `8934:18` "Switch" | MAJOR (1) | No hover/pressed ramp (border color was already a documented match) | **Fixed** (M4) |
| Textarea | `8934:21` "Textarea" | MATCH | — | No change |

**17/17 components validated. 7 MAJOR findings, all fixed in this pass** (Alert,
Badge, Checkbox, Label, Link, Progress, Radio Group/Switch — the last two share
one root cause and one fix).

## Per-component findings

### Alert (`8934:8`, "Message bar")
Structure matched exactly: radius `4px` (`rounded-md`), 1px stroke, Success
tokens byte-identical (`#f1faf1`/`#9fd89f`). The `default` variant's `bg-card`
resolved to `#ffffff` in light mode — identical to the page background — so it
never read as a filled surface the way Fluent's grey `#f5f5f5` "Informative"
MessageBar does. **Fixed (M1):** `default` now uses `bg-secondary`
(`#f5f5f5`/`#333333`), an exact hex match to Figma's `Status background color`,
no new token needed. Remaining MINOR: `--warning-text`/`--warning-subtle`/
`--destructive-subtle` are a shade off this Figma instance's own local values
(sourced from generic Fluent ramp docs rather than this file) — tracked as a
new backlog item, not fixed (precision-only, not visible).

### Avatar (`8911:3185`, "Avatars")
Default size (32px), circular shape, and Body-1-Strong initials type
(14px/600) all match exactly. One MINOR: Fluent's shipped default fallback
(no image) is neutral grey (`#e6e6e6` bg / `#616161` fg); this kit always
renders a brand-blue fallback. Deliberate, AA-checked — see **Deliberate
non-changes** below. Missing size scale/presence badges/group-pie layouts are
pre-existing backlog (`docs/status-and-backlog.md` line 66), not new findings.

### Badge (`8911:3186`, "Badge")
Four compounding MAJOR findings, all geometric/color, none structural:
Fluent's Badge uses a fixed **4px** chip radius at every size (confirmed
identical at Medium/20px and Extra-large/32px — not height-relative), **4px**
horizontal padding, and **10px/14px** Caption-2-Strong type; this kit shipped
`rounded-full` (pill), `px-2` (8px, 2×), and `text-xs` (12px, one step up).
Brand and Success fills matched exactly (`#0f6cbd`, `#107c10`). Warning was
the sharpest miss: Figma's Warning fill is a brighter `#f7630c` paired with
**dark** `#242424` text, not this kit's darker `#da3b01` with white text.
**Fixed (M5):** `rounded-md` (4px), `px-1`, `text-[10px]/[14px]`, and a new
dedicated `--warning-badge`/`--warning-badge-foreground` token pair
(`#f7630c`/`#242424`) — chosen because `#242424` on `#da3b01` measures
**3.40:1** (fails AA) while `#242424` on `#f7630c` measures **4.98:1** (clears
AA). `Alert`'s own `--warning`/`--warning-text` pair is untouched. The Danger
fill hex mismatch (`#c50f1f` Figma vs. `#d13438` `--destructive`) is a
deliberate non-fix — see **Single-destructive-red policy** below. The Tint
(soft-fill) appearance family remains a pre-existing backlog item.

### Button (`8911:3188`, "Button")
No MAJOR findings on its own — height (24/32/40), h-padding (8/12/16px),
radius (4px), and Primary fill (`#0f6cbd`) are all exact matches; dark
`--primary` (`brand-70`), the 4px radius, and the double-stroke focus-ring
approximation are all pre-existing, correctly documented deviations. **Fixed
as a side effect of M7:** the `link` variant's color ramp was shifted in
lockstep with `Link` (see below) since the two are documented as
kept-in-sync; Button keeps its own `font-semibold` weight.

### Card (`8911:3189`, "Card")
No MAJOR or new findings. Elevation is the standout: `--shadow-4` reproduces
Fluent "Shadow 04" byte-for-byte (`0 0 2px` + `0 2px 4px`, ambient
`rgba(0,0,0,.12)`, key `rgba(0,0,0,.14)`). Fill, border, and title weight all
match. 16px padding/gap vs. Fluent's 12px, and `rounded-lg` (6px) vs. Fluent's
4px card radius, are both pre-existing, already-documented deviations
(card.tsx doc comment) — reconfirmed accurate, not changed.

### Checkbox (`8911:3190`, "Checkbox")
Box geometry (16px, 2px radius, 1px border, 12px checkmark), checked fill
(`#0f6cbd`), and the indeterminate glyph all matched. Two MAJOR, undocumented
findings: the unchecked rest border used `border-input` (`#d1d1d1`) against
Fluent's `NeutralStrokeAccessible.Rest` (`#616161`), and there was no
hover/pressed ramp at all — despite `component-conventions.md` §4 already
prescribing a brand ramp for filled-brand surfaces (which `Button` follows).
**Fixed (M3):** rest border now uses the new `--stroke-accessible` token;
hover/pressed steps through `NeutralStrokeAccessible.Hover/Pressed`
(`#575757`/`#4d4d4d`) when unchecked, and `CompoundBrandBackground.Hover/Pressed`
(`brand-70`/`brand-60`, dark hover `brand-80`) when checked. See **Systemic
findings** below for the shared root cause across Checkbox/Radio Group/Switch.

### Input (`8934:4`, "Input")
Height (32px), radius (4px), typography (14px/400/lh20), background
(`#ffffff`), and side border (`#d1d1d1`) all matched exactly, as did the
signature 2px brand bottom-underline focus treatment (faithfully reproduced
via inset box-shadow, no reflow). One MINOR, now fixed: Fluent paints the
*resting* bottom edge with the darker `NeutralStrokeAccessible` (`#616161`)
while the other three sides stay `#d1d1d1` — this kit previously used a
uniform border. **Fixed (N1):** `border-b-stroke-accessible` added; focus and
`aria-invalid` still override it by specificity. H-padding (`px-3`=12px vs.
spec's 10px) and placeholder color (`#616161` vs. spec's `#707070`) remain
small, non-actionable MINOR drift.

### Label (`8934:5`, "Label")
Type size (14px/20px) and text color (`#242424`) matched. The headline
finding: Fluent's Label component set's **default** variant is literally
named `Type=Regular (Default)` (weight 400), with Semibold (600) as an
explicit opt-in — this kit's doc comment asserted the opposite ("Fluent 2's
Label type ramp is 14px/600") and hardcoded `font-semibold` unconditionally,
so every label rendered heavier than spec. **Fixed (M6):** default weight is
now `font-normal`; `className="font-semibold"` remains available as an
override for the Semibold variant. Asterisk gap tightened from `gap-2` (8px)
to `gap-1` (4px = Fluent `spacingHorizontalXS`), an exact spacing match. The
asterisk's earlier mixed-weight problem (inheriting the old `font-semibold`)
resolved automatically as a side effect. Asterisk color (`text-destructive`
`#d13438` vs. Figma's `#c50f1f`) is a deliberate non-fix — see
**Single-destructive-red policy**.

### Link (`8934:6`, "Link")
Underline behavior (none at rest, hover-only), visited-state handling
(deliberately unstyled, matching Fluent's guidance), and the `inline` variant
all matched. The systematic finding: every one of Fluent's three
`BrandForegroundLink` states was one brand-ramp step darker than this kit's
ramp — rest `brand-70`/hover `brand-60`/pressed `brand-50` (light) vs. this
kit's `brand-80`/`brand-70`/`brand-60`. **Fixed (M7):** ramp shifted to
`70→60→50` (dark `100→110→120`), matching `BrandForegroundLink` exactly;
weight changed `font-medium` (500) → `font-normal` (400), matching Fluent's
Body 1/Regular. `Button`'s `link` variant carries the identical color ramp
(documented as kept in sync) and was updated alongside it — see Button above.

### Progress (`8934:12`, "Progress bar")
Track thickness (`h-0.5`=2px), full-pill radius, and the Default-intent brand
fill (`#0f6cbd`) all matched exactly — the task's flagged "check this" item on
thickness resolved clean. The one MAJOR finding: Fluent's ProgressBar ships a
first-class `State` axis (Default/Success/Error/Warning) with distinctly
colored bars; this kit's indicator was unconditionally `bg-primary`, with no
way to render a green/red/orange bar without a manual `className` override.
**Fixed (M2):** added a `variant` prop (`default`/`success`/`warning`/
`destructive`) via a new `progressVariants` cva, exposed on
`ProgressPrimitive.Indicator`. `success` (`bg-success` `#107c10`) and
`warning` (`bg-warning` `#da3b01`) are exact hex matches to this Figma
instance's Success/Warning states; `destructive` reuses `bg-destructive`
(`#d13438`) rather than introducing Figma's filled-status `#c50f1f` — see
**Single-destructive-red policy**. Track color (`bg-secondary` `#f5f5f5` vs.
spec `#e6e6e6`) remains a MINOR, non-actionable drift (no existing token is an
exact match). The indeterminate gradient-sweep animation gap is pre-existing,
documented backlog (needs a `tokens.css` keyframe), reconfirmed accurate.

### Radio Group (`8934:13`, "Radio group")
Ring+dot indicator shape (vs. a checkmark) and `gap-2` spacing (an exact match
to Figma's own `spacingHorizontalS` between icon and label) were both already
correct and documented. Same two MAJOR findings as Checkbox, same root cause:
undocumented `border-input` (`#d1d1d1`) instead of `NeutralStrokeAccessible`
(`#616161`), and no hover/pressed ramp. **Fixed (M4):** unchecked ring now
uses `--stroke-accessible` with its hover/pressed steps; checked ring+dot step
through `CompoundBrandStroke`/`CompoundBrandForeground1` Hover/Pressed
(`brand-70`/`brand-60`, dark hover `brand-80`) via a `group` on the root so the
dot (no `data-checked` of its own) ramps alongside the ring.

### Select (`8911:3194`, "Dropdown")
Trigger↔Input parity was exact (height, radius, typography, side border,
focus underline) — Fluent's dropdown trigger and input field share identical
metrics, and this kit's implementation intentionally mirrors `Input`. Popup
elevation (`shadow-16`), item height (32px), and highlight behavior all
matched. **Fixed alongside Input (N1):** trigger picks up the same
`border-b-stroke-accessible` resting bottom accent. **Fixed (N4):**
`SelectItem` radius changed `rounded-sm` (2px) → `rounded-md` (4px), matching
Fluent's `Corner-radius/List/Default`. Checkmark-on-the-right placement
(vs. Fluent's leading checkmark) remains a documented, deliberate
shadcn-API choice. Item highlight color (`bg-accent` `#f0f0f0` vs. spec
`#f5f5f5`) is a deliberate non-fix — see **Deliberate non-changes**.

### Separator (`8911:3192`, "Divider")
Thickness (1px), orientation support, and ARIA semantics (`role="none"` vs.
`role="separator"`) all matched exactly. One MINOR: stroke color (`bg-border`
`#d1d1d1`) is one grey step darker than Fluent's dedicated Divider stroke
(`#e0e0e0`). **Not fixed — documented (N3):** a doc-comment-only change
explaining the token-consistency trade-off; see **Deliberate non-changes**.
Missing labeled/inset divider variants remain pre-existing backlog
(line 64).

### Skeleton (`8934:14`, "Skeleton")
No MAJOR or actionable MINOR findings. Corner radius (4px) matched exactly;
flat `bg-secondary` fill sits inside Figma's `#e6e6e6`–`#fafafa` gradient
range (close enough to not warrant a fix). The gradient-sweep shimmer
animation gap is pre-existing, documented backlog, reconfirmed accurate — this
pass supplied the exact two gradient-stop hex values a future
`--animate-shimmer` implementation would need.

### Spinner (`8934:17`, "Spinner")
Arc brand color (`#0f6cbd`) and round-capped stroke geometry matched exactly.
Three related MINOR findings: (1) the track circle used
`text-muted-foreground/25` (grey) against Fluent's `BrandStroke2Contrast.Rest`
(`#b4d6fa` — a pale **blue**, this kit's own `--brand-140`); (2) only 4 of
Fluent's 8 spec'd sizes (16/20/24/28/32/36/40/44px) are exposed; (3) no
`Subtle` style variant for spinners placed on colored surfaces, and the inner
`<circle>` classes are hardcoded so it can't be overridden via `className`.
**Fixed (N2):** track color is now `text-brand-140` (exact hex match), with
`dark:text-brand-40` as a derived dark pairing (no dark Figma frame existed;
chosen to avoid colliding with `--primary`'s dark value of `brand-70`).
Size-set and `Subtle` style remain backlog — added as new items (see
**Backlog additions**).

### Switch (`8934:18`, "Switch")
Track dimensions, thumb size/travel, and checked-state colors
(`#0f6cbd`/`#ffffff`) all matched — this was the one component that already
had an explicitly *documented* deviation for the unchecked track border
(`border-input` over the measured `#616161`), unlike Checkbox/Radio Group's
undocumented version of the same substitution. One MAJOR: no hover/pressed
ramp, same gap as Checkbox/Radio Group. **Fixed (M4):** unchecked track now
uses `--stroke-accessible` (retiring the old `border-input` documented
deviation, since the new token is spec-true), with the same
`CompoundBrandBackground` hover/pressed ramp on the checked track as
Checkbox/Radio Group.

### Textarea (`8934:21`, "Textarea")
No MAJOR findings. Border, background, radius, and the bottom-accent focus
treatment (shared with Input) all matched exactly. Placeholder color
(`text-muted-foreground` `#616161` vs. spec's `#707070`) is a MINOR,
non-actionable drift — ours is *higher* contrast than spec, and
`--muted-foreground` is a shared token used across the whole kit, so a
Textarea-only fix would break consistency elsewhere. Single-style/no-size-
variant scope is pre-existing, documented, and correctly out of scope.

## Systemic findings

**The `NeutralStrokeAccessible` (`#616161`) pattern.** Five components
independently needed Fluent's higher-contrast interactive-control stroke —
Checkbox, Radio Group, and Switch (unchecked border) and Input/Select
(resting bottom edge) — but only `Switch` had documented the substitution of
the lighter `border-input` (`#d1d1d1`) in its place; Checkbox and Radio Group
made the same swap silently. Rather than patch five components with one-off
hex values, a new token family was added to `tokens.css` (**T1**):
`--stroke-accessible` (`#616161` light / `#adadad` dark) with `-hover`
(`#575757`/`#b3b3b3`) and `-pressed` (`#4d4d4d`/`#bdbdbd`) steps, bridged
through the `@theme inline` layer as `--color-stroke-accessible*` and remapped
to `CanvasText` under `.high-contrast`. `tokens.test.ts` gained four new
assertions covering the `:root`/`.dark` values, the `@theme` bridge, and the
high-contrast remap.

**The missing interaction ramp.** Checkbox, Radio Group, and Switch all had
zero `hover:`/`active:` classes, despite `component-conventions.md` §4
already prescribing a brand hover/press ramp for filled-brand surfaces (the
recipe `Button` follows). This wasn't a documented simplification — it was an
oversight. A new §4 subsection, **"Control stroke + interaction ramp,"** now
codifies the pattern for this component family: the unchecked outline steps
through `--stroke-accessible`'s three states; the checked state's border+fill
step through `CompoundBrandBackground`/`CompoundBrandStroke` Hover/Pressed
(`brand-70`→`brand-60` light, `brand-80` dark hover), using
`data-[checked]:hover:`/`:active:` selectors so the checked ramp always
outranks the neutral one by specificity. Radio's dot (no `data-checked` of
its own) rides its parent's `group` hover/press instead.

**The single-destructive-red policy.** The Figma source uses two distinct
reds across components: `#d13438` (this kit's `--destructive`, used for
Button/Alert/most fills) and `#c50f1f` (a separate "filled-status" red bound
to ProgressBar's Error state, Badge's Danger fill, and Label's required
asterisk in the live Figma file). Rather than introduce a fifth red token to
chase per-component fidelity, `docs/design/tokens-research.md` §12 decision 9
formalizes standardizing on the single existing `--destructive` (`#d13438`)
everywhere a destructive/danger fill is needed — Badge's `destructive`
variant, Progress's new `destructive` variant, and Label's required asterisk
all intentionally keep `#d13438`, not `#c50f1f`.

**The `--warning-badge` AA story.** Badge's Warning variant is the one case
where matching Figma's own fill *required* a new token rather than reusing an
existing one, because the fill and foreground are coupled: Figma's Warning
badge pairs a brighter fill (`#f7630c`) with **dark** static text (`#242424`),
the opposite polarity from `--warning`'s (`#da3b01`) white-text pairing used
elsewhere (e.g. Alert). Reusing `--warning` with dark text would fail AA
(`#242424` on `#da3b01` measures **3.40:1**); the new fill clears it
(`#242424` on `#f7630c` measures **4.98:1**). A dedicated
`--warning-badge`/`--warning-badge-foreground` pair keeps Alert's existing
`--warning` untouched while letting Badge match its own Figma instance
exactly and stay AA-safe.

> **Provenance note (verified at the source).** During consolidation the Badge
> and ProgressBar reports appeared to contradict each other on the value of
> `WarningBackground3.Rest`. Re-querying both symbols directly via the Figma
> Dev Mode MCP settled it: the *same semantic token name* resolves to
> **different values per component context** in the official kit — Badge
> `Warning/Medium/Filled` (`9202:10241`) binds it to `#f7630c` (paired with
> static dark text), while ProgressBar `Warning/Medium` (`9121:5778`) binds it
> to `#da3b01`. Both readings were correct, the divergence is Figma-side, and
> each of this kit's fixes matches its own component's actual spec.

## Deliberate non-changes

- **Separator stroke color** — Fluent's Divider token (`#e0e0e0`) is one grey
  step lighter than the generic `--border` (`#d1d1d1`) this component reuses.
  Kept `bg-border` on purpose: a divider sharing the exact token used by
  inputs/cards is worth more than one-step-lighter fidelity, and re-pointing
  `--border` globally would lighten every input/card border too.
- **Select item highlight color** — `bg-accent` (`#f0f0f0`) vs. Fluent's list
  hover (`#f5f5f5`) is a one-grey-step difference, imperceptible on a 32px
  row; kept `--accent` for token consistency with every other hover surface
  in the kit rather than introduce a list-specific hover token.
- **Avatar brand fallback** — Fluent's own Avatar component set defaults to a
  neutral-grey fallback (`#e6e6e6`/`#616161`) when no image/initials color is
  set; this kit always renders a brand-blue fallback (AA-checked, both
  themes) for consistent brand identity across the kit. Not changed in this
  pass (`avatar.tsx` is out of scope for a docs-only change); the doc-comment
  softening this validation recommends is left as a follow-up.
- **Destructive red (`#d13438` vs. Figma's `#c50f1f`)** — single-token policy,
  see **Systemic findings** above and `docs/design/tokens-research.md` §12
  decision 9.

## Backlog additions

New items surfaced by this validation and added to
[`docs/status-and-backlog.md`](../status-and-backlog.md):

- **Spinner `Subtle` style + full 8-size set.** Fluent's Spinner ships a
  `Subtle` style axis (near-white arc/track for colored surfaces) and 8 sizes
  (16/20/24/28/32/36/40/44px); this kit exposes only the brand-arc style and
  4 of the 8 sizes (`sm`/`default`/`lg`/`xl` = 16/24/32/40px), with no
  `className`-override path to `Subtle` since the inner `<circle>` classes
  are hardcoded.
- **Progress `size`/large variant.** Fluent's ProgressBar ships a
  Medium(2px)/Large(4px) `Size` axis; this kit only offers the 2px Medium
  track, with no `size` prop.
- **Alert status-extension hex precision.** `--warning-subtle`/
  `--warning-border`/`--warning-text` and `--destructive-subtle`/
  `--destructive-border` are close to, but not exact matches of, this Figma
  file's local Message-bar values (sourced from generic published Fluent ramp
  docs rather than this specific component instance) — e.g.
  `--warning-text` `#c43501` vs. the Figma instance's `#bc4b09`. Small,
  same-hue drift; not a contrast or functional issue, flagged for future
  precision-tightening.

---

# Pass 2 — v0.3.0 overlays + v0.4.0 batch (2026-07-12)

**Method:** identical to pass 1 (per-component `get_metadata`/`get_screenshot`/
`get_variable_defs` via the Figma desktop Dev Mode MCP against the same Fluent 2
Web Community kit), run by four parallel validation agents over the nine
components shipped after pass 1. Same disclaimer applies.

## Summary

| Component | Figma page | Verdict (pre-fix) | MAJOR findings | Status |
|---|---|---|---|---|
| Dialog | `8911:3191` "Dialog" | MINOR | — | Title 18→20px fixed; radius 10 vs 8px + shadow-alpha drift documented |
| Popover | `8934:11` "Popover" | MATCH | — | Documented deviation (visible border vs Figma's `TransparentStroke`) |
| Dropdown Menu | `8934:7` "Menu" | MAJOR (1) | Section header was `font-medium`/muted vs Fluent Caption-1-Stronger Bold/`NeutralForeground2` | **Fixed** (P2-M1) |
| Tooltip | `8934:25` "Tooltip" | MAJOR (2) | Visible border where Fluent's stroke is transparent; `shadow-16` where Fluent specs `Shadow 08` | **Fixed** (P2-M2) |
| Tabs | `8934:19` "Tablist" | MAJOR (3) | Tab height 36 vs 44px; indicator 2 vs 3px; full-bleed bar vs 12px-inset pill | **Fixed** (P2-M3) |
| Accordion | `8911:3184` "Accordion" | MAJOR (1) | Title `font-medium` (500) vs Fluent Body-1 Regular (400) | **Fixed** (P2-M4; header also tightened to Fluent's 44px) |
| Toast | `8934:22` "Toast" | MAJOR (structural) | Fluent Toast is a flat white card + colored leading status icon; kit ships Alert-mirrored tinted variants | **Documented deviation** + backlog (see below) |
| Breadcrumb | `8911:3187` "Breadcrumb" | MAJOR (2) | Items are button-like hover/pressed pills (`Type=Button` symbols); current page emphasized by weight only, same `NeutralForeground2` color | **Fixed** (P2-M5) |
| Pagination | — | N/A | No Fluent 2 Web counterpart exists; the component is a shadcn-pattern composite styled entirely via the (pass-1-validated) `buttonVariants` | No change |

**9/9 components validated. 9 MAJOR findings: 7 fixed, 1 documented deviation
(Toast), 1 N/A (Pagination).**

## Fixes applied (P2-M1…M5)

- **P2-M1 Dropdown Menu section header** — `DropdownMenuLabel` now
  `font-bold text-foreground-2` (Fluent Caption 1 Stronger in
  `NeutralForeground2`), replacing the SelectLabel-parity muted caption. Node
  evidence `9121:6394`/`9121:6395`.
- **P2-M2 Tooltip surface** — dropped the `border` class (Fluent binds the
  tooltip stroke to `TransparentStroke.Rest`; edge is elevation-only) and
  swapped `shadow-16` → `shadow-8` (Fluent's tooltip is the Shadow-08 tier —
  `0 0 2px` + `0 4px 8px`, node `9014:2662`); also `px-2.5` → `px-3`
  (`spacingHorizontalM` = 12px).
- **P2-M3 Tabs geometry** — trigger `py-2` → `py-3` (44px Fluent Medium tab,
  node `9116:18471`); indicator `h-0.5` → `h-[3px] rounded-full` inset 12px
  from each tab edge via `calc()` on Base UI's `--active-tab-left/width`
  (Fluent's indicator is a short inset pill, node `9116:18476`), sliding
  behavior unchanged.
- **P2-M4 Accordion title** — `font-medium` → `font-normal` (Fluent Body 1
  Regular, node `9074:921`; same root cause as pass 1's Label M6) and
  `py-4` → `py-3` (44px Fluent Medium header, node `9074:915`).
- **P2-M5 Breadcrumb items** — `BreadcrumbLink` is now a button-like pill
  (`rounded-md px-1.5 py-0.5 hover:bg-accent active:bg-accent/80` — Figma's
  item symbols are literally `Type=Button` with `SubtleBackground`
  hover/pressed fills, node `9077:5740`; the `--accent` fill carries the same
  one-grey-step drift accepted for Select/Menu highlights); trail base color
  `text-muted-foreground` → `text-foreground-2` (`NeutralForeground2`
  `#424242`, node `9077:5763`); `BreadcrumbPage` emphasizes by **weight only**
  (`font-semibold`, same trail color — node `9077:5783`), replacing the
  weight+color jump.

## New token

- **`--foreground-2`** (`NeutralForeground2`): light `#424242` (grey[26]),
  dark `#d6d6d6` (grey[84]), high-contrast `CanvasText`; bridged as
  `text-foreground-2` etc. Three independent pass-2 findings resolved to this
  exact value (Menu section header, Breadcrumb trail, Menu item rest text) —
  same systemic-gap pattern that produced `--stroke-accessible` in pass 1.

## Documented deviations (deliberate, not fixed)

- **Toast tinted status variants.** Every status instance on Fluent's Toast
  page (`9472:13071`–`13396`) is a flat white `NeutralBackground1` card whose
  status semantics live entirely in a colored leading icon — titles stay
  `#242424` regardless of intent. The kit's tinted `*-subtle`/`*-border`
  variants (mirroring Alert) are kept as the kit's deliberate design: they keep
  Toast/Alert visually consonant and the status tokens already ship. A
  Fluent-exact alternative (flat surface + leading status-icon slot) is on the
  backlog.
- **Popover border.** Figma's Default popover binds `TransparentStroke.Rest`
  (shadow-only edge); the kit keeps a 1px `border-border` line for edge
  definition on flat renders (`9087:454`).
- **Dialog radius/shadow.** `rounded-xl` = 10px vs `Corner-radius/Modal/Large`
  = 8px (the kit's radius scale has no 8px step; a global `--radius-xl` change
  would ripple to Card); shadow alphas are the same generic-vs-local-instance
  drift already documented for `--shadow-4` in pass 1.
- **Tabs resting hairline.** The kit's `TabsList` keeps a `border-b` rule the
  Figma symbols don't show (Fluent relies on the indicator alone) — kept for
  list delineation, documented here.

## New backlog items from pass 2

- Toast Fluent-exact appearance: flat `NeutralBackground1` surface + leading
  status-icon slot (structural; see deviation note above).
- Tabs `size` axis (Fluent Small 32px / Medium 44px with per-size indicator
  geometry), vertical orientation, and the hover-state grey indicator bar.
- Accordion size axis (Small/Medium/Large/Extra-large), optional leading-icon
  slot, 20px chevron (kit uses 16px), panel padding 12px h/v (kit: `pb-4`
  only).
- Dialog explicit size variants (Figma ships 600px/320px; kit is `max-w-lg` =
  512px, between the two).
- Dropdown Menu / Select item **rest** text as `NeutralForeground2`
  (`#424242`) darkening to `#242424` on hover — kit currently uses uniform
  `popover-foreground`; now expressible via `--foreground-2`, deferred to keep
  Menu/Select consistent until both are changed together.
- Breadcrumb size axis (Large 16px / Medium 14px / Small 12px).
