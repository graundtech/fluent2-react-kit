import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  it("renders its children as a span with the badge data-slot hook", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-slot", "badge");
  });

  it("defaults to the default variant", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toHaveClass("bg-primary");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  // --- variants: each produces its distinguishing class + data-variant hook ---
  it.each([
    ["default", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["destructive", "bg-destructive"],
    ["outline", "bg-transparent"],
    ["success", "bg-success"],
    ["warning", "bg-warning-badge"],
  ] as const)("variant=%s applies %s", (variant, signature) => {
    render(<Badge variant={variant}>B</Badge>);
    const badge = screen.getByText("B");
    expect(badge).toHaveClass(signature);
    expect(badge).toHaveAttribute("data-variant", variant);
  });

  // --- geometry: Fluent 4px chip, 4px padding, 10px caption-2 -----------------
  it("uses the Fluent 4px-chip geometry (rounded-md, px-1, 10px caption-2), not a pill", () => {
    render(<Badge>Chip</Badge>);
    const badge = screen.getByText("Chip");
    expect(badge).toHaveClass("rounded-md", "px-1", "h-5");
    // 10px/14px Caption 2 Strong — arbitrary length is twMerge-safe (see badge.tsx)
    expect(badge.className).toContain("text-[10px]/[14px]");
    expect(badge.className).not.toContain("rounded-full");
    expect(badge.className).not.toContain("text-xs");
  });

  // --- warning polarity: bright-orange chip + dark static text ----------------
  it("gives the warning variant the dedicated bright-orange/dark-text token pair", () => {
    render(<Badge variant="warning">Warn</Badge>);
    const badge = screen.getByText("Warn");
    expect(badge).toHaveClass("bg-warning-badge", "text-warning-badge-foreground");
    // not the darkOrange fill + white text that --warning would give
    expect(badge.className).not.toContain("bg-warning ");
    expect(badge.className).not.toContain("text-warning-foreground");
  });

  it("merges a caller-provided className without dropping variant classes", () => {
    render(
      <Badge variant="secondary" className="mt-2 custom-x">
        Merged
      </Badge>
    );
    const badge = screen.getByText("Merged");
    expect(badge).toHaveClass("mt-2", "custom-x", "bg-secondary");
  });

  it("forwards a ref to the underlying span (React 19 ref-as-prop)", () => {
    let node: HTMLSpanElement | null = null;
    render(
      <Badge
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Badge>
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
  });

  // --- asChild ------------------------------------------------------------
  it("renders as an <a> via asChild, keeping badge classes and merging props", () => {
    render(
      <Badge asChild variant="outline" data-extra="yes">
        <a href="/releases">v2.0</a>
      </Badge>
    );

    const link = screen.getByRole("link", { name: "v2.0" });
    expect(link.tagName).toBe("A");
    // the anchor's own prop survives
    expect(link).toHaveAttribute("href", "/releases");
    // badge variant classes are merged onto the anchor
    expect(link).toHaveClass("bg-transparent", "rounded-md");
    // slot data-hooks + arbitrary props flow through
    expect(link).toHaveAttribute("data-slot", "badge");
    expect(link).toHaveAttribute("data-extra", "yes");
  });

  // --- badgeVariants export -------------------------------------------------
  it("exports badgeVariants returning a class string", () => {
    const classes = badgeVariants({ variant: "destructive" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("bg-destructive");
  });

  // --- accessibility --------------------------------------------------------
  it("has no axe violations (default)", async () => {
    const { container } = render(<Badge>Accessible</Badge>);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (status variant)", async () => {
    const { container } = render(<Badge variant="success">Completed</Badge>);
    await expect(container).toHaveNoAxeViolations();
  });
});
