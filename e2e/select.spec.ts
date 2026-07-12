import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Select e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/select.test.tsx` covers everything the
 * Vitest/jsdom environment can observe (roving focus, keyboard nav, selection,
 * `data-*` state hooks, axe). jsdom has no layout or paint engine, so these
 * are only verifiable in a real browser and were explicitly deferred here:
 *   a. pointer click-to-open (jsdom opens via the keyboard only)
 *   b. the popup leaving the a11y tree / going `display:none` after the exit
 *      transition (jsdom never fires `transitionend`, so the popup lingers)
 *   c. click-outside / Escape close
 *   d. collision-aware positioning + the `--anchor-width` contract
 *   e. flip-above on collision, never overflowing the viewport
 *   f. internal list scrolling + the scroll-up/down arrows
 *   g. keyboard parity + scroll-highlighted-into-view
 *   h. computed visual states (focus accent, highlight, check, disabled, invalid)
 *   i. dark-theme popover surface
 *   j. the open (scale + fade) animation reaching steady state
 *
 * ── Two real-browser findings that correct the component/backlog wording ──
 * 1. **The popup is HIDDEN, not unmounted, on close.** Base UI 1.6.0 keeps
 *    `[data-slot="select-content"]` mounted after close and instead sets the
 *    Positioner to `hidden` (`display:none`) once the exit transition finishes.
 *    So `toHaveCount(0)` on the content element never holds. The real,
 *    browser-only fact — stronger than jsdom's `aria-expanded="false"` — is that
 *    the `listbox` role LEAVES the accessibility tree and the popup computes to
 *    `display:none`. That is what (b)/(c) assert. (The backlog/doc wording
 *    "popup unmounting after its exit transition" is imprecise — it's hidden.)
 * 2. **The portalled popup does NOT inherit the `.dark` PreviewPanel scope.**
 *    `Select.Portal` mounts to `document.body`, outside the demo's `.dark`
 *    section, so the "Dark panel" select on `/preview/select` actually renders
 *    with LIGHT tokens. Real dark theming comes from the root `.dark` class
 *    (how the app's theme toggle works), so (i) drives that instead and asserts
 *    the shipped-page behavior explicitly.
 */

// Computed token colors (see packages/react/src/styles/tokens.css).
const LIGHT_ACCENT = "rgb(240, 240, 240)"; // --accent  #f0f0f0
const LIGHT_PRIMARY = "rgb(15, 108, 189)"; // --primary / --brand-80  #0f6cbd
const DESTRUCTIVE = "rgb(209, 52, 56)"; //    --destructive  #d13438
const LIGHT_POPOVER = "rgb(255, 255, 255)"; // --popover  #ffffff
const DARK_POPOVER = "rgb(41, 41, 41)"; //    --popover  #292929 (dark)
const DARK_ACCENT = "rgb(51, 51, 51)"; //     --accent   #333333 (dark)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/select");
});

/** The single visible popup (Base UI leaves closed popups mounted-but-hidden). */
function openPopup(page: Page): Locator {
  return page.locator('[data-slot="select-content"]:visible');
}

/** Open a select by its trigger id (ids are unique per example on the page). */
async function openByClick(page: Page, id: string): Promise<Locator> {
  const trigger = page.locator(`#${id}`);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  return trigger;
}

/** Wait for the open (scale + fade) transition to settle before measuring. */
async function settleOpen(page: Page): Promise<Locator> {
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("transform", "none");
  return popup;
}

