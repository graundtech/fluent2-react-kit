import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup / RadioGroupItem", () => {
  // --- structure / slots -------------------------------------------------

  it("renders a radiogroup containing radio items", () => {
    render(
      <RadioGroup defaultValue="a" aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
        <RadioGroupItem value="b" aria-label="Banana" />
      </RadioGroup>
    );

    const group = screen.getByRole("radiogroup", { name: "Fruit" });
    expect(group).toBeInTheDocument();
    expect(group.tagName).toBe("DIV");

    const items = screen.getAllByRole("radio");
    expect(items).toHaveLength(2);
  });

  it("applies the data-slot hooks", () => {
    render(
      <RadioGroup defaultValue="a" aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
      </RadioGroup>
    );

    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "data-slot",
      "radio-group"
    );
    expect(screen.getByRole("radio")).toHaveAttribute(
      "data-slot",
      "radio-group-item"
    );
  });

  // --- selection: click ---------------------------------------------------

  it("selects an item on click and deselects the previous one", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue="a" aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
        <RadioGroupItem value="b" aria-label="Banana" />
      </RadioGroup>
    );

    const [apple, banana] = screen.getAllByRole("radio") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(apple).toHaveAttribute("aria-checked", "true");
    expect(banana).toHaveAttribute("aria-checked", "false");

    await user.click(banana);

    expect(banana).toHaveAttribute("aria-checked", "true");
    expect(apple).toHaveAttribute("aria-checked", "false");
  });

  // --- selection: keyboard -------------------------------------------------

  it("moves selection with ArrowDown and ArrowRight (roving focus)", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue="a" aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
        <RadioGroupItem value="b" aria-label="Banana" />
        <RadioGroupItem value="c" aria-label="Cherry" />
      </RadioGroup>
    );

    const [apple, banana, cherry] = screen.getAllByRole("radio") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    apple.focus();
    expect(apple).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(banana).toHaveFocus();
    expect(banana).toHaveAttribute("aria-checked", "true");
    expect(apple).toHaveAttribute("aria-checked", "false");

    await user.keyboard("{ArrowRight}");
    expect(cherry).toHaveFocus();
    expect(cherry).toHaveAttribute("aria-checked", "true");
    expect(banana).toHaveAttribute("aria-checked", "false");
  });

  // --- controlled value / onValueChange ------------------------------------

  it("supports a controlled value + onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function ControlledHarness() {
      const [value, setValue] = useState("a");
      return (
        <RadioGroup
          aria-label="Controlled fruit"
          value={value}
          onValueChange={(next: string, details) => {
            onValueChange(next, details);
            setValue(next);
          }}
        >
          <RadioGroupItem value="a" aria-label="Apple" />
          <RadioGroupItem value="b" aria-label="Banana" />
        </RadioGroup>
      );
    }

    render(<ControlledHarness />);
    const [apple, banana] = screen.getAllByRole("radio") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(apple).toHaveAttribute("aria-checked", "true");

    await user.click(banana);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("b", expect.anything());
    expect(banana).toHaveAttribute("aria-checked", "true");
    expect(apple).toHaveAttribute("aria-checked", "false");
  });

  // --- disabled ------------------------------------------------------------

  it("skips a disabled item on click", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue="a" aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
        <RadioGroupItem value="b" aria-label="Banana" disabled />
      </RadioGroup>
    );

    const [apple, banana] = screen.getAllByRole("radio") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(banana).toHaveAttribute("data-disabled");

    await user.click(banana);

    expect(banana).toHaveAttribute("aria-checked", "false");
    expect(apple).toHaveAttribute("aria-checked", "true");
  });

  // --- className merge -------------------------------------------------------

  it("merges a caller className on RadioGroup without dropping the base classes", () => {
    render(
      <RadioGroup className="custom-group" aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
      </RadioGroup>
    );

    const group = screen.getByRole("radiogroup");
    expect(group).toHaveClass("custom-group", "grid", "gap-2");
  });

  it("merges a caller className on RadioGroupItem without dropping the base classes", () => {
    render(
      <RadioGroup aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" className="custom-item" />
      </RadioGroup>
    );

    const item = screen.getByRole("radio");
    expect(item).toHaveClass("custom-item", "rounded-full", "size-4");
  });

  // --- Fluent accessible-stroke ring + interaction ramp -------------------

  it("outlines the unchecked ring with the accessible-stroke ramp and steps the checked ring through the brand ramp", () => {
    render(
      <RadioGroup aria-label="Fruit">
        <RadioGroupItem value="a" aria-label="Apple" />
      </RadioGroup>
    );
    const item = screen.getByRole("radio");
    expect(item).toHaveClass(
      "border-stroke-accessible",
      "hover:border-stroke-accessible-hover",
      "active:border-stroke-accessible-pressed",
      "data-[checked]:border-primary",
      "data-[checked]:hover:border-brand-70",
      "data-[checked]:active:border-brand-60",
      "dark:data-[checked]:hover:border-brand-80"
    );
    // the old lighter border-input grey is gone
    expect(item.className).not.toContain("border-input");
  });

  // --- ref -----------------------------------------------------------------

  it("forwards refs to the underlying group div and item span", () => {
    let groupNode: HTMLDivElement | null = null;
    let itemNode: HTMLSpanElement | null = null;

    render(
      <RadioGroup
        aria-label="Fruit"
        ref={(el) => {
          groupNode = el;
        }}
      >
        <RadioGroupItem
          value="a"
          aria-label="Apple"
          ref={(el) => {
            itemNode = el;
          }}
        />
      </RadioGroup>
    );

    expect(groupNode).toBeInstanceOf(HTMLDivElement);
    expect(itemNode).toBeInstanceOf(HTMLSpanElement);
  });

  // --- accessibility ---------------------------------------------------------

  it("has no axe violations (default, labeled via kit Label)", async () => {
    const { container } = render(
      <RadioGroup defaultValue="all" aria-label="Notifications">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="all" id="axe-all" />
          <Label htmlFor="axe-all">All</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="none" id="axe-none" />
          <Label htmlFor="axe-none">None</Label>
        </div>
      </RadioGroup>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled item)", async () => {
    const { container } = render(
      <RadioGroup defaultValue="all" aria-label="Notifications">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="all" id="axe-disabled-all" />
          <Label htmlFor="axe-disabled-all">All</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="none" id="axe-disabled-none" disabled />
          <Label htmlFor="axe-disabled-none">None</Label>
        </div>
      </RadioGroup>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
