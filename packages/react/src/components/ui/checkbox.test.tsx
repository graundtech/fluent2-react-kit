import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "./label";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  // --- structure / slots -------------------------------------------------

  it("renders an unchecked checkbox by default", () => {
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  it("applies the data-slot hook", () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "data-slot",
      "checkbox"
    );
  });

  // --- interaction: uncontrolled -------------------------------------------

  it("toggles unchecked -> checked on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Subscribe" />);
    const checkbox = screen.getByRole("checkbox");

    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveAttribute("data-checked", "");
  });

  it("toggles via keyboard (Space) when focused", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Subscribe" />);
    const checkbox = screen.getByRole("checkbox");

    checkbox.focus();
    expect(checkbox).toHaveFocus();
    await user.keyboard(" ");
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  // --- interaction: controlled ---------------------------------------------

  it("supports a controlled checked prop + onCheckedChange callback", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    function Controlled() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          aria-label="Controlled"
          checked={checked}
          onCheckedChange={(next: boolean) => {
            onCheckedChange(next);
            setChecked(next);
          }}
        />
      );
    }

    render(<Controlled />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("stays unchecked when checked=false is held constant, even though onCheckedChange fires", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="Pinned"
        checked={false}
        onCheckedChange={onCheckedChange}
      />
    );
    const checkbox = screen.getByRole("checkbox");

    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    // the caller never applied the update, so the controlled value holds
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  // --- indeterminate ---------------------------------------------------------

  it("renders aria-checked=mixed and the data-indeterminate hook when indeterminate", () => {
    render(<Checkbox aria-label="Select all" indeterminate />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(checkbox).toHaveAttribute("data-indeterminate", "");
  });

  it("does not carry data-checked/data-unchecked while indeterminate", () => {
    render(<Checkbox aria-label="Select all" indeterminate />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toHaveAttribute("data-checked");
    expect(checkbox).not.toHaveAttribute("data-unchecked");
  });

  // --- disabled ----------------------------------------------------------

  it("blocks toggling and exposes aria-disabled/data-disabled when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="Disabled"
        disabled
        onCheckedChange={onCheckedChange}
      />
    );
    const checkbox = screen.getByRole("checkbox");

    expect(checkbox).toHaveAttribute("aria-disabled", "true");
    expect(checkbox).toHaveAttribute("data-disabled", "");
    await user.click(checkbox);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  // --- className merge ----------------------------------------------------------

  it("merges a caller-provided className without dropping base classes", () => {
    render(
      <Checkbox aria-label="Merge" className="ring-2 custom-checkbox" />
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveClass("ring-2", "custom-checkbox", "size-4", "rounded-sm");
  });

  // --- ref -----------------------------------------------------------------

  it("forwards a ref to the underlying checkbox span (React 19 ref-as-prop)", () => {
    let node: HTMLElement | null = null;
    render(
      <Checkbox
        aria-label="Ref"
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLElement);
    expect(node).toHaveAttribute("role", "checkbox");
  });

  // --- accessibility ---------------------------------------------------------

  it("has no axe violations (unchecked, paired with kit Label)", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Checkbox id="terms-a11y" />
        <Label htmlFor="terms-a11y">Accept terms</Label>
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (checked, paired with kit Label)", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Checkbox id="checked-a11y" defaultChecked />
        <Label htmlFor="checked-a11y">Accept terms</Label>
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled, paired with kit Label)", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Checkbox id="disabled-a11y" disabled />
        <Label htmlFor="disabled-a11y">Accept terms</Label>
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
