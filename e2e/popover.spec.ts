import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Popover e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/popover.test.tsx` covers everything jsdom
 * can observe (open on click/keyboard, the non-modal `dialog` role, focus into
 * the popup, Escape + outside-click close, controlled mode, slots/classes,
 * axe). jsdom has no layout or paint engine, so these are only verifiable in a
 * real browser and were explicitly deferred here:
 *   a. pointer open
 *   b. the popup positioned below the trigger (side=bottom) with sideOffset 4
 *   c. the popup hidden (not `toHaveCount(0)`) after the exit transition
 *   d. click-outside close (jsdom covered the userEvent half; verify for real)
 *   e. focus moving into the popup and back to the trigger on close
 *   f. collision-aware flip near the viewport edge
 *   g. the `w-72` width computing to 288px
 *   h. `shadow-16` actually computed
 *   i. the open scale + fade animation reaching steady state
 *
 * ── Real-browser findings ──
 * 1. **The preview-page triggers carry `data-slot="button"`, NOT
 *    `data-slot="popover-trigger"`.** Every trigger is a kit `Button` composed
 *    via Base UI's `render` prop, and the Button's own `data-slot="button"` wins
 *    the merge, so triggers are addressed by role + accessible name (scoped to
 *    the Light panel), never by a `popover-trigger` selector.
 * 2. **The popup is HIDDEN, not unmounted, on close** — Base UI 1.6.0, exactly
 *    as select.spec.ts documents. `[data-slot="popover-content"]` stays mounted
 *    and goes `display:none` after the exit transition; the browser-only fact is
 *    that the `dialog` role leaves the accessibility tree. (c)/(d) assert that,
 *    never `toHaveCount(0)` on the element.
 * 3. **The popup is a non-modal `dialog` and moves focus into itself on open**
 *    (Base UI focuses the first field — here the "Width" input) and restores
 *    focus to the trigger on close; (e) asserts both. It is non-modal, so unlike
 *    the Dialog it does NOT lock page scroll.
 */

const LIGHT_BG = "rgb(255, 255, 255)"; // --popover / --background (light)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/popover");
});

/** The single visible popover popup (Base UI leaves closed popups mounted-but-hidden). */
function openPopup(page: Page): Locator {
  return page.locator('[data-slot="popover-content"]:visible');
}

/** The Light panel — triggers repeat verbatim in the Dark panel, so scope to one. */
function lightPanel(page: Page): Locator {
  return page.locator("section.light");
}

/** Open a popover by its Light-panel trigger label; returns the trigger Locator. */
async function openByClick(
  page: Page,
  name: string,
  exact = false
): Promise<Locator> {
  const trigger = lightPanel(page).getByRole("button", { name, exact });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return trigger;
}

/** Wait for the open (scale + fade) transition to settle before measuring. */
async function settleOpen(page: Page): Promise<Locator> {
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("transform", "none");
  return popup;
}

// ── a. pointer open ──────────────────────────────────────────────────────────
test("a: clicking the trigger opens the non-modal popover dialog", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Edit dimensions");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const popup = openPopup(page);
  await expect(popup).toHaveAttribute("role", "dialog");
  await expect(popup).not.toHaveAttribute("aria-modal", "true");
});

// ── b. positioning: below the trigger (side=bottom), sideOffset 4 ────────────
test("b: the popup opens below the trigger with a 4px sideOffset", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Edit dimensions");
  const popup = await settleOpen(page);
  const positioner = page.locator('[data-slot="popover-positioner"]:visible');
  await expect(positioner).toHaveAttribute("data-side", "bottom");

  const t = await trigger.boundingBox();
  const p = await popup.boundingBox();
  if (!t || !p) throw new Error("missing bounding boxes");
  // sideOffset = 4: popup top sits ~4px below the trigger bottom.
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height + 3);
  expect(p.y).toBeLessThanOrEqual(t.y + t.height + 5);
});

// ── c. hidden-not-unmounted on Escape close ─────────────────────────────────
test("c: Escape closes and the popup leaves the a11y tree / computes to display:none", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Edit dimensions");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="popover-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── d. click-outside closes ──────────────────────────────────────────────────
test("d: clicking outside closes the popup", async ({ page }) => {
  const trigger = await openByClick(page, "Edit dimensions");
  // Click a raw viewport corner, away from the trigger and popup.
  await page.mouse.click(5, 5);

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="popover-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── e. focus moves into the popup and returns to the trigger on close ────────
test("e: focus moves into the popup on open and returns to the trigger on close", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Edit dimensions");
  const popup = await settleOpen(page);

  await expect
    .poll(() => popup.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

// ── f. collision: with no room below, the popup flips above the trigger ──────
test("f: near the bottom edge the popup flips above the trigger and stays on-screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 460 });
  const trigger = lightPanel(page).getByRole("button", {
    name: "Edit dimensions",
  });
  await trigger.scrollIntoViewIfNeeded();
  // Park the trigger near the bottom edge so there's no room for the popup below.
  await page.evaluate(() => {
    const t = [...document.querySelectorAll("section.light button")].find(
      (b) => b.textContent?.trim() === "Edit dimensions"
    );
    if (!t) return;
    const r = t.getBoundingClientRect();
    window.scrollBy(0, r.top - (window.innerHeight - 40));
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const popup = await settleOpen(page);

  const positioner = page.locator('[data-slot="popover-positioner"]:visible');
  await expect(positioner).toHaveAttribute("data-side", "top");

  const t = await trigger.boundingBox();
  const p = await popup.boundingBox();
  const viewport = page.viewportSize();
  if (!t || !p || !viewport) throw new Error("missing box/viewport");
  expect(p.y + p.height).toBeLessThanOrEqual(t.y + 1); // popup bottom <= trigger top
  expect(p.y).toBeGreaterThanOrEqual(-1); // no top overflow
});

// ── g. the default panel width (w-72) computes to 288px ──────────────────────
test("g: the default popover width computes to 288px (w-72)", async ({
  page,
}) => {
  await openByClick(page, "Edit dimensions");
  const popup = await settleOpen(page);
  await expect(popup).toHaveCSS("width", "288px");
});

// ── h. the flyout elevation (shadow-16) is actually painted ──────────────────
test("h: the popup paints the shadow-16 flyout elevation", async ({ page }) => {
  await openByClick(page, "Edit dimensions");
  const popup = await settleOpen(page);

  await expect(popup).toHaveCSS("background-color", LIGHT_BG);
  // shadow-16 = 0 0 2px ambient, 0 8px 16px key — assert the key layer.
  const shadow = await popup.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toContain("8px 16px");
  expect(shadow).not.toBe("none");
});

// ── i. open animation reaches steady state (scale + fade) ────────────────────
test("i: the open animation runs from the starting style and settles at opacity 1 / no transform", async ({
  page,
}) => {
  const trigger = lightPanel(page).getByRole("button", {
    name: "Edit dimensions",
  });
  await trigger.scrollIntoViewIfNeeded();

  await page.evaluate(() => {
    const w = window as unknown as {
      __anim: { starting: boolean; midOpacity: boolean };
    };
    w.__anim = { starting: false, midOpacity: false };
    const observer = new MutationObserver(() => {
      const p = document.querySelector('[data-slot="popover-content"]');
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

  await trigger.click();
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("transform", "none");
  await expect(popup).toHaveCSS("transition-duration", "0.15s"); // duration-fast

  const anim = await page.evaluate(
    () =>
      (window as unknown as { __anim: { starting: boolean; midOpacity: boolean } })
        .__anim
  );
  expect(anim.starting).toBe(true); // data-starting-style applied on enter
  expect(anim.midOpacity).toBe(true); // opacity ramped up from < 1 (the fade)
});
