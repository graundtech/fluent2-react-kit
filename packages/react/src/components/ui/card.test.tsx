import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

function FullCard() {
  return (
    <Card data-testid="card">
      <CardHeader>
        <CardTitle>Meeting notes</CardTitle>
        <CardDescription>Weekly sync — engineering</CardDescription>
        <CardAction>
          <button type="button">Edit</button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Discussed Q3 roadmap and staffing.</p>
      </CardContent>
      <CardFooter>
        <button type="button">Archive</button>
      </CardFooter>
    </Card>
  );
}

describe("Card", () => {
  // --- composition: every part renders with its data-slot -------------------
  it("renders a full composition with all data-slots present", () => {
    render(<FullCard />);

    expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card");
    expect(screen.getByText("Meeting notes")).toHaveAttribute(
      "data-slot",
      "card-title"
    );
    expect(screen.getByText("Weekly sync — engineering")).toHaveAttribute(
      "data-slot",
      "card-description"
    );
    expect(
      screen.getByText("Discussed Q3 roadmap and staffing.").closest(
        '[data-slot="card-content"]'
      )
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Edit" }).closest(
        '[data-slot="card-action"]'
      )
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Archive" }).closest(
        '[data-slot="card-footer"]'
      )
    ).not.toBeNull();
    expect(
      screen.getByText("Meeting notes").closest('[data-slot="card-header"]')
    ).not.toBeNull();
  });

  it("renders children content", () => {
    render(<FullCard />);
    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
    expect(screen.getByText("Discussed Q3 roadmap and staffing.")).toBeInTheDocument();
  });

  // --- root element is a div for every part ----------------------------------
  it.each([
    ["Card", Card, "card"],
    ["CardHeader", CardHeader, "card-header"],
    ["CardTitle", CardTitle, "card-title"],
    ["CardDescription", CardDescription, "card-description"],
    ["CardAction", CardAction, "card-action"],
    ["CardContent", CardContent, "card-content"],
    ["CardFooter", CardFooter, "card-footer"],
  ] as const)("%s renders a <div> with data-slot=%s", (_label, Part, slot) => {
    render(<Part data-testid="part">content</Part>);
    const el = screen.getByTestId("part");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveAttribute("data-slot", slot);
  });

  // --- className merge: every part accepts and merges className -------------
  it.each([
    ["Card", Card],
    ["CardHeader", CardHeader],
    ["CardTitle", CardTitle],
    ["CardDescription", CardDescription],
    ["CardAction", CardAction],
    ["CardContent", CardContent],
    ["CardFooter", CardFooter],
  ] as const)("%s merges a caller-provided className", (_label, Part) => {
    render(
      <Part data-testid="part" className="custom-x">
        content
      </Part>
    );
    const el = screen.getByTestId("part");
    expect(el).toHaveClass("custom-x");
  });

  it("Card keeps its base classes when className is merged", () => {
    render(
      <Card data-testid="card" className="w-96">
        content
      </Card>
    );
    const el = screen.getByTestId("card");
    expect(el).toHaveClass("w-96", "bg-card", "rounded-lg", "shadow-4");
  });

  // --- heading semantics: CardTitle is a div, not a heading (matches shadcn) -
  it("CardTitle is a div, not an ARIA heading (matches current shadcn/ui)", () => {
    render(<CardTitle>Plain title</CardTitle>);
    const title = screen.getByText("Plain title");
    expect(title.tagName).toBe("DIV");
    expect(
      screen.queryByRole("heading", { name: "Plain title" })
    ).not.toBeInTheDocument();
  });

  // --- ref forwarding ----------------------------------------------------------
  it("forwards a ref to the underlying Card div (React 19 ref-as-prop)", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Card
        ref={(el) => {
          node = el;
        }}
      >
        Ref
      </Card>
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  // --- accessibility ----------------------------------------------------------
  it("has no axe violations (full composition)", async () => {
    const { container } = render(<FullCard />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (card without an action, header-only)", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Simple card</CardTitle>
          <CardDescription>No footer, no action.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Just content.</p>
        </CardContent>
      </Card>
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
