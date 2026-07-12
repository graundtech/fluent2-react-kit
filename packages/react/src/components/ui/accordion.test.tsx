import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

/**
 * jsdom has no layout engine, so Base UI's `ResizeObserver`-driven panel
 * height measurement (the `--accordion-panel-height` CSS var the component
 * doc comment documents) never runs for real. Stub `ResizeObserver` so the
 * panel mounts/unmounts without throwing — the actual pixel height and CSS
 * transition are a Playwright/visual concern (see the component's report),
 * not something jsdom can meaningfully assert.
 */
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  }
});

/** Canonical three-item FAQ accordion used across most tests. */
function FaqAccordion(props: Partial<ComponentProps<typeof Accordion>> = {}) {
  return (
    <Accordion {...props}>
      <AccordionItem value="a">
        <AccordionTrigger>Question A</AccordionTrigger>
        <AccordionContent>Answer A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Question B</AccordionTrigger>
        <AccordionContent>Answer B</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c" disabled>
        <AccordionTrigger>Question C (disabled)</AccordionTrigger>
        <AccordionContent>Answer C</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  // --- structure / slots --------------------------------------------------

  it("renders each trigger as a button with aria-expanded, inside an h3 header", () => {
    render(<FaqAccordion />);
    const trigger = screen.getByRole("button", { name: "Question A" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("data-slot", "accordion-trigger");
    expect(trigger.closest("h3")).toHaveAttribute(
      "data-slot",
      "accordion-header"
    );
  });

  it("applies data-slot hooks to root and item", () => {
    const { container } = render(<FaqAccordion />);
    expect(container.querySelector('[data-slot="accordion"]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-slot="accordion-item"]')
    ).toHaveLength(3);
  });

  it("does not render a panel for a closed item (unmounted by default)", () => {
    render(<FaqAccordion />);
    expect(screen.queryByText("Answer A")).not.toBeInTheDocument();
  });

  // --- opening / panel semantics -------------------------------------------

  it("opens a panel on click, exposing role=region labelled by the trigger", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const trigger = screen.getByRole("button", { name: "Question A" });

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Question A" });
    expect(region).toHaveAttribute("data-slot", "accordion-content");
    expect(region).toHaveTextContent("Answer A");
    expect(trigger).toHaveAttribute("aria-controls", region.id);
  });

  it("clicking again closes the panel", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const trigger = screen.getByRole("button", { name: "Question A" });

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  // --- keyboard activation --------------------------------------------------

  it("toggles via keyboard Enter when the trigger is focused", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const trigger = screen.getByRole("button", { name: "Question A" });

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles via keyboard Space when the trigger is focused", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const trigger = screen.getByRole("button", { name: "Question B" });

    trigger.focus();
    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("does not move focus between triggers on ArrowDown/ArrowUp (roving focus removed per updated APG guidance)", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const triggerA = screen.getByRole("button", { name: "Question A" });
    const triggerB = screen.getByRole("button", { name: "Question B" });

    triggerA.focus();
    expect(triggerA).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    // Base UI's accordion trigger has no arrow-key handler (see accordion.tsx
    // doc comment) — focus stays put rather than moving to the next trigger.
    expect(triggerA).toHaveFocus();
    expect(triggerB).not.toHaveFocus();
  });

  // --- single vs multiple ----------------------------------------------------

  it("single mode (default multiple=false): opening one item closes the other", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const triggerA = screen.getByRole("button", { name: "Question A" });
    const triggerB = screen.getByRole("button", { name: "Question B" });

    await user.click(triggerA);
    expect(triggerA).toHaveAttribute("aria-expanded", "true");

    await user.click(triggerB);
    expect(triggerB).toHaveAttribute("aria-expanded", "true");
    expect(triggerA).toHaveAttribute("aria-expanded", "false");
  });

  it("multiple mode: opening one item leaves the other open", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion multiple />);
    const triggerA = screen.getByRole("button", { name: "Question A" });
    const triggerB = screen.getByRole("button", { name: "Question B" });

    await user.click(triggerA);
    await user.click(triggerB);

    expect(triggerA).toHaveAttribute("aria-expanded", "true");
    expect(triggerB).toHaveAttribute("aria-expanded", "true");
  });

  it("supports a controlled value (array) + onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Accordion value={["a"]} onValueChange={onValueChange}>
        <AccordionItem value="a">
          <AccordionTrigger>Q A</AccordionTrigger>
          <AccordionContent>Ans A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Q B</AccordionTrigger>
          <AccordionContent>Ans B</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const triggerA = screen.getByRole("button", { name: "Q A" });
    expect(triggerA).toHaveAttribute("aria-expanded", "true");

    await user.click(triggerA);
    expect(onValueChange).toHaveBeenCalledWith([], expect.anything());
    // the caller never applied the update, so the controlled value holds
    expect(triggerA).toHaveAttribute("aria-expanded", "true");
  });

  // --- disabled item -----------------------------------------------------

  it("blocks a disabled item's trigger from opening on click", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const triggerC = screen.getByRole("button", {
      name: "Question C (disabled)",
    });

    expect(triggerC).toHaveAttribute("aria-disabled", "true");
    await user.click(triggerC);
    expect(triggerC).toHaveAttribute("aria-expanded", "false");
  });

  // --- chevron rotation ----------------------------------------------------

  it("carries data-panel-open on the trigger once its panel is open, driving the chevron's rotate class", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion />);
    const trigger = screen.getByRole("button", { name: "Question A" });

    expect(trigger).not.toHaveAttribute("data-panel-open");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("data-panel-open");

    const chevron = trigger.querySelector("svg");
    expect(chevron).toHaveClass("group-data-[panel-open]:rotate-180");
  });

  // --- className merge / ref -----------------------------------------------

  it("merges a caller className on AccordionItem without dropping base classes", () => {
    const { container } = render(
      <Accordion>
        <AccordionItem value="a" className="custom-item">
          <AccordionTrigger>Q</AccordionTrigger>
          <AccordionContent>A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const item = container.querySelector('[data-slot="accordion-item"]');
    expect(item).toHaveClass("custom-item", "border-b");
  });

  it("merges a caller className on AccordionContent's inner wrapper without dropping base classes", async () => {
    const user = userEvent.setup();
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>Q</AccordionTrigger>
          <AccordionContent className="custom-content">
            Body text
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    await user.click(screen.getByRole("button", { name: "Q" }));
    const region = screen.getByRole("region");
    const inner = region.firstElementChild;
    expect(inner).toHaveClass("custom-content", "pb-4", "text-muted-foreground");
  });

  it("forwards a ref to the underlying trigger button", () => {
    // Base UI types AccordionTrigger's ref as HTMLElement (not
    // HTMLButtonElement specifically), matching the compiled .d.ts.
    let node: HTMLElement | null = null;
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger
            ref={(el) => {
              node = el;
            }}
          >
            Q
          </AccordionTrigger>
          <AccordionContent>A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  // --- accessibility ---------------------------------------------------------

  it("has no axe violations (closed)", async () => {
    const { container } = render(<FaqAccordion />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (one item open)", async () => {
    const user = userEvent.setup();
    const { container } = render(<FaqAccordion />);
    await user.click(screen.getByRole("button", { name: "Question A" }));
    await expect(container).toHaveNoAxeViolations();
  });
});
