import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Ribbon e2e — the flagship composite, in a real browser.
 *
 * `packages/react/src/components/ui/ribbon.test.tsx` proves the wiring under
 * jsdom with synthetic sizes (registry, grouped menu, collapse, focus logic).
 * jsdom has no layout engine and no `ResizeObserver` that reflects real widths,
 * so the browser-only truths deferred here are the ones that only exist once the
 * row is actually painted and measured:
 *   a. the resize ladder drops commands by PRIORITY (not DOM order) and the
 *      "…" trigger's `aria-label` count tracks the hidden set
 *   b. opening the "…" menu shows one section header per partially/fully
 *      overflowed group, in SOURCE order, with the right rows
 *   c. the "Realce" split-button keeps a working SUBMENU inside the menu
 *      (while "Colar", priority 95, SURVIVES in the bar — Word's ladder)
 *   d. a fully-overflowed single-item group ("Estilos") drops its divider
 *   e. the pinned "Desfazer" never overflows at any width
 *   f. **the marquee assertion:** focus a command, shrink until it overflows,
 *      and focus lands on the "…" trigger (not `<body>`)
 *   g. collapsed (tabs-only) hides the row; clicking a tab restores it
 *   h. switching tabs swaps the command row with roving tabindex intact
 *
 * Preview priorities (Word-survivor ladder, post phase-4 retune) — hide order
 * ascending: Centralizar 15 → Substituir 20 → Realce 28 → Cor da Fonte 30 →
 * Numeração 35 → Copiar 38 → Recortar 40 → Alinhar à Esquerda 55 → Estilo 58 →
 * Marcadores 60 → Localizar 65 → Pincel 70 → Sublinhado 80 → Itálico 85 →
 * Negrito 90 → Colar 95 (measured surviving down to the 240px slider floor,
 * alongside the pinned Desfazer).
 *
 * ── Real-browser findings ──
 * 1. **First-paint settling: the row paints EVERYTHING-VISIBLE for one frame,
 *    then the first `ResizeObserver` pass hides the overflow.** `Overflow`'s
 *    `getServerSnapshot` returns "all visible / overflowCount 0", so the server
 *    markup and first client paint agree (no hydration mismatch); the real
 *    measurement runs after mount and reflows once. At PRODUCTION `next start`
 *    timings this transient is NOT perceptible in the Playwright trace — by the
 *    time the page reaches a settled interactive state the count already matches
 *    the width. The spec therefore always `expect.poll`s the settled state; the
 *    "over-report" (too many items shown for <1 frame) exists in the model but
 *    is not observable as a flash at these timings. Recorded per instructions.
 * 2. **`RibbonItem` wraps its child in an `OverflowItem`, so the MEASURED /
 *    hidden element is the item's OUTER wrapper** — the `inline-flex` span
 *    around a Tooltip+button, or the `SplitButton` group for Colar/Realce —
 *    which carries `data-slot="overflow-item"` + `data-overflowing`. The inner control
 *    keeps its own `aria-label`; when the wrapper goes `display:none` the inner
 *    control is `toBeHidden()`. Hidden wrappers are `aria-hidden`, so `getByRole`
 *    skips them — hidden-state assertions go through CSS/attribute locators.
 * 3. **The "…" trigger is `data-slot="ribbon-overflow-trigger"`** (it overrides
 *    the `ToolbarButton` slot) and its `aria-label` is the live overflow count
 *    ("N more commands" / "1 more command"). The count always equals the number
 *    of `overflow-item` wrappers carrying `data-overflowing`.
 * 4. **Focus preservation works in Chromium:** when the focused command's
 *    wrapper flips to `display:none`, `RibbonItem`'s pre-commit focus snapshot +
 *    post-commit effect moves focus to the trigger, so focus never falls to
 *    `<body>`. (f) proves it against a real, painted overflow transition — the
 *    thing jsdom can only approximate.
 * 5. **The overflow menu portals to `document.body`** (root-light theme), so it
 *    is addressed globally by `[data-slot="ribbon-overflow-menu"]`, not inside
 *    the panel — same portal caveat the dropdown/overflow specs document.
 * 6. **The `data-slot="overflow-item"` marker lands on a DIFFERENT element
 *    depending on the item's bar-form**, because the injected clone props are
 *    forwarded by whatever the `RibbonItem` child is:
 *      • a `TipButton` item spreads `{...props}` onto its inner `ToolbarButton`,
 *        so the marker (+ `display:none` when hidden) lands on the BUTTON itself
 *        — the labeled element and the overflow-item are the same node;
 *      • a `Toggle`/`SplitButton` item is wrapped in a literal `inline-flex`
 *        span / the SplitButton root, so the marker lands on that OUTER wrapper
 *        and the `aria-label` is a descendant.
 *    Both hide correctly, but the wrapper identity is not uniform — so this spec
 *    keys off `aria-label` (the control) and `[data-overflowing]` counts, never
 *    off a fixed wrapper shape. Recorded for phase-4 as a consistency note.
 * 7. **FIXED IN v1.1 — the Início row no longer clips.** Post phase-4 the row
 *    clipped at intermediate widths (with the old `padding={88}` reserve, e.g.
 *    container 560 → `scrollWidth` 605 vs `clientWidth` 558, ~47px over; smaller
 *    overruns at 640/520/470/430/400/320/280/240): the dense 16 items + 5
 *    dividers + ~15 gaps outran any fixed reserve between breakpoints. The
 *    Overflow manager now MEASURES the flex gap, every group divider, and the
 *    "…" trigger directly (plus a post-layout safety net), so Início ships with
 *    **no `padding`** and the accounting is exact. The dedicated no-clip sweep
 *    below (test "i") asserts `scrollWidth <= clientWidth` at every settled
 *    slider width — the previously documented ~47px overrun is gone, and this is
 *    the acceptance criterion for the v1.1 improvement. The other tests still
 *    settle on the derived overflow state (hidden-count stability), never on
 *    geometry, since a drop can transiently change both together.
 */

/** Groups in SOURCE (registration) order; "Desfazer" holds only the pinned Undo. */
const GROUP_ORDER = [
  "Área de Transferência",
  "Fonte",
  "Parágrafo",
  "Estilos",
  "Edição",
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/ribbon");
});

