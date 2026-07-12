import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "./label";
import { Switch } from "./switch";

describe("Switch", () => {
  // --- structure / slots --------------------------------------------------

  it("renders as an accessible switch (span[role=switch]), not a native input", () => {
    render(<Switch aria-label="Airplane mode" />);
    const control = screen.getByRole("switch", { name: "Airplane mode" });
    expect(control).toBeInTheDocument();
    expect(control.tagName).toBe("SPAN");
  });

  it("applies the switch / switch-thumb data-slot hooks", () => {
    const { container } = render(<Switch aria-label="Notifications" />);
    const root = screen.getByRole("switch");
    expect(root).toHaveAttribute("data-slot", "switch");
    const thumb = container.querySelector('[data-slot="switch-thumb"]');
    expect(thumb).toBeInTheDocument();
  });

  // --- aria-checked / data-state hooks -------------------------------------

  it("defaults to unchecked: aria-checked=false and data-unchecked present", () => {
    render(<Switch aria-label="Wi-Fi" />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toHaveAttribute("data-unchecked");
    expect(control).not.toHaveAttribute("data-checked");
  });

  it("defaultChecked renders as checked: aria-checked=true and data-checked present", () => {
    render(<Switch aria-label="Bluetooth" defaultChecked />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "true");
    expect(control).toHaveAttribute("data-checked");
    expect(control).not.toHaveAttribute("data-unchecked");
  });

  // --- interaction: click + keyboard ---------------------------------------

  it("toggles aria-checked on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Dark mode" />);
    const control = screen.getByRole("switch");

    expect(control).toHaveAttribute("aria-checked", "false");
    await user.click(control);
    expect(control).toHaveAttribute("aria-checked", "true");
    await user.click(control);
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("toggles on Space when focused (keyboard activation)", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Sync" />);
    const control = screen.getByRole("switch");

    control.focus();
    expect(control).toHaveFocus();
    await user.keyboard(" ");
    expect(control).toHaveAttribute("aria-checked", "true");
    await user.keyboard(" ");
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  // --- controlled usage -----------------------------------------------------

  it("supports controlled checked + onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    function Controlled() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          aria-label="Controlled"
          checked={checked}
          onCheckedChange={(next, eventDetails) => {
            onCheckedChange(next, eventDetails);
            setChecked(next);
          }}
        />
      );
    }
    render(<Controlled />);

    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "false");

    await user.click(control);
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    // Base UI's onCheckedChange is (checked, eventDetails) — unlike shadcn's
    // Radix-based single-arg (checked) signature (documented API deviation).
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("does not change when checked is controlled and onCheckedChange is a no-op", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Pinned" checked={false} onCheckedChange={() => {}} />);
    const control = screen.getByRole("switch");

    await user.click(control);
    // stays false: the consumer owns state and chose not to update it
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  // --- disabled --------------------------------------------------------------

  it("blocks toggling and click handling when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Locked" disabled onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch");

    expect(control).toHaveAttribute("data-disabled");
    expect(control).toHaveAttribute("aria-disabled", "true");
    await user.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  // --- Fluent accessible-stroke track + interaction ramp --------------------

  it("outlines the off-track with the accessible-stroke ramp (not border-input)", () => {
    render(<Switch aria-label="Ramp" />);
    const control = screen.getByRole("switch");
    expect(control).toHaveClass(
      "border-stroke-accessible",
      "hover:border-stroke-accessible-hover",
      "active:border-stroke-accessible-pressed"
    );
    // the retired border-input deviation is gone
    expect(control.className).not.toContain("border-input");
  });

  it("steps the on-track through the Compound brand ramp on hover/press", () => {
    render(<Switch aria-label="Brand ramp" defaultChecked />);
    const control = screen.getByRole("switch");
    expect(control).toHaveClass(
      "data-[checked]:bg-primary",
      "data-[checked]:hover:bg-brand-70",
      "data-[checked]:active:bg-brand-60",
      "dark:data-[checked]:hover:bg-brand-80"
    );
  });

  // --- className merge --------------------------------------------------------

  it("merges a caller className on the root without dropping base classes", () => {
    render(<Switch aria-label="Custom" className="custom-switch ring-4" />);
    const control = screen.getByRole("switch");
    expect(control).toHaveClass("custom-switch", "ring-4", "h-5", "w-10", "rounded-full");
  });

  // --- ref ---------------------------------------------------------------------

  it("forwards a ref to the underlying root span", () => {
    let node: HTMLElement | null = null;
    render(
      <Switch
        aria-label="Ref target"
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
    expect(node).toBe(screen.getByRole("switch"));
  });

  // --- pairing with a real label (kit Label + plain label) --------------------

  it("resolves its accessible name from a sibling kit Label via htmlFor/id", () => {
    render(
      <>
        <Label htmlFor="airplane-mode">Airplane mode</Label>
        <Switch id="airplane-mode" />
      </>
    );
    expect(screen.getByRole("switch", { name: "Airplane mode" })).toBeInTheDocument();
  });

  it("resolves its accessible name from a plain native label via htmlFor/id", () => {
    render(
      <>
        <label htmlFor="wifi">Wi-Fi</label>
        <Switch id="wifi" />
      </>
    );
    expect(screen.getByRole("switch", { name: "Wi-Fi" })).toBeInTheDocument();
  });

  // --- accessibility -----------------------------------------------------------

  it("has no axe violations (unchecked, labeled)", async () => {
    const { container } = render(
      <>
        <Label htmlFor="a11y-off">Notifications</Label>
        <Switch id="a11y-off" />
      </>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (checked, labeled)", async () => {
    const { container } = render(
      <>
        <Label htmlFor="a11y-on">Notifications</Label>
        <Switch id="a11y-on" defaultChecked />
      </>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled, labeled)", async () => {
    const { container } = render(
      <>
        <Label htmlFor="a11y-disabled">Notifications</Label>
        <Switch id="a11y-disabled" disabled />
      </>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
