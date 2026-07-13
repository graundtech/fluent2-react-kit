import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Toggle, toggleVariants } from "./toggle";

describe("Toggle", () => {
  // --- structure / slots --------------------------------------------------

  it("renders its children as an accessible, native button", () => {
    render(<Toggle>Bold</Toggle>);
    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(toggle).toBeInTheDocument();
    expect(toggle.tagName).toBe("BUTTON");
  });

  it("applies the data-slot / data-variant / data-size hooks", () => {
    render(
      <Toggle variant="outline" size="lg">
        Hooks
      </Toggle>
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("data-slot", "toggle");
    expect(toggle).toHaveAttribute("data-variant", "outline");
    expect(toggle).toHaveAttribute("data-size", "lg");
  });

  it("defaults to the default variant + size", () => {
    render(<Toggle>Default</Toggle>);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveClass("bg-transparent", "h-8");
    expect(toggle).toHaveAttribute("data-variant", "default");
    expect(toggle).toHaveAttribute("data-size", "default");
  });

  // --- variants: each produces its distinguishing class -----------------------
  it.each([
    ["default", "bg-transparent"],
    ["outline", "border-input"],
  ] as const)("variant=%s applies %s", (variant, signature) => {
    render(<Toggle variant={variant}>V</Toggle>);
    expect(screen.getByRole("button")).toHaveClass(signature);
  });

  // --- sizes: each produces its distinguishing class, matching button.tsx -----
  it.each([
    ["default", "h-8"],
    ["sm", "h-6"],
    ["lg", "h-10"],
  ] as const)("size=%s applies %s", (size, signature) => {
    render(<Toggle size={size}>S</Toggle>);
    expect(screen.getByRole("button")).toHaveClass(signature);
  });

  it("merges a caller-provided className without dropping variant classes", () => {
    render(<Toggle className="w-full custom-x">Merged</Toggle>);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveClass("w-full", "custom-x", "bg-transparent");
  });

  // --- aria-pressed / data-pressed hooks ---------------------------------------

  it("defaults to unpressed: aria-pressed=false and no data-pressed", () => {
    render(<Toggle aria-label="Bold">B</Toggle>);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).not.toHaveAttribute("data-pressed");
  });

  it("defaultPressed renders as pressed: aria-pressed=true and data-pressed present", () => {
    render(
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("data-pressed");
  });

  it("applies the pressed-state secondary surface classes", () => {
    render(
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveClass(
      "data-[pressed]:bg-secondary",
      "data-[pressed]:text-secondary-foreground"
    );
  });

  // --- interaction: click + keyboard --------------------------------------------

  it("toggles aria-pressed on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Italic">I</Toggle>);
    const toggle = screen.getByRole("button");

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("activates via keyboard (Enter and Space) when focused", async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Underline">U</Toggle>);
    const toggle = screen.getByRole("button");

    toggle.focus();
    expect(toggle).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  // --- controlled usage -----------------------------------------------------------

  it("supports controlled pressed + onPressedChange", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();

    function Controlled() {
      const [pressed, setPressed] = useState(false);
      return (
        <Toggle
          aria-label="Controlled"
          pressed={pressed}
          onPressedChange={(next, eventDetails) => {
            onPressedChange(next, eventDetails);
            setPressed(next);
          }}
        >
          C
        </Toggle>
      );
    }
    render(<Controlled />);

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    // Base UI's onPressedChange is (pressed, eventDetails) — unlike shadcn's
    // Radix-based single-arg (pressed) signature (documented API deviation).
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("does not change when pressed is controlled and onPressedChange is a no-op", async () => {
    const user = userEvent.setup();
    render(
      <Toggle aria-label="Pinned" pressed={false} onPressedChange={() => {}}>
        P
      </Toggle>
    );
    const toggle = screen.getByRole("button");

    await user.click(toggle);
    // stays false: the consumer owns state and chose not to update it
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  // --- disabled --------------------------------------------------------------------

  it("blocks toggling and click handling when disabled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle aria-label="Locked" disabled onPressedChange={onPressedChange}>
        L
      </Toggle>
    );
    const toggle = screen.getByRole("button");

    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  // --- ref ---------------------------------------------------------------------------

  it("forwards a ref to the underlying button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Toggle
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Toggle>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
    expect(node).toBe(screen.getByRole("button"));
  });

  // --- toggleVariants export --------------------------------------------------------
  it("exports toggleVariants returning a class string", () => {
    const classes = toggleVariants({ variant: "outline", size: "sm" });
    expect(typeof classes).toBe("string");
    expect(classes).toContain("h-6");
    expect(classes).toContain("border-input");
  });

  // --- accessibility -----------------------------------------------------------------

  it("has no axe violations (unpressed)", async () => {
    const { container } = render(<Toggle aria-label="Bold">B</Toggle>);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (pressed)", async () => {
    const { container } = render(
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled)", async () => {
    const { container } = render(
      <Toggle aria-label="Bold" disabled>
        B
      </Toggle>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
