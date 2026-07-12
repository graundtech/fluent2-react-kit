import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Combobox e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/combobox.test.tsx` covers everything the
 * Vitest/jsdom environment can observe (roving focus, keyboard nav, the built-in
 * text filter, selection, clear, `data-*` state hooks, axe). jsdom has no layout
 * or paint engine, so these were explicitly deferred here:
 *   a. pointer click-to-open (jsdom opens via the keyboard only)
 *   b. typing filters the visible item count down in a real browser
 *   c. the popup being removed after the exit transition (jsdom never fires
 *      `transitionend`, so it lingers in its exit state)
 *   d. collision-aware positioning + the `--anchor-width` min-width contract
 *   e. item pointer-click commits the value into the input and closes
 *   f. the clear button showing when a value is set and resetting on click
 *   g. keyboard highlight walking + scroll-into-view
 *   h. the field's computed bottom brand-accent focus (inset box-shadow)
 *   i. the open scale+fade animation reaching steady state
 *   j. dark-theme popover surface via the root `.dark`
 *
 * ── Real-browser findings that correct the Select precedent / task wording ──
 * 1. **The Combobox popup UNMOUNTS on close — it is NOT hidden like Select.**
 *    Where Base UI's `Select` leaves `[data-slot="select-content"]` mounted and
 *    sets it `display:none` after the exit transition, `Combobox.Popup` is fully
 *    REMOVED once the close transition completes. So the correct dismissed
 *    assertion is `toHaveCount(0)` on `[data-slot="combobox-content"]` (like
 *    Toast/Accordion), verified for both option-commit close and Escape close.
 * 2. **`--anchor-width` is the ANCHOR (input) width, NOT the field wrapper
 *    width.** Select's popup min-width equals the trigger width; here the popup's
 *    `--anchor-width` (294px on the max-w-xs field) is the inner `Combobox.Input`
 *    box, which is narrower than the 320px field wrapper (the wrapper also holds
 *    the Clear + chevron). So (d) asserts `popup.width === --anchor-width` and
 *    left-alignment to the wrapper, NOT `popup.width === wrapper.width`.
 * 3. **The popup portals to `document.body`, escaping the `.dark` PreviewPanel
 *    scope** (same caveat as select/toast). Real dark theming comes from the root
 *    `.dark` class (how the app toggle works), which (j) drives.
 *
 * ── Preview-page gap ──
 * No example on `/preview/combobox` has a list long enough to overflow its
 * `max-h-[min(var(--available-height),20rem)]` cap (the basic picker has 7 h-8
 * rows, well under 20rem), so internal scrolling cannot be exercised. (g) walks
 * the keyboard highlight to the last item and asserts it stays within the list
 * bounds; the list never scrolls (scrollTop stays 0) because it doesn't overflow.
 */

const LIGHT_PRIMARY = "rgb(15, 108, 189)"; // --primary / --brand-80  #0f6cbd
const LIGHT_ACCENT = "rgb(240, 240, 240)"; //  --accent   #f0f0f0
const DESTRUCTIVE = "rgb(209, 52, 56)"; //     --destructive  #d13438
const DARK_POPOVER = "rgb(41, 41, 41)"; //     --popover  #292929 (dark)
const DARK_ACCENT = "rgb(51, 51, 51)"; //      --accent   #333333 (dark)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/combobox");
});

/** The single visible popup (Combobox unmounts closed popups — finding 1). */
function openPopup(page: Page): Locator {
  return page.locator('[data-slot="combobox-content"]:visible');
}

/** The field-chrome wrapper that holds the input with this id. */
function wrapperOf(page: Page, id: string): Locator {
  return page.locator(`div[data-slot="combobox-input-wrapper"]:has(#${id})`);
}

/** Click the field open by its input id and wait for the listbox. */
async function openByClick(page: Page, id: string): Promise<Locator> {
  const input = page.locator(`#${id}`);
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  return input;
}

/** Wait for the open (scale + fade) transition to settle before measuring. */
async function settleOpen(page: Page): Promise<Locator> {
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("scale", "none");
  return popup;
}

// ── a. pointer click opens the listbox ───────────────────────────────────────
test("a: pointer click on the field opens the listbox with all options", async ({
  page,
}) => {
  const input = await openByClick(page, "light-basic");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option")).toHaveCount(7);
});

