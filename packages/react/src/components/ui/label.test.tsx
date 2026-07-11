import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Label } from "./label";

describe("Label", () => {
  it("renders its children as a <label> element", () => {
    render(<Label htmlFor="email">Email address</Label>);
    const label = screen.getByText("Email address");
    expect(label.tagName).toBe("LABEL");
  });

  it("applies the data-slot hook", () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.getByText("Email")).toHaveAttribute("data-slot", "label");
  });

  it("carries the disabled-ergonomics utility classes for peer/group pairing", () => {
    render(<Label htmlFor="email">Email</Label>);
    const label = screen.getByText("Email");
    expect(label).toHaveClass(
      "peer-disabled:cursor-not-allowed",
      "peer-disabled:opacity-50",
      "group-data-[disabled=true]:pointer-events-none",
      "group-data-[disabled=true]:opacity-50"
    );
  });

  // --- htmlFor association -----------------------------------------------------
  it("associates with a paired input via htmlFor, exposing it through getByLabelText", () => {
    render(
      <div>
        <Label htmlFor="email">Email address</Label>
        <input id="email" />
      </div>
    );
    const input = screen.getByLabelText("Email address");
    expect(input.tagName).toBe("INPUT");
  });

  it("focuses the paired input when the label text is clicked (native label behavior)", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Label htmlFor="email">Email address</Label>
        <input id="email" />
      </div>
    );
    const input = screen.getByLabelText("Email address");
    await user.click(screen.getByText("Email address"));
    expect(input).toHaveFocus();
  });

  // --- className merge ----------------------------------------------------------
  it("merges a caller-provided className without dropping base classes", () => {
    render(
      <Label htmlFor="email" className="custom-x">
        Email
      </Label>
    );
    const label = screen.getByText("Email");
    expect(label).toHaveClass("custom-x", "text-sm", "font-semibold");
  });

  // --- ref ------------------------------------------------------------------------
  it("forwards a ref to the underlying label element (React 19 ref-as-prop)", () => {
    let node: HTMLLabelElement | null = null;
    render(
      <Label
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Label>
    );
    expect(node).toBeInstanceOf(HTMLLabelElement);
  });

  // --- required indicator --------------------------------------------------------
  describe("required", () => {
    it("renders an aria-hidden asterisk after the children when required", () => {
      const { container } = render(
        <Label htmlFor="name" required>
          Full name
        </Label>
      );
      const label = container.querySelector("label")!;
      expect(label).toHaveTextContent("Full name*");

      const asterisk = label.querySelector("span");
      expect(asterisk).toHaveAttribute("aria-hidden", "true");
      expect(asterisk).toHaveTextContent("*");
      expect(asterisk).toHaveClass("text-destructive");
    });

    it("does not render an asterisk when required is false (default)", () => {
      const { container } = render(<Label htmlFor="name">Full name</Label>);
      const label = container.querySelector("label")!;
      expect(label.querySelector("span")).not.toBeInTheDocument();
    });

    it("keeps the accessible name clean of the asterisk (aria-hidden excludes it from the accessible name)", () => {
      render(
        <div>
          <Label htmlFor="name" required>
            Full name
          </Label>
          <input id="name" required aria-required="true" />
        </div>
      );
      // getByLabelText matches on the label's raw textContent (it would
      // include the asterisk), so it is not a reliable check here. getByRole's
      // `name` option instead runs the real accessible-name algorithm
      // (dom-accessibility-api), which skips aria-hidden content — this is
      // the same computation assistive tech relies on.
      expect(
        screen.getByRole("textbox", { name: "Full name" })
      ).toBeInTheDocument();
    });
  });

  // --- accessibility ---------------------------------------------------------------
  it("has no axe violations (label + input pair)", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="email-a11y">Email address</Label>
        <input id="email-a11y" type="email" />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (required label + input pair)", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="name-a11y" required>
          Full name
        </Label>
        <input id="name-a11y" required aria-required="true" />
      </div>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