/** Scope to the Light panel (the demo renders the same ribbon in both panels). */
function panel(page: Page): Locator {
  return page.locator("section.light");
}

/** The active command row (a `role="toolbar"`); scoped, visible one only. */
function activeBar(page: Page): Locator {
  return panel(page).locator('[role="toolbar"]:visible').first();
}

/**
 * The active tab's "…" trigger. Every kept-mounted `RibbonContent` (one per tab)
 * has its own trigger, so scope to the visible command row — not the panel — to
 * get exactly one. (The trigger itself may be `visibility:hidden` when nothing
 * overflows, so we can't use `:visible` on it directly.)
 */
function overflowTrigger(page: Page): Locator {
  return activeBar(page).locator('[data-slot="ribbon-overflow-trigger"]');
}

/** A bar control by its accessible name (matches even while its wrapper is hidden). */
function ctl(page: Page, label: string): Locator {
  return panel(page).locator(`[aria-label="${label}"]`);
}

/** The open overflow menu (portalled to body). */
function openMenu(page: Page): Locator {
  return page.locator('[data-slot="ribbon-overflow-menu"]:visible');
}

async function setWidth(page: Page, value: number): Promise<void> {
  const slider = panel(page).locator("#ribbon-width");
  await slider.evaluate((el, v) => {
    const proto = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );
    proto?.set?.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

/** Number of overflowed (hidden) command wrappers in the active row. */
function hiddenCount(page: Page): Promise<number> {
  return activeBar(page)
    .locator('[data-slot="overflow-item"][data-overflowing=""]')
    .count();
}

/** The live count parsed out of the trigger's aria-label. */
async function triggerCount(page: Page): Promise<number> {
  const label = (await overflowTrigger(page).getAttribute("aria-label")) ?? "";
  const match = label.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** The active row's real vs. clip extent, read after the layout settles. */
function clipOf(page: Page): Promise<{ sw: number; cw: number }> {
  return activeBar(page).evaluate((el) => ({
    sw: (el as HTMLElement).scrollWidth,
    cw: (el as HTMLElement).clientWidth,
  }));
}

/**
 * Wait for the ResizeObserver-driven overflow state to STOP changing (two
 * consecutive hidden-count reads agree). State-based on purpose: a drop can
 * change the hidden count and the geometry in the same tick, so we settle on the
 * derived overflow state and assert geometry (test "i") only AFTER settling.
 */
async function settle(page: Page): Promise<void> {
  let prev = -999;
  await expect
    .poll(
      async () => {
        const cur = await hiddenCount(page);
        const stable = cur === prev;
        prev = cur;
        return stable;
      },
      { intervals: [80, 80, 80, 80], timeout: 6000 }
    )
    .toBe(true);
}

// ── a. priority-based drops + the trigger count tracks the hidden set ─────────
test("a: shrinking drops commands by priority and the trigger count matches the hidden set", async ({
  page,
}) => {
  await setWidth(page, 1100);
  await settle(page);
  const wide = await hiddenCount(page);

  await setWidth(page, 560);
  await settle(page);
  const narrow = await hiddenCount(page);
  expect(narrow).toBeGreaterThan(wide);

  // The trigger's announced count equals the number of hidden wrappers.
  await expect.poll(() => triggerCount(page)).toBe(narrow);

  // Priority beats DOM order: at 560 (with v1.1's exact gap+divider accounting)
  // the hidden set is the seven lowest-priority commands (15/20/28/30/35/38/40).
  // "Recortar" (cut, priority 40) sits in the Área de Transferência group —
  // DOM-EARLIER than "Alinhar à Esquerda" (priority 55, Parágrafo) and
  // "Localizar" (priority 65, the DOM-LAST Edição group) — yet Recortar hides
  // while both of them survive. A pure DOM-order model would hide the later
  // items first, so this is the proof.
  await expect(ctl(page, "Centralizar")).toBeHidden(); // priority 15
  await expect(ctl(page, "Recortar")).toBeHidden(); // priority 40, DOM-early
  await expect(ctl(page, "Alinhar à Esquerda")).toBeVisible(); // 55, DOM-later
  await expect(ctl(page, "Localizar")).toBeVisible(); // priority 65, DOM-last
  await expect(ctl(page, "Colar")).toBeVisible(); // priority 95, the survivor
});

// ── b. the menu shows source-ordered section headers for overflowed groups ────
test("b: the overflow menu groups hidden commands under source-ordered headers", async ({
  page,
}) => {
  await setWidth(page, 430);
  await settle(page);
  await expect(overflowTrigger(page)).toBeVisible();

  await overflowTrigger(page).click();
  const menu = openMenu(page);
  await expect(menu).toBeVisible();

  // Read the section-header labels in DOM order and assert they are a
  // subsequence of the canonical source order (no group jumps ahead of another).
  const labels = await menu
    .locator('[data-slot="dropdown-menu-label"]')
    .allInnerTexts();
  const trimmed = labels.map((l) => l.trim()).filter(Boolean);
  expect(trimmed.length).toBeGreaterThan(1);

  let cursor = -1;
  for (const label of trimmed) {
    const next = GROUP_ORDER.indexOf(label as (typeof GROUP_ORDER)[number]);
    expect(next).toBeGreaterThan(cursor); // strictly increasing → source order
    cursor = next;
  }

  // The lowest-priority command shows as a labeled row under Parágrafo.
  await expect(menu.getByRole("menuitem", { name: "Centralizar" })).toBeVisible();
});

// ── c. the Realce split-button becomes a working submenu inside the menu ──────
test("c: overflowed, Realce renders a submenu inside the overflow menu while Colar survives in the bar", async ({
  page,
}) => {
  // Narrow enough that Realce (highlight, priority 28) is overflowed while
  // Colar (paste, priority 95 — Word's survivor ladder) stays in the bar.
  await setWidth(page, 560);
  await settle(page);
  await expect(ctl(page, "Realce")).toBeHidden(); // gone from the bar
  await expect(ctl(page, "Colar")).toBeVisible(); // the split-button survives

  await overflowTrigger(page).click();
  const menu = openMenu(page);

  // Realce appears as a submenu trigger (its custom overflowRender), not a
  // plain item — and Colar, still visible in the bar, is NOT offered here.
  const realceSub = menu.locator('[data-slot="dropdown-menu-sub-trigger"]', {
    hasText: "Realce",
  });
  await expect(realceSub).toBeVisible();
  await expect(menu.getByText("Colar")).toHaveCount(0);

  const sub = page.locator('[data-slot="dropdown-menu-sub-content"]:visible');
  // Re-hover until the submenu opens: a single hover after the menu paints can
  // race the sub-trigger's open delay (a dropdown hover timing quirk, unrelated
  // to overflow), so poll the hover→open until it sticks.
  await expect(async () => {
    await realceSub.hover();
    await expect(sub).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
  await expect(sub.getByRole("menuitem", { name: "Amarelo" })).toBeVisible();
  await expect(sub.getByRole("menuitem", { name: "Sem realce" })).toBeVisible();
});

// ── d. a fully-overflowed single-item group drops its divider ────────────────
test("d: the Estilos divider disappears once its only command overflows", async ({
  page,
}) => {
  // "Estilo" (styles group, priority 58) is the group's ONLY item, so once it
  // overflows the whole group is hidden and its trailing divider must hide.
  await setWidth(page, 430);
  await settle(page);
  await expect(ctl(page, "Estilo")).toBeHidden();

  // The Estilos group's OverflowDivider is now display:none (no dangling seam).
  const dividers = activeBar(page).locator('[data-slot="overflow-divider"]');
  const hiddenDividers = await dividers.evaluateAll((els) =>
    els.filter((el) => el.hasAttribute("data-overflowing")).length
  );
  expect(hiddenDividers).toBeGreaterThan(0);
});

// ── e. the pinned Desfazer never overflows ───────────────────────────────────
test("e: the pinned Desfazer stays in the row at the narrowest width", async ({
  page,
}) => {
  await setWidth(page, 240); // the slider floor (15 of 16 commands hidden here)
  await settle(page);
  await expect(ctl(page, "Desfazer")).toBeVisible();
  // Undo is a TipButton, so its overflow-item marker sits on the button itself
  // (finding 6). It is never marked overflowing at any width.
  await expect(
    activeBar(page).locator('[data-slot="overflow-item"][aria-label="Desfazer"]')
  ).not.toHaveAttribute("data-overflowing", "");
});

// ── f. MARQUEE: focus follows an overflowing command to the "…" trigger ───────
test("f: focusing a command then shrinking until it overflows moves focus to the trigger", async ({
  page,
}) => {
  await setWidth(page, 1100);
  await settle(page);

  // Focus a command that is visible at full width but overflows when shrunk
  // (Numeração, priority 35, drops by 560 on the retuned ladder).
  const numbering = ctl(page, "Numeração");
  await expect(numbering).toBeVisible();
  await numbering.focus();
  await expect(numbering).toBeFocused();

  // Shrink until Numeração is pushed into the "…" menu.
  await setWidth(page, 360);
  await settle(page);
  await expect(numbering).toBeHidden();

  // Focus was moved to the trigger, not dropped to <body>.
  await expect(overflowTrigger(page)).toBeFocused();
});

// ── g. collapsed hides the row; clicking a tab restores it ────────────────────
test("g: tabs-only collapse hides the command row and selecting a tab restores it", async ({
  page,
}) => {
  await setWidth(page, 900);
  await settle(page);
  await expect(activeBar(page)).toBeVisible();

  // Toggle "Mostrar apenas as guias" → the row hides (tabs-only).
  const collapseToggle = panel(page).getByRole("button", {
    name: "Mostrar apenas as guias",
  });
  await collapseToggle.click();
  // No command row is visible in tabs-only mode.
  await expect(panel(page).locator('[role="toolbar"]:visible')).toHaveCount(0);

  // Clicking a tab un-collapses (Word behavior) — the row returns.
  await panel(page).getByRole("tab", { name: "Início" }).click();
  await expect(panel(page).locator('[role="toolbar"]:visible')).toHaveCount(1);
});

// ── h. switching tabs swaps the row, roving tabindex intact ───────────────────
test("h: switching tabs swaps the command row and keeps a single roving tab stop", async ({
  page,
}) => {
  await setWidth(page, 900);
  await settle(page);

  // Início is active: its "Negrito" toggle is visible; Inserir's "Tabela" isn't.
  await expect(ctl(page, "Negrito")).toBeVisible();
  await expect(ctl(page, "Tabela")).toBeHidden();

  await panel(page).getByRole("tab", { name: "Inserir" }).click();

  // The Inserir row is now shown, the Início row hidden.
  await expect(ctl(page, "Tabela")).toBeVisible();
  await expect(ctl(page, "Negrito")).toBeHidden();

  // The visible row is a single tab stop: exactly one item has tabindex=0.
  const tabStops = await activeBar(page).evaluate(
    (root) => root.querySelectorAll('[tabindex="0"]').length
  );
  expect(tabStops).toBe(1);
});

// ── i. ACCEPTANCE: the Início row never clips at any settled width (v1.1) ──────
test("i: the Início row fits its clip box at every settled width (no clipping)", async ({
  page,
}) => {
  // The full slider range down to 280, including the widths that overran ~47px
  // under the old fixed `padding={88}` reserve (finding 7). With v1.1's measured
  // gaps + dividers + trigger and the post-layout safety net, the row's
  // scrollWidth must never exceed its clientWidth once the overflow state has
  // settled. (The 240px slider floor is excluded: there only the pinned
  // Desfazer + the `minimumVisible` floor remain, and those two controls are
  // together wider than 240px, so a ~2px clip there is the FLOOR forcing a
  // command to stay rather than the accounting under-counting — the net is not
  // allowed to hide below the floor.)
  const widths = [
    1100, 900, 760, 640, 560, 520, 470, 430, 400, 360, 320, 280,
  ];
  for (const width of widths) {
    await setWidth(page, width);
    await settle(page);
    const { sw, cw } = await clipOf(page);
    expect(sw, `Início row clips at width ${width} (scroll ${sw} > client ${cw})`)
      .toBeLessThanOrEqual(cw + 1);
  }
});

// ── first-paint settling: the count is stable + matches the trigger once settled ─
test("first paint settles to a width-consistent overflow count", async ({
  page,
}) => {
  // Fresh load at the default width; after settle the hidden count and the
  // trigger's announced count agree (finding 1: no perceptible over-report flash
  // at production timings — the first RO pass has already run by interactive).
  await settle(page);
  const hidden = await hiddenCount(page);
  await expect.poll(() => triggerCount(page)).toBe(hidden);
});
