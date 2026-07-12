import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Label } from "./label";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders a native <textarea> with the textbox role and no forced type", () => {
    render(<Textarea aria-label="Bio" />);
    const textarea = screen.getByRole("textbox", { name: "Bio" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).not.toHaveAttribute("type");
  });

  it("applies the data-slot hook", () => {
    render(<Textarea aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "textarea");
  });

  it("carries the Fluent flat-field layout classes (field-sizing-content, min-h-16, rounded-md)", () => {
    render(<Textarea aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveClass(
      "field-sizing-content",
      "min-h-16",
      "rounded-md",
      "border-input"
    );
  });

  // --- interaction ------------------------------------------------------------
  it("accepts multi-line typed input via user-event", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Bio" />);
    const textarea = screen.getByRole("textbox");

    await user.type(textarea, "Line one{enter}Line two");
    expect(textarea).toHaveValue("Line one\nLine two");
  });

  it("blocks typing when disabled", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Bio" disabled />);
    const textarea = screen.getByRole("textbox");

    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass("disabled:pointer-events-none", "disabled:opacity-50");
    await user.type(textarea, "Ada");
    expect(textarea).toHaveValue("");
  });

  // --- className merge ---------------------------------------------------------
  it("merges a caller-provided className without dropping base classes", () => {
    render(<Textarea aria-label="Bio" className="w-64 custom-x" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("w-64", "custom-x", "rounded-md", "border-input");
    // tailwind-merge resolved the conflicting width utility — base "w-full" is gone
    expect(textarea.className).not.toContain("w-full");
  });

  // --- invalid state -------------------------------------------------------------
  it("emits the destructive aria-invalid classes", () => {
    render(<Textarea aria-label="Bio" aria-invalid="true" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveClass(
      "aria-invalid:border-destructive",
      "aria-invalid:ring-destructive/20",
      "dark:aria-invalid:ring-destructive/40"
    );
  });

  // --- focus accent --------------------------------------------------------------
  it("carries the Fluent bottom-accent focus classes (inset box-shadow, not the generic ring)", () => {
    render(<Textarea aria-label="Bio" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass(
      "focus-visible:border-primary",
      "focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-80)]",
      "dark:focus-visible:shadow-[inset_0_-2px_0_0_var(--brand-100)]"
    );
    // the generic kit ring recipe must NOT be present on this component
    expect(textarea.className).not.toContain("focus-visible:ring-2");
  });

  it("swaps the focus accent to destructive when invalid and focused", () => {
    render(<Textarea aria-label="Bio" aria-invalid="true" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("aria-invalid:focus-visible:shadow-[inset_0_-2px_0_0_var(--destructive)]");
  });

  // --- ref ---------------------------------------------------------------------
  it("forwards a ref to the underlying textarea element (React 19 ref-as-prop)", () => {
    let node: HTMLTextAreaElement | null = null;
    render(
      <Textarea
        aria-label="Bio"
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLTextAreaElement);
  });

  // --- accessibility ----------------------------------------------------------
  // Labeled with the kit's own `Label` component — both are stable v0.1.0
  // siblings, so pairing them here also exercises the `htmlFor`/`id`
  // association consumers will actually use.
  it("has no axe violations (default, labeled)", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="textarea-default">Bio</Label>
        <Textarea id="textarea-default" />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled, labeled)", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="textarea-disabled">Bio</Label>
        <Textarea id="textarea-disabled" disabled />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (aria-invalid, labeled)", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="textarea-invalid">Bio</Label>
        <Textarea id="textarea-invalid" aria-invalid="true" />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
