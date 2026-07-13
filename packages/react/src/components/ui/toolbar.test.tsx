import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
} from "./toolbar";

/**
 * Base UI's composite (roving-tabindex) root attaches layout listeners that
 * expect `ResizeObserver` to exist; jsdom has none — the same stub
 * `select.test.tsx` / `tabs.test.tsx` install.
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

/** A realistic formatting toolbar exercising every part. */
function FormattingToolbar({
  orientation,
  disableUnderline = false,
}: {
  orientation?: "horizontal" | "vertical";
  disableUnderline?: boolean;
} = {}) {
  return (
    <Toolbar aria-label="Text formatting" orientation={orientation}>
      <ToolbarGroup aria-label="Font style">
        <ToolbarButton size="icon" aria-label="Bold">
          B
        </ToolbarButton>
        <ToolbarButton size="icon" aria-label="Italic">
          I
        </ToolbarButton>
        <ToolbarButton size="icon" aria-label="Underline" disabled={disableUnderline}>
          U
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarInput aria-label="Font size" defaultValue="12" />
      <ToolbarSeparator />
      <ToolbarLink href="#help">Help</ToolbarLink>
    </Toolbar>
  );
}

/** Three plain buttons — a predictable fixture for keyboard-navigation tests. */
function ThreeButtonToolbar({
  onClick,
  disableSecond = false,
  trailing = false,
}: {
  onClick?: () => void;
  disableSecond?: boolean;
  trailing?: boolean;
}) {
  return (
    <>
      <Toolbar aria-label="Items">
        <ToolbarButton onClick={onClick}>First</ToolbarButton>
        <ToolbarButton disabled={disableSecond} onClick={onClick}>
          Second
        </ToolbarButton>
        <ToolbarButton onClick={onClick}>Third</ToolbarButton>
      </Toolbar>
      {trailing ? <button type="button">After</button> : null}
    </>
  );
}

