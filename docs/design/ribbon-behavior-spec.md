# Ribbon behavior spec — observed from Word Online (live)

Field notes from driving the real Word Online ribbon (Gabriel's tenant, blank
`DocExemplo.docx`, pt-BR locale, 2026-07-12) via browser automation: both
layout modes, the full resize ladder in each, and the overflow menu anatomy.
This document is the **behavioral source of truth** for the kit's Ribbon
initiative, replacing the Figma Dev Mode workflow (Ribbon does not exist in
the Fluent 2 Figma kit nor in Fluent UI React v9 — microsoft/fluentui#13883
was soft-closed). Complements the external spec sources: MS Learn
`cmd-ribbons` (UX/scaling rules), Aurora `RibbonResizing.md` (collapse
algorithm), Fluent.Ribbon WPF (`SizeDefinition`/`ReduceOrder` API precedent),
and Syncfusion EJ2 Ribbon docs (web behavior model).

Official mode names (from Word's own switcher, chevron at the ribbon's far
right): **"Faixa de Opções Clássica"** (classic, two-row) and **"Faixa de
Opções de Linha Única"** (single-line). The same menu exposes a third axis,
**"Mostrar Faixa de Opções"**: *Sempre mostrar* / *Mostrar apenas as guias*
(tabs-only collapse) / *Ajustar automaticamente* (toggles the adaptive
resize behavior — it is user-disableable, not hardwired).

## Classic mode (v2 target)

Home-tab group order: `Desfazer | Área de Transferência | Fonte | Parágrafo |
Estilos | Editando | Voz | Revisão de Texto | Suplementos`.

Anatomy at full width (~1440px):

- Tab strip (~36px) above a content band (~96px); active tab gets the Fluent
  brand underline.
- Each group: content area + centered group label (~11px, muted) at the
  bottom + 1px vertical separator between groups + optional dialog-launcher
  button (↘) in the group's bottom-right corner (Fonte, Parágrafo, Estilos).
- Item forms observed: large stacked button with dropdown (Colar), 2×3 grid
  of small icon-buttons (clipboard commands), composite fields (font name +
  size combos), toggle buttons (N/I/S row), split buttons (highlight, font
  color), preview gallery (Estilos), and a vertical list of medium
  icon+label buttons (Localizar/Substituir/Selecionar).

### Resize ladder (with "Ajustar automaticamente" on)

| Width | Behavior |
| --- | --- |
| 1440/1352 | Everything expanded |
| 1240 | `Parágrafo` collapses to a single dropdown button (icon + label + chevron, opens the full group as a flyout); `Estilos` gallery narrows to one visible style |
| 1000 | `Fonte` also collapses to a dropdown button |
| 840 | **Group collapse stops** — remaining overflow switches to horizontal **scrolling**, with a `>` scroll-arrow button on the clipped edge |
| 680 | The **tab strip itself** overflows: trailing tabs (Revisão/Exibir/Ajuda) fold behind a `⌄` chevron after Referências |

Key takeaways: collapse is per-group by explicit priority (Parágrafo before
Fonte, despite DOM order); galleries degrade gradually (shrink before
collapsing); trailing groups (Editando/Voz/Revisão/Suplementos) were never
collapsed at the tested widths — scroll is the terminal fallback, exactly the
model Aurora's RibbonResizing.md describes.

## Single-line mode (v1 target)

One ~40px row. No group labels; thin vertical separators still delimit
logical groups. Item forms: icon-buttons, split/menu buttons with chevrons,
inline combos (font, size, styles), and a **"…" overflow menu button that is
always present** — even at full width some items (Suplementos, etc.) never
fit. The layout-switcher chevron is pinned at the far right, outside the
overflow budget.

### Resize ladder (items dropped into "…")

| Width | Dropped into overflow |
| --- | --- |
| 1352 | (baseline) trailing low-priority items already in "…" |
| 1100 | grow/shrink font (A↑/A↓), strikethrough/sub/superscript, casing, numbering, indents, borders, shading |
| 900 | **font name + size combos** (before N/I/S — priority beats DOM order), highlight, font color |
| 700 | Ditar (mic); tab strip folds trailing tabs behind `⌄`; survivors: undo, paste, painter, N/I/S, bullets, align, Estilos combo, search |

### Overflow menu ("…") anatomy — the heart of the v1 design

- Overflowed items are **grouped under section headers named after their
  source group** ("Fonte", "Parágrafo", "Voz", "Revisão de Texto",
  "Suplementos").
- Every command **changes presentation** when it moves into the menu:
  toolbar icon-button → menu item with icon + full text label.
- Composite widgets adapt: font name/size render as **labeled inline fields
  inside the menu** ("Nome da Fonte [combo]", "Tamanho da Fonte [combo]").
- Split buttons stay split: menu item + divider + `❯` submenu arrow
  (Realce, Cor da Fonte, Numeração, Ditar).
- Whole trailing groups live permanently in the menu at narrow widths.

## API implications for the kit

1. **Dual presentation is mandatory.** Every `RibbonItem` needs `icon` +
   `label` even when the bar renders icon-only, because the same item must
   render as a labeled menu item inside the overflow. The container decides
   the form (context, not props).
2. **Priority model over DOM order** for overflow (`priority`, with
   pinned/never-overflow support for things like the layout switcher) —
   the Fluent `priority-overflow` model, reimplemented (two priority queues +
   ResizeObserver + snapshot/subscribe; hide via CSS so hidden items stay
   measurable; subtract the "…" trigger's own width from the budget).
3. **`groupId` + section headers** in the overflow menu; group separators
   hide when their whole group is hidden or overflowed.
4. **Three API axes**, mirroring Word's own switcher: `layout`
   (`"single-line"` v1 / `"classic"` v2), `collapsed` (tabs-only mode), and
   `autoAdjust` (adaptive behavior is user-toggleable).
5. **Classic mode (v2) pipeline**: per-group staged collapse by explicit
   group priority → horizontal scroll fallback with arrow buttons → tab-strip
   overflow. Group collapse target is a dropdown button that opens the full
   group as a flyout.
6. Split buttons, combos, and galleries each need an overflow/menu form —
   design their part APIs with both renderings from day one.

## Automation notes (for the validation phase)

- The Word editor lives in a cross-origin OOPIF (`WacFrame_Word_0`);
  synthetic input and accessibility-tree reads do NOT cross into it, but
  screenshots/zooms render it fine, and window resizing exercises the
  adaptive layout without needing clicks inside the frame.
- If the Chrome window is hidden/minimized (`visibilityState === "hidden"`),
  rAF suspension freezes the Word UI — menus won't open and resizes won't
  reflow. The window must be visibly frontmost during behavioral tests.
- ARIA/DOM inspection of the real ribbon is therefore not possible with this
  tooling; the kit's a11y model comes from the APG Tabs + Toolbar composite
  patterns instead (there is no official ARIA "ribbon" pattern).
