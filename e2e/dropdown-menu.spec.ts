import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * DropdownMenu e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/dropdown-menu.test.tsx` covers everything
 * jsdom can observe (open on keyboard/click, roving keyboard nav, selection,
 * checkbox/radio state, groups/labels/separators, `data-*` hooks, axe). jsdom
 * has no layout or paint engine, so these are only verifiable in a real browser
 * and were explicitly deferred here:
 *   a. pointer click-open, item-click commit + close
 *   b. the popup hidden (not `toHaveCount(0)`) after the exit transition
 *   c. keyboard arrow nav + Enter parity
 *   d. the popup positioned below the trigger with sideOffset 4
 *   e. a submenu opening on hover AND via ArrowRight, positioned to the side
 *   f. collision-aware flip near the viewport edge
 *   g. computed visual states: `data-[highlighted]` accent, destructive tint,
 *      checkbox check indicator, radio dot
 *   h. the dark popover surface (root `.dark`) + the shipped-panel portal caveat
 *
 * ── Real-browser findings ──
 * 1. **The preview-page triggers keep their `id` but carry `data-slot="button"`,
 *    NOT `data-slot="dropdown-menu-trigger"`.** Each trigger is a kit `Button`
 *    composed via `render`; Base UI merges the props (so the `id` set on
 *    `DropdownMenuTrigger` survives onto the Button), but the Button's own
 *    `data-slot="button"` wins the slot merge. Triggers are therefore addressed
 *    by their stable `#light-*` / `#dark-*` ids (as select.spec.ts does), never
 *    by a `dropdown-menu-trigger` selector.
 * 2. **The popup is HIDDEN, not unmounted, on close** — Base UI 1.6.0, exactly
 *    as select.spec.ts documents. `[data-slot="dropdown-menu-content"]` stays
 *    mounted and goes `display:none` after the exit transition; the browser-only
 *    fact is that the `menu` role leaves the accessibility tree. (b) asserts that,
 *    never `toHaveCount(0)` on the element.
 * 3. **The portalled popup does NOT inherit the `.dark` PreviewPanel scope.**
 *    `Menu.Portal` mounts to `document.body`, outside the demo's `.dark`
 *    section, so the "Dark panel" menu renders with LIGHT tokens on the shipped
 *    page. Real dark theming comes from the root `.dark` class, so (h) drives
 *    that and also documents the shipped-page portal behavior — same split
 *    select.spec.ts makes.
 * 4. **The destructive item's highlight tint (`bg-destructive/10`) exists only
 *    as a compound `data-[variant=destructive]:data-[highlighted]` variant** and
 *    is measured live: the highlighted "Delete" row's background is a destructive
 *    wash distinct from the neutral `bg-accent` a plain row highlights to, while
 *    its text stays the `destructive` token. Both are asserted directly.
 * 5. **A submenu's `data-side` is the LOGICAL `inline-end`, not a physical
 *    `right`/`left`.** Base UI positions submenus on the inline axis and reports
 *    the side as `inline-end` (flipping to `inline-start` on collision) rather
 *    than resolving it to a writing-mode-physical value the way a top-level
 *    menu's `bottom`/`top` reads. (e) asserts the logical pair.
 */

const LIGHT_ACCENT = "rgb(240, 240, 240)"; // --accent  #f0f0f0
const DARK_ACCENT = "rgb(51, 51, 51)"; //     --accent  #333333 (dark)
const LIGHT_POPOVER = "rgb(255, 255, 255)"; // --popover #ffffff
const DARK_POPOVER = "rgb(41, 41, 41)"; //    --popover #292929 (dark)
const DESTRUCTIVE = "rgb(209, 52, 56)"; //    --destructive #d13438

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/dropdown-menu");
});

/** The single visible menu popup (Base UI leaves closed popups mounted-but-hidden). */
function openPopup(page: Page): Locator {
  return page.locator('[data-slot="dropdown-menu-content"]:visible');
}

/** Open a menu by its trigger id (ids are unique per example on the page). */
async function openByClick(page: Page, id: string): Promise<Locator> {
  const trigger = page.locator(`#${id}`);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
  return trigger;
}

/** Wait for the open (scale + fade) transition to settle before measuring. */
async function settleOpen(page: Page): Promise<Locator> {
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("transform", "none");
  return popup;
}

