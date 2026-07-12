import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Structural sanity checks for the distributable token stylesheet.
 *
 * We read tokens.css as plain text (no CSS parser) and assert the invariants a
 * consumer relies on: the shadcn core variable contract exists under `:root`,
 * dark mode re-points the core surfaces, and the Tailwind bridge + both
 * high-contrast mechanisms are present. String/regex checks keep this test free
 * of CSS-parsing dependencies.
 */
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "tokens.css"),
  "utf8"
);

/**
 * Extract the body of the first top-level rule whose selector list starts with
 * `selector` (no nested braces). The optional `(?:\s*,\s*[.:#\w-]+)*` tolerates
 * a grouped selector list — e.g. the light theme block is `:root, .light { … }`
 * — without matching a bare `.dark ` inside an `@custom-variant` (there `.dark`
 * is followed by `(`, not `,`/`{`).
 */
function firstBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(
    new RegExp(`${escaped}(?:\\s*,\\s*[.:#\\w-]+)*\\s*\\{([^}]*)\\}`)
  );
  const body = match?.[1];
  if (body == null) throw new Error(`No block found for selector "${selector}"`);
  return body;
}

const SHADCN_CORE_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--popover",
  "--primary",
  "--secondary",
  "--muted",
  "--accent",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--radius"
] as const;

describe("tokens.css structure", () => {
  const rootBlock = firstBlock(":root");
  const darkBlock = firstBlock(".dark");

  it("defines every shadcn core variable under :root", () => {
    for (const name of SHADCN_CORE_VARS) {
      expect(rootBlock, `:root is missing ${name}`).toContain(`${name}:`);
    }
  });

  it("overrides the core surface/foreground variables under .dark", () => {
    for (const name of [
      "--background",
      "--foreground",
      "--card",
      "--card-foreground",
      "--popover",
      "--popover-foreground",
      "--primary",
      "--border",
      "--input",
      "--ring"
    ]) {
      expect(darkBlock, `.dark is missing override for ${name}`).toContain(
        `${name}:`
      );
    }
  });

  it("uses HEX authoring for the brand primary (light) and re-points it in dark", () => {
    expect(rootBlock).toContain("--primary: #0f6cbd");
    expect(darkBlock).toContain("--primary: #115ea3");
  });

  it("exposes the full brand ramp (--brand-10 … --brand-160)", () => {
    expect(rootBlock).toContain("--brand-10:");
    expect(rootBlock).toContain("--brand-80: #0f6cbd");
    expect(rootBlock).toContain("--brand-160:");
  });

  it("includes the Tailwind v4 bridge", () => {
    expect(css).toContain("@theme inline");
    expect(css).toContain("--color-primary: var(--primary)");
  });

  it("ships both high-contrast mechanisms", () => {
    expect(css).toContain("forced-colors: active");
    expect(css).toContain(".high-contrast");
  });

  it("remaps the status-extension tokens Alert consumes under .high-contrast", () => {
    // The core set is covered above; these are the status extensions Alert's
    // destructive/success/warning variants paint with. Subtle fills collapse
    // to Canvas, borders + AA-safe text tokens to CanvasText.
    const hcBlock = firstBlock(".high-contrast");
    for (const surface of [
      "--destructive-subtle",
      "--success-subtle",
      "--warning-subtle"
    ]) {
      expect(hcBlock, `.high-contrast missing ${surface}`).toContain(
        `${surface}: Canvas;`
      );
    }
    for (const inked of [
      "--destructive-border",
      "--success-border",
      "--warning-border",
      "--destructive-text",
      "--warning-text"
    ]) {
      expect(hcBlock, `.high-contrast missing ${inked}`).toContain(
        `${inked}: CanvasText;`
      );
    }
  });

  it("remaps the brand stops Alert's info variant + Avatar's fallback consume under .high-contrast", () => {
    // Info Alert / Avatar tint with the raw brand ramp, so the consumed stops
    // must be system-colored here too. Surfaces -> Canvas; text + border ->
    // CanvasText. The dual-role stops --brand-70/--brand-140 (Avatar initials
    // text AND Alert-info border) must be CanvasText, not Canvas, or Avatar's
    // initials would vanish against their own fallback background.
    const hcBlock = firstBlock(".high-contrast");
    for (const surface of ["--brand-160", "--brand-30", "--brand-40"]) {
      expect(hcBlock, `.high-contrast missing ${surface}`).toContain(
        `${surface}: Canvas;`
      );
    }
    for (const ink of [
      "--brand-70",
      "--brand-80",
      "--brand-100",
      "--brand-140"
    ]) {
      expect(hcBlock, `.high-contrast missing ${ink}`).toContain(
        `${ink}: CanvasText;`
      );
    }
  });

  it("defines the accessible-stroke ramp under :root and re-points it in dark", () => {
    for (const name of [
      "--stroke-accessible",
      "--stroke-accessible-hover",
      "--stroke-accessible-pressed"
    ]) {
      expect(rootBlock, `:root is missing ${name}`).toContain(`${name}:`);
      expect(darkBlock, `.dark is missing ${name}`).toContain(`${name}:`);
    }
    expect(rootBlock).toContain("--stroke-accessible: #616161");
    expect(darkBlock).toContain("--stroke-accessible: #adadad");
  });

  it("defines the badge-warning token pair (bright-orange chip, dark static text)", () => {
    expect(rootBlock).toContain("--warning-badge: #f7630c");
    expect(rootBlock).toContain("--warning-badge-foreground: #242424");
  });

  it("bridges the new stroke/badge tokens through the Tailwind @theme layer", () => {
    for (const name of [
      "--color-stroke-accessible",
      "--color-stroke-accessible-hover",
      "--color-stroke-accessible-pressed",
      "--color-warning-badge",
      "--color-warning-badge-foreground"
    ]) {
      expect(css, `@theme is missing ${name}`).toContain(`${name}:`);
    }
  });

  it("remaps the accessible-stroke ramp to CanvasText under .high-contrast", () => {
    const hcBlock = firstBlock(".high-contrast");
    for (const name of [
      "--stroke-accessible",
      "--stroke-accessible-hover",
      "--stroke-accessible-pressed"
    ]) {
      expect(hcBlock, `.high-contrast missing ${name}`).toContain(
        `${name}: CanvasText;`
      );
    }
    expect(hcBlock).toContain("--warning-badge: Canvas;");
    expect(hcBlock).toContain("--warning-badge-foreground: CanvasText;");
  });

  it("declares the radius base and derived scale", () => {
    expect(rootBlock).toContain("--radius: 6px");
    expect(css).toContain("--radius-md: calc(var(--radius) - 2px)");
  });

  it("re-scopes light mode onto a .light class grouped with :root", () => {
    // Fix: `.light` lets a consumer force light inside a `.dark` ancestor,
    // sharing the `:root` declarations with zero duplication.
    expect(css).toMatch(/:root,\s*\.light\s*\{/);
  });

  it("sets color-scheme so native UA chrome tracks the theme", () => {
    // Fix: form controls / scrollbars follow `color-scheme` per theme.
    expect(rootBlock).toContain("color-scheme: light");
    expect(darkBlock).toContain("color-scheme: dark");
  });
});
