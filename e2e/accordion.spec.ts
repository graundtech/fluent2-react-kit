import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Accordion e2e — the interaction paths jsdom cannot reach, and the
 * close-completion question the integration pass flagged.
 *
 * `packages/react/src/components/ui/accordion.test.tsx` covers everything the
 * Vitest/jsdom environment can observe (open/close state, `aria-expanded`,
 * region labelling, single/multiple modes, non-roving keyboard, disabled,
 * axe). jsdom has no layout/paint engine, so the height animation, the
 * `--accordion-panel-height` measurement, the chevron rotation transform, and —
 * critically — the *completion* of the close (which is rAF-gated in Base UI)
 * are only observable in a real browser and were deferred here.
 *
 * ── HEADLINE: the "closed panel stays visible" report is a PANE ARTIFACT, not
 *    a component bug. ──
 * During integration an in-app browser pane with a suspended/throttled renderer
 * showed a panel that had gone `aria-expanded="false"` still occupying full
 * height. Base UI's Accordion runs the exit sequence (apply the ending-style,
 * then unmount) across `requestAnimationFrame` ticks; when the pane throttles
 * rAF (backgrounded/suspended renderer) those ticks never fire, so the panel is
 * frozen mid-close and never unmounts. Reproduced while authoring these specs:
 * in the throttled pane a rAF sampler timed out and the closed panel sat at its
 * full 276px indefinitely. In a healthy, foregrounded browser (this Playwright
 * Chromium) the exit completes and the panel LEAVES THE DOM — which
 * `test "close-completion"` proves. A green run here IS the verdict: pane
 * artifact, component correct.
 *
 * ── Real-browser findings that refine the component wording ──
 * 1. **The Accordion UNMOUNTS closed panels — it does NOT hide-not-unmount.**
 *    This is the deliberate opposite of the Select/Dialog popup pattern (whose
 *    content stays mounted and goes `display:none`, so those specs forbid
 *    `toHaveCount(0)`). Base UI's `Accordion.Panel` defaults `keepMounted`
 *    false: a closed item renders NO panel element at all (verified — the two
 *    default-closed FAQ panels are absent from the DOM and their triggers have
 *    `aria-controls: null`). So here `toHaveCount(0)` is the *correct*
 *    close-completion assertion, and the closed trigger's `aria-controls`
 *    dropping to null is the a11y-tree signal.
 * 2. **`--accordion-panel-height` settles to `auto` when fully open**, not a
 *    pixel value — Base UI writes a measured pixel value only WHILE the height
 *    transition is running (so it can animate `0 → Npx` / `Npx → 0`) and then
 *    relaxes to `auto` at rest. The "real pixel value" is therefore sampled
 *    mid-transition (`test "height-animates"`), not read at the settled state.
 * 3. **The panel transition is `height 0.2s cubic-bezier(0, 0, 0, 1)`**
 *    (duration-normal / ease-decelerate-mid entering), animating the `height`
 *    property directly — the mid-transition height sits strictly between 0 and
 *    the measured full height, proving a real tween rather than a snap.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/accordion");
});

/** The Light panel — every example repeats in the Dark panel, so scope to one. */
function lightPanel(page: Page): Locator {
  return page.locator("section.light");
}

/** The single-mode FAQ accordion (the first of the panel's three accordions). */
function faqAccordion(page: Page): Locator {
  return lightPanel(page).locator('[data-slot="accordion"]').first();
}

/** An accordion item scoped by its trigger's accessible name. */
function item(scope: Locator, triggerName: RegExp): Locator {
  return scope.locator('[data-slot="accordion-item"]', {
    has: scope.page().getByRole("button", { name: triggerName }),
  });
}

// ── HEADLINE: the close actually completes (panel unmounts) in a healthy browser
test("close-completion: clicking an open trigger closed unmounts its panel", async ({
  page,
}) => {
  const faq = faqAccordion(page);
  const accessible = item(faq, /Is this component accessible\?/);
  const trigger = accessible.getByRole("button", { name: /accessible/ });
  const panel = accessible.locator('[data-slot="accordion-content"]');

  // faq-1 is open by default.
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();

  await trigger.click();

  // The exact thing the pane could not do: the exit sequence completes and the
  // panel leaves the DOM (Base UI unmounts closed panels — finding 1). This is
  // where the throttled pane froze the panel at full height forever; in a
  // healthy browser it resolves well within the exit transition.
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveCount(0);
  // The a11y-tree signal: the trigger no longer points at a rendered region.
  await expect(trigger).not.toHaveAttribute("aria-controls", /.+/);
});