// ── a. pointer click-open + commit + close ───────────────────────────────────
test("a: clicking the trigger opens the menu and clicking an item closes it", async ({
  page,
}) => {
  const trigger = await openByClick(page, "light-basic");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem")).toHaveCount(3);

  await page.getByRole("menuitem", { name: "Duplicate" }).click();

  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page.locator('[data-slot="dropdown-menu-content"]')
  ).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── b. hidden-not-unmounted close, plus Escape ──────────────────────────────
test("b: Escape closes and the menu leaves the a11y tree / computes to display:none", async ({
  page,
}) => {
  const trigger = await openByClick(page, "light-basic");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page.locator('[data-slot="dropdown-menu-content"]')
  ).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── c. keyboard arrow nav + Enter parity ─────────────────────────────────────
test("c: keyboard opens, arrows move the highlight, and Enter commits + closes", async ({
  page,
}) => {
  const trigger = page.locator("#light-basic");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press("ArrowDown"); // opens + highlights the first item
  await expect(page.getByRole("menu")).toBeVisible();

  const highlighted = page.locator(
    '[data-slot="dropdown-menu-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveText("Edit");

  await page.keyboard.press("ArrowDown");
  await expect(highlighted).toHaveText("Duplicate");
  await page.keyboard.press("ArrowUp");
  await expect(highlighted).toHaveText("Edit");

  await page.keyboard.press("Enter"); // commits the highlighted item + closes
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── d. positioning: below the trigger, sideOffset 4 ──────────────────────────
test("d: the popup opens below the trigger with a 4px sideOffset", async ({
  page,
}) => {
  const trigger = await openByClick(page, "light-basic");
  const popup = await settleOpen(page);
  const positioner = page.locator(
    '[data-slot="dropdown-menu-positioner"]:visible'
  );
  await expect(positioner).toHaveAttribute("data-side", "bottom");

  const t = await trigger.boundingBox();
  const p = await popup.boundingBox();
  if (!t || !p) throw new Error("missing bounding boxes");
  // sideOffset = 4: popup top sits ~4px below the trigger bottom.
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height + 3);
  expect(p.y).toBeLessThanOrEqual(t.y + t.height + 5);
  // align "start": left edges line up.
  expect(Math.abs(p.x - t.x)).toBeLessThanOrEqual(1);
});

// ── e. submenu opens on hover AND via ArrowRight, to the side of its parent ───
test("e: the submenu opens on hover, positioned to the side of its parent item", async ({
  page,
}) => {
  await openByClick(page, "light-share");
  const subTrigger = page.getByRole("menuitem", { name: "Send to" });
  await subTrigger.hover();

  // The submenu popup appears and its trigger stays highlighted (data-popup-open).
  const subContent = page.locator(
    '[data-slot="dropdown-menu-sub-content"]:visible'
  );
  await expect(subContent).toBeVisible();
  await expect(subContent.getByRole("menuitem", { name: "Email" })).toBeVisible();
  await expect(
    page.locator('[data-slot="dropdown-menu-sub-trigger"]')
  ).toHaveAttribute("data-popup-open", "");

  // It opens to the SIDE (inline axis), not stacked below like a top-level menu.
  // Base UI reports the submenu's side as the LOGICAL value `inline-end`
  // (flipping to `inline-start` on collision), not a physical `right`/`left`.
  const subPositioner = page.locator(
    '[data-slot="dropdown-menu-sub-positioner"]:visible'
  );
  const side = await subPositioner.getAttribute("data-side");
  expect(["inline-end", "inline-start"]).toContain(side);
});

test("e: the submenu also opens via ArrowRight on the highlighted sub-trigger", async ({
  page,
}) => {
  const trigger = page.locator("#light-share");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press("ArrowDown"); // opens + highlights "Copy link"
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown"); // highlight "Send to" (the sub-trigger)
  await expect(
    page.locator('[data-slot="dropdown-menu-sub-trigger"][data-highlighted]')
  ).toBeVisible();

  await page.keyboard.press("ArrowRight"); // opens the submenu
  await expect(
    page.locator('[data-slot="dropdown-menu-sub-content"]:visible')
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Messages" })
  ).toBeVisible();
});

// ── f. collision: with no room below, the popup flips above the trigger ──────
test("f: near the bottom edge the popup flips above the trigger and stays on-screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  const trigger = page.locator("#light-grouped");
  await trigger.scrollIntoViewIfNeeded();
  // Park the trigger near the bottom edge so there's no room for the popup below.
  await page.evaluate(() => {
    const t = document.querySelector("#light-grouped");
    if (!t) return;
    const r = t.getBoundingClientRect();
    window.scrollBy(0, r.top - (window.innerHeight - 40));
  });
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
  const popup = await settleOpen(page);

  const positioner = page.locator(
    '[data-slot="dropdown-menu-positioner"]:visible'
  );
  await expect(positioner).toHaveAttribute("data-side", "top");

  const t = await trigger.boundingBox();
  const p = await popup.boundingBox();
  const viewport = page.viewportSize();
  if (!t || !p || !viewport) throw new Error("missing box/viewport");
  expect(p.y + p.height).toBeLessThanOrEqual(t.y + 1); // popup bottom <= trigger top
  expect(p.y).toBeGreaterThanOrEqual(-1); // no top overflow
});

// ── g. computed visual states ────────────────────────────────────────────────
test("g: the highlighted item shows the accent background", async ({ page }) => {
  const trigger = page.locator("#light-basic");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const highlighted = page.locator(
    '[data-slot="dropdown-menu-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveText("Edit");
  await expect(highlighted).toHaveCSS("background-color", LIGHT_ACCENT);
});

test("g: the destructive item paints destructive text and a destructive highlight wash", async ({
  page,
}) => {
  await openByClick(page, "light-more");
  const del = page.getByRole("menuitem", { name: "Delete" });
  // token-tinted text (never a hardcoded red)
  await expect(del).toHaveCSS("color", DESTRUCTIVE);

  await del.hover();
  await expect(del).toHaveAttribute("data-highlighted", "");
  // The highlight is a destructive wash — a tint distinct from the neutral
  // accent a plain row highlights to, not a transparent background.
  const bg = await del.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe(LIGHT_ACCENT);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  // Text stays the destructive token while highlighted.
  await expect(del).toHaveCSS("color", DESTRUCTIVE);
});

test("g: checkbox items mount a check indicator only while checked; radio shows its dot", async ({
  page,
}) => {
  await openByClick(page, "light-view");

  // "Status bar" ships defaultChecked → indicator svg present.
  const statusBar = page.getByRole("menuitemcheckbox", { name: "Status bar" });
  await expect(statusBar).toHaveAttribute("aria-checked", "true");
  await expect(statusBar.locator("svg")).toBeVisible();
  // "Activity bar" starts unchecked → no indicator.
  const activityBar = page.getByRole("menuitemcheckbox", {
    name: "Activity bar",
  });
  await expect(activityBar).toHaveAttribute("aria-checked", "false");
  await expect(activityBar.locator("svg")).toHaveCount(0);

  // Radio group defaults to "comfortable" → its dot indicator is mounted.
  const comfortable = page.getByRole("menuitemradio", { name: "Comfortable" });
  await expect(comfortable).toHaveAttribute("aria-checked", "true");
  await expect(comfortable.locator("svg")).toBeVisible();
  const compact = page.getByRole("menuitemradio", { name: "Compact" });
  await expect(compact).toHaveAttribute("aria-checked", "false");
  await expect(compact.locator("svg")).toHaveCount(0);
});

// ── h. dark surface via the root theme, plus the shipped-panel portal caveat ─
test("h: under the root dark theme the menu surface uses the dark tokens", async ({
  page,
}) => {
  // The portalled popup escapes the demo's `.dark` PreviewPanel, so real dark
  // theming comes from the root `.dark` class (how the app toggle works).
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  await openByClick(page, "dark-basic");
  const popup = await settleOpen(page);
  await expect(popup).toHaveCSS("background-color", DARK_POPOVER);

  await page.keyboard.press("ArrowDown");
  const highlighted = page.locator(
    '[data-slot="dropdown-menu-item"][data-highlighted]:visible'
  );
  await expect(highlighted).toHaveCSS("background-color", DARK_ACCENT);
});

test("h: on the shipped page the .dark panel menu portals out to a light surface", async ({
  page,
}) => {
  // Documents the actual shipped behavior: Menu.Portal mounts to document.body
  // (outside the `.dark` section) and the page root is light, so the "Dark
  // panel" menu's popup renders on a LIGHT surface.
  await openByClick(page, "dark-basic");
  const popup = await settleOpen(page);
  await expect(popup).toHaveCSS("background-color", LIGHT_POPOVER);
  const insideDark = await popup.evaluate((el) => !!el.closest(".dark"));
  expect(insideDark).toBe(false);
});
