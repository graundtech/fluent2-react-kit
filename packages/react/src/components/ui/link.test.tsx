import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { Link, linkVariants } from "./link";

describe("Link", () => {
  it("renders an anchor with the given href and accessible name", () => {
    render(<Link href="https://example.com">Visit example</Link>);
    const link = screen.getByRole("link", { name: "Visit example" });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("applies the data-slot / data-variant hooks", () => {
    render(
      <Link href="/docs" variant="inline">
        Hooks
      </Link>
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-slot", "link");
    expect(link).toHaveAttribute("data-variant", "inline");
  });

  it("defaults to the default variant", () => {
    render(<Link href="/docs">Default</Link>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-variant", "default");
  });

  // --- variants: default (no rest underline) vs inline (persistent underline) -
  it("variant=default has no underline at rest, only on hover", () => {
    render(
      <Link href="/docs" variant="default">
        Standalone
      </Link>
    );
    const link = screen.getByRole("link");
    expect(link).not.toHaveClass("underline");
    expect(link).toHaveClass("hover:underline");
  });

  it("variant=inline applies a persistent underline", () => {
    render(
      <Link href="/docs" variant="inline">
        Inline
      </Link>
    );
    expect(screen.getByRole("link")).toHaveClass("underline");
  });

  it("merges a caller-provided className without dropping variant classes", () => {
    render(
      <Link href="/docs" className="w-full custom-x">
        Merged
      </Link>
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("w-full", "custom-x", "text-brand-70");
  });

  // --- Fluent BrandForegroundLink ramp (one step darker than the old set) ----
  it("carries the Fluent link color ramp (rest brand-70 → hover brand-60 → pressed brand-50)", () => {
    render(<Link href="/docs">Ramped</Link>);
    const link = screen.getByRole("link");
    expect(link).toHaveClass(
      "text-brand-70",
      "hover:text-brand-60",
      "active:text-brand-50",
      "dark:text-brand-100",
      "dark:hover:text-brand-110",
      "dark:active:text-brand-120",
      "font-normal"
    );
    // the previous one-step-lighter ramp is gone
    expect(link.className).not.toContain("text-primary");
    expect(link.className).not.toContain("font-medium");
  });

  // --- interaction ------------------------------------------------------------
  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Link href="/docs" onClick={onClick}>
        Click me
      </Link>
    );

    await user.click(screen.getByRole("link"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates via keyboard (Enter) when focused", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Link href="/docs" onClick={onClick}>
        Press
      </Link>
    );

    const link = screen.getByRole("link");
    link.focus();
    expect(link).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // --- disabled (aria-disabled — anchors have no native `disabled`) -----------
  it("emits the disabled treatment classes when aria-disabled", () => {
    render(
      <Link href="/docs" aria-disabled="true">
        Disabled
      </Link>
    );
    const link = screen.getByRole("link", { name: "Disabled" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveClass(
      "aria-disabled:pointer-events-none",
      "aria-disabled:opacity-50",
      "aria-disabled:no-underline"
    );
  });

  // --- ref ----------------------------------------------------------------------
  it("forwards a ref to the underlying anchor (React 19 ref-as-prop)", () => {
    let node: HTMLAnchorElement | null = null;
    render(
      <Link
        href="/docs"
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Link>
    );
    expect(node).toBeInstanceOf(HTMLAnchorElement);
  });

  // --- asChild ------------------------------------------------------------------
  it("renders as an <a> via asChild, merging link classes and props", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Link asChild variant="inline" onClick={onClick} data-extra="yes">
        <a href="/dashboard">Go</a>
      </Link>
    );

    const link = screen.getByRole("link", { name: "Go" });
    expect(link.tagName).toBe("A");
    // the anchor's own prop survives
    expect(link).toHaveAttribute("href", "/dashboard");
    // link variant classes are merged onto the child
    expect(link).toHaveClass("underline", "text-brand-70");
    // slot data-hooks + arbitrary props flow through
    expect(link).toHaveAttribute("data-slot", "link");
    expect(link).toHaveAttribute("data-extra", "yes");
    // and merged handlers fire
    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a non-anchor child via asChild (e.g. a custom component)", () => {
    function CustomAction({
      className,
      children,
      ...props
    }: ComponentProps<"button">) {
      return (
        <button type="button" className={className} {...props}>
          {children}
        </button>
      );
    }

    render(
      <Link asChild>
        <CustomAction>Custom</CustomAction>
      </Link>
    );

    const button = screen.getByRole("button", { name: "Custom" });
    expect(button).toHaveAttribute("data-slot", "link");
    expect(button).toHaveClass("text-brand-70");
  });

  // --- linkVariants export -----------------------------------------------------
  it("exports linkVariants returning a class string", () => {
    const classes = linkVariants({ variant: "inline" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("underline");
  });

  // --- accessibility ------------------------------------------------------------
  it("has no axe violations (standalone link)", async () => {
    const { container } = render(
      <Link href="https://example.com">Accessible standalone link</Link>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (inline link inside a paragraph)", async () => {
    const { container } = render(
      <p>
        Read our{" "}
        <Link href="/terms" variant="inline">
          terms of service
        </Link>{" "}
        before continuing.
      </p>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
