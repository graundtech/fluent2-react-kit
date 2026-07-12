import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

function BasicBreadcrumb() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  // --- landmark / semantics ----------------------------------------------------
  it("renders a nav landmark with an accessible name", () => {
    render(<BasicBreadcrumb />);
    const nav = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveAttribute("data-slot", "breadcrumb");
  });

  it("renders BreadcrumbList as an <ol> and BreadcrumbItem as an <li>", () => {
    render(<BasicBreadcrumb />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(list).toHaveAttribute("data-slot", "breadcrumb-list");

    const items = screen.getAllByRole("listitem");
    // 3 BreadcrumbItem <li> + 2 BreadcrumbSeparator <li role="presentation">
    // presentation role removes them from the "listitem" a11y query, so only
    // the 3 real items are returned here.
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute("data-slot", "breadcrumb-item");
  });

  // --- BreadcrumbLink -----------------------------------------------------------
  it("renders BreadcrumbLink as an anchor with the given href", () => {
    render(<BasicBreadcrumb />);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
  });

  it("supports asChild composition, merging classes and props onto the child", () => {
    render(
      <BreadcrumbLink asChild className="custom-link">
        <a href="/custom" data-extra="yes">
          Custom
        </a>
      </BreadcrumbLink>
    );
    const link = screen.getByRole("link", { name: "Custom" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/custom");
    expect(link).toHaveAttribute("data-extra", "yes");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
    expect(link).toHaveClass("custom-link", "hover:text-foreground");
  });

  // --- BreadcrumbPage -------------------------------------------------------------
  it("marks BreadcrumbPage as the current step, non-interactive", () => {
    render(<BasicBreadcrumb />);
    const page = screen.getByText("Breadcrumb");
    expect(page.tagName).toBe("SPAN");
    expect(page).toHaveAttribute("role", "link");
    expect(page).toHaveAttribute("aria-disabled", "true");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveAttribute("data-slot", "breadcrumb-page");
  });

  // --- BreadcrumbSeparator --------------------------------------------------------
  it("renders the default separator as presentational and hidden from a11y tree", () => {
    render(<BasicBreadcrumb />);
    const separators = document.querySelectorAll(
      '[data-slot="breadcrumb-separator"]'
    );
    expect(separators).toHaveLength(2);
    separators.forEach((separator) => {
      expect(separator).toHaveAttribute("role", "presentation");
      expect(separator).toHaveAttribute("aria-hidden", "true");
      expect(separator.querySelector("svg")).toBeInTheDocument();
    });
  });

  it("renders custom children instead of the default chevron", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
        </BreadcrumbList>
      </Breadcrumb>
    );
    const separator = document.querySelector(
      '[data-slot="breadcrumb-separator"]'
    );
    expect(separator).toHaveTextContent("/");
    expect(separator?.querySelector("svg")).not.toBeInTheDocument();
  });

  // --- BreadcrumbEllipsis -----------------------------------------------------
  it("renders BreadcrumbEllipsis with sr-only text and hidden dots", () => {
    render(<BreadcrumbEllipsis />);
    const ellipsis = document.querySelector(
      '[data-slot="breadcrumb-ellipsis"]'
    );
    expect(ellipsis).toHaveAttribute("role", "presentation");
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("More")).toHaveClass("sr-only");
    expect(ellipsis?.querySelector("svg")).toBeInTheDocument();
  });

  // --- className merge across every part ---------------------------------------
  it("merges a caller-provided className on every part without dropping base classes", () => {
    render(
      <Breadcrumb className="nav-x">
        <BreadcrumbList className="list-x">
          <BreadcrumbItem className="item-x">
            <BreadcrumbLink href="/" className="link-x">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="sep-x" />
          <BreadcrumbItem>
            <BreadcrumbPage className="page-x">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(screen.getByRole("navigation")).toHaveClass("nav-x");
    expect(screen.getByRole("list")).toHaveClass("list-x", "flex");
    expect(screen.getByRole("link", { name: "Home" }).closest("li")).toHaveClass(
      "item-x",
      "inline-flex"
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveClass(
      "link-x",
      "hover:text-foreground"
    );
    expect(
      document.querySelector('[data-slot="breadcrumb-separator"]')
    ).toHaveClass("sep-x");
    expect(screen.getByText("Current")).toHaveClass("page-x", "font-semibold");
  });

  // --- ref forwarding ------------------------------------------------------------
  it("forwards a ref to the underlying nav element (React 19 ref-as-prop)", () => {
    let node: HTMLElement | null = null;
    render(
      <Breadcrumb
        ref={(el) => {
          node = el;
        }}
      >
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    expect(node).toBeInstanceOf(HTMLElement);
    expect((node as unknown as HTMLElement)?.tagName).toBe("NAV");
  });

  // --- accessibility ----------------------------------------------------------
  it("has no axe violations (default breadcrumb)", async () => {
    const { container } = render(<BasicBreadcrumb />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (ellipsis + custom separator)", async () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
