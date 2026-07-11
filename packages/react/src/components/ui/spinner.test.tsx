import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner, spinnerVariants } from "./spinner";

describe("Spinner", () => {
  it("renders a status element with the default accessible name 'Loading'", () => {
    render(<Spinner />);
    const status = screen.getByRole("status", { name: "Loading" });
    expect(status).toBeInTheDocument();
    expect(status.tagName).toBe("SPAN");
  });

  it("applies the data-slot / data-size hooks", () => {
    render(<Spinner size="lg" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-slot", "spinner");
    expect(status).toHaveAttribute("data-size", "lg");
  });

  it("defaults to the default size", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveAttribute("data-size", "default");
  });

  it("hides the SVG glyph from assistive tech", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  // --- label ------------------------------------------------------------------
  it("uses the visible label as the accessible name and renders it visibly", () => {
    render(<Spinner label="Loading messages" />);
    const status = screen.getByRole("status", { name: "Loading messages" });
    expect(status).toBeInTheDocument();
    expect(screen.getByText("Loading messages")).toBeVisible();
  });

  it("does not render visible label text when label is omitted", () => {
    render(<Spinner />);
    // only the accessible name (aria-label) conveys "Loading"; no visible text node
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  // --- aria-label override -----------------------------------------------------
  it("honors an explicit aria-label override when no label is set", () => {
    render(<Spinner aria-label="Fetching data" />);
    expect(screen.getByRole("status", { name: "Fetching data" })).toBeInTheDocument();
  });

  it("prefers the visible label over an explicit aria-label when both are set", () => {
    render(<Spinner label="Visible text" aria-label="Fetching data" />);
    expect(screen.getByRole("status", { name: "Visible text" })).toBeInTheDocument();
  });

  it("falls back to 'Loading' for an empty label and renders no visible text", () => {
    // An empty aria-label is ignored by the accessible-name computation, so
    // `label=""` must fall through to the default name rather than leaving the
    // status region unnamed. It must also not render an (empty) visible span.
    render(<Spinner label="" />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  // --- sizes: each produces its distinguishing class on the glyph -------------
  it.each([
    ["sm", "size-4"],
    ["default", "size-6"],
    ["lg", "size-8"],
    ["xl", "size-10"],
  ] as const)("size=%s applies %s to the glyph", (size, signature) => {
    const { container } = render(<Spinner size={size} />);
    expect(container.querySelector("svg")).toHaveClass(signature);
  });

  // --- className merge ----------------------------------------------------------
  it("merges a caller-provided className without dropping base classes", () => {
    render(<Spinner className="custom-x" />);
    const status = screen.getByRole("status");
    expect(status).toHaveClass("custom-x", "inline-flex");
  });

  // --- ref ------------------------------------------------------------------
  it("forwards a ref to the underlying span (React 19 ref-as-prop)", () => {
    let node: HTMLSpanElement | null = null;
    render(
      <Spinner
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
  });

  // --- spinnerVariants export --------------------------------------------------
  it("exports spinnerVariants returning a class string", () => {
    const classes = spinnerVariants({ size: "xl" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("size-10");
  });

  // --- accessibility ----------------------------------------------------------
  it("has no axe violations (default)", async () => {
    const { container } = render(<Spinner />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (labeled)", async () => {
    const { container } = render(<Spinner label="Loading messages" />);
    await expect(container).toHaveNoAxeViolations();
  });
});
