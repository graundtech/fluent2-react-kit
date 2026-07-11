import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Separator } from "./separator";

describe("Separator", () => {
  it("renders a div with the data-slot hook", () => {
    render(<Separator data-testid="sep" />);
    const sep = screen.getByTestId("sep");
    expect(sep.tagName).toBe("DIV");
    expect(sep).toHaveAttribute("data-slot", "separator");
  });

  // --- role / decorative -------------------------------------------------
  it("is decorative by default and renders role=none", () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveAttribute("role", "none");
  });

  it("renders role=separator when decorative is false", () => {
    render(<Separator decorative={false} data-testid="sep" />);
    expect(screen.getByRole("separator")).toBe(screen.getByTestId("sep"));
  });

  // --- aria-orientation ----------------------------------------------------
  it("emits aria-orientation=vertical for a non-decorative vertical separator", () => {
    render(<Separator decorative={false} orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    );
  });

  it("does NOT emit aria-orientation for a non-decorative horizontal separator", () => {
    render(<Separator decorative={false} orientation="horizontal" data-testid="sep" />);
    expect(screen.getByTestId("sep")).not.toHaveAttribute("aria-orientation");
  });

  it("does not emit aria-orientation on a decorative vertical separator either", () => {
    render(<Separator decorative orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId("sep")).not.toHaveAttribute("aria-orientation");
  });

  // --- orientation / classes ------------------------------------------------
  it("defaults to horizontal orientation with the data-orientation hook + sizing classes", () => {
    render(<Separator data-testid="sep" />);
    const sep = screen.getByTestId("sep");
    expect(sep).toHaveAttribute("data-orientation", "horizontal");
    expect(sep).toHaveClass(
      "shrink-0",
      "bg-border",
      "data-[orientation=horizontal]:h-px",
      "data-[orientation=horizontal]:w-full",
      "data-[orientation=vertical]:h-full",
      "data-[orientation=vertical]:w-px"
    );
  });

  it("reflects orientation=vertical via the data-orientation hook", () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveAttribute(
      "data-orientation",
      "vertical"
    );
  });

  // --- className merge -------------------------------------------------------
  it("merges a caller-provided className without dropping base classes", () => {
    render(<Separator className="my-4 custom-x" data-testid="sep" />);
    const sep = screen.getByTestId("sep");
    expect(sep).toHaveClass("my-4", "custom-x", "bg-border", "shrink-0");
  });

  // --- ref ---------------------------------------------------------------
  it("forwards a ref to the underlying div (React 19 ref-as-prop)", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Separator
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  // --- accessibility -------------------------------------------------------
  it("has no axe violations in a realistic decorative composition", async () => {
    const { container } = render(
      <div>
        <p>First block of text.</p>
        <Separator />
        <p>Second block of text.</p>
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations in a realistic semantic (non-decorative) composition", async () => {
    const { container } = render(
      <div>
        <section>Section one</section>
        <Separator decorative={false} />
        <section>Section two</section>
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
