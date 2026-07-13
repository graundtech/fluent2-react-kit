import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Toolbar e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/toolbar.test.tsx` covers the composite
 * roving-focus contract in jsdom (single tab stop, arrow nav, wrap-around,
 * disabled-but-focusable, orientation). jsdom has focus and can move a roving
 * tabindex, but it has no *layout* engine, so the browser-only facts deferred
 * here are the ones that depend on real focus order in a painted tree:
 *   a. `Tab` lands in the bar exactly once (roving tabindex: one item is the
 *      tab stop, `Tab` again LEAVES the whole toolbar), and `Shift+Tab` from
 *      the tab stop leaves backwards
 *   b. `ArrowRight`/`ArrowLeft` move focus between items — across groups and
 *      separators — and WRAP at the ends (`loopFocus`)
 *   c. focus MEMORY: after moving focus with arrows and tabbing away, tabbing
 *      back returns to the last-focused item, not the first
 *   d. a `disabled` toolbar item stays focusable + arrow-reachable
 *      (`aria-disabled`, not the native `disabled` attribute)
 *   e. a VERTICAL toolbar navigates on Arrow{Down,Up} and ignores Arrow{Left,
 *      Right}; its disabled item is still reachable
 *   f. a `render={<Button/>}`-composed item participates in the roving sequence
 *
 * ── Real-browser findings ──
 * 1. **Roving tabindex is stamped as `tabindex="0"` on exactly ONE item and
 *    `tabindex="-1"` on the rest.** Base UI's Toolbar seeds the first item as
 *    the tab stop on mount; arrowing moves the `0` with focus. (a) asserts the
 *    invariant "exactly one `tabindex=0` in the toolbar" directly, which is the
 *    structural proof of a single tab stop.
 * 2. **The inline `ToolbarInput` and the `ToolbarLink` are part of the roving
 *    sequence, NOT separate tab stops.** In the "Text formatting" bar, `Tab`
 *    from any item jumps clean out of the toolbar (past the input and the link)
 *    — arrows are the only way to reach them. This is the APG composite-widget
 *    behavior and the whole point of the pattern.
 * 3. **A `render={<Button variant="default" size="sm"/>}` item is driven by the
 *    OUTER `ToolbarButton`, not the inner Button — a real composition caveat.**
 *    The composed "Publish" item renders with `data-slot="toolbar-button"`,
 *    `data-variant="ghost"`, and a TRANSPARENT background — i.e. `ToolbarButton`'s
 *    own default (`variant="ghost"`) styling + slot win the merge; the inner
 *    `Button`'s `variant="default"`/`size="sm"` do NOT take effect. So the
 *    preview's stated intent ("a brand-filled primary via the kit Button") does
 *    not actually paint — the item is a subtle/ghost toolbar button. Flagged for
 *    phase-4 to cross-check; NOT a blocker (the item is fully functional and
 *    still participates in the roving sequence). This is the OPPOSITE of the
 *    dropdown-menu slot-merge where the inner Button won — here the toolbar
 *    primitive is the outer element and its props win.
 * 4. **Disabled toolbar items report `aria-disabled="true"` and carry
 *    `data-disabled`, and have NO native `disabled` attribute** (Base UI's
 *    `focusableWhenDisabled` default), so they still take focus via the arrow
 *    keys — exactly the discoverability behavior the toolbar doc comment
 *    promises.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/toolbar");
});

/** The Light panel — every example repeats in the Dark panel, so scope to one. */
function themePanel(page: Page, theme: "light" | "dark"): Locator {
  return page.locator(`section.${theme}`);
}

/**
 * A toolbar in a given panel, addressed by its exact `aria-label`. `exact` is
 * required: the accessible-name match is substring by default, and "Text
 * formatting" is a substring of "Vertical text formatting".
 */
function toolbar(page: Page, theme: "light" | "dark", label: string): Locator {
  return themePanel(page, theme).getByRole("toolbar", { name: label, exact: true });
}

/** How many items in this toolbar are the tab stop (`tabindex="0"`). */
function tabStopCount(bar: Locator): Promise<number> {
  return bar.evaluate(
    (root) =>
      root.querySelectorAll(
        '[data-slot^="toolbar-"]:not([data-slot="toolbar-group"]):not([data-slot="toolbar-separator"])[tabindex="0"], [data-slot="button"][tabindex="0"]'
      ).length
  );
}

// ── a. single tab stop: Tab in once, Tab leaves, Shift+Tab leaves backwards ──
test("a: the toolbar is a single tab stop — exactly one item is tabbable and Tab leaves the bar", async ({
  page,
}) => {
  const bar = toolbar(page, "light", "Text formatting");
  const bold = bar.getByRole("button", { name: "Bold" });

  // Exactly one item carries the roving tab stop (tabindex=0); the rest are -1.
  await expect.poll(() => tabStopCount(bar)).toBe(1);

  await bold.focus();
  await expect(bold).toBeFocused();

  // Tab moves clean OUT of the toolbar (past every other item + the input +
  // the link — they are arrow-reachable only, not separate tab stops).
  await page.keyboard.press("Tab");
  const focusInside = await bar.evaluate((root) =>
    root.contains(document.activeElement)
  );
  expect(focusInside).toBe(false);

  // Shift+Tab from the first item leaves backwards, too (single stop both ways).
  await bold.focus();
  await page.keyboard.press("Shift+Tab");
  const focusInsideAfterBack = await bar.evaluate((root) =>
    root.contains(document.activeElement)
  );
  expect(focusInsideAfterBack).toBe(false);
});

// ── b. arrow nav across groups/separators, with wrap-around ──────────────────
test("b: arrows move focus across groups and wrap at the ends", async ({
  page,
}) => {
  const bar = toolbar(page, "light", "Text formatting");
  const bold = bar.getByRole("button", { name: "Bold" });
  const italic = bar.getByRole("button", { name: "Italic" });
  const underline = bar.getByRole("button", { name: "Underline" });
  const alignLeft = bar.getByRole("button", { name: "Align left" });

  await bold.focus();
  await page.keyboard.press("ArrowRight");
  await expect(italic).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(underline).toBeFocused();
  // Crossing the separator into the next group with one more ArrowRight.
  await page.keyboard.press("ArrowRight");
  await expect(alignLeft).toBeFocused();

  // ArrowLeft steps back.
  await page.keyboard.press("ArrowLeft");
  await expect(underline).toBeFocused();

  // Wrap-around: from the first item, ArrowLeft lands on the LAST item (the
  // "Help" link — the terminal toolbar item), proving loopFocus.
  await bold.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(bar.getByRole("link", { name: "Help" })).toBeFocused();
});

// ── c. focus memory: re-entering the bar returns to the last-focused item ─────
test("c: tabbing back into the toolbar restores the last-focused item", async ({
  page,
}) => {
  const bar = toolbar(page, "light", "Text formatting");
  const bold = bar.getByRole("button", { name: "Bold" });
  const underline = bar.getByRole("button", { name: "Underline" });

  await bold.focus();
  await page.keyboard.press("ArrowRight"); // Italic
  await page.keyboard.press("ArrowRight"); // Underline (now the tab stop)
  await expect(underline).toBeFocused();

  // The roving tab stop moved onto Underline.
  await expect(underline).toHaveAttribute("tabindex", "0");
  await expect(bold).toHaveAttribute("tabindex", "-1");

  // Leave the toolbar, then Shift+Tab back in — focus returns to Underline.
  await page.keyboard.press("Tab");
  await expect(bar.locator(":focus")).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(underline).toBeFocused();
});

// ── d. disabled item is focusable + arrow-reachable (aria-disabled) ──────────
test("d: a disabled toolbar item is arrow-reachable and reports aria-disabled, not native disabled", async ({
  page,
}) => {
  const bar = toolbar(page, "light", "Document actions");
  const cut = bar.getByRole("button", { name: "Cut" });
  const paste = bar.getByRole("button", { name: "Paste" });

  // Base UI keeps a disabled item focusable: aria-disabled + data-disabled,
  // never the native attribute (which would drop it from the focus order).
  await expect(paste).toHaveAttribute("aria-disabled", "true");
  await expect(paste).toHaveAttribute("data-disabled", "");
  expect(await paste.evaluate((el) => el.hasAttribute("disabled"))).toBe(false);

  // Arrow keys still land on it: Cut → Copy → Paste.
  await cut.focus();
  await page.keyboard.press("ArrowRight"); // Copy
  await page.keyboard.press("ArrowRight"); // Paste (disabled, but focusable)
  await expect(paste).toBeFocused();
});

// ── e. vertical orientation: Down/Up navigate, Left/Right do not ─────────────
test("e: a vertical toolbar navigates on Arrow Down/Up and ignores Left/Right", async ({
  page,
}) => {
  const bar = toolbar(page, "light", "Vertical text formatting");
  await expect(bar).toHaveAttribute("data-orientation", "vertical");

  const bold = bar.getByRole("button", { name: "Bold" });
  const italic = bar.getByRole("button", { name: "Italic" });
  const alignLeft = bar.getByRole("button", { name: "Align left" });
  const alignCenter = bar.getByRole("button", { name: "Align center" });

  await bold.focus();
  // Left/Right are inert on the block axis — focus does not move.
  await page.keyboard.press("ArrowRight");
  await expect(bold).toBeFocused();

  // Down moves through the items, across the separator.
  await page.keyboard.press("ArrowDown");
  await expect(italic).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(alignLeft).toBeFocused();
  // The disabled "Align center" is still reachable by arrow.
  await page.keyboard.press("ArrowDown");
  await expect(alignCenter).toBeFocused();
  await expect(alignCenter).toHaveAttribute("aria-disabled", "true");

  await page.keyboard.press("ArrowUp");
  await expect(alignLeft).toBeFocused();
});

// ── f. a render={<Button/>}-composed item joins the roving sequence ──────────
test("f: a render-prop Button item participates in the roving tabindex", async ({
  page,
}) => {
  const bar = toolbar(page, "light", "Document actions");
  const publish = bar.getByRole("button", { name: "Publish" });

  // Composition caveat (finding 3): the OUTER ToolbarButton wins the merge — the
  // item keeps `data-slot="toolbar-button"` + `data-variant="ghost"` (its own
  // default), NOT the inner Button's default/sm. Documenting the reality.
  await expect(publish).toHaveAttribute("data-slot", "toolbar-button");
  await expect(publish).toHaveAttribute("data-variant", "ghost");

  // It is reachable by arrow keys from the first item and takes focus, so
  // composition did not opt it out of the composite. Cut → Copy → Paste →
  // Publish (Publish is the terminal item).
  await bar.getByRole("button", { name: "Cut" }).focus();
  await page.keyboard.press("ArrowRight"); // Copy
  await page.keyboard.press("ArrowRight"); // Paste
  await page.keyboard.press("ArrowRight"); // Publish
  await expect(publish).toBeFocused();
  await expect(publish).toHaveAttribute("tabindex", "0");

  // Wrap forward off the last item returns to the first (Cut).
  await page.keyboard.press("ArrowRight");
  await expect(bar.getByRole("button", { name: "Cut" })).toBeFocused();
});
