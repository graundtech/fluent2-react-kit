import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

/**
 * jsdom has no layout engine, so Base UI's floating-ui positioning
 * (`ResizeObserver`) is not implemented. Stub it so the popup can mount.
 *
 * Base UI's Tooltip is hover/focus driven. Hover relies on `restMs` timers
 * layered on top of real pointer coordinates/`getBoundingClientRect`, which
 * jsdom cannot simulate meaningfully — per the Select precedent, that path is
 * a Playwright concern (see the component's report). **Every test here opens
 * via the keyboard-equivalent focus path** (`trigger.focus()`): Base UI's
 * `useFocus` interaction (tooltip.tsx's "use client" note / trigger source)
 * opens with no artificial delay regardless of `TooltipProvider`'s `delay`,
 * so it is deterministic in jsdom. `TooltipProvider delay={0}` is still used
 * throughout for clarity/consistency, even though the focus path ignores it.
 *
 * Base UI also never fires `transitionend` in jsdom (same root cause as
 * `select.test.tsx`), so once a tooltip has mounted once, closing it again
 * leaves the popup element lingering in the DOM in its exit state instead of
 * being removed. "Closed" is therefore asserted through Base UI's presence
 * data attributes (`data-popup-open` on the trigger, `data-closed` on the
 * content) rather than role/DOM removal — the same adaptation
 * `select.test.tsx` makes for `aria-expanded`.
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

/** The canonical tooltip used across most tests. */
function BasicTooltip({
  onOpenChange,
  defaultOpen,
}: {
  onOpenChange?: (open: boolean, eventDetails: unknown) => void;
  defaultOpen?: boolean;
} = {}) {
  return (
    <TooltipProvider delay={0} closeDelay={0}>
      <Tooltip onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful hint</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Focus the trigger to open the tooltip — the deterministic jsdom path. */
async function openWithFocus(): Promise<HTMLElement> {
  const trigger = screen.getByRole("button");
  trigger.focus();
  await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
  return trigger;
}

describe("Tooltip", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders the trigger as a button and no tooltip content while closed", () => {
    render(<BasicTooltip />);
    const trigger = screen.getByRole("button", { name: "Hover me" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("data-slot", "tooltip-trigger");
    expect(trigger).not.toHaveAttribute("data-popup-open");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("merges a caller className on the trigger without dropping props", () => {
    render(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger className="custom-trigger">Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByRole("button")).toHaveClass("custom-trigger");
  });

  it("forwards a ref to the underlying trigger button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            ref={(el) => {
              node = el;
            }}
          >
            Trigger
          </TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  // --- open (focus path) ----------------------------------------------------

  it("shows the tooltip on focus, exposing role=tooltip and the kit's data-slot", async () => {
    render(<BasicTooltip />);
    await openWithFocus();

    const content = screen.getByRole("tooltip");
    expect(content).toHaveTextContent("Helpful hint");
    expect(content).toHaveAttribute("data-slot", "tooltip-content");
  });

  it("marks the trigger with Base UI's open presence attribute while shown", async () => {
    render(<BasicTooltip />);
    const trigger = await openWithFocus();
    expect(trigger).toHaveAttribute("data-popup-open");
  });

  it("merges a caller className on the content without dropping base classes", async () => {
    render(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent className="custom-content">Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    screen.getByRole("button").focus();
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveClass(
        "custom-content",
        "bg-popover",
        "shadow-8"
      )
    );
  });

  it("forwards a ref to the underlying content element", async () => {
    let node: HTMLDivElement | null = null;
    render(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent
            ref={(el) => {
              node = el;
            }}
          >
            Content
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    screen.getByRole("button").focus();
    await waitFor(() => expect(node).toBeInstanceOf(HTMLDivElement));
  });

  // --- close ------------------------------------------------------------

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);
    const trigger = await openWithFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).not.toHaveAttribute("data-popup-open"));
  });

  it("fires onOpenChange(true) on focus-open and onOpenChange(false) on Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<BasicTooltip onOpenChange={onOpenChange} />);
    await openWithFocus();
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
    );
  });

  // --- controlled open -----------------------------------------------------

  it("respects a controlled open prop", () => {
    const { rerender } = render(
      <TooltipProvider delay={0}>
        <Tooltip open={false}>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    rerender(
      <TooltipProvider delay={0}>
        <Tooltip open={true}>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  // --- description linkage recipe -------------------------------------------

  it("supports the documented id + aria-describedby linkage recipe (Base UI does not wire this automatically)", async () => {
    render(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger aria-describedby="tip-content">Trigger</TooltipTrigger>
          <TooltipContent id="tip-content">Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-describedby", "tip-content");

    trigger.focus();
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveAttribute("id", "tip-content")
    );
  });

  // --- accessibility ---------------------------------------------------------

  it("has no axe violations when closed", async () => {
    const { container } = render(<BasicTooltip />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    render(<BasicTooltip />);
    await openWithFocus();
    // The popup is portalled to <body>, so scope axe to the whole document
    // body (same rationale as select.test.tsx). Disable the `region`
    // best-practice rule: it flags page content not wrapped in a landmark,
    // a page-structure concern, not a component one.
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
