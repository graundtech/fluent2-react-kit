# Fluent 2 → shadcn Token System — Research & Spec

Design-token research for `@graundtech/fluent2-react-kit`. This kit is **visually inspired by** Microsoft Fluent 2 but follows the **shadcn/ui philosophy** (CSS variables + Tailwind utilities, copy-paste components). It is **not affiliated with Microsoft**. No Fluent UI source is copied verbatim; the tokens below are **derived** from publicly documented Fluent 2 design values and the open Fluent UI React v9 token ramps, then re-expressed in a shadcn-compatible variable system.

> **Value provenance legend**
> - **[F]** = taken directly from a published Fluent ramp/token (authoritative hex / px / ms / cubic-bezier).
> - **[D]** = derived by us (a mapping decision, a converted OKLCH value, or an interpolated choice). Derivations are defensible and documented, but an implementer may adjust.
>
> **Hex is the source of truth.** OKLCH values in this document are *computed conversions* of the Fluent hex and are provided because shadcn v4 ships OKLCH. Re-verify OKLCH with a converter at implementation time if exactness matters; the hex will not change.

---

## 1. Summary & approach

**Goal:** produce one CSS-variable layer that (a) drives shadcn/ui components unchanged, and (b) makes them read as Fluent 2.

**Method — three layers, matching how both systems already work:**

1. **Global ramps (private).** Import the raw Fluent ramps as-is: the `brandWeb` blue ramp (`--brand-10 … --brand-160`), the 0–100 grey ramp, and the shared status colors (green / red / darkOrange). These are Fluent's "global tokens."
2. **Semantic aliases (the shadcn contract).** Map ramp slots onto the exact variable names shadcn expects (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, …). This is Fluent's "alias token" idea expressed with shadcn's names, so any shadcn component or third-party block works with zero edits.
3. **Tailwind bridge.** A Tailwind v4 `@theme inline` block re-exports every semantic variable as a Tailwind utility (`bg-primary`, `text-muted-foreground`, `rounded-md`, `shadow-8`, `duration-normal`, …).

**Dark mode** is derived the same way Fluent derives its own dark theme: not by inverting hex, but by **re-pointing each alias at a different ramp slot** (e.g. `--primary` → `brand[80]` in light, `brand[70]` in dark; `--foreground` → `grey[14]` in light, `white` in dark). We reuse Fluent's published light/dark alias mappings so contrast behavior matches Fluent.

**Naming compatibility rule:** never rename or drop a shadcn core variable. Fluent-only concepts (status colors, the brand ramp, elevation levels, motion) are added as **extensions** with new names so upstream shadcn updates never collide.

---

## 2. Color system

### 2.0 Source ramps (global tokens — verbatim Fluent, `[F]`)

**Brand — `brandWeb` (the Fluent web brand blue; primary is `#0f6cbd`):**

| Slot | Hex | | Slot | Hex |
|---|---|---|---|---|
| brand-10 | `#061724` | | brand-90 | `#2886de` |
| brand-20 | `#082338` | | brand-100 | `#479ef5` |
| brand-30 | `#0a2e4a` | | brand-110 | `#62abf5` |
| brand-40 | `#0c3b5e` | | brand-120 | `#77b7f7` |
| brand-50 | `#0e4775` | | brand-130 | `#96c6fa` |
| brand-60 | `#0f548c` | | brand-140 | `#b4d6fa` |
| brand-70 | `#115ea3` | | brand-150 | `#cfe4fa` |
| **brand-80** | **`#0f6cbd`** | | brand-160 | `#ebf3fc` |

**Neutral grey ramp (even slots shown; full ramp is `grey[0]`–`grey[100]` in steps of 2):**

| Slot | Hex | Slot | Hex | Slot | Hex | Slot | Hex |
|---|---|---|---|---|---|---|---|
| grey-0 | `#000000` | grey-26 | `#424242` | grey-52 | `#858585` | grey-84 | `#d6d6d6` |
| grey-8 | `#141414` | grey-32 | `#525252` | grey-60 | `#999999` | grey-86 | `#dbdbdb` |
| grey-12 | `#1f1f1f` | grey-38 | `#616161` | grey-68 | `#adadad` | grey-88 | `#e0e0e0` |
| grey-14 | `#242424` | grey-40 | `#666666` | grey-80 | `#cccccc` | grey-90 | `#e6e6e6` |
| grey-16 | `#292929` | grey-44 | `#707070` | grey-82 | `#d1d1d1` | grey-92 | `#ebebeb` |
| grey-20 | `#333333` | grey-46 | `#757575` |  |  | grey-94 | `#f0f0f0` |
| grey-24 | `#3d3d3d` | grey-50 | `#808080` | | | grey-96 | `#f5f5f5` |
| | | | | | | grey-98 | `#fafafa` |

`grey[100] = #ffffff`. (The ramp is regular; the slots above are the ones the alias tokens reference.)

**Shared status colors (used by success/warning/danger extensions):**

