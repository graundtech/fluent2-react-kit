import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * SplitButton e2e — the interaction / computed-visual paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/split-button.test.tsx` covers the composition
 * in jsdom (two tab stops, the Action never opening the menu, shared variant/
 * size, aria wiring from the composed DropdownMenuTrigger). jsdom has no layout
 * or paint engine, so these are deferred here:
 *   a. clicking the Action runs its command and NEVER opens the menu; clicking
 *      the chevron Trigger opens it
 *   b. Escape closes the menu and returns focus to the Trigger
 *   c. the 1px joining divider computes a DIFFERENT color per variant
 *      (default's brand line vs outline's neutral input line), measured live
 *   d. the Action and the Trigger are two real, separately-tabbable stops
 *   e. the geometry of the joined seam + the focus ring (documented below)
 *
 * ── Real-browser findings ──
 * 1. **The two parts overlap by exactly 1px at the seam.** `SplitButtonTrigger`
 *    ships `-ml-px`, so the Trigger's left edge sits 1px INSIDE the Action's
 *    right edge (measured: `trigger.x ≈ action.x + action.width - 1`). This
 *    collapses the Action's right border and the Trigger's left border into a
 *    single hairline — the intended join, not a bug.
 * 2. **The focus ring is a box-shadow, `ring-2` + `ring-offset-2` ≈ 4px of
 *    outward glow that is NOT part of the border box** (so `boundingBox()` never
 *    sees it). Because a focused part's ring extends ~4px, it paints OVER the
 *    adjacent part's border region at the joined seam. The component handles
 *    this on purpose: `SplitButton` is `isolate` and each part is
 *    `relative focus-visible:z-10`, so the focused part's ring is lifted above
 *    its neighbor and reads as a clean, unbroken ring rather than being clipped
 *    by the sibling. (e) asserts the z-10 lift + the box-shadow ring presence
 *    and records the 1px seam. **No fix needed — the overlap is contained by the
 *    stacking context; documenting the reality as instructed.**
 * 3. **The joining divider color is genuinely per-variant** and token-driven:
 *    `default` → `--brand-60` (`rgb(15, 84, 140)`), `outline` → `--input`
 *    (`rgb(209, 209, 209)`). (c) asserts both and that they diverge.
 * 4. **The Trigger's `aria-haspopup`/`aria-expanded` arrive only from the
 *    composed `DropdownMenuTrigger`** — a bare `SplitButtonTrigger` (the static
 *    matrix / disabled examples) carries neither; the menu-composed "Paste"
 *    trigger carries both. Confirmed while opening.
 */

const LIGHT_BRAND_60 = "rgb(15, 84, 140)"; // --brand-60 #0f548c — default divider (light)
const LIGHT_INPUT = "rgb(209, 209, 209)"; //  --input    #d1d1d1 — outline divider (light)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/split-button");
});

/** The Light/Dark panel — each example repeats per panel, so scope to one. */
function themePanel(page: Page, theme: "light" | "dark"): Locator {
  return page.locator(`section.${theme}`);
}

/** The single visible menu popup (Base UI leaves closed popups mounted-but-hidden). */
function openPopup(page: Page): Locator {
  return page.locator('[data-slot="dropdown-menu-content"]:visible');
}

// ── a. Action runs its command and never opens the menu; the chevron opens it ─
test("a: the Action never opens the menu; only the chevron Trigger does", async ({
  page,
}) => {
  const paste = themePanel(page, "light").getByRole("button", {
    name: "Paste",
    exact: true,
  });
  const trigger = themePanel(page, "light").getByRole("button", {
    name: "Paste options",
  });

  // Clicking the primary Action does NOT open any menu.
  await paste.click();
  await expect(page.getByRole("menu")).toHaveCount(0);

  // Clicking the chevron opens it.
  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    openPopup(page).getByRole("menuitem", { name: "Keep Source Formatting" })
  ).toBeVisible();
});

// ── b. Escape closes and returns focus to the Trigger ────────────────────────
test("b: Escape closes the menu and restores focus to the Trigger", async ({
  page,
}) => {
  const trigger = themePanel(page, "light").getByRole("button", {
    name: "Paste options",
  });
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

// ── c. the joining divider color differs per variant (default vs outline) ─────
test("c: the joining divider computes a different color for default vs outline", async ({
  page,
}) => {
  const panel = themePanel(page, "light");
  // The static matrix: address a Trigger by its variant (data-variant on the part).
  const defaultTrigger = panel
    .locator('[data-slot="split-button-trigger"][data-variant="default"]')
    .first();
  const outlineTrigger = panel
    .locator('[data-slot="split-button-trigger"][data-variant="outline"]')
    .first();

  // The 1px seam is the Trigger's LEFT border (border-l + per-variant color).
  await expect(defaultTrigger).toHaveCSS("border-left-color", LIGHT_BRAND_60);
  await expect(outlineTrigger).toHaveCSS("border-left-color", LIGHT_INPUT);

  const d = await defaultTrigger.evaluate(
    (el) => getComputedStyle(el).borderLeftColor
  );
  const o = await outlineTrigger.evaluate(
    (el) => getComputedStyle(el).borderLeftColor
  );
  expect(d).not.toBe(o);
});

// ── d. the Action and the Trigger are two separate tab stops ─────────────────
test("d: the Action and the Trigger are two separately-tabbable stops", async ({
  page,
}) => {
  const paste = themePanel(page, "light").getByRole("button", {
    name: "Paste",
    exact: true,
  });
  const trigger = themePanel(page, "light").getByRole("button", {
    name: "Paste options",
  });

  await paste.focus();
  await expect(paste).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
});

// ── e. joined seam geometry + the focus-ring stacking lift ────────────────────
test("e: the parts overlap 1px at the seam and the focused part lifts its ring above the neighbor", async ({
  page,
}) => {
  const panel = themePanel(page, "light");
  const paste = panel.getByRole("button", { name: "Paste", exact: true });
  const trigger = panel.getByRole("button", { name: "Paste options" });

  const a = await paste.boundingBox();
  const t = await trigger.boundingBox();
  if (!a || !t) throw new Error("missing bounding boxes");

  // The Trigger's left edge sits ~1px inside the Action's right edge (`-ml-px`),
  // and the two share the same top/height (a joined single control).
  expect(Math.abs(t.x - (a.x + a.width - 1))).toBeLessThanOrEqual(1);
  expect(Math.abs(t.y - a.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(t.height - a.height)).toBeLessThanOrEqual(1);

  // Focusing the Action paints a box-shadow ring (ring-2 + ring-offset-2 ≈ 4px
  // of outward glow, not part of the border box) and lifts it above the Trigger
  // via `focus-visible:z-10` inside the `isolate` group — so the ring reads
  // unbroken across the seam. Assert the ring shadow exists and the z lift.
  await paste.focus();
  const shadow = await paste.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toBe("none");
  const z = await paste.evaluate((el) => getComputedStyle(el).zIndex);
  expect(z).toBe("10");
});
