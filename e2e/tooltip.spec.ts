import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Tooltip e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/tooltip.test.tsx` covers everything jsdom
 * can observe, but ONLY via the focus path: Base UI's hover open leans on
 * `restMs` timers layered on real pointer coordinates, which jsdom cannot
 * simulate, so the unit suite opens every tooltip with `trigger.focus()` and
 * asserts "closed" through Base UI's presence data attributes. jsdom has no
 * layout, paint, or real pointer engine, so these are only verifiable in a real
 * browser and were explicitly deferred here:
 *   a. opening on real HOVER after the provider delay, closing on pointer leave
 *   b. opening on keyboard focus (the `:focus-visible` path)
 *   c. Escape closing, with the popup hidden (not `toHaveCount(0)`) afterward
 *   d. the flyout positioned above the trigger by default (side=top, offset 4)
 *   e. the neutral Fluent surface (bg-popover, dark text, 12px, shadow-16),
 *      NOT shadcn's inverted brand bubble
 *
 * ── Real-browser findings ──
 * 1. **The focus-open path is gated on `:focus-visible`, and that heuristic is
 *    MODALITY-dependent — so "programmatic focus doesn't open it" holds only
 *    after a pointer interaction, not on a fresh keyboard-modality load.** Base
 *    UI opens on focus only when the browser marks the trigger `:focus-visible`.
 *    Chromium's heuristic keys off the last input modality: after a real
 *    pointer interaction a scripted `element.focus()` is NOT focus-visible (no
 *    tooltip — the behavior observed by hand), but on a freshly loaded page with
 *    no prior pointer input Chromium cannot rule out the keyboard, so even a
 *    scripted `.focus()` satisfies `:focus-visible` and DOES open the tooltip
 *    (observed here under Playwright). Because that negative is environment-
 *    dependent and flaky, (b) does not assert it; it drives an unambiguous
 *    keyboard Tab (always focus-visible) and asserts the tooltip opens. The unit
 *    suite's `trigger.focus()` opens in jsdom only because jsdom has no
 *    heuristic at all.
 * 2. **The surface is a NEUTRAL flyout, not shadcn's inverted brand bubble.**
 *    The popup computes to `bg-popover` (white in light) with dark
 *    `popover-foreground` text — NOT `bg-primary` (#0f6cbd) with white text.
 *    (e) pins this: white background + dark text + 12px + shadow-16 + the
 *    240px (`max-w-60`) cap is the headline Fluent divergence (tooltip.tsx
 *    divergence 1).
 * 3. **The preview-page triggers carry `data-slot="button"`, NOT
 *    `data-slot="tooltip-trigger"`** (kit `Button` composed via `render`; the
 *    Button's own slot wins the merge), so triggers are addressed by role +
 *    accessible name (scoped to the Light panel).
 * 4. **The popup is HIDDEN, not unmounted, on close** — Base UI 1.6.0, same as
 *    select.spec.ts. `[data-slot="tooltip-content"]` is hidden after the exit
 *    transition and the `tooltip` role leaves the accessibility tree; (a)/(c)
 *    assert that, never `toHaveCount(0)` on the element.
 *
 * ── Preview-page gap ──
 * `/preview/tooltip` wraps its examples in a single `<TooltipProvider>` with the
 * default 600ms delay and exposes NO shorter-delay (`delay={0}`) example, so
 * every hover-open here pays the real 600ms rest delay (Playwright's 10s
 * expect-timeout absorbs it). A `delay={0}` example would let the hover tests
 * run instantly; noted for the preview-page owner.
 */

const LIGHT_POPOVER = "rgb(255, 255, 255)"; //   --popover  #ffffff (light)
const POPOVER_FG = "rgb(36, 36, 36)"; //         --popover-foreground #242424
const PRIMARY = "rgb(15, 108, 189)"; //          --primary (the shadcn bubble we must NOT be)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/tooltip");
});

/** The Light panel — triggers repeat verbatim in the Dark panel, so scope to one. */
function lightPanel(page: Page): Locator {
  return page.locator("section.light");
}

/** Hover a Light-panel trigger open (pays the real ~600ms provider delay). */
async function hoverOpen(page: Page, name: string): Promise<Locator> {
  const trigger = lightPanel(page).getByRole("button", { name, exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  return trigger;
}

// ── a. hover opens after the delay; pointer leave closes ─────────────────────
test("a: hovering the trigger opens the tooltip and leaving closes it", async ({
  page,
}) => {
  const trigger = await hoverOpen(page, "Top");
  await expect(page.getByRole("tooltip")).toHaveText("Tooltip on top");
  await expect(trigger).toHaveAttribute("data-popup-open", "");

  // Move the pointer off the trigger — the tooltip closes.
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.locator('[data-slot="tooltip-content"]')).toBeHidden();
  await expect(trigger).not.toHaveAttribute("data-popup-open", "");
});

// ── b. keyboard focus (focus-visible) opens the tooltip ──────────────────────
test("b: a keyboard Tab (focus-visible) opens the tooltip with no artificial delay", async ({
  page,
}) => {
  const trigger = lightPanel(page).getByRole("button", {
    name: "Right",
    exact: true,
  });

  // Reach the trigger purely by keyboard so the browser marks it :focus-visible
  // (Shift+Tab off it, then Tab back) — Base UI's focus path opens with no delay
  // (unlike the 600ms hover delay). The scripted-focus negative is intentionally
  // NOT asserted here: it is modality-dependent and flaky (see header finding 1).
  await trigger.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("tooltip")).toHaveText("Tooltip on the right");
});

// ── c. Escape closes; popup hidden, role leaves the a11y tree ────────────────
test("c: Escape closes the tooltip and it leaves the a11y tree / is hidden", async ({
  page,
}) => {
  await hoverOpen(page, "Top");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.locator('[data-slot="tooltip-content"]')).toBeHidden();
});

// ── d. positioned above the trigger by default (side=top, offset 4) ──────────
test("d: the flyout opens above the trigger by default with a 4px offset", async ({
  page,
}) => {
  // "Hover for details" sets no `side`, so it exercises the default (top).
  const trigger = await hoverOpen(page, "Hover for details");
  const positioner = page.locator('[data-slot="tooltip-positioner"]:visible');
  await expect(positioner).toHaveAttribute("data-side", "top");

  const content = page.locator('[data-slot="tooltip-content"]:visible');
  const t = await trigger.boundingBox();
  const p = await content.boundingBox();
  if (!t || !p) throw new Error("missing bounding boxes");
  // Above the trigger: the popup bottom sits ~4px above the trigger top.
  const gap = t.y - (p.y + p.height);
  expect(gap).toBeGreaterThanOrEqual(3);
  expect(gap).toBeLessThanOrEqual(5);
});

// ── e. neutral Fluent surface — NOT the inverted brand bubble ────────────────
test("e: the tooltip is a neutral popover surface (not shadcn's inverted brand bubble)", async ({
  page,
}) => {
  await hoverOpen(page, "Top");
  const content = page.getByRole("tooltip");

  await expect(content).toHaveAttribute("data-slot", "tooltip-content");
  // Neutral surface: white popover background with dark text — the opposite of
  // shadcn's bg-primary (#0f6cbd) + white-text bubble.
  await expect(content).toHaveCSS("background-color", LIGHT_POPOVER);
  expect(await content.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    PRIMARY
  );
  await expect(content).toHaveCSS("color", POPOVER_FG);
  // Compact type + capped width + flyout elevation.
  await expect(content).toHaveCSS("font-size", "12px"); // text-xs
  await expect(content).toHaveCSS("max-width", "240px"); // max-w-60
  const shadow = await content.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toContain("8px 16px"); // shadow-16 key layer
  expect(shadow).not.toBe("none");
});