| Family | primary | tint60 (bg) | tint40 (border) | shade10 (text) | shade20 | shade30 |
|---|---|---|---|---|---|---|
| green | `#107c10` | `#f1faf1` | `#9fd89f` | `#0e700e` | `#0c5e0c` | `#094509` |
| red | `#d13438` | `#fdf6f6` | `#f1bbbc` | `#bc2f32` | `#9f282b` | `#751d1f` |
| darkOrange | `#da3b01` | `#fdf6f3` | `#f4bfab` | `#c43501` | `#a62d01` | `#7a2101` |

### 2.1 shadcn core set — LIGHT

Alias → Fluent slot → concrete value. OKLCH is `[D]` (converted); hex is `[F]` unless noted.

| shadcn variable | Fluent alias basis | Hex | OKLCH (derived) |
|---|---|---|---|
| `--background` | NeutralBackground1 = `white` | `#ffffff` | `oklch(1 0 0)` |
| `--foreground` | NeutralForeground1 = `grey[14]` | `#242424` | `oklch(0.260 0 0)` |
| `--card` | NeutralBackground1 | `#ffffff` | `oklch(1 0 0)` |
| `--card-foreground` | NeutralForeground1 | `#242424` | `oklch(0.260 0 0)` |
| `--popover` | NeutralBackground1 | `#ffffff` | `oklch(1 0 0)` |
| `--popover-foreground` | NeutralForeground1 | `#242424` | `oklch(0.260 0 0)` |
| `--primary` | BrandBackground = `brand[80]` | `#0f6cbd` | `oklch(0.527 0.149 251.5)` |
| `--primary-foreground` | ForegroundOnBrand = `white` | `#ffffff` | `oklch(1 0 0)` |
| `--secondary` | NeutralBackground3 = `grey[96]` | `#f5f5f5` | `oklch(0.970 0 0)` |
| `--secondary-foreground` | NeutralForeground1 | `#242424` | `oklch(0.260 0 0)` |
| `--muted` | NeutralBackground3 = `grey[96]` | `#f5f5f5` | `oklch(0.970 0 0)` |
| `--muted-foreground` | NeutralForeground3 = `grey[38]` | `#616161` | `oklch(0.493 0 0)` |
| `--accent` | NeutralBackground4 = `grey[94]` | `#f0f0f0` | `oklch(0.955 0 0)` |
| `--accent-foreground` | NeutralForeground1 | `#242424` | `oklch(0.260 0 0)` |
| `--destructive` | DangerBackground3 = red primary | `#d13438` | `oklch(0.570 0.194 24.6)` |
| `--destructive-foreground` | `white` | `#ffffff` | `oklch(1 0 0)` |
| `--border` | NeutralStroke1 = `grey[82]` | `#d1d1d1` | `oklch(0.861 0 0)` |
| `--input` | NeutralStroke1 = `grey[82]` | `#d1d1d1` | `oklch(0.861 0 0)` |
| `--ring` | BrandStroke1 = `brand[80]` | `#0f6cbd` | `oklch(0.527 0.149 251.5)` |

### 2.2 shadcn core set — DARK

Derived by re-pointing aliases at Fluent's **published dark** slots (not by hex inversion).

| shadcn variable | Fluent dark alias basis | Hex | OKLCH (derived) |
|---|---|---|---|
| `--background` | NeutralBackground canvas = `grey[14]` `[D]`* | `#242424` | `oklch(0.260 0 0)` |
| `--foreground` | NeutralForeground1 = `white` | `#ffffff` | `oklch(1 0 0)` |
| `--card` | NeutralBackground1 = `grey[16]` | `#292929` | `oklch(0.281 0 0)` |
| `--card-foreground` | NeutralForeground1 = `white` | `#ffffff` | `oklch(1 0 0)` |
| `--popover` | NeutralBackground1 = `grey[16]` | `#292929` | `oklch(0.281 0 0)` |
| `--popover-foreground` | `white` | `#ffffff` | `oklch(1 0 0)` |
| `--primary` | BrandBackground = `brand[70]` | `#115ea3` | `oklch(0.476 0.131 251.3)` |
| `--primary-foreground` | ForegroundOnBrand = `white` | `#ffffff` | `oklch(1 0 0)` |
| `--secondary` | NeutralBackground (raised) = `grey[20]` | `#333333` | `oklch(0.321 0 0)` |
| `--secondary-foreground` | `white` | `#ffffff` | `oklch(1 0 0)` |
| `--muted` | NeutralBackground2 = `grey[12]` | `#1f1f1f` | `oklch(0.239 0 0)` |
| `--muted-foreground` | NeutralForeground3 = `grey[68]` | `#adadad` | `oklch(0.748 0 0)` |
| `--accent` | NeutralBackground (hover) = `grey[20]` | `#333333` | `oklch(0.321 0 0)` |
| `--accent-foreground` | `white` | `#ffffff` | `oklch(1 0 0)` |
| `--destructive` | red primary (kept) `[D]` | `#d13438` | `oklch(0.570 0.194 24.6)` |
| `--destructive-foreground` | `white` | `#ffffff` | `oklch(1 0 0)` |
| `--border` | NeutralStroke2 = `grey[32]` | `#525252` | `oklch(0.438 0 0)` |
| `--input` | NeutralStroke2 = `grey[32]` | `#525252` | `oklch(0.438 0 0)` |
| `--ring` | BrandForeground1 = `brand[100]` | `#479ef5` | `oklch(0.686 0.154 251.2)` |

