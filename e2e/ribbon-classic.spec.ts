import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Ribbon CLASSIC e2e (v2 phase C4) — the classic (two-row) band in a real
 * browser, driven through the shipped RibbonLayoutSwitcher.
 *
 * `e2e/ribbon.spec.ts` is the SINGLE-LINE regression guard (untouched here);
 * this file covers only the classic-layout truths that need real layout/paint:
 *   a. the collapse ladder respects `collapsePriority` (Parágrafo 50 collapses
 *      before Fonte 40 before Edição 20 before Área de Transferência 10) — the
 *      collapsed set is always a PREFIX of that order as the band shrinks
 *   b. a collapsed group exposes a dropdown whose flyout holds — and can operate —
 *      the group's same children
 *   c. at the narrow floor every group is collapsed and the band still overflows,
 *      so the horizontal-scroll arrows arm and actually scroll the band
 *   d. the tab strip folds trailing tabs behind the `⌄` menu and activating a
 *      folded tab works (the switcher chevron never folds — it's outside the budget)
 *   e. the layout switcher round-trips classic → single-line → classic and the
 *      active tab is preserved across both flips
 *   f. `autoAdjust=false` keeps every group expanded (no collapse) and goes
 *      straight to the scroll UI
 *
 * ── Real-browser findings (this phase) ──
 * 1. **The classic band width follows the demo's width slider** (the container the
 *    `GroupCollapse` manager measures), exactly like the single-line row. The
 *    band content is ~370px wide fully expanded, so the collapse ladder plays out
 *    in the lower ~240–380px slider range; above that everything fits. The tests
 *    therefore sweep and assert the RELATIVE ladder (prefix-of-order), never a
 *    hardcoded breakpoint — the absolute widths are demo-specific.
 * 2. **A group's mode is read off `[data-slot="collapse-group"][data-group-id=…]`'s
 *    `data-mode`** (`"expanded" | "collapsed"`) — stamped by the C1 manager. Only
 *    the Início tab carries the clipboard/font/paragraph/editing group ids, so
 *    scoping to the Light panel targets exactly one of each. A collapsed group's
 *    dropdown is `[data-slot="ribbon-group-trigger"]` with the group label as its
 *    accessible name; expanded, that button is `display:none` + `aria-hidden`, so
 *    `getByRole` only sees it once collapsed.
 * 3. **The RibbonLayoutSwitcher menu portals to `document.body`** (root-light
 *    theme), like every kit menu, so its radio items are addressed globally (only
 *    one panel's menu is open at a time). Its radio/checkbox items keep the menu
 *    open on click (`closeOnClick=false`), so the helper presses Escape to close it
 *    before touching the band.
 * 4. **`autoAdjust=false` mounts NO `GroupCollapse`** — there are zero
 *    `[data-slot="collapse-group"]` and zero collapsed dropdowns; the band is a
 *    plain (clipped) scroll container from the first overflow, so the arrows arm
 *    straight away. This is the divergence the switcher's "Ajustar automaticamente"
 *    checkbox drives (classic-only).
 * 5. **Focus/roving in classic reaches the large buttons** because the preview
 *    composes them through `ToolbarButton` (`render={<ToolbarButton/>}`) — proven
 *    at the unit level in `ribbon.test.tsx`; this file exercises the visual band.
 */

const COLLAPSE_ORDER = ["paragraph", "font", "editing", "clipboard"] as const;
type GroupId = (typeof COLLAPSE_ORDER)[number];

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/ribbon");
});

