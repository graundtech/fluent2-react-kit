import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Multi Select e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/multi-select.test.tsx` covers what the
 * Vitest/jsdom environment can observe (chip render, the built-in filter,
 * multiple selection, chip removal, Backspace-removes-last, `data-*` hooks, axe).
 * jsdom has no layout/paint engine, so these were deferred here:
 *   a. pointer-select two items → two chips, popup stays open (multiple mode)
 *   b. a chip ✕ pointer-click removing the chip, keeping the input usable
 *   c. Backspace on an empty input removing the last chip (real keyboard)
 *   d. ArrowLeft focusing a chip, Delete removing the focused chip
 *   e. chips wrapping to a second row (distinct bounding-box tops), the field
 *      growing without clipping
 *   f. check indicators on selected items in the open list
 *   g. filter-then-select flow
 *   h. the chips container's a11y role
 *
 * ── Real-browser finding refining the a11y coverage target ──
 * **The chips container's `role="toolbar"` is CONDITIONAL — it appears only once
 * at least one chip is present.** Base UI's `Combobox.Chips` (v1.6.0) renders a
 * bare `<div>` with NO `role` while the field is empty, and adds `role="toolbar"`
 * only when it actually holds chips (the toolbar groups the removable chip
 * buttons for arrow-key traversal). So (h) asserts `role="toolbar"` on a
 * chips-populated field and the absence of the role on an empty one.
 *
 * ── Other real-browser notes ──
 * - The popup is `ComboboxContent`, so it UNMOUNTS on close like Combobox (not
 *   hidden like Select); in `multiple` mode it stays OPEN after a selection and
 *   only unmounts on Escape / outside-click.
 * - Chip counts are scoped per-field: the page renders six MultiSelect examples,
 *   and `[data-slot="multi-select-chip"]` is page-wide, so every assertion reads
 *   chips through the specific field's wrapper.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/multi-select");
});

/** The chips field wrapper holding the input with this id. */
function wrapperOf(page: Page, id: string): Locator {
  return page.locator(`div[data-slot="multi-select-input-wrapper"]:has(#${id})`);
}

/** The chips currently rendered in this field. */
function chipsOf(page: Page, id: string): Locator {
  return wrapperOf(page, id).locator('[data-slot="multi-select-chip"]');
}

/** Click the field open by its input id and wait for the listbox. */
async function openByClick(page: Page, id: string): Promise<Locator> {
  const input = page.locator(`#${id}`);
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  return input;
}

// ── a. select two items → two chips, popup stays open ────────────────────────
test("a: selecting two options renders two chips and keeps the popup open", async ({
  page,
}) => {
  const input = await openByClick(page, "light-basic");

  await page.getByRole("option", { name: "Apple" }).click();
  // multiple mode: the popup stays open after a selection.
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(chipsOf(page, "light-basic")).toHaveCount(1);

  await page.getByRole("option", { name: "Banana" }).click();
  await expect(chipsOf(page, "light-basic")).toHaveCount(2);
  await expect(input).toHaveAttribute("aria-expanded", "true");

  const chips = chipsOf(page, "light-basic");
  await expect(chips.nth(0)).toHaveText("Apple");
  await expect(chips.nth(1)).toHaveText("Banana");
});

// ── b. chip ✕ removes it and the input stays usable ──────────────────────────
test("b: a chip's ✕ removes it, leaving the input focusable and typable", async ({
  page,
}) => {
  const input = page.locator("#light-preselected"); // starts with Apple, Cherry
  await expect(chipsOf(page, "light-preselected")).toHaveCount(2);

  await wrapperOf(page, "light-preselected")
    .getByRole("button", { name: "Remove" })
    .first()
    .click();

  await expect(chipsOf(page, "light-preselected")).toHaveCount(1);
  await expect(chipsOf(page, "light-preselected").first()).toHaveText("Cherry");

  // The input is still usable after the removal (Base UI refocuses the field).
  await input.click();
  await input.fill("Ban");
  await expect(page.getByRole("option")).toHaveCount(1);
});

// ── c. Backspace on the empty input removes the last chip ────────────────────
test("c: Backspace on the empty input removes the last chip", async ({ page }) => {
  const input = page.locator("#light-preselected"); // Apple, Cherry
  await expect(chipsOf(page, "light-preselected")).toHaveCount(2);
  await expect(input).toHaveValue("");

  await input.focus();
  await page.keyboard.press("Backspace");

  await expect(chipsOf(page, "light-preselected")).toHaveCount(1);
  await expect(chipsOf(page, "light-preselected").first()).toHaveText("Apple");
});