*`[D]` **Dark surface strategy:** Fluent's own dark ramp makes `NeutralBackground1` (`grey[16]`, the *content* surface) **lighter** than the canvas behind it. To stay idiomatic for shadcn (where `--card`/`--popover` sit visually above `--background`), we set the page `--background` one step darker (`grey[14] #242424`) and use `grey[16] #292929` for cards/popovers. This yields a subtle, Fluent-correct elevation without shadows. An implementer preferring a flat canvas may set `--background` = `#292929` and drop the elevation delta.

### 2.3 Chart colors (shadcn `--chart-1..5`)

Distinct hues drawn from the Fluent brand + shared palette. `[D]` selection, `[F]` hexes.

| Var | Light hex | Dark hex | Source |
|---|---|---|---|
| `--chart-1` | `#0f6cbd` | `#479ef5` | brand blue (80 / 100) |
| `--chart-2` | `#038387` | `#4bb6b9` | Fluent teal (primary / lighter) |
| `--chart-3` | `#107c10` | `#54b054` | Fluent green |
| `--chart-4` | `#da3b01` | `#ff8f6b` | Fluent darkOrange |
| `--chart-5` | `#5c2e91` | `#a97fd6` | Fluent purple |

> Dark variants are lightened for legibility on dark surfaces `[D]`; teal/purple lighter values are interpolations, verify contrast on charts.

### 2.4 Sidebar colors (shadcn `--sidebar-*`)

Nav rail reads slightly recessed from content. `[D]` mapping onto grey ramp.

| Var | Light | Dark |
|---|---|---|
| `--sidebar` | `#fafafa` (grey-98) | `#1f1f1f` (grey-12) |
| `--sidebar-foreground` | `#242424` | `#ffffff` |
| `--sidebar-primary` | `#0f6cbd` | `#479ef5` |
| `--sidebar-primary-foreground` | `#ffffff` | `#ffffff` |
| `--sidebar-accent` | `#ebf3fc` (brand-160) | `#333333` (grey-20) |
| `--sidebar-accent-foreground` | `#115ea3` (brand-70) | `#ffffff` |
| `--sidebar-border` | `#e0e0e0` (grey-88) | `#333333` (grey-20) |
| `--sidebar-ring` | `#0f6cbd` | `#479ef5` |

The light selected/active nav item (`--sidebar-accent` = brand-160 tint with brand-70 text) is the classic Fluent "selected navigation" look.

### 2.5 Fluent-specific extensions (beyond shadcn)

**Brand ramp (expose the full 16 stops)** — `--brand-10 … --brand-160` = the `brandWeb` table in §2.0. Justified: buttons need hover/pressed/selected states that shadcn's single `--primary` can't express. Recommended state derivation:

| State | Light | Dark |
|---|---|---|
| primary rest | `brand-80` `#0f6cbd` | `brand-70` `#115ea3` |
| primary hover | `brand-70` `#115ea3` | `brand-80` `#0f6cbd` |
| primary pressed | `brand-60` `#0f548c` | `brand-60` `#0f548c` |
| primary selected | `brand-70` | `brand-80` |

**Status colors** — added because shadcn only ships `--destructive`:

| Var | Light hex | Dark hex `[D]` | Basis |
|---|---|---|---|
| `--success` | `#107c10` | `#54b054` | green primary / lightened |
| `--success-foreground` | `#ffffff` | `#0a0a0a` | on-fill text |
| `--success-subtle` | `#f1faf1` | `#0c1c0c` | green tint60 / derived dark |
| `--success-border` | `#9fd89f` | `#2f7a2f` | green tint40 / derived |
| `--warning` | `#da3b01` | `#ff8f6b` | darkOrange primary / lightened |
| `--warning-foreground` | `#ffffff` | `#1a0a02` | on-fill text |
| `--warning-text` | `#c43501` | `#ffb59a` | darkOrange shade10 (AA text on light) |
| `--warning-subtle` | `#fdf6f3` | `#22120a` | darkOrange tint60 / derived |
| `--warning-border` | `#f4bfab` | `#a62d01` | darkOrange tint40 / shade |
| `--destructive-subtle` | `#fdf6f6` | `#3b1212` | red tint60 / derived |
| `--destructive-border` | `#f1bbbc` | `#9f282b` | red tint40 / shade |

> **Warning = Fluent darkOrange, not yellow.** Fluent 2's `Status/Warning` ramp is the darkOrange family (`#da3b01` primary, `#c43501`/`#8a3707` text shades), chosen so warning text passes AA on light surfaces where pure yellow fails. `--warning-text` is provided separately from the `--warning` fill for exactly this reason.

