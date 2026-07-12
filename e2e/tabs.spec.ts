import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Tabs e2e — the interaction paths jsdom cannot reach.
 *
 * `packages/react/src/components/ui/tabs.test.tsx` covers everything the
 * Vitest/jsdom environment can observe (roving focus, arrow-key navigation,
 * manual activation, `data-active` state, panel switching, axe). jsdom has no
 * layout or paint engine, so `Tabs.Indicator` — which measures the active tab's
 * `getBoundingClientRect`/`offsetLeft` to drive its position — always reads `0`
 * and stays `hidden` there (see divergence 3 in tabs.tsx). The sliding-underline
 * motion is therefore only verifiable in a real browser and was deferred here:
 *   a. the 2px `bg-primary` indicator painted under the active tab, positioned
 *      from real `--active-tab-left`/`--active-tab-width` values
 *   b. clicking another tab MOVES the indicator to align with the new tab
 *   c. `transition-[left,width]` wired so the move animates (not a snap)
 *   d. manual activation (divergence 4): ArrowRight moves focus WITHOUT
 *      selecting; Enter/Space then commits
 *   e. the inactive panel leaving the a11y tree while the active one shows
 *   f. the dark-panel indicator surface computing to the dark brand token
 *
 * ── Real-browser findings that refine the component wording ──
 * 1. **The `--active-tab-*` CSS vars live INLINE on the indicator `<span>`
 *    itself, not on the `TabsList`.** Base UI's `Tabs.Indicator` writes
 *    `--active-tab-left`/`--active-tab-width` (plus `-right`/`-top`/`-bottom`/
 *    `-height`) as inline custom properties on the indicator element it renders,
 *    and the wrapper positions the span with
 *    `left-[var(--active-tab-left)] w-[var(--active-tab-width)]`. So the vars are
 *    read off the indicator element (getComputedStyle of the *list* returns
 *    empty). For the first/active tab, `--active-tab-left` is `0px` (the list is
 *    `position: relative` and the first tab sits at its left edge), while
 *    `--active-tab-width` is the real measured tab width (~87px).
 * 2. **Manual activation is the shipped default (divergence 4).** ArrowRight
 *    moves roving focus to the next tab but does NOT select it — `data-active`
 *    and `aria-selected` stay on the previously active tab until Enter/Space (or
 *    a click). (d) asserts that WAI-ARIA "manual activation" behavior directly,
 *    the opposite of Radix/shadcn's activate-on-arrow default.
 * 3. **Tabs render INLINE — there is no portal, so the `.dark` PreviewPanel
 *    genuinely dark-themes the indicator.** Unlike Select/Toast (whose popups
 *    portal to `document.body` and escape the panel's `.dark` scope), every Tabs
 *    part stays inside its panel's DOM subtree. So the "Dark" panel's indicator
 *    computes `bg-primary` from the dark token (`--primary` = brand-70,
 *    `rgb(17, 94, 163)`) with no root-theme trick needed — (f) asserts that on
 *    the shipped dark panel directly.
 */

const LIGHT_PRIMARY = "rgb(15, 108, 189)"; // --primary / brand-80 (light)  #0f6cbd
const DARK_PRIMARY = "rgb(17, 94, 163)"; //   --primary / brand-70 (dark)   #115ea3

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/tabs");
});

/** The Light panel — every example repeats in the Dark panel, so scope to one. */
function themePanel(page: Page, theme: "light" | "dark"): Locator {
  return page.locator(`section.${theme}`);
}

/**
 * The "Basic" tabs list in a given panel, addressed by its exact `aria-label`
 * ("Project sections" — the disabled example is "Project sections (one
 * disabled)", so the equality attribute selector never collides).
 */
function basicList(page: Page, theme: "light" | "dark"): Locator {
  return themePanel(page, theme).locator(
    '[data-slot="tabs-list"][aria-label="Project sections"]'
  );
}

/** Read a CSS custom property off an element's computed style. */
function cssVar(el: Locator, name: string): Promise<string> {
  return el.evaluate(
    (node, prop) => getComputedStyle(node).getPropertyValue(prop).trim(),
    name
  );
}