// ── the open height actually animates (not a snap) + real px measurement var ──
test("height-animates: opening a panel tweens its height through intermediate px", async ({
  page,
}) => {
  // Open a default-closed panel while a rAF sampler records the panel's
  // bounding-box height and `--accordion-panel-height` every frame. In a real
  // browser rAF runs, so we capture the `0 → full` tween.
  const sampled = await lightPanel(page).evaluate(
    (root) =>
      new Promise<{ heights: number[]; vars: string[] }>((resolve) => {
        const acc = root.querySelector('[data-slot="accordion"]');
        if (!acc) return resolve({ heights: [], vars: [] });
        const items = [
          ...acc.querySelectorAll('[data-slot="accordion-item"]'),
        ] as HTMLElement[];
        const it = items.find((el) =>
          el
            .querySelector('[data-slot="accordion-trigger"]')
            ?.textContent?.includes("Is it styled")
        );
        if (!it) return resolve({ heights: [], vars: [] });
        const trigger = it.querySelector(
          '[data-slot="accordion-trigger"]'
        ) as HTMLElement;

        const heights: number[] = [];
        const vars: string[] = [];
        trigger.click(); // open
        const start = performance.now();
        function frame() {
          const p = it!.querySelector('[data-slot="accordion-content"]');
          if (p) {
            heights.push(
              Math.round(p.getBoundingClientRect().height * 100) / 100
            );
            vars.push(
              getComputedStyle(p)
                .getPropertyValue("--accordion-panel-height")
                .trim()
            );
          }
          if (performance.now() - start < 500) requestAnimationFrame(frame);
          else resolve({ heights, vars });
        }
        requestAnimationFrame(frame);
      })
  );

  const max = Math.max(...sampled.heights);
  expect(max).toBeGreaterThan(20); // the panel opened to a real height
  // A real tween: at least one sampled frame sits strictly between 0 and full.
  const intermediate = sampled.heights.some((h) => h > 2 && h < max - 2);
  expect(intermediate).toBe(true);
  // And Base UI wrote a real pixel measurement into --accordion-panel-height
  // during the transition (finding 2 — it relaxes to `auto` only at rest).
  expect(sampled.vars.some((v) => /^\d+(\.\d+)?px$/.test(v))).toBe(true);
});

// ── the panel transition is height-based (the wiring behind the tween) ────────
test("the open panel carries the height transition", async ({ page }) => {
  const faq = faqAccordion(page);
  const panel = item(faq, /Is this component accessible\?/).locator(
    '[data-slot="accordion-content"]'
  );
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("transition-property", "height");
  await expect(panel).toHaveCSS("transition-duration", "0.2s");
});

// ── the chevron rotates 180° when its panel is open ───────────────────────────
test("the chevron rotates when the panel is open and rests flat when closed", async ({
  page,
}) => {
  const faq = faqAccordion(page);
  const openChevron = item(faq, /Is this component accessible\?/).locator("svg");
  const closedChevron = item(faq, /Is it styled\?/).locator("svg");

  // Real-browser finding: Tailwind v4 compiles `rotate-180` to the INDEPENDENT
  // CSS `rotate` property (`rotate: 180deg`), not the `transform` matrix — same
  // class of Tailwind-v4 property split dialog.spec documents for `scale`. So
  // `transform` stays `none` on the chevron and the rotation reads off `rotate`.
  await expect(openChevron).toHaveCSS("rotate", "180deg");
  await expect(openChevron).toHaveCSS("transform", "none");
  await expect(closedChevron).toHaveCSS("rotate", "none");
});

// ── single mode: opening one item closes the previously open one ──────────────
test("single mode: opening a second item closes the first (mutual exclusion)", async ({
  page,
}) => {
  const faq = faqAccordion(page);
  const firstPanel = item(faq, /Is this component accessible\?/).locator(
    '[data-slot="accordion-content"]'
  );
  const styledTrigger = item(faq, /Is it styled\?/).getByRole("button");
  const styledPanel = item(faq, /Is it styled\?/).locator(
    '[data-slot="accordion-content"]'
  );

  await expect(firstPanel).toBeVisible();
  await styledTrigger.click();

  await expect(styledPanel).toBeVisible();
  await expect(firstPanel).toHaveCount(0); // the first item closed (unmounted)
});

// ── multiple mode: items open independently ───────────────────────────────────
test("multiple mode: opening a third item keeps the others open", async ({
  page,
}) => {
  // The second accordion is `multiple` with two items open by default.
  const multi = lightPanel(page).locator('[data-slot="accordion"]').nth(1);
  const panels = multi.locator('[data-slot="accordion-content"]');
  await expect(panels).toHaveCount(2);

  await item(multi, /Third section/)
    .getByRole("button")
    .click();

  // All three are now open at once — none closed when the third opened.
  await expect(panels).toHaveCount(3);
});

// ── keyboard: Enter and Space toggle the focused trigger ──────────────────────
test("keyboard: Enter opens the focused trigger and Space closes it", async ({
  page,
}) => {
  const faq = faqAccordion(page);
  const styled = item(faq, /Is it styled\?/);
  const trigger = styled.getByRole("button");
  const panel = styled.locator('[data-slot="accordion-content"]');

  await trigger.focus();
  await expect(panel).toHaveCount(0); // closed by default

  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Space");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
