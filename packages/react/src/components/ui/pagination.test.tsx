import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

function FullPagination() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" aria-label="Page 1">
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" aria-label="Page 2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe("Pagination", () => {
  it("renders a nav landmark with the pagination accessible name", () => {
    render(<FullPagination />);
    const nav = screen.getByRole("navigation", { name: "pagination" });
    expect(nav).toBeInTheDocument();
    expect(nav.tagName).toBe("NAV");
  });

  it("applies data-slot to the nav", () => {
    render(<FullPagination />);
    expect(screen.getByRole("navigation")).toHaveAttribute(
      "data-slot",
      "pagination"
    );
  });

  it("merges className on Pagination without dropping layout classes", () => {
    render(<Pagination className="custom-nav" data-testid="nav" />);
    const nav = screen.getByTestId("nav");
    expect(nav).toHaveClass("custom-nav", "mx-auto", "flex", "justify-center");
  });

  // --- PaginationContent: list semantics --------------------------------------
  it("renders PaginationContent as a <ul> with data-slot and layout classes", () => {
    render(
      <PaginationContent data-testid="content">
        <PaginationItem>
          <li />
        </PaginationItem>
      </PaginationContent>
    );
    const content = screen.getByTestId("content");
    expect(content.tagName).toBe("UL");
    expect(content).toHaveAttribute("data-slot", "pagination-content");
    expect(content).toHaveClass("flex", "flex-row", "items-center", "gap-1");
  });

  it("merges className on PaginationContent", () => {
    render(<PaginationContent className="custom-list" data-testid="content" />);
    expect(screen.getByTestId("content")).toHaveClass(
      "custom-list",
      "flex-row"
    );
  });

  it("renders PaginationItem as a <li> with data-slot", () => {
    render(
      <ul>
        <PaginationItem data-testid="item">x</PaginationItem>
      </ul>
    );
    const item = screen.getByTestId("item");
    expect(item.tagName).toBe("LI");
    expect(item).toHaveAttribute("data-slot", "pagination-item");
  });

  // --- PaginationLink -----------------------------------------------------------
  it("renders an inactive link with ghost-variant button classes and no aria-current", () => {
    render(
      <PaginationLink href="#" aria-label="Page 3">
        3
      </PaginationLink>
    );
    const link = screen.getByRole("link", { name: "Page 3" });
    expect(link.tagName).toBe("A");
    expect(link).not.toHaveAttribute("aria-current");
    expect(link).toHaveAttribute("data-active", "false");
    // ghost variant signature class (matches Button's ghost test)
    expect(link).toHaveClass("hover:bg-accent");
  });

  it("renders an active link with outline-variant classes and aria-current=page", () => {
    render(
      <PaginationLink href="#" aria-label="Page 2" isActive>
        2
      </PaginationLink>
    );
    const link = screen.getByRole("link", { name: "Page 2" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("data-active", "true");
    // outline variant signature class (matches Button's outline test)
    expect(link).toHaveClass("border-input");
  });

  it("defaults PaginationLink to the icon size", () => {
    render(
      <PaginationLink href="#" aria-label="Page 4">
        4
      </PaginationLink>
    );
    expect(screen.getByRole("link", { name: "Page 4" })).toHaveClass(
      "size-8"
    );
  });

  it("carries data-slot=pagination-link and forwards data-slot=button via buttonVariants integration", () => {
    render(
      <PaginationLink href="#" aria-label="Page 5">
        5
      </PaginationLink>
    );
    const link = screen.getByRole("link", { name: "Page 5" });
    expect(link).toHaveAttribute("data-slot", "pagination-link");
    // the link actually carries the Button system's classes, not a bespoke look
    expect(link.className).toBe(
      `${buttonVariants({ variant: "ghost", size: "icon" })}`
    );
  });

  it("merges className on PaginationLink without dropping variant classes", () => {
    render(
      <PaginationLink href="#" aria-label="Page 6" className="custom-link">
        6
      </PaginationLink>
    );
    const link = screen.getByRole("link", { name: "Page 6" });
    expect(link).toHaveClass("custom-link", "hover:bg-accent");
  });

  it("forwards a ref to the underlying anchor", () => {
    let node: HTMLAnchorElement | null = null;
    render(
      <PaginationLink
        href="#"
        aria-label="Page 7"
        ref={(el) => {
          node = el;
        }}
      >
        7
      </PaginationLink>
    );
    expect(node).toBeInstanceOf(HTMLAnchorElement);
  });

  // --- PaginationPrevious / PaginationNext ---------------------------------------
  it("renders PaginationPrevious with a Previous label and a chevron svg", () => {
    render(<PaginationPrevious href="#" />);
    const link = screen.getByRole("link", { name: "Go to previous page" });
    expect(link).toHaveTextContent("Previous");
    expect(link.querySelector("svg")).toBeInTheDocument();
    expect(link).toHaveClass("gap-1", "px-2.5");
  });

  it("renders PaginationNext with a Next label and a chevron svg", () => {
    render(<PaginationNext href="#" />);
    const link = screen.getByRole("link", { name: "Go to next page" });
    expect(link).toHaveTextContent("Next");
    expect(link.querySelector("svg")).toBeInTheDocument();
    expect(link).toHaveClass("gap-1", "px-2.5");
  });

  it("gives PaginationPrevious/Next the default (not icon) button size", () => {
    render(<PaginationPrevious href="#" />);
    expect(screen.getByRole("link", { name: "Go to previous page" })).toHaveClass(
      "h-8"
    );
  });

  // --- PaginationEllipsis --------------------------------------------------------
  it("renders PaginationEllipsis as aria-hidden with sr-only text and a dots svg", () => {
    render(<PaginationEllipsis data-testid="ellipsis" />);
    const ellipsis = screen.getByTestId("ellipsis");
    expect(ellipsis.tagName).toBe("SPAN");
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(ellipsis).toHaveAttribute("data-slot", "pagination-ellipsis");
    expect(ellipsis.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("More pages")).toHaveClass("sr-only");
  });

  // --- accessibility ---------------------------------------------------------
  it("has no axe violations (default full pagination)", async () => {
    const { container } = render(<FullPagination />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (active page state)", async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#" aria-label="Page 1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
