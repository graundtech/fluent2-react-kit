import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

/**
 * jsdom has no layout engine, so `Tabs.Indicator`'s `getBoundingClientRect`/
 * `offsetWidth` measurements are always `0`; Base UI treats that as "not
 * measured yet" and keeps the indicator `hidden` (see tabs.tsx divergence 3).
 * The indicator element itself still renders (`data-slot="tabs-indicator"`),
 * so structural assertions work — the sliding motion is a Playwright/manual
 * concern, not testable here. `ResizeObserver` is stubbed for the same reason
 * `select.test.tsx` stubs it: Base UI's layout listeners expect it to exist.
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

function FruitTabs({
  onValueChange,
  defaultValue = "apple",
  disableBanana = false,
}: {
  onValueChange?: (value: unknown, eventDetails: unknown) => void;
  defaultValue?: string;
  disableBanana?: boolean;
} = {}) {
  return (
    <Tabs defaultValue={defaultValue} onValueChange={onValueChange}>
      <TabsList aria-label="Fruit">
        <TabsTrigger value="apple">Apple</TabsTrigger>
        <TabsTrigger value="banana" disabled={disableBanana}>
          Banana
        </TabsTrigger>
        <TabsTrigger value="cherry">Cherry</TabsTrigger>
      </TabsList>
      <TabsContent value="apple">Apple panel</TabsContent>
      <TabsContent value="banana">Banana panel</TabsContent>
      <TabsContent value="cherry">Cherry panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs / TabsList / TabsTrigger / TabsContent", () => {
  // --- structure / semantics ------------------------------------------------

  it("renders tablist/tab/tabpanel roles", () => {
    render(<FruitTabs />);

    expect(screen.getByRole("tablist", { name: "Fruit" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    // only the active panel is rendered/visible
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Apple panel");
  });

  it("applies data-slot hooks on every rendered part", () => {
    render(<FruitTabs />);

    expect(screen.getByRole("tablist")).toHaveAttribute(
      "data-slot",
      "tabs-list"
    );
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute(
      "data-slot",
      "tabs-trigger"
    );
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "data-slot",
      "tabs-content"
    );
    // the sliding indicator (divergence 3) — hidden in jsdom (0-size layout)
    // but still present in the DOM
    expect(
      screen.getByRole("tablist").querySelector('[data-slot="tabs-indicator"]')
    ).toBeInTheDocument();
  });

  it("wires aria-selected on the active and inactive tabs", () => {
    render(<FruitTabs />);

    const [apple, banana, cherry] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    expect(apple).toHaveAttribute("aria-selected", "true");
    expect(banana).toHaveAttribute("aria-selected", "false");
    expect(cherry).toHaveAttribute("aria-selected", "false");
  });

  // --- default value / controlled -------------------------------------------

  it("honors defaultValue (uncontrolled)", () => {
    render(<FruitTabs defaultValue="cherry" />);

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Cherry panel");
    const cherry = screen.getAllByRole("tab")[2];
    expect(cherry).toHaveAttribute("aria-selected", "true");
  });

  it("supports a controlled value + onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function ControlledHarness() {
      const [value, setValue] = useState("apple");
      return (
        <Tabs
          value={value}
          onValueChange={(next, details) => {
            onValueChange(next, details);
            setValue(next as string);
          }}
        >
          <TabsList aria-label="Fruit">
            <TabsTrigger value="apple">Apple</TabsTrigger>
            <TabsTrigger value="banana">Banana</TabsTrigger>
          </TabsList>
          <TabsContent value="apple">Apple panel</TabsContent>
          <TabsContent value="banana">Banana panel</TabsContent>
        </Tabs>
      );
    }

    render(<ControlledHarness />);
    const [apple, banana] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(apple).toHaveAttribute("aria-selected", "true");

    await user.click(banana);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana", expect.anything());
    expect(banana).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Banana panel");
  });

  // --- click activation -------------------------------------------------------

  it("activates a tab and switches the visible panel on click", async () => {
    const user = userEvent.setup();
    render(<FruitTabs />);

    const [apple, , cherry] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    await user.click(cherry);

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Cherry panel");
    expect(cherry).toHaveAttribute("aria-selected", "true");
    expect(apple).toHaveAttribute("aria-selected", "false");
  });

  // --- keyboard: roving focus + manual activation (divergence 4) -------------

  it("roves focus with ArrowRight/ArrowLeft without activating (Base UI's manual-activation default)", async () => {
    const user = userEvent.setup();
    render(<FruitTabs />);

    const [apple, banana, cherry] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    apple.focus();
    expect(apple).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(banana).toHaveFocus();
    // focus moved but selection did not change (manual activation)
    expect(apple).toHaveAttribute("aria-selected", "true");
    expect(banana).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{ArrowLeft}");
    expect(apple).toHaveFocus();

    void cherry;
  });

  it("activates the focused tab with Enter (manual-activation default)", async () => {
    const user = userEvent.setup();
    render(<FruitTabs />);

    const [apple, banana] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
    ];
    apple.focus();
    await user.keyboard("{ArrowRight}");
    expect(banana).toHaveFocus();
    expect(banana).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{Enter}");
    expect(banana).toHaveAttribute("aria-selected", "true");
    expect(apple).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Banana panel");
  });

  it("loops focus from the last tab back to the first with ArrowRight", async () => {
    const user = userEvent.setup();
    render(<FruitTabs />);

    const [apple, , cherry] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    cherry.focus();
    await user.keyboard("{ArrowRight}");
    expect(apple).toHaveFocus();
  });

  // --- disabled ---------------------------------------------------------------

  it("skips a disabled tab on click", async () => {
    const user = userEvent.setup();
    render(<FruitTabs disableBanana />);

    const [, banana] = screen.getAllByRole("tab") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(banana).toHaveAttribute("data-disabled");
    expect(banana).toHaveAttribute("aria-disabled", "true");

    await user.click(banana);

    expect(banana).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Apple panel");
  });

  // --- className merge ----------------------------------------------------

  it("merges a caller className on TabsList without dropping base classes", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Fruit" className="custom-list">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A panel</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole("tablist")).toHaveClass(
      "custom-list",
      "flex",
      "border-b"
    );
  });

  it("merges a caller className on TabsTrigger without dropping base classes", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Fruit">
          <TabsTrigger value="a" className="custom-trigger">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a">A panel</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole("tab")).toHaveClass(
      "custom-trigger",
      "px-3",
      "text-sm"
    );
  });

  // --- ref forwarding -----------------------------------------------------

  it("forwards refs to the underlying list div, trigger button, and panel div", () => {
    let listNode: HTMLDivElement | null = null;
    let triggerNode: HTMLElement | null = null;
    let panelNode: HTMLDivElement | null = null;

    render(
      <Tabs defaultValue="a">
        <TabsList
          aria-label="Fruit"
          ref={(el) => {
            listNode = el;
          }}
        >
          <TabsTrigger
            value="a"
            ref={(el) => {
              triggerNode = el;
            }}
          >
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="a"
          ref={(el) => {
            panelNode = el;
          }}
        >
          A panel
        </TabsContent>
      </Tabs>
    );

    expect(listNode).toBeInstanceOf(HTMLDivElement);
    expect(triggerNode).toBeInstanceOf(HTMLButtonElement);
    expect(panelNode).toBeInstanceOf(HTMLDivElement);
  });

  // --- accessibility -----------------------------------------------------

  it("has no axe violations (default)", async () => {
    const { container } = render(<FruitTabs />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (disabled tab)", async () => {
    const { container } = render(<FruitTabs disableBanana />);
    await expect(container).toHaveNoAxeViolations();
  });
});