**Shadow color primitives** (feed §5): `--shadow-ambient`, `--shadow-key`, `--shadow-brand-ambient`, `--shadow-brand-key` — see §5.

### 2.6 High-contrast strategy

Two independent mechanisms, both shipped:

**(a) Windows/forced-colors (automatic).** When the OS forces colors, hand control to the system palette and stop painting our own backgrounds/borders on structural elements:

```css
@media (forced-colors: active) {
  :root {
    /* Let the browser substitute system colors; opt specific props back in. */
    --ring: Highlight;
    --border: CanvasText;
    --input: CanvasText;
  }
  /* Focus must remain visible and must not be removed by forced-color-adjust. */
  :where(button, a, [role="button"], input, select, textarea):focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
  /* Preserve intentional brand fills only where meaning depends on them. */
  .btn-primary { forced-color-adjust: none; background: Highlight; color: HighlightText; }
}
```

**(b) Explicit `.high-contrast` theme class (author-controlled, cross-platform).** Mirrors Fluent's `highContrast` theme using CSS system-color keywords so it works outside Windows too:

```css
.high-contrast {
  --background: Canvas;
  --foreground: CanvasText;
  --card: Canvas;
  --card-foreground: CanvasText;
  --popover: Canvas;
  --popover-foreground: CanvasText;
  --primary: Highlight;
  --primary-foreground: HighlightText;
  --secondary: ButtonFace;
  --secondary-foreground: ButtonText;
  --muted: Canvas;
  --muted-foreground: GrayText;
  --accent: Highlight;
  --accent-foreground: HighlightText;
  --destructive: LinkText;            /* system's strong accent */
  --destructive-foreground: Canvas;
  --border: CanvasText;
  --input: CanvasText;
  --ring: Highlight;
  --success: CanvasText;
  --warning: CanvasText;
}
```

Rules: never convey state by color alone in HC (pair with icon/underline/border); keep focus rings at **2px minimum**; disabled elements use `GrayText`.

---

## 3. Typography

**Font stacks** `[F]` families, `[D]` exact fallback list:

```css
--font-sans: "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto",
             "Helvetica Neue", sans-serif;
--font-mono: "Cascadia Code", Consolas, "Courier New", Courier, monospace;
--font-numeric: Bahnschrift, "Segoe UI", -apple-system, sans-serif;
```

Segoe UI is Windows-only; the fallback chain covers macOS (San Francisco via `-apple-system`), Android/ChromeOS (Roboto), and generic. Result: near-Fluent on Windows, graceful elsewhere. (Optionally self-host **Segoe UI Variable** if licensing allows; not bundled by default.)

**Type ramp** — Fluent size/line-height/weight `[F]`, Tailwind mapping `[D]`:

| Fluent role | Size | Line-height | Weight | Tailwind default? | Recommended token |
|---|---|---|---|---|---|
| Caption2 | 10px | 14px | 400 | ✗ (no 10px) | `--text-caption2` (custom) |
| Caption1 | 12px | 16px | 400 | ✓ `text-xs` | `text-xs` (override LH → 16px) |
| Body1 | 14px | 20px | 400 | ✓ `text-sm` | `text-sm` (override LH → 20px) |
| Body1Strong | 14px | 20px | 600 | ✓ | `text-sm font-semibold` |
| Body2 / Subtitle2 | 16px | 22px | 400 / 600 | ✓ `text-base` | `text-base` (override LH → 22px) |
| Subtitle1 | 20px | 28px | 600 | ✓ `text-xl` (20px) | `text-xl font-semibold` |
| Title3 | 24px | 32px | 600 | ✓ `text-2xl` (24px) | `text-2xl font-semibold` |
| Title2 | 28px | 36px | 600 | ✗ (3xl=30px) | `--text-title2` (custom) |
| Title1 | 32px | 40px | 600 | ✗ (4xl=36px) | `--text-title1` (custom) |
| LargeTitle | 40px | 52px | 600 | ✗ (5xl=48px) | `--text-large-title` (custom) |
| Display | 68px | 92px | 600 | ✗ (7xl=72px) | `--text-display` (custom) |

**Weights** `[F]`: `--font-weight-regular: 400`, `--font-weight-medium: 500`, `--font-weight-semibold: 600`, `--font-weight-bold: 700`. Fluent uses **400** for body and **600** for all strong/title text (700 is rare; 500 for select controls).

**Recommendation:** keep Tailwind's `text-xs/sm/base/xl/2xl` for 12/14/16/20/24 (exact matches), but **override their line-heights** to Fluent's tighter values, and define **custom `--text-*` tokens** for the sizes Tailwind's default scale misses (10, 28, 32, 40, 68). Each custom size ships with a paired `--line-height`. Do **not** try to force Fluent's 28/32/40/68 onto Tailwind's 30/36/48/72 defaults — the visual rhythm breaks.

---

## 4. Radius

**Fluent radius scale** `[F]`: none `0`, small `2px`, medium `4px`, large `6px`, xLarge `8px`, xxLarge `12px`, circular `9999px`.