// ── b. typing filters the visible option count in a real browser ─────────────
test("b: typing filters the list down to the matching options", async ({
  page,
}) => {
  const input = await openByClick(page, "light-basic");
  await expect(page.getByRole("option")).toHaveCount(7);

  await input.fill("an");
  // "Banana" (an) is the only match; the others drop out of the DOM.
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option", { name: "Banana" })).toBeVisible();

  await input.fill("zzz");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.locator('[data-slot="combobox-empty"]:visible')).toHaveText(
    "No fruits found."
  );
});

// ── c/e. item pointer-click commits into the input and closes (unmounts) ─────
test("c/e: clicking an option fills the input, closes, and the popup unmounts", async ({
  page,
}) => {
  const input = await openByClick(page, "light-basic");

  await page.getByRole("option", { name: "Banana" }).click();

  // Base UI fills the input with the selected item's label and closes.
  await expect(input).toHaveValue("Banana");
  await expect(input).toHaveAttribute("aria-expanded", "false");

  // The exact jsdom-unreachable bit: the popup is REMOVED (not hidden) after the
  // exit transition — Combobox unmounts, unlike Select (finding 1).
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator('[data-slot="combobox-content"]')).toHaveCount(0);
});

test("c: Escape closes the field and unmounts the popup", async ({ page }) => {
  const input = await openByClick(page, "light-grouped");
  await page.keyboard.press("Escape");

  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator('[data-slot="combobox-content"]')).toHaveCount(0);
});

// ── d. positioning: below the field, left-aligned, --anchor-width min-width ──
test("d: the popup opens below the field, left-aligned, at the --anchor-width min-width", async ({
  page,
}) => {
  await openByClick(page, "light-basic");
  const popup = await settleOpen(page);
  const wrapper = wrapperOf(page, "light-basic");

  const w = await wrapper.boundingBox();
  const p = await popup.boundingBox();
  if (!w || !p) throw new Error("missing bounding boxes");

  // sideOffset = 4: popup top sits ~4px below the field bottom.
  expect(p.y).toBeGreaterThanOrEqual(w.y + w.height + 2);
  expect(p.y).toBeLessThanOrEqual(w.y + w.height + 6);
  // align "start": left edges line up (the anchor is the input, ~= wrapper left).
  expect(Math.abs(p.x - w.x)).toBeLessThanOrEqual(2);

  // The popup min-width is Base UI's --anchor-width. Finding 2: that is the inner
  // input box width, NARROWER than the field wrapper (which also holds Clear +
  // chevron), so this is NOT wrapper.width.
  const anchorWidth = await popup.evaluate((el) =>
    getComputedStyle(el.parentElement as HTMLElement)
      .getPropertyValue("--anchor-width")
      .trim()
  );
  expect(anchorWidth).toBe(`${Math.round(p.width)}px`);
  expect(p.width).toBeLessThan(w.width); // narrower than the wrapper
  await expect(popup).toHaveCSS("min-width", `${Math.round(p.width)}px`);
});

// ── f. clear button shows when a value is set and resets on click ────────────
test("f: the clear button appears with a value set and resets the input on click", async ({
  page,
}) => {
  // The "Preselected" field starts with a committed value (Cherry).
  const input = page.locator("#light-preselected");
  await expect(input).toHaveValue("Cherry");

  const clear = wrapperOf(page, "light-preselected").getByRole("button", {
    name: "Clear",
  });
  await expect(clear).toBeVisible();

  await clear.click();
  await expect(input).toHaveValue("");
  // With the value cleared, the Clear button unmounts (Base UI auto-hides it).
  await expect(clear).toHaveCount(0);
});