// ── a. the indicator is a 2px brand bar under the active tab ──────────────────
test("a: the indicator paints a 2px brand bar aligned under the active tab", async ({
  page,
}) => {
  const list = basicList(page, "light");
  const indicator = list.locator('[data-slot="tabs-indicator"]');
  const activeTab = list.getByRole("tab", { name: "Overview" });

  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveCSS("background-color", LIGHT_PRIMARY);
  await expect(indicator).toHaveCSS("height", "2px");

  // Real measured position vars, written inline on the indicator element.
  expect(await cssVar(indicator, "--active-tab-left")).toBe("0px"); // first tab
  const width = await cssVar(indicator, "--active-tab-width");
  expect(parseFloat(width)).toBeGreaterThan(0);

  // The painted bar lines up horizontally with the active tab.
  const bar = await indicator.boundingBox();
  const tab = await activeTab.boundingBox();
  if (!bar || !tab) throw new Error("missing bounding boxes");
  expect(Math.abs(bar.x - tab.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(bar.width - tab.width)).toBeLessThanOrEqual(2);
});

// ── b + c. clicking another tab MOVES the indicator (animated) + switches panel
test("b+c: clicking another tab slides the indicator to it and switches the panel", async ({
  page,
}) => {
  const list = basicList(page, "light");
  const indicator = list.locator('[data-slot="tabs-indicator"]');

  // The move is wired to animate `left` and `width` (not snap).
  await expect(indicator).toHaveCSS("transition-property", "left, width");
  await expect(indicator).toHaveCSS("transition-duration", "0.2s");

  const overviewBar = await indicator.boundingBox();
  if (!overviewBar) throw new Error("missing indicator box");

  await list.getByRole("tab", { name: "Activity" }).click();

  // The Activity tab is now the active/selected one.
  await expect(list.getByRole("tab", { name: "Activity" })).toHaveAttribute(
    "data-active",
    ""
  );

  // The indicator settled onto the Activity tab: its box shifts right and lands
  // aligned with Activity. Poll the alignment so the assertion waits through the
  // ~200ms slide transition rather than reading a mid-flight frame.
  const activityTab = await list
    .getByRole("tab", { name: "Activity" })
    .boundingBox();
  if (!activityTab) throw new Error("missing tab box");
  await expect
    .poll(async () => {
      const b = await indicator.boundingBox();
      return b ? Math.abs(b.x - activityTab.x) : 999;
    })
    .toBeLessThanOrEqual(2);
  await expect
    .poll(async () => {
      const b = await indicator.boundingBox();
      return b ? Math.abs(b.width - activityTab.width) : 999;
    })
    .toBeLessThanOrEqual(2);
  // And it genuinely moved rightward off the Overview position (not a no-op).
  const movedBar = await indicator.boundingBox();
  if (!movedBar) throw new Error("missing indicator box");
  expect(movedBar.x).toBeGreaterThan(overviewBar.x + 10);

  // The panel content switched to the Activity panel.
  await expect(
    themePanel(page, "light").getByText(
      "A chronological feed of comments, commits, and status changes."
    )
  ).toBeVisible();
});

// ── d. manual activation: ArrowRight moves focus without selecting ────────────
test("d: ArrowRight moves focus without selecting; Enter then commits (manual activation)", async ({
  page,
}) => {
  const list = basicList(page, "light");
  const overview = list.getByRole("tab", { name: "Overview" });
  const activity = list.getByRole("tab", { name: "Activity" });

  await overview.focus();
  await page.keyboard.press("ArrowRight");

  // Roving focus landed on Activity, but selection did NOT follow it:
  // Overview is still the active/selected tab (divergence 4).
  await expect(activity).toBeFocused();
  await expect(overview).toHaveAttribute("data-active", "");
  await expect(activity).not.toHaveAttribute("data-active", "");
  await expect(
    list.getByRole("tab", { selected: true })
  ).toHaveAccessibleName("Overview");

  // Enter commits the focused tab.
  await page.keyboard.press("Enter");
  await expect(activity).toHaveAttribute("data-active", "");
  await expect(
    list.getByRole("tab", { selected: true })
  ).toHaveAccessibleName("Activity");
});

// ── e. inactive panels leave the a11y tree; the active one is shown ───────────
test("e: only the active tab's panel is in the accessibility tree", async ({
  page,
}) => {
  const panel = themePanel(page, "light");
  // Base UI's Tabs.Panel hides inactive panels; exactly one tabpanel shows per
  // Tabs group. The Overview panel is visible at rest; the others are hidden.
  await expect(
    panel.getByText(
      "A summary of the project: status, owners, and recent milestones."
    )
  ).toBeVisible();
  await expect(
    panel.getByText(
      "A chronological feed of comments, commits, and status changes."
    )
  ).toBeHidden();
});

// ── f. the dark panel's indicator uses the dark brand token (no portal) ───────
test("f: the dark panel indicator computes the dark brand token", async ({
  page,
}) => {
  // Tabs render inline (no portal), so the `.dark` PreviewPanel genuinely
  // dark-themes the indicator — bg-primary resolves to the dark --primary.
  const indicator = basicList(page, "dark").locator(
    '[data-slot="tabs-indicator"]'
  );
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveCSS("background-color", DARK_PRIMARY);
});
