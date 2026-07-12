import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * jsdom has no layout engine, so Base UI's floating-ui positioning
 * (`ResizeObserver`) is not implemented. Stub it so the popup can open —
 * same workaround `select.test.tsx` documents. Everything else — portalling,
 * focus management, keyboard/pointer dismissal, `data-*` state hooks — runs
 * for real in jsdom.
 *
 * Unlike `Select`, `Popover.Trigger` opens directly on click (there's no
 * highlighted-item state to race against a zero-size portal), so these tests
 * open via `userEvent.click()` as well as the keyboard, covering both real
 * activation paths per conventions §5.
 *
 * "Closed" is asserted via `aria-expanded="false"` / the `dialog` role
 * leaving the accessibility tree, never DOM removal of the content node —
 * CSS transitions never fire `transitionend` in jsdom, so Base UI's popup
 * lingers in its exit state (hidden, not unmounted) after close.
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

/** The canonical popover used across most tests: a trigger button + a text field. */
function DemoPopover({
  onOpenChange,
  open,
  defaultOpen,
  modal,
}: {
  onOpenChange?: (open: boolean, eventDetails: unknown) => void;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
} = {}) {
  return (
    <Popover
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      <PopoverTrigger>Open popover</PopoverTrigger>
      <PopoverContent aria-label="Edit name">
        <label htmlFor="popover-name-field">Name</label>
        <input id="popover-name-field" />
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders the trigger as a button with the expected data-slot", () => {
    render(<DemoPopover />);
    const trigger = screen.getByRole("button", { name: "Open popover" });
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("data-slot", "popover-trigger");
  });

  it("wires aria-haspopup and aria-expanded on the trigger", () => {
    render(<DemoPopover />);
    const trigger = screen.getByRole("button", { name: "Open popover" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("is not in the accessibility tree when closed", () => {
    render(<DemoPopover />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("merges a caller className on the trigger without dropping it", () => {
    render(
      <Popover>
        <PopoverTrigger className="custom-trigger">Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );
    expect(screen.getByRole("button", { name: "Open" })).toHaveClass(
      "custom-trigger"
    );
  });

  it("forwards a ref to the underlying trigger button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Popover>
        <PopoverTrigger
          ref={(el) => {
            node = el;
          }}
        >
          Open
        </PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  it("composes with another component via the render prop (Base UI's asChild analogue)", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger render={<Button variant="outline">Open</Button>} />
        <PopoverContent aria-label="Content">Body</PopoverContent>
      </Popover>
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    // Base UI merges its own trigger props onto the rendered Button element —
    // no wrapper node, and Button's own variant styling survives the merge.
    expect(trigger).toHaveAttribute("data-slot", "popover-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveClass("border-input");

    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  // --- open: pointer ---------------------------------------------------------

  it("opens on trigger click", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    const trigger = screen.getByRole("button", { name: "Open popover" });

    await user.click(trigger);

    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // --- open: keyboard ----------------------------------------------------

  it("opens on Enter when the trigger is focused", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    const trigger = screen.getByRole("button", { name: "Open popover" });

    trigger.focus();
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens on Space when the trigger is focused", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    const trigger = screen.getByRole("button", { name: "Open popover" });

    trigger.focus();
    await user.keyboard(" ");

    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // --- content / role / structure (open) ----------------------------------

  it("renders the content as a non-modal dialog with the expected data-slot", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    await user.click(screen.getByRole("button", { name: "Open popover" }));

    const content = await screen.findByRole("dialog");
    expect(content).toHaveAttribute("data-slot", "popover-content");
    // non-modal: Base UI's `modal` defaults to false, so no aria-modal="true"
    expect(content).not.toHaveAttribute("aria-modal", "true");
  });

  it("moves focus into the popup on open", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    await user.click(screen.getByRole("button", { name: "Open popover" }));

    const content = await screen.findByRole("dialog");
    await waitFor(() => expect(content).toContainElement(document.activeElement as HTMLElement));
  });

  it("merges a caller className on the content without dropping base classes", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="custom-content">Body</PopoverContent>
      </Popover>
    );
    await user.click(screen.getByRole("button", { name: "Open" }));

    const content = await screen.findByRole("dialog");
    expect(content).toHaveClass("custom-content", "bg-popover", "shadow-16");
  });

  it("forwards a ref to the underlying content element", async () => {
    const user = userEvent.setup();
    let node: HTMLDivElement | null = null;
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent
          ref={(el) => {
            node = el;
          }}
        >
          Body
        </PopoverContent>
      </Popover>
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  // --- close ---------------------------------------------------------------

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    await user.click(screen.getByRole("button", { name: "Open popover" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DemoPopover />
        <button type="button">Outside</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: "Open popover" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  // --- controlled ------------------------------------------------------------

  it("supports a controlled open/onOpenChange pair", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function Controlled() {
      return <DemoPopover open={false} onOpenChange={onOpenChange} />;
    }
    render(<Controlled />);

    const trigger = screen.getByRole("button", { name: "Open popover" });
    await user.click(trigger);

    // open stays false (controlled from outside), but the change is reported
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders open when the controlled open prop is true", async () => {
    render(<DemoPopover open={true} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open popover" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations when closed", async () => {
    const { container } = render(<DemoPopover />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<DemoPopover />);
    await user.click(screen.getByRole("button", { name: "Open popover" }));
    await screen.findByRole("dialog");

    // The popup is portalled to <body>, so scope axe to the whole document
    // body. Disable the `region` best-practice rule: it flags page content
    // not wrapped in a landmark (`<main>` etc.), which is a page-structure
    // concern, not a component one — an isolated render legitimately has no
    // landmarks (same exemption `select.test.tsx` documents).
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