describe("Toolbar", () => {
  // --- structure / semantics -------------------------------------------------
  it("renders role=toolbar with the consumer-supplied accessible name", () => {
    render(
      <Toolbar aria-label="Text formatting">
        <ToolbarButton>Bold</ToolbarButton>
      </Toolbar>
    );
    const toolbar = screen.getByRole("toolbar", { name: "Text formatting" });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.tagName).toBe("DIV");
  });

  it("gives every part its data-slot hook", () => {
    render(<FormattingToolbar />);
    expect(screen.getByRole("toolbar")).toHaveAttribute("data-slot", "toolbar");
    expect(screen.getByRole("group")).toHaveAttribute(
      "data-slot",
      "toolbar-group"
    );
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "data-slot",
      "toolbar-button"
    );
    expect(screen.getByRole("textbox", { name: "Font size" })).toHaveAttribute(
      "data-slot",
      "toolbar-input"
    );
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute(
      "data-slot",
      "toolbar-link"
    );
    const separators = screen.getAllByRole("separator");
    expect(separators).toHaveLength(2);
    expect(separators[0]).toHaveAttribute("data-slot", "toolbar-separator");
  });

  it("renders each part as its expected native element", () => {
    render(<FormattingToolbar />);
    expect(screen.getByRole("button", { name: "Bold" }).tagName).toBe("BUTTON");
    expect(screen.getByRole("link", { name: "Help" }).tagName).toBe("A");
    expect(screen.getByRole("textbox", { name: "Font size" }).tagName).toBe(
      "INPUT"
    );
    expect(screen.getByRole("group").tagName).toBe("DIV");
  });

  // --- ToolbarButton variant/size (reused buttonVariants) --------------------
  it("defaults ToolbarButton to the Fluent subtle (ghost) button", () => {
    render(
      <Toolbar aria-label="t">
        <ToolbarButton>X</ToolbarButton>
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "X" });
    expect(button).toHaveClass("hover:bg-accent");
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-size", "default");
  });

  it.each([
    ["default", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["outline", "border-input"],
    ["ghost", "hover:bg-accent"],
    ["destructive", "bg-destructive"],
    ["link", "underline-offset-4"],
  ] as const)("ToolbarButton variant=%s applies %s", (variant, signature) => {
    render(
      <Toolbar aria-label="t">
        <ToolbarButton variant={variant}>V</ToolbarButton>
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "V" });
    expect(button).toHaveClass(signature);
    expect(button).toHaveAttribute("data-variant", variant);
  });

  it.each([
    ["default", "h-8"],
    ["sm", "h-6"],
    ["lg", "h-10"],
    ["icon", "size-8"],
  ] as const)("ToolbarButton size=%s applies %s", (size, signature) => {
    render(
      <Toolbar aria-label="t">
        <ToolbarButton size={size}>S</ToolbarButton>
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "S" });
    expect(button).toHaveClass(signature);
    expect(button).toHaveAttribute("data-size", size);
  });

  // --- className merge -------------------------------------------------------
  it("merges a caller className on the root, letting it win over base utilities", () => {
    render(
      <Toolbar aria-label="t" className="w-full custom-x">
        <ToolbarButton>X</ToolbarButton>
      </Toolbar>
    );
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveClass("w-full", "custom-x", "flex", "items-center");
    // twMerge drops the base `w-fit` when the caller passes `w-full`
    expect(toolbar.className).not.toContain("w-fit");
  });

  it("merges a caller className on ToolbarButton without dropping variant classes", () => {
    render(
      <Toolbar aria-label="t">
        <ToolbarButton className="custom-y">X</ToolbarButton>
      </Toolbar>
    );
    expect(screen.getByRole("button", { name: "X" })).toHaveClass(
      "custom-y",
      "hover:bg-accent"
    );
  });

  // --- interaction -----------------------------------------------------------
  it("fires a ToolbarButton onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="t">
        <ToolbarButton onClick={onClick}>Click me</ToolbarButton>
      </Toolbar>
    );
    await user.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates a ToolbarButton via keyboard (Enter / Space)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="t">
        <ToolbarButton onClick={onClick}>Press</ToolbarButton>
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "Press" });
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  // --- disabled --------------------------------------------------------------
  it("marks a disabled ToolbarButton with aria-disabled (not the native attribute) and blocks activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="t">
        <ToolbarButton disabled onClick={onClick}>
          Nope
        </ToolbarButton>
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "Nope" });
    // Base UI keeps it focusable-when-disabled: aria-disabled, no native disabled
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("ToolbarGroup disabled disables every item inside it", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="t">
        <ToolbarGroup disabled>
          <ToolbarButton onClick={onClick}>In group</ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "In group" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  // --- keyboard: single tab stop + roving focus (APG toolbar pattern) --------
  it("is a single tab stop — Tab enters the toolbar then leaves past all items", async () => {
    const user = userEvent.setup();
    render(<ThreeButtonToolbar trailing />);

    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    // one more Tab jumps straight to the element after the toolbar, proving the
    // three items share one tab stop rather than three
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("moves focus between items with ArrowRight / ArrowLeft", async () => {
    const user = userEvent.setup();
    render(<ThreeButtonToolbar />);
    const [first, second] = screen.getAllByRole("button") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];

    first.focus();
    expect(first).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(first).toHaveFocus();
  });

  it("wraps focus around the ends with the arrow keys (loopFocus default)", async () => {
    const user = userEvent.setup();
    render(<ThreeButtonToolbar />);
    const [first, , third] = screen.getAllByRole("button") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];

    // ArrowLeft from the first item wraps to the last
    first.focus();
    await user.keyboard("{ArrowLeft}");
    expect(third).toHaveFocus();

    // ArrowRight from the last item wraps back to the first
    await user.keyboard("{ArrowRight}");
    expect(first).toHaveFocus();
  });

  it("keeps disabled items reachable by arrow keys but not activatable", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ThreeButtonToolbar onClick={onClick} disableSecond />);
    const [first, second] = screen.getAllByRole("button") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];

    first.focus();
    await user.keyboard("{ArrowRight}");
    // the disabled item is still landed on (focusableWhenDisabled default)
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-disabled", "true");

    await user.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("returns focus to the last-focused item on re-entry (roving memory)", async () => {
    const user = userEvent.setup();
    render(<ThreeButtonToolbar trailing />);
    const [first, second] = screen.getAllByRole("button") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];

    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();

    await user.tab(); // leave the toolbar
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();

    await user.tab({ shift: true }); // re-enter — lands on the last-focused item
    expect(second).toHaveFocus();
  });

  // --- orientation -----------------------------------------------------------
  it("defaults to horizontal orientation, with a perpendicular (vertical) separator", () => {
    render(<FormattingToolbar />);
    expect(screen.getByRole("toolbar")).toHaveAttribute(
      "data-orientation",
      "horizontal"
    );
    // Base UI renders the separator perpendicular to the toolbar
    expect(screen.getAllByRole("separator")[0]).toHaveAttribute(
      "data-orientation",
      "vertical"
    );
  });

  it("passes orientation=vertical through to data-orientation / aria-orientation", () => {
    render(<FormattingToolbar orientation="vertical" />);
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveAttribute("data-orientation", "vertical");
    expect(toolbar).toHaveAttribute("aria-orientation", "vertical");
    expect(toolbar).toHaveClass("data-[orientation=vertical]:flex-col");
    // separator flips to horizontal in a vertical toolbar
    expect(screen.getAllByRole("separator")[0]).toHaveAttribute(
      "data-orientation",
      "horizontal"
    );
  });

  // --- composition via Base UI's render prop (not asChild) -------------------
  it("composes through Base UI's render prop, merging data-slot + styling onto the element", () => {
    render(
      <Toolbar aria-label="t">
        <ToolbarButton
          className="wrapper-cls"
          render={<button type="button">Composed</button>}
        />
      </Toolbar>
    );
    const button = screen.getByRole("button", { name: "Composed" });
    expect(button.tagName).toBe("BUTTON");
    // the rendered element's own prop survives
    expect(button).toHaveAttribute("type", "button");
    // the wrapper's data-slot + ghost styling + caller className are merged on
    expect(button).toHaveAttribute("data-slot", "toolbar-button");
    expect(button).toHaveClass("wrapper-cls", "hover:bg-accent");
  });

  // --- ref forwarding --------------------------------------------------------
  it("forwards a ref to the underlying toolbar div", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Toolbar
        aria-label="t"
        ref={(el) => {
          node = el;
        }}
      >
        <ToolbarButton>X</ToolbarButton>
      </Toolbar>
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("forwards a ref to the underlying ToolbarButton", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Toolbar aria-label="t">
        <ToolbarButton
          ref={(el) => {
            node = el;
          }}
        >
          X
        </ToolbarButton>
      </Toolbar>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  it("forwards a ref to the underlying ToolbarInput", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Toolbar aria-label="t">
        <ToolbarInput
          aria-label="Field"
          ref={(el) => {
            node = el;
          }}
        />
      </Toolbar>
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
  });

  // --- accessibility ---------------------------------------------------------
  it("has no axe violations (default horizontal toolbar)", async () => {
    const { container } = render(<FormattingToolbar />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (vertical, with a disabled item)", async () => {
    const { container } = render(
      <FormattingToolbar orientation="vertical" disableUnderline />
    );
    await expect(container).toHaveNoAxeViolations();
  });
});