**shadcn convention (Tailwind v4):** a single `--radius` base; utilities derive via ± px offsets `[F, confirmed from shadcn globals.css]`:

```css
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

**Decision — set `--radius: 6px` (Fluent "large") as the base.** `[D]`

Rationale: shadcn's `--radius` anchors the `lg` step; the components used most often (`Button`, `Input`, `Badge`) use `rounded-md`, and dialogs/cards use `rounded-lg`/`rounded-xl`. With base = 6px the derived scale lands almost exactly on Fluent:

| Utility | Value | Fluent equivalent |
|---|---|---|
| `rounded-sm` | `2px` | small ✓ |
| `rounded-md` | `4px` | **medium ✓** (buttons, inputs — the common control radius) |
| `rounded-lg` | `6px` | large ✓ |
| `rounded-xl` | `10px` | ~xLarge (8px; +2px, acceptable) |

This makes the highest-traffic control radius (`rounded-md`) equal Fluent's medium 4px while giving a clean 2/4/6 progression. If a stricter 4px anchor is preferred, set `--radius: 4px` — but then `rounded-sm` collapses to `0` and small (2px) is lost; **6px is the better base.** Add `--radius-full: 9999px` for Fluent's circular (pills, avatars).

---

## 5. Shadows / elevation

Fluent elevation = **key** shadow (sharp, directional, defines the edge) + **ambient** shadow (soft, implies distance), layered. `[F]` structure & offsets from the Fluent elevation spec; opacities `[F]` from the Fluent theme.

**Shadow color primitives:**

| Var | Light | Dark |
|---|---|---|
| `--shadow-ambient` | `rgba(0,0,0,0.12)` | `rgba(0,0,0,0.24)` |
| `--shadow-key` | `rgba(0,0,0,0.14)` | `rgba(0,0,0,0.28)` |

**Elevation ramp** (key `Y = 0.5 × n`, key `blur = n`; ambient `blur = 2px` for low ramp, `8px` for high ramp) — identical string in light & dark, only the color primitives differ:

```css
--shadow-2:  0 0 2px var(--shadow-ambient), 0 1px 2px  var(--shadow-key);
--shadow-4:  0 0 2px var(--shadow-ambient), 0 2px 4px  var(--shadow-key);
--shadow-8:  0 0 2px var(--shadow-ambient), 0 4px 8px  var(--shadow-key);
--shadow-16: 0 0 2px var(--shadow-ambient), 0 8px 16px var(--shadow-key);
--shadow-28: 0 0 8px var(--shadow-ambient), 0 14px 28px var(--shadow-key);
--shadow-64: 0 0 8px var(--shadow-ambient), 0 32px 64px var(--shadow-key);
```

**Usage mapping** `[F]` (Fluent component elevations): `shadow-2` = cards/FAB rest, `shadow-4` = card hover / list items, `shadow-8` = command bar, tooltip, `shadow-16` = popover, hover card, `shadow-28` = drawer/nav, `shadow-64` = dialog, modal.

**Brand shadows** (optional, for branded surfaces): swap the primitives for `--shadow-brand-ambient` / `--shadow-brand-key`. A defensible default `[D]` derived from Fluent's luminosity formula (`opacity ≈ round(34 − 0.09 × luminosity)` for the key layer): `--shadow-brand-ambient: rgba(15,108,189,0.30)`, `--shadow-brand-key: rgba(15,108,189,0.25)`, then `--shadow-8-brand: 0 0 2px var(--shadow-brand-ambient), 0 4px 8px var(--shadow-brand-key);` etc. Ship only if a component needs it.

---

## 6. Spacing

**Fluent spacing ramp** `[F]`: `0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32` px (tokens `none, xxs, xs, sNudge, s, mNudge, m, l, xl, xxl, xxxl`; horizontal & vertical variants share these values).

**Decision — keep Tailwind's default 4px scale.** `[D]` Tailwind v4's spacing is `calc(var(--spacing) * n)` with `--spacing: 0.25rem` (4px), and it supports fractional steps, so **every Fluent value is already expressible**:

| Fluent | px | Tailwind utility |
|---|---|---|
| xxs | 2 | `p-0.5` |
| xs | 4 | `p-1` |
| sNudge | 6 | `p-1.5` |
| s | 8 | `p-2` |
| mNudge | 10 | `p-2.5` |
| m | 12 | `p-3` |
| l | 16 | `p-4` |
| xl | 20 | `p-5` |
| xxl | 24 | `p-6` |
| xxxl | 32 | `p-8` |

The only Fluent values off Tailwind's whole-step grid are the 6px and 10px "nudges," and both fall on Tailwind's `.5` steps. **No custom spacing tokens are needed.** Do not redefine `--spacing`. (Optionally alias `--space-nudge-sm: 6px; --space-nudge-md: 10px;` for readability in component CSS, but the Tailwind utilities already cover them.)

**Stroke widths** `[F]` (for completeness): `--stroke-thin: 1px`, `--stroke-thick: 2px`, `--stroke-thicker: 3px`, `--stroke-thickest: 4px`.

---

## 7. Motion

**Durations** `[F]`:

```css
--duration-ultra-fast: 50ms;
--duration-faster:     100ms;
--duration-fast:       150ms;
--duration-normal:     200ms;
--duration-gentle:     250ms;
--duration-slow:       300ms;
--duration-slower:     400ms;
--duration-ultra-slow: 500ms;
```

**Easing curves** `[F]` (Fluent cubic-beziers):

```css
--ease-accelerate-max: cubic-bezier(0.9, 0.1, 1, 0.2);
--ease-accelerate-mid: cubic-bezier(1, 0, 1, 1);
--ease-accelerate-min: cubic-bezier(0.8, 0, 0.78, 1);
--ease-decelerate-max: cubic-bezier(0.1, 0.9, 0.2, 1);
--ease-decelerate-mid: cubic-bezier(0, 0, 0, 1);
--ease-decelerate-min: cubic-bezier(0.33, 0, 0.1, 1);
--ease-max:            cubic-bezier(0.8, 0, 0.2, 1);   /* easyEaseMax */
--ease-ease:           cubic-bezier(0.33, 0, 0.67, 1); /* easyEase   */
--ease-linear:         cubic-bezier(0, 0, 1, 1);
```

**Guidance** `[F/D]`: enter/expand → `--ease-decelerate-*` (object settling in); exit/collapse → `--ease-accelerate-*` (object leaving); move/resize within view → `--ease-max`. Typical control transition: `--duration-normal` (200ms) + `--ease-ease`. Always honor `@media (prefers-reduced-motion: reduce)` by collapsing durations to `0.01ms`.

---

## 8. Focus ring

**Fluent focus indicator** `[F]`: a **2px** stroke, high-contrast (neutral, not brand), rounded to follow the control, with an offset gap. Fluent draws a **double stroke** — an inner hairline in the surface color and an outer 2px stroke in the contrasting neutral (`#000` on light, `#fff` on dark) — so focus is visible on any background.

