import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Command e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/command.test.tsx` covers what the Vitest/jsdom
 * environment can observe (the always-open inline list, the built-in filter,
 * roving highlight, per-item onClick on click and Enter-when-highlighted, the
 * dialog open/close, `data-*` hooks, axe). jsdom has no layout/paint engine, so
 * these were deferred here: computed highlight surfaces, the CommandDialog exit
 * animation unmount, pointer hover highlight, and — decisively — the INLINE
 * (non-portalled) dark theming that distinguishes Command from every portalled
 * overlay in the kit.
 *
 * ── Real-browser findings that correct the coverage-target assumptions ──
 * 1. **The standalone palette does NOT filter, and its `CommandEmpty` is ALWAYS
 *    visible.** Base UI's filter keys off the `items` PROP (combobox.tsx /
 *    command.tsx divergence 2), and the preview's standalone palette uses STATIC
 *    `CommandItem` children with NO `items` prop. Consequence: typing does not
 *    reduce the standalone option count, and because the items collection is
 *    always empty, `Autocomplete.Empty` treats the list as empty and permanently
 *    renders "No results found." beneath the visible items. So LIVE FILTERING and
 *    the Empty show/clear cycle are exercised on the `CommandDialog` (which passes
 *    `items={DIALOG_COMMANDS}`), not the standalone palette. This is a
 *    preview-page composition gap, not a component bug — a filtering palette must
 *    pass `items` + a render-function `CommandList` child.
 * 2. **`CommandEmpty`'s root is always mounted (block, ~py-6 tall) as a live
 *    region; only its TEXT toggles.** Even in the dialog, the empty element stays
 *    in the DOM with matches present — the "No results found." TEXT appears only
 *    on a genuinely empty result. So Empty assertions key on the visible TEXT
 *    (`getByText`), not the element's presence.
 * 3. **No observable Enter/click side effect exists on the preview items.** The
 *    preview's `CommandItem`s carry no `onClick` handler (uncontrolled demo), so
 *    "Enter fires the highlighted item" has nothing to observe. These specs assert
 *    the highlight moves and Enter is accepted without error, and document the
 *    gap: a handler-backed assertion lives in the jsdom unit test instead.
 * 3b. **Keyboard highlight only works where the engine has an `items` array.**
 *    The standalone preview palette uses STATIC children with no `items`, so its
 *    active-item model is empty — ArrowUp/Down do NOT highlight its rows (only
 *    pointer HOVER does, which is DOM-driven). So keyboard highlight + Enter are
 *    exercised on the CommandDialog (items-backed); hover highlight is asserted on
 *    the standalone. Another facet of finding 1.
 * 4. **Command themes INLINE — it is NOT portalled.** Unlike Select/Combobox/
 *    Dialog/Toast (whose popups portal to body and escape the `.dark` scope),
 *    `Command` renders its panel in place, so it genuinely inherits a `.dark`
 *    ancestor. The dark-mode test asserts the panel both computes the dark surface
 *    AND has a `.dark` ancestor (`closest('.dark')`), the opposite of the portal
 *    components' finding.
 */

const LIGHT_ACCENT = "rgb(240, 240, 240)"; // --accent   #f0f0f0
const DARK_POPOVER = "rgb(41, 41, 41)"; //    --popover  #292929 (dark)

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/command");
});

/** The standalone always-open palette's input. */
function standaloneInput(page: Page): Locator {
  return page
    .locator('[data-slot="command"]')
    .first()
    .getByRole("combobox");
}

/** Open the CommandDialog and return its dialog + input locators. */
async function openDialog(page: Page): Promise<{ dialog: Locator; input: Locator }> {
  await page.getByRole("button", { name: "Open Command Menu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return { dialog, input: dialog.getByRole("combobox") };
}

// ── the always-open list renders items on load, no popup ─────────────────────
test("the standalone palette renders its list open on load, with no trigger", async ({
  page,
}) => {
  const panel = page.locator('[data-slot="command"]').first();
  await expect(panel.getByRole("listbox")).toBeVisible();
  await expect(panel.getByRole("option")).toHaveCount(5);
});

// ── keyboard highlight moves with computed data-[highlighted] bg (dialog) ────
test("ArrowDown/Up move the highlight in the items-backed dialog, painting the accent background", async ({
  page,
}) => {
  const { dialog, input } = await openDialog(page);

  await input.press("ArrowDown"); // highlights the first item
  const highlighted = dialog.locator(
    '[data-slot="command-item"][data-highlighted]'
  );
  await expect(highlighted).toHaveText("New File");
  await expect(highlighted).toHaveCSS("background-color", LIGHT_ACCENT);

  await input.press("ArrowDown");
  await expect(highlighted).toHaveText("New Folder");

  await input.press("ArrowUp");
  await expect(highlighted).toHaveText("New File");
});

// ── Enter is accepted on the highlighted item (side-effect gap documented) ───
test("Enter on the highlighted dialog item is accepted (no observable handler on the demo — finding 3)", async ({
  page,
}) => {
  const { dialog, input } = await openDialog(page);
  await input.press("ArrowDown");
  const highlighted = dialog.locator(
    '[data-slot="command-item"][data-highlighted]'
  );
  await expect(highlighted).toHaveText("New File");

  // The preview items have no onClick, so nothing observable fires; assert Enter
  // is handled without error and the palette stays put. Handler firing is proven
  // in command.test.tsx (jsdom) with a spy.
  await input.press("Enter");
  await expect(input).toBeVisible();
  await expect(dialog.getByRole("option")).toHaveCount(6);
});

// ── pointer hover highlights + click is accepted ─────────────────────────────
test("pointer hover highlights an item; clicking it is accepted", async ({
  page,
}) => {
  const item = page
    .locator('[data-slot="command"]')
    .first()
    .getByRole("option", { name: /New Folder/ });
  await item.hover();
  await expect(item).toHaveAttribute("data-highlighted", "");

  // Click fires the item's onClick (none on the demo — finding 3) without error.
  await item.click();
  await expect(item).toBeVisible();
});

// ── live filtering on the dialog (finding 1) ─────────────────────────────────
test("typing in the dialog palette filters the list live", async ({ page }) => {
  const { dialog, input } = await openDialog(page);
  await expect(dialog.getByRole("option")).toHaveCount(6);

  await input.fill("Save");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await expect(dialog.getByRole("option", { name: "Save All" })).toBeVisible();

  await input.fill("Folder");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await expect(dialog.getByRole("option", { name: "New Folder" })).toBeVisible();
});

// ── Empty shows on garbage input and clears when the input clears (dialog) ────
test("the dialog Empty shows on a no-match query and clears when the input clears", async ({
  page,
}) => {
  const { dialog, input } = await openDialog(page);
  // With matches present, the "No results found." text is not shown (finding 2).
  await expect(dialog.getByText("No results found.")).toBeHidden();

  await input.fill("zzzzz");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await expect(dialog.getByText("No results found.")).toBeVisible();

  await input.fill("");
  await expect(dialog.getByRole("option")).toHaveCount(6);
  await expect(dialog.getByText("No results found.")).toBeHidden();
});

// ── the standalone palette's always-on Empty (documents finding 1) ───────────
test("the standalone palette shows a permanent Empty (static children, no items — finding 1)", async ({
  page,
}) => {
  const panel = page.locator('[data-slot="command"]').first();
  // Items render AND the empty text is shown at the same time — the standalone
  // palette has no `items` prop, so Base UI's filter treats the list as empty.
  await expect(panel.getByRole("option")).toHaveCount(5);
  await expect(panel.getByText("No results found.")).toBeVisible();

  // Typing does not filter static children (the count is unchanged).
  await standaloneInput(page).fill("Save");
  await expect(panel.getByRole("option")).toHaveCount(5);
});

// ── group headings + shortcuts are visible ───────────────────────────────────
test("group headings and keyboard-shortcut hints render visibly", async ({
  page,
}) => {
  const panel = page.locator('[data-slot="command"]').first();
  await expect(
    panel.locator('[data-slot="command-group-heading"]')
  ).toHaveText(["Files", "Preferences"]);
  await expect(
    panel.locator('[data-slot="command-shortcut"]')
  ).toHaveText(["⌘N", "⌘⇧N", "⌘,"]);
  await expect(
    panel.locator('[data-slot="command-shortcut"]').first()
  ).toBeVisible();
});

// ── CommandDialog: opens, auto-focuses the input, sr-only title present ───────
test("the dialog opens with the palette, auto-focuses the input, and carries an sr-only title", async ({
  page,
}) => {
  const { dialog, input } = await openDialog(page);

  await expect(dialog.getByRole("option")).toHaveCount(6);
  // Base UI moves initial focus onto the command input.
  await expect(input).toBeFocused();

  // The accessible name is present but visually hidden.
  const title = dialog.locator('[data-slot="dialog-title"]');
  await expect(title).toHaveText("Command Palette");
  await expect(
    title.locator('xpath=ancestor::*[@data-slot="dialog-header"]')
  ).toHaveClass(/sr-only/);
});

// ── CommandDialog: Escape closes and the dialog unmounts (exit completes) ─────
test("Escape closes the dialog and it leaves the a11y tree after the exit", async ({
  page,
}) => {
  await openDialog(page);
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open Command Menu" })
  ).toBeVisible();
});

// ── dark mode: Command themes INLINE, not via a portal (finding 4) ───────────
test("under the root dark theme the inline panel uses the dark surface and keeps its .dark ancestor", async ({
  page,
}) => {
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const panel = page.locator('[data-slot="command"]').first();

  await expect(panel).toHaveCSS("background-color", DARK_POPOVER);
  // Unlike the portalled overlays, Command renders in place, so it genuinely has
  // a `.dark` ancestor (it did not escape to a body-level portal).
  const hasDarkAncestor = await panel.evaluate((el) => !!el.closest(".dark"));
  expect(hasDarkAncestor).toBe(true);
});