// ── d. ArrowLeft focuses a chip, Delete removes the focused chip ──────────────
test("d: ArrowLeft moves focus onto a chip and Delete removes it", async ({
  page,
}) => {
  const input = page.locator("#light-preselected"); // Apple, Cherry
  await expect(chipsOf(page, "light-preselected")).toHaveCount(2);

  await input.focus();
  await page.keyboard.press("ArrowLeft");

  // Focus lands on a chip element (Base UI ComboboxChip keyboard model).
  const focusedSlot = await page.evaluate(
    () => document.activeElement?.getAttribute("data-slot")
  );
  expect(focusedSlot).toBe("multi-select-chip");

  await page.keyboard.press("Delete");
  await expect(chipsOf(page, "light-preselected")).toHaveCount(1);
});

// ── e. chips wrap to a second row; the field grows without clipping ──────────
test("e: many chips wrap to multiple rows and the field grows to fit them", async ({
  page,
}) => {
  const input = await openByClick(page, "light-basic");

  // Select every fruit so the chips must reflow past one row of the max-w-xs field.
  for (const name of [
    "Apple",
    "Banana",
    "Cherry",
    "Dragonfruit",
    "Elderberry",
    "Fig",
    "Grape",
  ]) {
    await page.getByRole("option", { name, exact: true }).click();
  }
  await page.keyboard.press("Escape");

  const chips = chipsOf(page, "light-basic");
  await expect(chips).toHaveCount(7);

  // Chips sit on at least two distinct rows (distinct bounding-box tops).
  const tops = await chips.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().top))
  );
  expect(new Set(tops).size).toBeGreaterThanOrEqual(2);

  // The field grew past its min-h-8 to hold the wrapped rows, and no chip is
  // clipped outside the wrapper's box.
  const wrapper = wrapperOf(page, "light-basic");
  const wb = await wrapper.boundingBox();
  if (!wb) throw new Error("no wrapper box");
  expect(wb.height).toBeGreaterThan(32); // taller than a single 32px row
  const clipped = await chips.evaluateAll((els, wrapTop) => {
    return els.some((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom < wrapTop - 1;
    });
  }, wb.y);
  expect(clipped).toBe(false);
  await expect(input).toBeVisible();
});

// ── f. check indicators on selected items in the open list ───────────────────
test("f: selected items show the check indicator in the open list", async ({
  page,
}) => {
  await openByClick(page, "light-preselected"); // Apple, Cherry preselected

  const selected = page.getByRole("option", { selected: true });
  await expect(selected).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(selected.nth(i).locator("svg")).toBeVisible();
  }
  // An unselected option carries no indicator.
  await expect(
    page.getByRole("option", { name: "Banana" }).locator("svg")
  ).toHaveCount(0);
});

// ── g. filter-then-select flow ───────────────────────────────────────────────
test("g: typing filters the list, then the filtered option can be selected", async ({
  page,
}) => {
  const input = await openByClick(page, "light-basic");

  await input.fill("Dr");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(
    page.getByRole("option", { name: "Dragonfruit" })
  ).toBeVisible();

  await page.getByRole("option", { name: "Dragonfruit" }).click();
  await expect(chipsOf(page, "light-basic")).toHaveCount(1);
  await expect(chipsOf(page, "light-basic").first()).toHaveText("Dragonfruit");
});

// ── h. the chips container's a11y role (conditional role="toolbar") ──────────
test("h: the chips container carries role='toolbar' when populated, none when empty", async ({
  page,
}) => {
  // Populated field: Combobox.Chips exposes the chips as a toolbar (arrow-key
  // traversable group of removable chip buttons).
  const populated = wrapperOf(page, "light-preselected");
  await expect(populated).toHaveAttribute("role", "toolbar");
  await expect(
    populated.getByRole("button", { name: "Remove" })
  ).toHaveCount(2);

  // Empty field: no chips yet, so Base UI adds no toolbar role.
  const empty = wrapperOf(page, "light-basic");
  const emptyRole = await empty.evaluate((el) => el.getAttribute("role"));
  expect(emptyRole).toBeNull();
});
