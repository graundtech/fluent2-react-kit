import { expect, test } from "@playwright/test";

/**
 * Home page smoke — the demo renders and its theme toggle works and persists.
 * A thin guardrail so a broken build/deploy surfaces before the deeper Select
 * suite even runs.
 */

test("home page renders the hero and every component preview link", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Fluent 2 React Kit/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Fluent 2 React Kit" })
  ).toBeVisible();

  // The component grid links to all 21 /preview/<name> routes. (Scoped to the
  // grid so the "Compare plans" inline link elsewhere on the page isn't counted.)
  const grid = page.locator('section[aria-labelledby="previews-heading"]');
  await expect(grid.locator('a[href^="/preview/"]')).toHaveCount(21);
  await expect(grid.getByRole("link", { name: "select" })).toHaveAttribute(
    "href",
    "/preview/select"
  );
});

test("the theme radiogroup switches to dark and persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  const main = page.locator("main");

  // Light by default: no theme class, white canvas.
  await expect(html).not.toHaveClass(/dark/);
  await expect(main).toHaveCSS("background-color", "rgb(255, 255, 255)");

  const group = page.getByRole("radiogroup", { name: "Theme" });
  await group.getByRole("radio", { name: "Dark" }).click();

  // Dark applied: html gains `dark`, the radio is checked, canvas darkens.
  await expect(html).toHaveClass(/dark/);
  await expect(group.getByRole("radio", { name: "Dark" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(main).toHaveCSS("background-color", "rgb(36, 36, 36)");

  // Persisted (localStorage + pre-hydration script) across a full reload.
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await expect(
    page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", {
      name: "Dark",
    })
  ).toHaveAttribute("aria-checked", "true");
  await expect(main).toHaveCSS("background-color", "rgb(36, 36, 36)");
});