// ── a. pointer click-to-open + commit ───────────────────────────────────────
test("a: pointer click opens the listbox and clicking an option commits the value", async ({
  page,
}) => {
  const trigger = await openByClick(page, "light-basic-trigger");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(5);

  await page.getByRole("option", { name: "Banana" }).click();

  // Value commits into the trigger (items prop → friendly label) and it closes.
  await expect(trigger.locator('[data-slot="select-value"]')).toHaveText(
    "Banana"
  );
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

// ── b. popup leaves the a11y tree / is hidden after the exit transition ──────
test("b: after close the listbox leaves the a11y tree and the popup computes to display:none", async ({
  page,
}) => {
  const trigger = await openByClick(page, "light-basic-trigger");
  const popup = openPopup(page);
  await expect(popup).toBeVisible();

  await page.getByRole("option", { name: "Apple" }).click();

  // The exact thing jsdom can't verify: the listbox role is gone from the
  // accessibility tree, and the popup element computes to display:none once the
  // exit transition completes (Playwright auto-waits through the transition).
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── c. click-outside and Escape both close ──────────────────────────────────
test("c: Escape closes the popup", async ({ page }) => {
  const trigger = await openByClick(page, "light-basic-trigger");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("c: clicking outside closes the popup", async ({ page }) => {
  const trigger = await openByClick(page, "light-basic-trigger");
  // While open, Base UI covers the page with inert overlays that capture the
  // outside press, so click at a raw coordinate (bypasses element actionability).
  await page.mouse.click(5, 5);

  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── d. positioning: below, left-aligned, --anchor-width min-width ────────────
test("d: popup opens below the trigger, left-aligned, matching the trigger width (--anchor-width)", async ({
  page,
}) => {
  const trigger = await openByClick(page, "light-basic-trigger");
  const popup = await settleOpen(page);

  const t = await trigger.boundingBox();
  const p = await popup.boundingBox();
  if (!t || !p) throw new Error("missing bounding boxes");

  // sideOffset = 4: popup top sits 4px below the trigger bottom.
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height + 3);
  expect(p.y).toBeLessThanOrEqual(t.y + t.height + 5);
  // align "start": left edges line up.
  expect(Math.abs(p.x - t.x)).toBeLessThanOrEqual(1);
  // --anchor-width: the popup min-width equals the trigger width.
  expect(Math.abs(p.width - t.width)).toBeLessThanOrEqual(1);

  const anchorWidth = await popup.evaluate((el) =>
    getComputedStyle(el.parentElement as HTMLElement)
      .getPropertyValue("--anchor-width")
      .trim()
  );
  expect(anchorWidth).toBe(`${Math.round(t.width)}px`);
});

// ── e. collision: flip above, never overflow the viewport ───────────────────
test("e: with no room below, the popup flips above the trigger and stays within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  const trigger = page.locator("#light-long-trigger");
  await trigger.scrollIntoViewIfNeeded();
  // Park the trigger near the bottom edge so there's no room for the popup below.
  await page.evaluate(() => {
    const t = document.querySelector("#light-long-trigger");
    if (!t) return;
    const r = t.getBoundingClientRect();
    window.scrollBy(0, r.top - (window.innerHeight - 60));
  });
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  const popup = await settleOpen(page);

  // Base UI flips the side to "top" and renders the popup above the trigger,
  // capped by --available-height, never overflowing the viewport.
  const positioner = page.locator('[data-slot="select-positioner"]:visible');
  await expect(positioner).toHaveAttribute("data-side", "top");

  const t = await trigger.boundingBox();
  const p = await popup.boundingBox();
  if (!t || !p) throw new Error("missing bounding boxes");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("no viewport");

  expect(p.y + p.height).toBeLessThanOrEqual(t.y + 1); // popup bottom <= trigger top
  expect(p.y).toBeGreaterThanOrEqual(-1); // no top overflow
  expect(p.y + p.height).toBeLessThanOrEqual(viewport.height + 1); // no bottom overflow
});

// ── f. long list scrolls internally + directional scroll arrows ─────────────
test("f: the long list scrolls internally and renders directional scroll arrows", async ({
  page,
}) => {
  await openByClick(page, "light-long-trigger");
  const list = page.locator('[data-slot="select-list"]:visible');

  // Internal scroll: content overflows the capped list height.
  await expect(list).toHaveCSS("overflow-y", "auto");
  const metrics = await list.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  // Base UI DOES render scroll arrows on overflow, directionally: at the top of
  // the list the down arrow shows and the up arrow does not.
  await expect(
    page.locator('[data-slot="select-scroll-down-button"]:visible')
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="select-scroll-up-button"]')
  ).toHaveCount(0);

  // Scroll to the bottom: the up arrow appears and the down arrow disappears.
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    page.locator('[data-slot="select-scroll-up-button"]:visible')
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="select-scroll-down-button"]')
  ).toHaveCount(0);
});

// ── g. keyboard parity + scroll-highlighted-into-view ───────────────────────
test("g: keyboard opens, moves the highlight, scrolls it into view, and commits", async ({
  page,
}) => {
  const trigger = page.locator("#light-long-trigger");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press("Enter"); // opens + highlights the first item
  await expect(page.getByRole("listbox")).toBeVisible();

  const list = page.locator('[data-slot="select-list"]:visible');
  await expect(
    page.locator('[data-slot="select-item"][data-highlighted]:visible')
  ).toHaveText("UTC-12:00");

  // Walk the highlight to the last item — this must scroll the list.
  for (let i = 0; i < 24; i++) await page.keyboard.press("ArrowDown");

  const highlighted = page.locator(
    '[data-slot="select-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveText("UTC+12:00");
  // The highlighted item is scrolled into the list's visible region.
  const inView = await highlighted.evaluate((item) => {
    const l = item.closest('[data-slot="select-list"]') as HTMLElement;
    const ir = item.getBoundingClientRect();
    const lr = l.getBoundingClientRect();
    return ir.top >= lr.top - 1 && ir.bottom <= lr.bottom + 1;
  });
  expect(inView).toBe(true);
  await expect
    .poll(() => list.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);

  await page.keyboard.press("Enter"); // commits the highlighted item
  await expect(trigger.locator('[data-slot="select-value"]')).toHaveText(
    "UTC+12:00"
  );
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

// ── h. computed visual states ───────────────────────────────────────────────
test("h: focused trigger paints the Fluent bottom brand accent", async ({
  page,
}) => {
  const trigger = page.locator("#light-basic-trigger");
  await trigger.focus();
  // The accent animates in via `transition-[color,box-shadow]` (~150ms), so
  // poll/auto-wait for the settled state rather than reading a mid-transition
  // frame. Border switches to primary; the inset 2px brand underline lands.
  await expect(trigger).toHaveCSS("border-color", LIGHT_PRIMARY);
  await expect
    .poll(() => trigger.evaluate((el) => getComputedStyle(el).boxShadow))
    .toContain(`${LIGHT_PRIMARY} 0px -2px 0px 0px inset`);
});

test("h: the highlighted item shows the accent background", async ({ page }) => {
  const trigger = page.locator("#light-basic-trigger");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press("ArrowDown"); // opens + highlights first item
  await expect(page.getByRole("listbox")).toBeVisible();
  const highlighted = page.locator(
    '[data-slot="select-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveText("Apple");
  await expect(highlighted).toHaveCSS("background-color", LIGHT_ACCENT);
});

test("h: the selected item renders the check indicator", async ({ page }) => {
  await openByClick(page, "light-preselected-trigger"); // defaultValue cherry
  const selected = page.getByRole("option", { selected: true });
  await expect(selected).toHaveText("Cherry");
  await expect(selected.locator("svg")).toBeVisible();
  // Unselected items carry no indicator.
  await expect(
    page.getByRole("option", { name: "Apple" }).locator("svg")
  ).toHaveCount(0);
});

test("h: a disabled select cannot be opened by clicking", async ({ page }) => {
  const trigger = page.locator("#light-disabled-trigger");
  await expect(trigger).toBeDisabled();
  await trigger.click({ force: true });
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("h: an invalid trigger paints the destructive border", async ({ page }) => {
  const trigger = page.locator("#light-invalid-trigger");
  await expect(trigger).toHaveAttribute("aria-invalid", "true");
  await expect(trigger).toHaveCSS("border-color", DESTRUCTIVE);
});

// ── i. dark-theme popover surface ───────────────────────────────────────────
test("i: under the root dark theme the popover surface uses the dark tokens", async ({
  page,
}) => {
  // The portalled popup escapes the demo's `.dark` PreviewPanel section, so real
  // dark theming comes from the root `.dark` class (how the app toggle works).
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  await openByClick(page, "dark-basic-trigger");
  const popup = await settleOpen(page);
  await expect(popup).toHaveCSS("background-color", DARK_POPOVER);

  await page.keyboard.press("ArrowDown");
  const highlighted = page.locator(
    '[data-slot="select-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveCSS("background-color", DARK_ACCENT);
});

test("i: on the shipped page the .dark PreviewPanel popup portals out to a light surface", async ({
  page,
}) => {
  // Documents the actual shipped behavior: because Select.Portal mounts to
  // document.body (outside the `.dark` section) and the page root is light,
  // the "Dark panel" select's popup renders on a LIGHT surface.
  await openByClick(page, "dark-basic-trigger");
  const popup = await settleOpen(page);
  await expect(popup).toHaveCSS("background-color", LIGHT_POPOVER);
  const insideDark = await popup.evaluate((el) => !!el.closest(".dark"));
  expect(insideDark).toBe(false);
});

// ── j. open animation reaches steady state (scale + fade) ────────────────────
test("j: the open animation runs from the starting style and settles at opacity 1 / no transform", async ({
  page,
}) => {
  const trigger = page.locator("#light-basic-trigger");
  await trigger.scrollIntoViewIfNeeded();

  // Record the starting-style lifecycle + a sub-1 opacity frame during open.
  await page.evaluate(() => {
    (window as unknown as { __anim: { starting: boolean; midOpacity: boolean } }).__anim =
      { starting: false, midOpacity: false };
    const w = window as unknown as { __anim: { starting: boolean; midOpacity: boolean } };
    const observer = new MutationObserver(() => {
      const p = document.querySelector('[data-slot="select-content"]');
      if (!p) return;
      if (p.getAttribute("data-starting-style") !== null) w.__anim.starting = true;
      if (parseFloat(getComputedStyle(p).opacity) < 0.99) w.__anim.midOpacity = true;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  });

  await trigger.click();
  const popup = openPopup(page);
  // Steady state after the transition.
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("transform", "none");
  // The transition is wired to the starting/ending-style hooks.
  await expect(popup).toHaveCSS("transition-duration", "0.15s");

  const anim = await page.evaluate(
    () =>
      (window as unknown as { __anim: { starting: boolean; midOpacity: boolean } })
        .__anim
  );
  expect(anim.starting).toBe(true); // data-starting-style was applied on enter
  expect(anim.midOpacity).toBe(true); // opacity ramped up from < 1 (the fade)
});