/** Scope to the Light panel (the demo renders the same ribbon in both panels). */
function panel(page: Page): Locator {
  return page.locator("section.light");
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

/** Flip the Light ribbon's layout through its far-right RibbonLayoutSwitcher. */
async function switchLayout(
  page: Page,
  target: "classic" | "single-line"
): Promise<void> {
  await panel(page)
    .getByRole("button", { name: "Opções de exibição da faixa" })
    .click();
  const name =
    target === "classic"
      ? "Faixa de Opções Clássica"
      : "Faixa de Opções de Linha Única";
  await page.getByRole("menuitemradio", { name }).click();
  // The menu stays open (closeOnClick=false) — close it before touching the band.
  await page.keyboard.press("Escape");
}

/** Toggle the standalone "Ajustar automaticamente" convenience control. */
async function setAutoAdjust(page: Page, on: boolean): Promise<void> {
  const toggle = panel(page).getByRole("button", {
    name: "Ajustar automaticamente",
  });
  const pressed = (await toggle.getAttribute("aria-pressed")) === "true";
  if (pressed !== on) await toggle.click();
}

function collapseGroup(page: Page, groupId: GroupId): Locator {
  return panel(page).locator(
    `[data-slot="collapse-group"][data-group-id="${groupId}"]`
  );
}

async function groupMode(page: Page, groupId: GroupId): Promise<string> {
  return (await collapseGroup(page, groupId).getAttribute("data-mode")) ?? "?";
}

async function allModes(page: Page): Promise<Record<GroupId, string>> {
  const modes = {} as Record<GroupId, string>;
  for (const id of COLLAPSE_ORDER) modes[id] = await groupMode(page, id);
  return modes;
}

/** Wait until the classic collapse state stops changing (two agreeing reads). */
async function settleClassic(page: Page): Promise<void> {
  let prev = "";
  await expect
    .poll(
      async () => {
        const cur = Object.values(await allModes(page)).join(",");
        const stable = cur === prev && cur.indexOf("?") === -1;
        prev = cur;
        return stable;
      },
      { intervals: [80, 80, 80, 120], timeout: 8000 }
    )
    .toBe(true);
}

/** The collapsed set must always be a prefix of the priority collapse order. */
function assertPrefix(modes: Record<GroupId, string>, width: number): void {
  let seenExpanded = false;
  for (const id of COLLAPSE_ORDER) {
    if (modes[id] === "expanded") {
      seenExpanded = true;
    } else if (modes[id] === "collapsed" && seenExpanded) {
      throw new Error(
        `Ladder violated at ${width}px: ${id} collapsed while a higher-priority group stayed expanded (${JSON.stringify(
          modes
        )})`
      );
    }
  }
}

// ── a. the collapse ladder respects collapsePriority (prefix-of-order) ────────
test("a: shrinking collapses groups by collapsePriority (Parágrafo → Fonte → Edição → clipboard)", async ({
  page,
}) => {
  await switchLayout(page, "classic");
  await setWidth(page, 1100);
  await settleClassic(page);
  expect(await allModes(page)).toEqual({
    clipboard: "expanded",
    font: "expanded",
    paragraph: "expanded",
    editing: "expanded",
  });

  // Fine sweep through the collapse range. The collapsed set must never break
  // the priority order (prefix-of-order = the ladder proof: whenever a group is
  // collapsed, every higher-priority group is already collapsed — so Parágrafo
  // is always collapsed no later than Fonte, etc.), AND the collapse must be
  // STAGED (the count passes through an intermediate value, not a binary 0→4).
  const collapsedCounts = new Set<number>();
  const trace: string[] = [];
  for (let width = 440; width >= 240; width -= 10) {
    await setWidth(page, width);
    await settleClassic(page);
    const modes = await allModes(page);
    assertPrefix(modes, width);
    const count = Object.values(modes).filter((m) => m === "collapsed").length;
    collapsedCounts.add(count);
    trace.push(`${width}:${count}`);
  }
  expect(
    [...collapsedCounts].some((c) => c > 0 && c < 4),
    `expected a staged intermediate collapse count (trace ${trace.join(" ")})`
  ).toBe(true);

  // At the narrow floor Parágrafo is definitely collapsed; by the prefix
  // invariant clipboard (lowest priority) is the last to go.
  expect(await groupMode(page, "paragraph")).toBe("collapsed");
});

// ── b. a collapsed group's flyout holds and operates its children ─────────────
test("b: a collapsed group opens a flyout whose command is operable", async ({
  page,
}) => {
  await switchLayout(page, "classic");
  await setWidth(page, 380);
  await settleClassic(page);
  await expect.poll(() => groupMode(page, "paragraph")).toBe("collapsed");

  // The collapsed dropdown button carries the group label; expanded it wouldn't exist.
  const trigger = panel(page).getByRole("button", { name: "Parágrafo" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const flyout = page.getByRole("dialog", { name: "Parágrafo" });
  await expect(flyout).toBeVisible();
  const command = flyout.getByRole("button", { name: "Marcadores" });
  await expect(command).toBeVisible();
  await expect(command).toBeEnabled();
  await command.click(); // operable — no crash, click lands on a real control
});

// ── c. narrow floor arms the scroll arrows and they scroll the band ───────────
test("c: at the narrow floor the horizontal-scroll arrows arm and scroll", async ({
  page,
}) => {
  await switchLayout(page, "classic");
  await setWidth(page, 240); // all groups collapse and still overflow → scroll mode
  await settleClassic(page);
  expect(await groupMode(page, "clipboard")).toBe("collapsed");

  const rightArrow = panel(page).locator(
    '[data-slot="ribbon-scroll-button"][data-direction="right"]'
  );
  await expect(rightArrow).toBeVisible();

  const band = panel(page)
    .locator('[data-slot="ribbon-classic-band"] [role="toolbar"]')
    .first();
  const before = await band.evaluate((el) => el.scrollLeft);
  await rightArrow.click();
  await expect
    .poll(() => band.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before);

  // Once scrolled off the start, the left arrow appears.
  await expect(
    panel(page).locator(
      '[data-slot="ribbon-scroll-button"][data-direction="left"]'
    )
  ).toBeVisible();
});

// ── d. tab-strip overflow folds trailing tabs; a folded tab activates ─────────
test("d: the tab strip folds trailing tabs behind the ⌄ menu and activates one", async ({
  page,
}) => {
  await switchLayout(page, "classic");
  await setWidth(page, 320); // the six-tab strip can't fit → trailing tabs fold

  const tabMenu = panel(page).getByRole("button", { name: /guias ocultas/ });
  await expect(tabMenu).toBeVisible();

  // A trailing tab (Ajuda) is folded out of the strip.
  await expect(panel(page).getByRole("tab", { name: "Ajuda" })).toHaveCount(0);

  await tabMenu.click();
  const menu = page.getByRole("menu");
  const hiddenTab = menu.getByRole("menuitem", { name: "Ajuda" });
  await expect(hiddenTab).toBeVisible();
  await hiddenTab.click();

  // Activating it makes Ajuda the selected tab (pinned → it can never fold).
  await expect(
    panel(page).getByRole("tab", { name: "Ajuda", selected: true })
  ).toBeVisible();
});

// ── e. layout switcher round-trip preserves the active tab ────────────────────
test("e: switching classic ↔ single-line preserves the active tab", async ({
  page,
}) => {
  await setWidth(page, 900); // all tabs fit; keep the strip stable

  // Activate a non-default tab in single-line.
  await panel(page).getByRole("tab", { name: "Exibir" }).click();
  await expect(
    panel(page).getByRole("tab", { name: "Exibir", selected: true })
  ).toBeVisible();

  const root = panel(page).locator('[data-slot="ribbon"]');

  await switchLayout(page, "classic");
  await expect(
    panel(page).getByRole("tab", { name: "Exibir", selected: true })
  ).toBeVisible();
  // It really is classic now (root re-labels the whole ribbon).
  await expect(root).toHaveAttribute("data-layout", "classic");

  await switchLayout(page, "single-line");
  await expect(
    panel(page).getByRole("tab", { name: "Exibir", selected: true })
  ).toBeVisible();
  // Back to single-line, active tab still Exibir, and no classic band remains.
  await expect(root).toHaveAttribute("data-layout", "single-line");
  await expect(
    panel(page).locator('[data-slot="ribbon-classic-band"]')
  ).toHaveCount(0);
});

// ── f. autoAdjust=false keeps groups expanded, straight to scroll ─────────────
test("f: autoAdjust=false never collapses groups and arms scroll instead", async ({
  page,
}) => {
  await switchLayout(page, "classic");
  await setAutoAdjust(page, false);
  await setWidth(page, 240); // a width that collapses everything when autoAdjust is on

  // No GroupCollapse machinery and no collapsed dropdowns exist at all.
  await expect(
    panel(page).locator('[data-slot="collapse-group"]')
  ).toHaveCount(0);
  await expect(
    panel(page).locator('[data-slot="ribbon-group-collapsed"]')
  ).toHaveCount(0);

  // The groups stay expanded (their role=group shells remain, with real commands).
  await expect(
    panel(page).getByRole("group", { name: "Parágrafo" })
  ).toBeVisible();

  // The scroll path is armed straight away (the band overflows and clips).
  await expect(
    panel(page).locator('[data-slot="ribbon-scroll-button"]').first()
  ).toBeVisible();
});
