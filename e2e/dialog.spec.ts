import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Dialog e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/dialog.test.tsx` covers everything the
 * Vitest/jsdom environment can observe (open on click/keyboard, aria wiring,
 * every close path, controlled mode, slots/classes, axe). jsdom has no layout
 * or paint engine, so these are only verifiable in a real browser and were
 * explicitly deferred here:
 *   a. pointer open/close round-trip
 *   b. the popup visually centered in the viewport
 *   c. the smoke backdrop covering the viewport, computing to ~40% black
 *   d. `shadow-64` actually computed on the popup
 *   e. focus trapped inside while open (Tab cycles within), returned on close
 *   f. Escape closes
 *   g. the open fade + scale animation reaching steady state (opacity 1 / scale 1)
 *   h. page scroll locked behind a modal dialog
 *   i. the popup hidden (not `toHaveCount(0)`) after the exit transition
 *
 * ── Real-browser findings that correct the component/backlog wording ──
 * 1. **The preview-page triggers carry `data-slot="button"`, NOT
 *    `data-slot="dialog-trigger"`.** Every trigger on `/preview/dialog` is a
 *    kit `Button` composed via Base UI's `render` prop
 *    (`<DialogTrigger render={<Button/>}>`); Base UI merges the props onto the
 *    Button element and the Button's own `data-slot="button"` wins the merge.
 *    So triggers are addressed by their accessible label (scoped to the Light
 *    panel), never by a `dialog-trigger` slot selector. And because a modal
 *    dialog makes the background `inert` / `aria-hidden` while open, the trigger
 *    leaves the accessibility tree — the specs read it through a CSS locator so
 *    its `aria-expanded` attribute stays reachable during that window.
 * 2. **The backdrop computes to `oklab(0 0 0 / 0.4)`, not `rgba(0,0,0,0.4)`.**
 *    Tailwind v4 emits `bg-black/40` as an `oklab()` color with a 0.4 alpha
 *    channel (the modern-color-space output), so the smoke layer's computed
 *    `background-color` is the oklab form. That is still Fluent's theme-invariant
 *    40%-black smoke (dialog.tsx's sanctioned hardcoded color), just expressed in
 *    oklab — the assertion pins that exact string.
 * 3. **Scroll-lock is applied to `document.body` (inline `overflow: hidden`),
 *    not `<html>`.** Opening a modal dialog freezes the page by setting
 *    `overflow: hidden` on `body`; `<html>` is left untouched. So (h) asserts the
 *    body's computed overflow flips to `hidden` while open and back to `visible`
 *    on close.
 * 4. **The popup is HIDDEN, not unmounted, on close** — the same Base UI 1.6.0
 *    behavior select.spec.ts documents. `[data-slot="dialog-content"]` stays
 *    mounted and goes `display:none` after the exit transition; the real,
 *    browser-only fact is that the `dialog` role LEAVES the accessibility tree
 *    and the popup is hidden. That is what (a)/(f)/(i) assert, never
 *    `toHaveCount(0)` on the element.
 * 5. **The zoom animates the CSS `scale` property, not `transform`.** Per
 *    dialog.tsx's motion note, the -50%/-50% centering rides `translate:` and the
 *    open zoom rides `scale:`, so `transform` computes to `none` throughout and
 *    the settled-state assertion checks `scale: none` (Chromium's serialization
 *    of `scale: 1`) rather than `transform: none` for the zoom.
 */

const BACKDROP = "oklab(0 0 0 / 0.4)"; // bg-black/40 in Tailwind v4
const LIGHT_BG = "rgb(255, 255, 255)"; // --background (light)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/dialog");
});

/** The single visible dialog popup (Base UI leaves closed popups mounted-but-hidden). */
function openPopup(page: Page): Locator {
  return page.locator('[data-slot="dialog-content"]:visible');
}

/** The Light panel — triggers repeat verbatim in the Dark panel, so scope to one. */
function lightPanel(page: Page): Locator {
  return page.locator("section.light");
}

/**
 * A Light-panel trigger by its label, as a CSS (not role) locator. While a
 * modal dialog is open Base UI makes the background `inert` / `aria-hidden`, so
 * the trigger leaves the accessibility tree and a role-based locator can no
 * longer resolve it — but the DOM element (and its `aria-expanded` attribute)
 * is still present, which a CSS locator reads directly.
 */
function lightTrigger(page: Page, name: string): Locator {
  return lightPanel(page).locator("button", { hasText: name });
}

/** Open a dialog by its Light-panel trigger label; returns the trigger Locator. */
async function openByClick(page: Page, name: string): Promise<Locator> {
  const trigger = lightTrigger(page, name);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return trigger;
}

/** Wait for the open (scale + fade) transition to settle before measuring. */
async function settleOpen(page: Page): Promise<Locator> {
  const popup = openPopup(page);
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("scale", "none"); // scale:1 settled
  return popup;
}

// ── a. pointer open + close round-trip ───────────────────────────────────────
test("a: clicking the trigger opens the dialog and the ✕ closes it", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Delete repository");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("dialog", { name: "Delete this repository?" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── b. the popup is visually centered in the viewport ────────────────────────
test("b: the popup is centered in the viewport", async ({ page }) => {
  await openByClick(page, "Delete repository");
  const popup = await settleOpen(page);

  const box = await popup.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("missing box/viewport");

  const popupCx = box.x + box.width / 2;
  const popupCy = box.y + box.height / 2;
  // Centered by fixed top/left 50% + translate -50%/-50%; allow sub-pixel drift.
  expect(Math.abs(popupCx - viewport.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(popupCy - viewport.height / 2)).toBeLessThanOrEqual(1);
});

// ── c. backdrop covers the viewport and computes to ~40% black ───────────────
test("c: the smoke backdrop covers the viewport and computes to 40% black", async ({
  page,
}) => {
  await openByClick(page, "Delete repository");
  await settleOpen(page);

  const overlay = page.locator('[data-slot="dialog-overlay"]:visible');
  await expect(overlay).toHaveCSS("position", "fixed");
  await expect(overlay).toHaveCSS("background-color", BACKDROP);

  const box = await overlay.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("missing box/viewport");
  // fixed inset-0: the smoke layer spans the whole viewport.
  expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
});

// ── d. the dialog elevation (shadow-64) is actually painted ──────────────────
test("d: the popup paints the shadow-64 dialog elevation", async ({ page }) => {
  await openByClick(page, "Delete repository");
  const popup = await settleOpen(page);

  await expect(popup).toHaveCSS("background-color", LIGHT_BG);
  // shadow-64 = 0 0 8px ambient, 0 32px 64px key — assert the deep key layer.
  const shadow = await popup.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toContain("32px 64px");
  expect(shadow).not.toBe("none");
});

// ── e. focus is trapped while open and returns to the trigger on close ───────
test("e: focus is trapped inside the open dialog and returns to the trigger on close", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Delete repository");
  const popup = await settleOpen(page);

  // Focus lands on a real control inside the popup on open.
  await expect
    .poll(() => popup.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);

  // Tab cycles among the popup's focusables (✕, Cancel, Delete) and never
  // escapes to the background — the modal focus trap. Base UI wraps focus using
  // two `<span tabindex="0">` guard sentinels rendered as siblings of the popup
  // INSIDE `[data-slot="dialog-portal"]`, so at the wrap point focus is on a
  // guard (in the portal, outside the popup element itself). The trap invariant
  // is therefore "focus stays within the portal", never that it stays within the
  // popup element — assert containment against the portal. Poll for the SETTLED
  // state after each Tab: while a guard redirects focus back to the first
  // control, `document.activeElement` is momentarily `<body>`, so a synchronous
  // read would be racy — the settled focus is always inside the portal.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(
          () => !!document.activeElement?.closest('[data-slot="dialog-portal"]')
        )
      )
      .toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Focus is restored to the element that opened the dialog.
  await expect(trigger).toBeFocused();
});

// ── f. Escape closes ─────────────────────────────────────────────────────────
test("f: Escape closes the dialog", async ({ page }) => {
  const trigger = await openByClick(page, "Edit profile");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

// ── g. open animation runs from the starting style and settles ───────────────
test("g: the open fade + scale animation runs from the starting style and settles", async ({
  page,
}) => {
  const trigger = lightTrigger(page, "Delete repository");
  await trigger.scrollIntoViewIfNeeded();

  // Record the enter lifecycle: the starting-style hook + a sub-1 opacity frame.
  await page.evaluate(() => {
    const w = window as unknown as {
      __anim: { starting: boolean; midOpacity: boolean };
    };
    w.__anim = { starting: false, midOpacity: false };
    const observer = new MutationObserver(() => {
      const p = document.querySelector('[data-slot="dialog-content"]');
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
  // Steady state after the enter transition.
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toHaveCSS("scale", "none");
  // Motion targets opacity + scale (dialog.tsx motion note); transform stays none.
  await expect(popup).toHaveCSS("transform", "none");
  await expect(popup).toHaveCSS("transition-duration", "0.2s"); // duration-normal

  const anim = await page.evaluate(
    () =>
      (window as unknown as { __anim: { starting: boolean; midOpacity: boolean } })
        .__anim
  );
  expect(anim.starting).toBe(true); // data-starting-style applied on enter
  expect(anim.midOpacity).toBe(true); // opacity ramped up from < 1 (the fade)
});

// ── h. page scroll is locked behind the modal dialog ─────────────────────────
test("h: opening a modal dialog locks page scroll on the body", async ({
  page,
}) => {
  // Default: body scrolls freely.
  await expect(page.locator("body")).toHaveCSS("overflow", "visible");

  const trigger = await openByClick(page, "Delete repository");
  // Base UI's modal scroll-lock sets inline `overflow: hidden` on <body>.
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  // The lock is released on close.
  await expect(page.locator("body")).toHaveCSS("overflow", "visible");
});

// ── i. the footer-actions-only dialog dismisses through explicit buttons ─────
test("i: the showCloseButton={false} dialog has no ✕ and dismisses via a footer action", async ({
  page,
}) => {
  const trigger = await openByClick(page, "Terms of service");
  // No built-in ✕ in this example.
  await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);

  await page.getByRole("button", { name: "Decline" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