Two options; **recommend the shadcn-idiomatic brand ring by default**, offer the Fluent-authentic neutral double-stroke as a variant.

**Recommended (`--ring` brand, shadcn-native):**
```css
.focus-ring:focus-visible {
  outline: 2px solid var(--ring);   /* brand-80 light / brand-100 dark */
  outline-offset: 2px;
  border-radius: inherit;
}
```

**Fluent-authentic double stroke (neutral, max contrast):**
```css
:root { --stroke-focus-outer: #000000; --stroke-focus-inner: #ffffff; }
.dark { --stroke-focus-outer: #ffffff; --stroke-focus-inner: #000000; }

.focus-ring-fluent:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 1px var(--stroke-focus-inner),   /* gap ring in surface tone */
    0 0 0 3px var(--stroke-focus-outer);   /* 2px contrasting stroke   */
  border-radius: inherit;
}
```

Both keep the **2px** minimum and `:focus-visible` (keyboard-only) semantics. In forced-colors mode the ring switches to `Highlight` (see §2.6).

---

## 9. Tailwind v4 integration plan (`@theme inline` sketch)

Two files, shadcn-style: raw variables under `:root` / `.dark`, then a single `@theme inline` block that re-exports them as Tailwind utilities. Sketch (abbreviated where the pattern repeats):

