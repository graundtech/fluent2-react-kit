import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Toggle e2e — the computed-state paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/toggle.test.tsx` covers the state machine in
 * jsdom (aria-pressed wiring, Space/Enter activation, data-pressed stamping,
 * disabled). jsdom has no paint engine, so the *pressed look* — the filled
 * neutral surface + its border, resolved from tokens in BOTH themes — is only
 * verifiable in a real browser and is deferred here:
 *   a. pressed `default` computes `bg-secondary` + a `--border` border (light)
 *   b. pressed `outline` computes `bg-secondary` + a brand `--primary` border,
 *      distinct from `default`'s neutral border
 *   c. the same two, resolved to the DARK tokens in the `.dark` panel (Toggle
 *      renders INLINE — no portal — so the panel's `.dark` scope reaches it)
 *   d. keyboard toggling flips both the look and `data-pressed`/`aria-pressed`
 *   e. a disabled toggle blocks activation and keeps its state
 *
 * ── Real-browser findings ──
 * 1. **Toggle renders inline (native `<button>`, no portal), so the `.dark`
 *    PreviewPanel genuinely dark-themes it** — same inline story as Tabs, unlike
 *    the portalled popups (Select/DropdownMenu). (c) asserts the dark tokens on
 *    the shipped dark panel directly, no root-`.dark` trick needed.
 * 2. **`default` and `outline` share the SAME pressed fill (`--secondary`) but
 *    differ ONLY in border color** — `default` → neutral `--border`, `outline`
 *    → brand `--primary`. The border is what signals "on" for the outlined
 *    variant; (b) measures both and asserts they diverge.
 * 3. **FOUND HERE, THEN FIXED (dark outline pressed fill):** this suite
 *    originally caught the outline toggle's `data-[pressed]:bg-secondary` being
 *    OVERRIDDEN in dark by its own resting `dark:bg-input/30` (equal
 *    specificity, later in the cascade) — a pressed outline toggle in dark kept
 *    its translucent rest background (measured `oklab(0.4386 … / 0.3)`) and the
 *    on-state was carried by the brand border alone. `toggle.tsx` now
 *    re-asserts the fill as `dark:data-[pressed]:bg-secondary`, so pressed
 *    outline paints the same `--secondary` fill in both themes. (c) asserts the
 *    FIXED behavior — pressed fill = dark `--secondary`, distinct from the
 *    unpressed rest background — and would regress loudly if the cascade order
 *    ever flips back.
 * 4. **Pressed is stamped as boolean-presence `data-pressed=""` + a real
 *    `aria-pressed="true"`** (Base UI's `ToggleDataAttributes`), never a
 *    Radix-style `data-state="on"`. Disabled is the native `disabled` attribute
 *    (real native button), so activation is blocked at the platform level.
 */

const LIGHT_SECONDARY = "rgb(245, 245, 245)"; // --secondary  #f5f5f5 (light)
const DARK_SECONDARY = "rgb(51, 51, 51)"; //     --secondary  #333333 (dark)
const LIGHT_BORDER = "rgb(209, 209, 209)"; //    --border     #d1d1d1 (light)
const DARK_BORDER = "rgb(82, 82, 82)"; //        --border     #525252 (dark)
const LIGHT_PRIMARY = "rgb(15, 108, 189)"; //    --primary    #0f6cbd (light)
const DARK_PRIMARY = "rgb(17, 94, 163)"; //      --primary    #115ea3 (dark)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/toggle");
});

/** The Light/Dark panel — each example repeats per panel, so scope to one. */
function themePanel(page: Page, theme: "light" | "dark"): Locator {
  return page.locator(`section.${theme}`);
}

/**
 * The "Pressed" matrix in a panel holds the `defaultPressed` toggles. Each cell
 * is labelled by its own text ("default sm", "outline lg", …), so address a
 * pressed toggle by variant+size text within the panel.
 */
function pressedToggle(
  page: Page,
  theme: "light" | "dark",
  variant: "default" | "outline",
  size: "sm" | "default" | "lg"
): Locator {
  // The second heading block is "Pressed"; the toggle's accessible name is its
  // own "<variant> <size>" text, which is unique across the pressed matrix.
  return themePanel(page, theme)
    .getByRole("button", { name: `${variant} ${size}`, exact: true })
    .nth(1); // [0] = Unpressed matrix, [1] = Pressed matrix
}

// ── a + b. pressed computed surface/border per variant (light) ───────────────
test("a+b: in light, pressed default is secondary + neutral border; pressed outline is secondary + brand border", async ({
  page,
}) => {
  const pressedDefault = pressedToggle(page, "light", "default", "default");
  const pressedOutline = pressedToggle(page, "light", "outline", "default");

  await expect(pressedDefault).toHaveAttribute("data-pressed", "");
  await expect(pressedDefault).toHaveAttribute("aria-pressed", "true");

  // default: filled neutral surface + neutral --border.
  await expect(pressedDefault).toHaveCSS("background-color", LIGHT_SECONDARY);
  await expect(pressedDefault).toHaveCSS("border-color", LIGHT_BORDER);

  // outline: same fill, but the border brand-tints to signal "on".
  await expect(pressedOutline).toHaveCSS("background-color", LIGHT_SECONDARY);
  await expect(pressedOutline).toHaveCSS("border-color", LIGHT_PRIMARY);

  // The two borders genuinely diverge (the whole point of the outline signal).
  const dBorder = await pressedDefault.evaluate(
    (el) => getComputedStyle(el).borderColor
  );
  const oBorder = await pressedOutline.evaluate(
    (el) => getComputedStyle(el).borderColor
  );
  expect(dBorder).not.toBe(oBorder);
});

// ── c. the same, resolved to the dark tokens on the shipped dark panel ───────
test("c: in the dark panel the pressed surface/borders resolve to the dark tokens for BOTH variants", async ({
  page,
}) => {
  const pressedDefault = pressedToggle(page, "dark", "default", "default");
  const pressedOutline = pressedToggle(page, "dark", "outline", "default");
  // The matching UNPRESSED outline cell (first matrix) to compare fills against.
  const unpressedOutline = themePanel(page, "dark")
    .getByRole("button", { name: "outline default", exact: true })
    .nth(0);

  // default resolves cleanly to the dark tokens: secondary fill + border.
  await expect(pressedDefault).toHaveCSS("background-color", DARK_SECONDARY);
  await expect(pressedDefault).toHaveCSS("border-color", DARK_BORDER);

  // outline (finding 3 — the FIXED behavior): pressed fill is the dark
  // --secondary, same as light's story, and genuinely DIFFERENT from the
  // unpressed rest background (`dark:bg-input/30`). Before the fix these two
  // were equal (the cascade bug this suite caught).
  await expect(pressedOutline).toHaveCSS("background-color", DARK_SECONDARY);
  const restBg = await unpressedOutline.evaluate(
    (el) => getComputedStyle(el).backgroundColor
  );
  const pressedBg = await pressedOutline.evaluate(
    (el) => getComputedStyle(el).backgroundColor
  );
  expect(pressedBg).not.toBe(restBg); // press now visibly changes the fill

  // …and the brand border still carries the on-state signal.
  await expect(pressedOutline).toHaveCSS("border-color", DARK_PRIMARY);
  await expect(unpressedOutline).not.toHaveCSS("border-color", DARK_PRIMARY);
});

// ── d. keyboard toggling flips the look AND the state stamps ─────────────────
test("d: Space toggles the pressed look and the data-pressed / aria-pressed stamps", async ({
  page,
}) => {
  // An UNPRESSED default cell (first matrix). It has a transparent rest surface.
  const toggle = themePanel(page, "light")
    .getByRole("button", { name: "default default", exact: true })
    .nth(0);

  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).not.toHaveAttribute("data-pressed", "");
  // rest surface is transparent (bg-transparent), not the secondary fill.
  await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  await toggle.focus();
  await page.keyboard.press("Space");

  // Now pressed: state stamps flip and the neutral fill paints.
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toHaveAttribute("data-pressed", "");
  await expect(toggle).toHaveCSS("background-color", LIGHT_SECONDARY);

  // Space again releases it.
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).not.toHaveAttribute("data-pressed", "");
  await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

// ── e. disabled blocks activation and keeps state ────────────────────────────
test("e: a disabled toggle uses the native disabled attribute and does not toggle", async ({
  page,
}) => {
  // The disabled row: an unpressed and a pressed disabled toggle.
  const panel = themePanel(page, "light");
  const disabledUnpressed = panel
    .getByRole("button", { name: "unpressed", exact: true })
    .first();
  const disabledPressed = panel
    .getByRole("button", { name: "pressed", exact: true })
    .first();

  // Real native <button disabled> — platform-level block, not aria-disabled.
  await expect(disabledUnpressed).toBeDisabled();
  await expect(disabledPressed).toBeDisabled();
  await expect(disabledPressed).toHaveAttribute("aria-pressed", "true");

  // A forced click (bypassing the pointer-events guard) still changes nothing.
  await disabledUnpressed.click({ force: true });
  await expect(disabledUnpressed).toHaveAttribute("aria-pressed", "false");
  await disabledPressed.click({ force: true });
  await expect(disabledPressed).toHaveAttribute("aria-pressed", "true");
});
