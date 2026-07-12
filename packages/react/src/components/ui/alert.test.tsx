import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle, alertVariants } from "./alert";

/**
 * Note on the axe / color-contrast checks below: `packages/react/vitest.config.ts`
 * runs with `css: false`, so none of the Tailwind utility classes asserted in
 * this file are ever compiled to real CSS inside jsdom — elements render with
 * no computed background/foreground colors at all. axe-core's `color-contrast`
 * rule can only fail on colors it can actually read from computed styles; with
 * nothing computed, it reports the check as "incomplete" rather than a
 * violation, so `toHaveNoAxeViolations()` cannot catch a real contrast
 * regression in this suite. The manual sRGB contrast math against the token
 * hex values in `tokens.css` (see the doc comment in `alert.tsx`) is the real
 * verification for the status-extension tokens; the axe calls here still
 * cover every other rule (landmark/region-free markup, redundant alt text,
 * aria-* validity, etc.) for every variant.
 */

function DummyIcon(props: { "data-testid"?: string }) {
  return (
    <svg data-testid={props["data-testid"]} aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
    </svg>
  );
}

const VARIANTS = [
  ["default", "bg-card"],
  ["destructive", "bg-destructive-subtle"],
  ["success", "bg-success-subtle"],
  ["warning", "bg-warning-subtle"],
  ["info", "bg-brand-160"],
] as const;

describe("Alert", () => {
  it("renders as a div with role=alert and the alert data-slot hook", () => {
    render(<Alert>Heads up</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.tagName).toBe("DIV");
    expect(alert).toHaveAttribute("data-slot", "alert");
  });

  it("applies role=alert by default but lets a consumer override it (role=status wins)", () => {
    // role="alert" is a default placed before the {...props} spread, so a
    // passed role wins — assertive default for urgent messages, role="status"
    // (polite) for non-urgent success/info updates. See alert.tsx doc comment.
    const { rerender } = render(<Alert>Default</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<Alert role="status">Polite</Alert>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("defaults to the default variant", () => {
    render(<Alert>Default</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-card");
    expect(alert).toHaveAttribute("data-variant", "default");
  });

  // --- variants: each produces its distinguishing class + data-variant hook --
  it.each(VARIANTS)("variant=%s applies %s", (variant, signature) => {
    render(<Alert variant={variant}>Message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass(signature);
    expect(alert).toHaveAttribute("data-variant", variant);
  });

  // --- destructive variant accents with the AA-safe --destructive-text token,
  // not the raw --destructive fill (which fails AA in dark mode against
  // --destructive-subtle — see the doc comment in alert.tsx) --------------------
  it("variant=destructive accents icon/title with text-destructive-text, not text-destructive", () => {
    render(<Alert variant="destructive">Message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("[&>svg]:text-destructive-text");
    expect(alert).toHaveClass("*:data-[slot=alert-title]:text-destructive-text");
    // Regression guard: these are the pre-fix (AA-failing in dark mode) tokens.
    expect(alert).not.toHaveClass("[&>svg]:text-destructive");
    expect(alert).not.toHaveClass("*:data-[slot=alert-title]:text-destructive");
  });

  // --- composition: icon + title + description, all data-slots present ------
  it("renders a full composition (icon + title + description) with every data-slot", () => {
    render(
      <Alert variant="destructive">
        <DummyIcon data-testid="icon" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>Your changes were not saved.</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toHaveAttribute(
      "data-slot",
      "alert-title"
    );
    expect(screen.getByText("Your changes were not saved.")).toHaveAttribute(
      "data-slot",
      "alert-description"
    );
  });

  it("renders title-only compositions (no description) without error", () => {
    render(
      <Alert variant="success">
        <DummyIcon />
        <AlertTitle>Saved</AlertTitle>
      </Alert>
    );
    expect(screen.getByText("Saved")).toHaveAttribute(
      "data-slot",
      "alert-title"
    );
  });

  // --- className merge on every part ------------------------------------------
  it("merges a caller-provided className on Alert without dropping variant classes", () => {
    render(
      <Alert variant="warning" className="mt-4 custom-x">
        Merged
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("mt-4", "custom-x", "bg-warning-subtle");
  });

  it("merges a caller-provided className on AlertTitle", () => {
    render(<AlertTitle className="custom-title">Title</AlertTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("custom-title", "font-semibold");
    expect(title).toHaveAttribute("data-slot", "alert-title");
  });

  it("merges a caller-provided className on AlertDescription", () => {
    render(
      <AlertDescription className="custom-desc">Description</AlertDescription>
    );
    const description = screen.getByText("Description");
    expect(description).toHaveClass("custom-desc", "text-muted-foreground");
    expect(description).toHaveAttribute("data-slot", "alert-description");
  });

  // --- ref forwarding ----------------------------------------------------------
  it("forwards a ref to the underlying Alert div (React 19 ref-as-prop)", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Alert
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Alert>
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  // --- alertVariants export -----------------------------------------------------
  it("exports alertVariants returning a class string", () => {
    const classes = alertVariants({ variant: "info" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("bg-brand-160");
  });

  // --- accessibility ----------------------------------------------------------
  it("has no axe violations (default, no icon)", async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>A neutral message.</AlertDescription>
      </Alert>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it.each(VARIANTS)(
    "has no axe violations (variant=%s, full composition)",
    async (variant) => {
      const { container } = render(
        <Alert variant={variant}>
          <DummyIcon />
          <AlertTitle>Alert title</AlertTitle>
          <AlertDescription>Alert description copy.</AlertDescription>
        </Alert>
      );
      await expect(container).toHaveNoAxeViolations();
    }
  );
});