```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 6px;

  /* --- core (light) --- */
  --background: #ffffff;            --foreground: #242424;
  --card: #ffffff;                 --card-foreground: #242424;
  --popover: #ffffff;              --popover-foreground: #242424;
  --primary: #0f6cbd;              --primary-foreground: #ffffff;
  --secondary: #f5f5f5;            --secondary-foreground: #242424;
  --muted: #f5f5f5;                --muted-foreground: #616161;
  --accent: #f0f0f0;               --accent-foreground: #242424;
  --destructive: #d13438;          --destructive-foreground: #ffffff;
  --border: #d1d1d1;               --input: #d1d1d1;   --ring: #0f6cbd;
  --chart-1: #0f6cbd; --chart-2: #038387; --chart-3: #107c10;
  --chart-4: #da3b01; --chart-5: #5c2e91;
  --sidebar: #fafafa;              --sidebar-foreground: #242424;
  --sidebar-primary: #0f6cbd;      --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #ebf3fc;       --sidebar-accent-foreground: #115ea3;
  --sidebar-border: #e0e0e0;       --sidebar-ring: #0f6cbd;

  /* --- extensions --- */
  --success: #107c10; --success-foreground: #ffffff;
  --warning: #da3b01; --warning-foreground: #ffffff; --warning-text: #c43501;
  --brand-10:#061724; --brand-20:#082338; --brand-30:#0a2e4a; --brand-40:#0c3b5e;
  --brand-50:#0e4775; --brand-60:#0f548c; --brand-70:#115ea3; --brand-80:#0f6cbd;
  --brand-90:#2886de; --brand-100:#479ef5; --brand-110:#62abf5; --brand-120:#77b7f7;
  --brand-130:#96c6fa; --brand-140:#b4d6fa; --brand-150:#cfe4fa; --brand-160:#ebf3fc;

  --shadow-ambient: rgba(0,0,0,0.12); --shadow-key: rgba(0,0,0,0.14);
  --shadow-2:0 0 2px var(--shadow-ambient),0 1px 2px var(--shadow-key);
  --shadow-4:0 0 2px var(--shadow-ambient),0 2px 4px var(--shadow-key);
  --shadow-8:0 0 2px var(--shadow-ambient),0 4px 8px var(--shadow-key);
  --shadow-16:0 0 2px var(--shadow-ambient),0 8px 16px var(--shadow-key);
  --shadow-28:0 0 8px var(--shadow-ambient),0 14px 28px var(--shadow-key);
  --shadow-64:0 0 8px var(--shadow-ambient),0 32px 64px var(--shadow-key);
}

.dark {
  --background: #242424;           --foreground: #ffffff;
  --card: #292929;                 --card-foreground: #ffffff;
  --popover: #292929;              --popover-foreground: #ffffff;
  --primary: #115ea3;              --primary-foreground: #ffffff;
  --secondary: #333333;            --secondary-foreground: #ffffff;
  --muted: #1f1f1f;                --muted-foreground: #adadad;
  --accent: #333333;               --accent-foreground: #ffffff;
  --destructive: #d13438;          --destructive-foreground: #ffffff;
  --border: #525252;               --input: #525252;   --ring: #479ef5;
  --chart-1:#479ef5; --chart-2:#4bb6b9; --chart-3:#54b054; --chart-4:#ff8f6b; --chart-5:#a97fd6;
  --sidebar:#1f1f1f; --sidebar-foreground:#ffffff; --sidebar-primary:#479ef5;
  --sidebar-primary-foreground:#ffffff; --sidebar-accent:#333333;
  --sidebar-accent-foreground:#ffffff; --sidebar-border:#333333; --sidebar-ring:#479ef5;
  --success:#54b054; --warning:#ff8f6b; --warning-text:#ffb59a;
  --shadow-ambient: rgba(0,0,0,0.24); --shadow-key: rgba(0,0,0,0.28);
  /* --shadow-* strings are inherited unchanged (they reference the primitives) */
}

@theme inline {
  /* colors → utilities (bg-*, text-*, border-*, ring-*) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);   /* …2..5 */
  --color-sidebar: var(--sidebar);   /* …-foreground, -primary, etc. */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-brand-80: var(--brand-80); /* …full 10..160 for bg-brand-80 etc. */

  /* radius → rounded-* */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-full: 9999px;

  /* shadows → shadow-* */
  --shadow-2: var(--shadow-2);
  --shadow-4: var(--shadow-4);
  --shadow-8: var(--shadow-8);
  --shadow-16: var(--shadow-16);
  --shadow-28: var(--shadow-28);
  --shadow-64: var(--shadow-64);

  /* fonts → font-* */
  --font-sans: "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif;
  --font-mono: "Cascadia Code", Consolas, "Courier New", Courier, monospace;

  /* custom type sizes → text-* (paired line-heights) */
  --text-caption2: 10px;       --text-caption2--line-height: 14px;
  --text-title2: 28px;         --text-title2--line-height: 36px;
  --text-title1: 32px;         --text-title1--line-height: 40px;
  --text-large-title: 40px;    --text-large-title--line-height: 52px;
  --text-display: 68px;        --text-display--line-height: 92px;

  /* motion → duration-* / ease-* */
  --animate-duration-normal: 200ms;   /* or expose as --duration-* for arbitrary use */
  --ease-ease: cubic-bezier(0.33, 0, 0.67, 1);
  --ease-decelerate-mid: cubic-bezier(0, 0, 0, 1);
  --ease-accelerate-mid: cubic-bezier(1, 0, 1, 1);
  --ease-max: cubic-bezier(0.8, 0, 0.2, 1);
}
```

Notes: shadcn v4 uses `@theme inline` so the utilities resolve `var(--token)` at use-site, which is what lets `.dark` re-point values without regenerating utilities. Motion durations are most ergonomically shipped as plain `--duration-*` custom properties referenced in component CSS/`transition-duration`, since Tailwind's `duration-*` utilities read a separate `--transition-duration-*` namespace — expose both if you want `duration-normal` as a class.

---

## 10. Sources consulted

