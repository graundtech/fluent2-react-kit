import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Toast e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/toast.test.tsx` covers what the Vitest/jsdom
 * environment can observe (firing via the manager, title/description fallback,
 * variant classes, the live-region wiring, axe). jsdom has no layout/paint
 * engine and no real timers-through-rAF, so the portalled render, auto-dismiss,
 * the exit motion completing, the Base UI stacking transforms, the computed
 * variant surfaces, and the F6/hover-pause behaviors are only observable in a
 * real browser and were deferred here.
 *
 * ── Real-browser findings that refine the component/unit-test wording ──
 * 1. **A fired toast portals to a `<div>` under `document.body`, OUTSIDE the
 *    `.light`/`.dark` PreviewPanel scope** (same portal caveat as select.spec).
 *    `Toast.Portal` mounts the viewport to `body`, so a toast fired from the
 *    Dark panel's button still inherits the PAGE-ROOT theme (light on the
 *    shipped page), not the panel it was fired from. So the variant surface
 *    colors asserted below are the LIGHT tokens regardless of the firing panel,
 *    and they compute to plain `rgb(...)` (hex tokens), not `oklab(...)`.
 * 2. **The toast root is `role="dialog"`, `aria-modal="false"`, `tabindex="0"`**
 *    (labelled by its title, described by its description). The VIEWPORT is the
 *    landmark: `role="region"`, `aria-live="polite"`, `aria-label="Notifications"`,
 *    `tabindex="-1"`. Pressing F6 moves focus to that viewport landmark
 *    (`test "f6"` confirms it) — the documented keyboard entry point.
 *    **The aria-hidden-until-F6 finding is real, but it lives on the toast's
 *    interactive CONTROLS, not the root.** At rest the `ToastClose` (and
 *    `ToastAction`) buttons carry `aria-hidden="true"` so they are NOT in the
 *    accessibility tree until the user reaches the toast via F6 / Tab (Base UI
 *    keeps the transient stack out of the sequential a11y flow, surfacing it
 *    through the live region + F6 landmark instead). Consequence for these
 *    specs: `getByRole("button", { name: "Close" })` cannot resolve the ✕ at
 *    rest, so the close is clicked through its `[data-slot="toast-close"]` CSS
 *    locator — the same read-through-CSS tactic dialog.spec uses for controls an
 *    a11y query can't reach. The root itself is not aria-hidden.
 * 3. **Toasts UNMOUNT on dismiss** (like Accordion, unlike Select/Dialog): after
 *    the exit transition Base UI removes the toast from its `toasts` array and
 *    React unmounts it, so `toHaveCount(0)` is the correct dismissed assertion.
 * 4. **Stacking is expressed through `--toast-index` (0, 1, 2, …) + a per-toast
 *    `transform`.** A collapsed (un-hovered) stack peeks, so the toasts'
 *    bounding-box tops sit close together — the robust distinctness signal is
 *    the `--toast-index`, which `test "stacking"` asserts.
 * 5. **Auto-dismiss uses the Provider default 5000ms.** The preview renders
 *    `<ToastProvider>` with no `timeout` override, so a toast self-dismisses ~5s
 *    after firing (assertions use an ≥7s expect timeout to clear it).
 */

// Variant surfaces — the light status-extension tokens (see tokens.css), all
// computing to plain rgb. success is #f1faf1, etc.
const SURFACE: Record<string, string> = {
  default: "rgb(255, 255, 255)", //     --popover (light)      #ffffff
  success: "rgb(241, 250, 241)", //     --success-subtle       #f1faf1
  destructive: "rgb(253, 246, 246)", // --destructive-subtle   #fdf6f6
  warning: "rgb(253, 246, 243)", //     --warning-subtle       #fdf6f3
  info: "rgb(235, 243, 252)", //        --brand-160            #ebf3fc
};
const SUCCESS_TITLE = "rgb(16, 124, 16)"; // --success  #107c10

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/toast");
});

/** The Light panel's fire buttons (both panels share one Provider/Viewport). */
function fireButton(page: Page, label: string): Locator {
  return page.locator("section.light").getByRole("button", { name: label });
}

/** All currently-rendered toasts (portalled under body). */
function toasts(page: Page): Locator {
  return page.locator('[data-slot="toast"]');
}

// ── firing renders the toast in the portalled viewport ────────────────────────
test("firing a toast renders it in the viewport, portalled outside the panels", async ({
  page,
}) => {
  await fireButton(page, "Success").click();

  const toast = toasts(page);
  await expect(toast).toHaveCount(1);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("role", "dialog");

  // It sits inside the toast viewport, which portals to a body-level div
  // outside the `.light`/`.dark` PreviewPanel scope (finding 1).
  const viewport = page.locator('[data-slot="toast-viewport"]');
  await expect(viewport).toHaveAttribute("aria-live", "polite");
  const escapesPanels = await toast.evaluate(
    (el) => !el.closest(".light") && !el.closest(".dark")
  );
  expect(escapesPanels).toBe(true);
});

// ── variant surfaces compute to the light status tokens ───────────────────────
test("each variant paints its computed surface (light tokens, via the portal)", async ({
  page,
}) => {
  for (const [label, variant] of [
    ["Default", "default"],
    ["Success", "success"],
    ["Destructive", "destructive"],
    ["Warning", "warning"],
    ["Info", "info"],
  ] as const) {
    await fireButton(page, label).click();
    const toast = page.locator(`[data-slot="toast"][data-variant="${variant}"]`);
    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS("background-color", SURFACE[variant]);
  }
  // Status is carried on the title, not body text: the success title is green.
  await expect(
    page
      .locator('[data-slot="toast"][data-variant="success"]')
      .locator('[data-slot="toast-title"]')
  ).toHaveCSS("color", SUCCESS_TITLE);
});

// ── auto-dismiss after the default 5s timeout ─────────────────────────────────
test("a toast auto-dismisses (unmounts) after the default 5s timeout", async ({
  page,
}) => {
  await fireButton(page, "Default").click();
  await expect(toasts(page)).toHaveCount(1);

  // The Provider default timeout (5000ms) elapses and Base UI unmounts it after
  // the exit transition — give the ≥5s dismiss room to complete.
  await expect(toasts(page)).toHaveCount(0, { timeout: 9000 });
});

// ── the ✕ close dismisses immediately, exit motion completing ─────────────────
test("the ✕ close dismisses the toast and the exit motion completes (unmounts)", async ({
  page,
}) => {
  await fireButton(page, "Default").click();
  const toast = toasts(page);
  await expect(toast).toHaveCount(1);

  // The ✕ is aria-hidden at rest (finding 2), so it's addressed by its slot, not
  // by role. Force the click through the (visually-present) button.
  await page.locator('[data-slot="toast-close"]').click();

  // The exit transition runs (opacity → 0, slide out) and the toast unmounts —
  // not left stuck in the DOM. Well within the 0.5s exit + expect timeout.
  await expect(toast).toHaveCount(0);
});

// ── stacking: three toasts stack with distinct --toast-index ──────────────────
test("stacking: three toasts stack with distinct --toast-index values", async ({
  page,
}) => {
  await fireButton(page, "Default").click();
  await fireButton(page, "Success").click();
  await fireButton(page, "Warning").click();

  const toast = toasts(page);
  await expect(toast).toHaveCount(3);

  // Each toast carries a distinct stack index (0, 1, 2) — the robust signal,
  // since a collapsed stack peeks and bounding-box tops sit close (finding 4).
  const indices = await toast.evaluateAll((els) =>
    els.map((el) =>
      getComputedStyle(el).getPropertyValue("--toast-index").trim()
    )
  );
  expect(new Set(indices).size).toBe(3);
  expect([...indices].sort()).toEqual(["0", "1", "2"]);

  // And each carries a real transform (Base UI's stacking offset), not `none`.
  const transforms = await toast.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).transform)
  );
  for (const t of transforms) expect(t).not.toBe("none");
});

// ── F6 landmark focus (probe + document actual behavior) ──────────────────────
test("f6: pressing F6 moves focus to the toast viewport landmark", async ({
  page,
}) => {
  await fireButton(page, "Default").click();
  await expect(toasts(page)).toHaveCount(1);

  // Base UI wires F6 to jump focus to the toast viewport region (its documented
  // keyboard landmark). Focus the page body first, then press F6.
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("F6");

  // Actual observed behavior: focus lands within the portalled toast viewport
  // (the region itself or a focusable toast inside it).
  const focusInViewport = await page.evaluate(
    () =>
      !!document.activeElement?.closest('[data-slot="toast-viewport"]') ||
      document.activeElement?.getAttribute("data-slot") === "toast-viewport"
  );
  expect(focusInViewport).toBe(true);
});

// ── hover pauses the auto-dismiss timer (probe + document) ────────────────────
test("hover pauses the auto-dismiss timer; leaving resumes it", async ({
  page,
}) => {
  await fireButton(page, "Default").click();
  const toast = toasts(page);
  await expect(toast).toHaveCount(1);

  // Hover the toast and hold past the 5s default timeout — Base UI pauses the
  // timer while the pointer is over the stack, so it must still be present.
  await toast.hover();
  await page.waitForTimeout(6000);
  await expect(toast).toHaveCount(1);

  // Move the pointer away: the timer resumes and the toast dismisses.
  await page.mouse.move(5, 5);
  await expect(toast).toHaveCount(0, { timeout: 9000 });
});
