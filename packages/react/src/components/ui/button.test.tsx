import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Save changes</Button>);
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  it("applies the data-slot / data-variant / data-size hooks", () => {
    render(
      <Button variant="secondary" size="lg">
        Hooks
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-variant", "secondary");
    expect(button).toHaveAttribute("data-size", "lg");
  });

  it("defaults to the default variant + size", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button");
    // default variant = brand fill; default size = 32px (h-8)
    expect(button).toHaveClass("bg-primary", "h-8");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
  });

  // --- variants: each produces its distinguishing class -----------------------
  it.each([
    ["default", "bg-primary"],
    ["destructive", "bg-destructive"],
    ["secondary", "bg-secondary"],
    ["outline", "border-input"],
    ["ghost", "hover:bg-accent"],
    ["link", "underline-offset-4"],
  ] as const)("variant=%s applies %s", (variant, signature) => {
    render(<Button variant={variant}>V</Button>);
    expect(screen.getByRole("button")).toHaveClass(signature);
  });

  // --- sizes: each produces its distinguishing class --------------------------
  it.each([
    ["default", "h-8"],
    ["sm", "h-6"],
    ["lg", "h-10"],
    ["icon-sm", "size-6"],
    ["icon", "size-8"],
    ["icon-lg", "size-10"],
  ] as const)("size=%s applies %s", (size, signature) => {
    render(<Button size={size}>S</Button>);
    expect(screen.getByRole("button")).toHaveClass(signature);
  });

  // the link variant's color ramp is kept in sync with the Link component
  // (Fluent BrandForegroundLink: rest brand-70 → hover brand-60 → pressed
  // brand-50), but the button keeps its own font-semibold weight.
  it("gives the link variant the Fluent link ramp while keeping the button weight", () => {
    render(<Button variant="link">Linky</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "text-brand-70",
      "hover:text-brand-60",
      "active:text-brand-50",
      "dark:text-brand-100",
      "font-semibold"
    );
    expect(button.className).not.toContain("text-primary");
  });

  it("merges a caller-provided className without dropping variant classes", () => {
    render(<Button className="w-full custom-x">Merged</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("w-full", "custom-x", "bg-primary");
  });

  // --- interaction ------------------------------------------------------------
  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("activates via keyboard (Enter and Space) when focused", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);

    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  // --- type attribute: match shadcn — do NOT force a default type -------------
  it("does not set a type attribute by default (matches shadcn)", () => {
    render(<Button>No type</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("type");
  });

  it("forwards an explicit type attribute", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("forwards a ref to the underlying button (React 19 ref-as-prop)", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Button>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  // --- asChild ----------------------------------------------------------------
  it("renders as an <a> via asChild, merging button classes and props", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        asChild
        variant="outline"
        size="lg"
        onClick={onClick}
        data-extra="yes"
      >
        <a href="/dashboard">Go</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "Go" });
    expect(link.tagName).toBe("A");
    // the anchor's own prop survives
    expect(link).toHaveAttribute("href", "/dashboard");
    // button variant/size classes are merged onto the anchor
    expect(link).toHaveClass("border-input", "h-10");
    // slot data-hooks + arbitrary props flow through
    expect(link).toHaveAttribute("data-slot", "button");
    expect(link).toHaveAttribute("data-extra", "yes");
    // and merged handlers fire
    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // --- buttonVariants export --------------------------------------------------
  it("exports buttonVariants returning a class string", () => {
    const classes = buttonVariants({ variant: "ghost", size: "sm" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("h-6");
  });

  // --- accessibility ----------------------------------------------------------
  it("has no axe violations (default)", async () => {
    const { container } = render(<Button>Accessible</Button>);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled)", async () => {
    const { container } = render(<Button disabled>Accessible disabled</Button>);
    await expect(container).toHaveNoAxeViolations();
  });
});