- Fluent 2 color tokens — https://fluent2.microsoft.design/color-tokens
- Fluent 2 elevation/shadows — https://fluent2.microsoft.design/elevation
- Fluent 2 design principles (typography, layout) — https://fluent2.microsoft.design/design-principles
- Fluent UI React v9 token source (authoritative hex/px/ms values), `@fluentui/tokens`:
  - Brand ramps — `packages/tokens/src/global/brandColors.ts`
  - Grey ramp — `packages/tokens/src/global/colors.ts`
  - Border radius — `packages/tokens/src/global/borderRadius.ts`
  - Typography (families, sizes, line-heights, weights) — `packages/tokens/src/global/fonts.ts`
  - Spacing — `packages/tokens/src/global/spacings.ts`
  - Stroke widths — `packages/tokens/src/global/strokeWidths.ts`
  - Durations — `packages/tokens/src/global/durations.ts`
  - Easing curves — `packages/tokens/src/global/curves.ts`
  - Light alias mapping — `packages/tokens/src/alias/lightColor.ts`
  - Dark alias mapping — `packages/tokens/src/alias/darkColor.ts`
  - Shared/status colors — `packages/tokens/src/global/colorPalette.ts`, `colors.ts`
  - (repo root: https://github.com/microsoft/fluentui/tree/master/packages/tokens)
- Fluent UI React v9 Storybook (theme colors/shadows) — https://storybooks.fluentui.dev/react
- shadcn/ui theming (variable contract + Tailwind v4 `@theme inline`) — https://ui.shadcn.com/docs/theming
- shadcn/ui manual install (globals.css radius calc convention) — https://ui.shadcn.com/docs/installation/manual

> **Legal note:** all values above are individual, publicly documented design constants (colors, sizes, timings) re-expressed in our own token architecture. No Fluent UI React source files are copied into this kit. "Segoe UI" and "Fluent" are Microsoft marks; this project is unaffiliated and does not bundle Microsoft fonts.

---

## 11. Open questions / decisions needed

1. **Radius base (6px vs 4px).** Recommend **6px** so `rounded-md` (buttons/inputs) = Fluent medium 4px and the 2/4/6 progression stays intact. Choosing 4px loses `rounded-sm`=2px. → *Recommend 6px.*
2. **Dark elevation delta.** We darken `--background` to `grey[14]` and raise cards to `grey[16]` for subtle elevation (Fluent's model). Alternative: flat `#292929` canvas + shadow-only elevation. → *Recommend the tonal delta; it's more Fluent-authentic and works without shadows.*
3. **Dark `--primary`.** Set to `brand[70] #115ea3` (Fluent's dark filled-brand button) with white text — authentic but a mid-dark blue. Alternative: `brand[100] #479ef5` (brighter, but needs dark text and reads less "button-like"). → *Recommend brand[70].*
4. **Warning hue.** Fluent's `Status/Warning` is darkOrange (`#da3b01`), which is close to danger red. If product needs clearer visual separation from `--destructive`, consider a Fluent **yellow/amber** derivation for the fill while keeping `--warning-text` dark for AA. → *Default to darkOrange (Fluent-true); revisit if users confuse warning with error.*
5. **`--accent` = neutral vs brand tint.** We made `--accent` a **neutral** grey (safe for ghost/menu hovers). The Fluent "selected" brand tint (`brand-160` bg / `brand-70` text) lives on `--sidebar-accent` instead. If components want brand-tinted hovers globally, promote the brand tint to `--accent`. → *Recommend keeping accent neutral.*
6. **OKLCH exactness.** OKLCH numbers here are our conversions of the Fluent hex. If the implementation authors variables in OKLCH (shadcn v4 default), run the hex through a converter to lock final digits; the hex is canonical either way. → *Author in hex, or verify OKLCH on implementation.*
7. **Segoe UI licensing.** We ship a system-font stack (no bundled font). If pixel-parity with Fluent on non-Windows is required, decide whether to license/self-host **Segoe UI Variable**. → *Default: system stack, no bundled font.*
8. **Motion utility surface.** Decide whether to expose durations as Tailwind `duration-*` utilities (needs `--transition-duration-*` namespace) or only as `--duration-*` custom properties for component CSS. → *Recommend both: custom props always, utilities if authors want them.*

## 12. Decisions (orchestrator, 2026-07-11)

All eight open questions above are resolved by accepting the stated recommendations:

1. Radius base **6px** (`--radius: 6px`; `rounded-md` = Fluent medium 4px).
2. Dark mode uses the **tonal elevation delta** (canvas `#242424`, cards `#292929`).
3. Dark `--primary` = **brand[70] `#115ea3`** with white foreground.
4. Warning hue = **Fluent darkOrange** (`--warning-text` provided separately for AA text).
5. `--accent` stays **neutral grey**; brand tint lives on `--sidebar-accent`.
6. Variables are **authored in hex** (canonical). OKLCH columns remain reference-only.
7. **System font stack**, no bundled/self-hosted Segoe UI.
8. Motion exposed as **both** custom properties and Tailwind utilities.
9. **Single destructive red.** Fluent uses two reds across components — `#d13438`
   (red primary) and `#c50f1f` (filled-status red, e.g. ProgressBar Error, Badge
   Danger, Label required-asterisk in the Figma source). This kit standardizes on
   `#d13438` (`--destructive`) for **all** destructive/danger fills (Badge
   `destructive`, Progress `destructive`, Label required asterisk): one token, one
   red. Documented per-component in the Figma validation reports; the `#c50f1f`
   filled-status red is intentionally not introduced as a fifth red token.
