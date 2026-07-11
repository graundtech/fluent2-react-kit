import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renders a native <input> with the textbox role and no forced type", () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input.tagName).toBe("INPUT");
    expect(input).not.toHaveAttribute("type");
  });

  it("applies the data-slot hook", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "input");
  });

  it("defaults to the Fluent medium field size (h-8)", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole("textbox")).toHaveClass("h-8", "rounded-md", "border-input");
  });

  // --- interaction ------------------------------------------------------------
  it("accepts typed input via user-event", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox");

    await user.type(input, "Ada Lovelace");
    expect(input).toHaveValue("Ada Lovelace");
  });

  it("blocks typing when disabled", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Name" disabled />);
    const input = screen.getByRole("textbox");

    expect(input).toBeDisabled();
    expect(input).toHaveClass("disabled:pointer-events-none", "disabled:opacity-50");
    await user.type(input, "Ada");
    expect(input).toHaveValue("");
  });

  // --- className merge ---------------------------------------------------------
  it("merges a caller-provided className without dropping base classes", () => {
    render(<Input aria-label="Name" className="w-64 custom-x" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("w-64", "custom-x", "h-8", "rounded-md");
    // tailwind-merge resolved the conflicting width utility — base "w-full" is gone
    expect(input.className).not.toContain("w-full");
  });

  // --- invalid state -------------------------------------------------------------
  it("emits the destructive aria-invalid classes", () => {
    render(<Input aria-label="Name" aria-invalid="true" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass(
      "aria-invalid:border-destructive",
      "aria-invalid:ring-destructive/20",
      "dark:aria-invalid:ring-destructive/40"
    );
  });

  // --- focus accent --------------------------------------------------------------
  it("carries the Fluent bottom-accent focus classes (inset box-shadow, not the generic ring)", () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass(
      "focus-visible:border-primary",
      "focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-80)]",
      "dark:focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-100)]"
    );
    // the generic kit ring recipe must NOT be present on this component
    expect(input.className).not.toContain("focus-visible:ring-2");
  });

  // --- file variant ----------------------------------------------------------
  it("renders a file input variant", () => {
    render(<Input type="file" aria-label="Upload file" />);
    const input = screen.getByLabelText("Upload file");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveClass("file:h-7", "file:text-foreground", "file:border-0");
  });

  // --- ref ---------------------------------------------------------------------
  it("forwards a ref to the underlying input element (React 19 ref-as-prop)", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Input
        aria-label="Name"
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
  });

  // --- accessibility ----------------------------------------------------------
  // Labeled with a plain <label htmlFor> — the sibling Label component is
  // intentionally not imported here to keep this test isolated from it.
  it("has no axe violations (default, labeled)", async () => {
    const { container } = render(
      <div>
        <label htmlFor="input-default">Email</label>
        <Input id="input-default" />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled, labeled)", async () => {
    const { container } = render(
      <div>
        <label htmlFor="input-disabled">Email</label>
        <Input id="input-disabled" disabled />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (aria-invalid, labeled)", async () => {
    const { container } = render(
      <div>
        <label htmlFor="input-invalid">Email</label>
        <Input id="input-invalid" aria-invalid="true" />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
