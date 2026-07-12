import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a div with the data-slot hook", () => {
    render(<Skeleton data-testid="sk" />);
    const sk = screen.getByTestId("sk");
    expect(sk.tagName).toBe("DIV");
    expect(sk).toHaveAttribute("data-slot", "skeleton");
  });

  // --- base classes --------------------------------------------------------
  it("applies the base pulse/radius/fill classes", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass(
      "animate-shimmer",
      "rounded-md",
      "bg-secondary"
    );
  });

  // --- reduced motion --------------------------------------------------------
  it("applies motion-reduce:animate-none so the pulse is fully stopped, not slowed", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass("motion-reduce:animate-none");
  });

  // --- className merge (shape overrides) -------------------------------------
  it("merges a caller-provided className without dropping base classes", () => {
    render(<Skeleton className="my-4 custom-x" data-testid="sk" />);
    const sk = screen.getByTestId("sk");
    expect(sk).toHaveClass("my-4", "custom-x", "bg-secondary", "animate-shimmer");
  });

  it("lets a shape override (e.g. a circular avatar block) replace rounded-md via tailwind-merge", () => {
    render(<Skeleton className="h-4 w-40 rounded-full" data-testid="sk" />);
    const sk = screen.getByTestId("sk");
    expect(sk).toHaveClass("h-4", "w-40", "rounded-full");
    expect(sk.className).not.toMatch(/(?:^|\s)rounded-md(?:\s|$)/);
  });

  // --- ref -------------------------------------------------------------------
  it("forwards a ref to the underlying div (React 19 ref-as-prop)", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Skeleton
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  // --- accessibility -----------------------------------------------------------
  it("has no axe violations for a lone skeleton", async () => {
    const { container } = render(<Skeleton />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations for a skeleton 'card' composition inside an aria-busy region", async () => {
    const { container } = render(
      <div aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
