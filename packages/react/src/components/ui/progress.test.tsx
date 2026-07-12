import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress, progressVariants } from "./progress";

describe("Progress", () => {
  // --- structure / slots -------------------------------------------------

  it("renders the root as a div with role=progressbar and the progress data-slot", () => {
    render(<Progress aria-label="Upload" value={50} />);
    const root = screen.getByRole("progressbar", { name: "Upload" });
    expect(root.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-slot", "progress");
  });

  it("carries the Fluent thin-bar layout classes (h-0.5, not shadcn's h-2)", () => {
    render(<Progress aria-label="Upload" value={50} />);
    const root = screen.getByRole("progressbar");
    expect(root).toHaveClass("h-0.5", "bg-secondary", "rounded-full", "overflow-hidden");
    expect(root.className).not.toContain("h-2");
  });

  it("renders the track and indicator parts with their data-slots", () => {
    const { container } = render(<Progress aria-label="Upload" value={50} />);
    expect(container.querySelector('[data-slot="progress-track"]')).toBeInTheDocument();
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("bg-primary", "rounded-full");
  });

  // --- intent variants (Fluent State axis) --------------------------------

  it("defaults to the default (brand) intent variant", () => {
    const { container } = render(<Progress aria-label="Upload" value={50} />);
    const root = screen.getByRole("progressbar");
    expect(root).toHaveAttribute("data-variant", "default");
    expect(
      container.querySelector('[data-slot="progress-indicator"]')
    ).toHaveClass("bg-primary");
  });

  it.each([
    ["default", "bg-primary"],
    ["success", "bg-success"],
    ["warning", "bg-warning"],
    ["destructive", "bg-destructive"],
  ] as const)("variant=%s paints the indicator %s", (variant, signature) => {
    const { container } = render(
      <Progress aria-label="Upload" value={50} variant={variant} />
    );
    const root = screen.getByRole("progressbar");
    expect(root).toHaveAttribute("data-variant", variant);
    const indicator = container.querySelector(
      '[data-slot="progress-indicator"]'
    );
    expect(indicator).toHaveClass(signature, "rounded-full");
  });

  it("exports progressVariants returning a class string", () => {
    const classes = progressVariants({ variant: "success" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("bg-success");
  });

  // --- determinate: aria-valuenow + indicator width -----------------------

  it.each([
    [0, "0"],
    [33, "33"],
    [100, "100"]
  ] as const)("value=%s sets aria-valuenow=%s and aria-valuemin/max", (value, expected) => {
    render(<Progress aria-label="Upload" value={value} />);
    const root = screen.getByRole("progressbar");
    expect(root).toHaveAttribute("aria-valuenow", expected);
    expect(root).toHaveAttribute("aria-valuemin", "0");
    expect(root).toHaveAttribute("aria-valuemax", "100");
  });

  it.each([
    [0, "0%"],
    [33, "33%"],
    [100, "100%"]
  ] as const)("value=%s drives the indicator's width to %s", (value, expectedWidth) => {
    const { container } = render(<Progress aria-label="Upload" value={value} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]') as HTMLElement;
    expect(indicator.style.width).toBe(expectedWidth);
  });

  // --- indeterminate --------------------------------------------------------

  it("omits aria-valuenow when value is undefined (indeterminate)", () => {
    render(<Progress aria-label="Loading" />);
    const root = screen.getByRole("progressbar");
    expect(root).not.toHaveAttribute("aria-valuenow");
  });

  it("omits aria-valuenow when value is explicitly null (indeterminate)", () => {
    render(<Progress aria-label="Loading" value={null} />);
    const root = screen.getByRole("progressbar");
    expect(root).not.toHaveAttribute("aria-valuenow");
  });

  it("renders the pulsing stand-in indicator when indeterminate", () => {
    const { container } = render(<Progress aria-label="Loading" />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveClass("animate-pulse", "w-1/3");
  });

  it("stops the indeterminate pulse under prefers-reduced-motion (motion-reduce:animate-none)", () => {
    const { container } = render(<Progress aria-label="Loading" />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveClass("motion-reduce:animate-none");
  });

  it("does not render the pulsing stand-in when determinate", () => {
    const { container } = render(<Progress aria-label="Upload" value={33} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).not.toHaveClass("animate-pulse");
  });

  // --- className merge -----------------------------------------------------

  it("merges a caller-provided className without dropping base classes", () => {
    render(<Progress aria-label="Upload" value={50} className="w-64 custom-x" />);
    const root = screen.getByRole("progressbar");
    expect(root).toHaveClass("w-64", "custom-x", "rounded-full");
  });

  it("lets a caller override the default thin height via className (tailwind-merge resolves the conflict)", () => {
    render(<Progress aria-label="Upload" value={50} className="h-2" />);
    const root = screen.getByRole("progressbar");
    expect(root).toHaveClass("h-2");
    expect(root.className).not.toContain("h-0.5");
  });

  // --- ref -------------------------------------------------------------------

  it("forwards a ref to the underlying root div", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Progress
        aria-label="Upload"
        value={50}
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  // --- accessibility -----------------------------------------------------------

  it("has no axe violations (determinate, labeled)", async () => {
    const { container } = render(<Progress aria-label="Upload progress" value={33} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (indeterminate, labeled)", async () => {
    const { container } = render(<Progress aria-label="Loading" />);
    await expect(container).toHaveNoAxeViolations();
  });
});