// ── g. keyboard highlight walks to the last item, staying in view ────────────
test("g: keyboard walks the highlight to the last item and it stays within the list", async ({
  page,
}) => {
  const input = page.locator("#light-basic");
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  await page.keyboard.press("ArrowDown"); // opens + highlights the first item
  await expect(page.getByRole("listbox")).toBeVisible();

  const list = page.locator('[data-slot="combobox-list"]:visible');
  const highlighted = page.locator(
    '[data-slot="combobox-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveText("Apple");

  // Walk to the last item (Grape). The preview list (7 rows) does not overflow
  // its 20rem cap, so scrollIntoView keeps the item in view and scrollTop stays 0.
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  await expect(highlighted).toHaveText("Grape");

  const inView = await highlighted.evaluate((item) => {
    const l = item.closest('[data-slot="combobox-list"]') as HTMLElement;
    const ir = item.getBoundingClientRect();
    const lr = l.getBoundingClientRect();
    return ir.top >= lr.top - 1 && ir.bottom <= lr.bottom + 1;
  });
  expect(inView).toBe(true);
  expect(await list.evaluate((el) => el.scrollTop)).toBe(0);
});

// ── h. field paints the Fluent bottom brand accent on focus ──────────────────
test("h: focusing the input paints the Fluent bottom brand accent on the wrapper", async ({
  page,
}) => {
  const input = page.locator("#light-basic");
  await input.focus();
  const wrapper = wrapperOf(page, "light-basic");

  // has-[input:focus-visible] on the WRAPPER: border switches to primary and the
  // inset 2px brand underline lands (computed box-shadow, animated in over ~150ms).
  await expect(wrapper).toHaveCSS("border-bottom-color", LIGHT_PRIMARY);
  await expect
    .poll(() => wrapper.evaluate((el) => getComputedStyle(el).boxShadow))
    .toContain(`${LIGHT_PRIMARY} 0px -2px 0px 0px inset`);
});

test("h: the highlighted item shows the accent background", async ({ page }) => {
  const input = page.locator("#light-basic");
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  const highlighted = page.locator(
    '[data-slot="combobox-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveText("Apple");
  await expect(highlighted).toHaveCSS("background-color", LIGHT_ACCENT);
});

test("h: the selected item renders the check indicator", async ({ page }) => {
  await openByClick(page, "light-preselected"); // defaultValue Cherry
  const selected = page.getByRole("option", { selected: true });
  await expect(selected).toHaveText("Cherry");
  await expect(selected.locator("svg")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Apple" }).locator("svg")
  ).toHaveCount(0);
});

test("h: an invalid field paints the destructive border", async ({ page }) => {
  const input = page.locator("#light-invalid");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(wrapperOf(page, "light-invalid")).toHaveCSS(
    "border-color",
    DESTRUCTIVE
  );
});

test("h: a disabled field cannot be opened by clicking", async ({ page }) => {
  const input = page.locator("#light-disabled");
  await expect(input).toBeDisabled();
  await input.click({ force: true });
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(input).toHaveAttribute("aria-expanded", "false");
});

// ── i. open animation reaches steady state (scale + fade) ────────────────────
test("i: the open animation runs from the starting style and settles at opacity 1 / no scale", async ({
  page,
}) => {
  const input = page.locator("#light-basic");
  await input.scrollIntoViewIfNeeded();

  await page.evaluate(() => {
    const w = window as unknown as {
      __anim: { starting: boolean; midOpacity: boolean };
    };
    w.__anim = { starting: false, midOpacity: false };
    const observer = new MutationObserver(() => {
      const p = document.querySelector('[data-slot="combobox-content"]');
      if (!p) return;
      if (p.getAttribute("data-starting-style") !== null)
        w.__anim.starting = true;
      if (parseFloat(getComputedStyle(p).opacity) < 0.99)
        w.__anim.midOpacity = true;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  });

  await input.click();
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("scale", "none");
  // Motion is on [opacity,scale] (never transform — conventions §3.5).
  await expect(popup).toHaveCSS("transition-duration", "0.15s");

  const anim = await page.evaluate(
    () =>
      (window as unknown as { __anim: { starting: boolean; midOpacity: boolean } })
        .__anim
  );
  expect(anim.starting).toBe(true); // data-starting-style applied on enter
  expect(anim.midOpacity).toBe(true); // opacity ramped up from < 1 (the fade)
});

// ── j. dark-theme popover surface via the root .dark ─────────────────────────
test("j: under the root dark theme the portalled popup uses the dark tokens", async ({
  page,
}) => {
  // The popup portals to body, escaping the `.dark` PreviewPanel (finding 3), so
  // real dark theming comes from the root `.dark` (how the app toggle works).
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  await openByClick(page, "dark-basic");
  const popup = await settleOpen(page);
  await expect(popup).toHaveCSS("background-color", DARK_POPOVER);

  await page.keyboard.press("ArrowDown");
  const highlighted = page.locator(
    '[data-slot="combobox-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveCSS("background-color", DARK_ACCENT);
});
