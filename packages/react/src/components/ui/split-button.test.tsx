import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  SplitButton,
  SplitButtonAction,
  SplitButtonTrigger,
} from "./split-button";

/**
 * jsdom has no layout engine, so Base UI's floating-ui positioning
 * (`ResizeObserver`) and "scroll the highlighted item into view"
 * (`scrollIntoView`) are not implemented. Stub them so the menu composition can
 * open (mirrors `dropdown-menu.test.tsx`). Everything else — the two joined
 * buttons, click/keyboard independence, portalling, roving focus — runs for
 * real in jsdom.
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
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

/** The canonical Paste-style composition used across the menu tests. */
function PasteSplitButton({
  onPaste,
  onKeepText,
  variant,
  size,
  disabledAction,
  disabledTrigger,
}: {
  onPaste?: () => void;
  onKeepText?: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  disabledAction?: boolean;
  disabledTrigger?: boolean;
} = {}) {
  return (
    <DropdownMenu>
      <SplitButton variant={variant} size={size}>
        <SplitButtonAction onClick={onPaste} disabled={disabledAction}>
          Paste
        </SplitButtonAction>
        <DropdownMenuTrigger
          render={
            <SplitButtonTrigger
              aria-label="Paste options"
              disabled={disabledTrigger}
            />
          }
        />
      </SplitButton>
      <DropdownMenuContent>
        <DropdownMenuItem>Keep Source Formatting</DropdownMenuItem>
        <DropdownMenuItem>Merge Formatting</DropdownMenuItem>
        <DropdownMenuItem onClick={onKeepText}>Keep Text Only</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("SplitButton", () => {
  // --- structure / slots --------------------------------------------------

  it("renders a group with the two joined parts", () => {
    render(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("data-slot", "split-button");
    expect(group).toHaveClass("isolate", "inline-flex");

    const action = screen.getByRole("button", { name: "Paste" });
    expect(action.tagName).toBe("BUTTON");
    expect(action).toHaveAttribute("data-slot", "split-button-action");

    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("data-slot", "split-button-trigger");
  });

  it("joins the parts: Action is flat-right, Trigger is flat-left with a divider", () => {
    render(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    expect(screen.getByRole("button", { name: "Paste" })).toHaveClass(
      "rounded-r-none"
    );
    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger).toHaveClass("rounded-l-none", "-ml-px", "border-l");
  });

  it("renders the default chevron glyph as an aria-hidden inline svg", () => {
    render(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    const trigger = screen.getByRole("button", { name: "More options" });
    const svg = trigger.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  // --- variant / size sharing via context ---------------------------------

  it("shares the root variant + size with both parts", () => {
    render(
      <SplitButton variant="outline" size="sm">
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("data-variant", "outline");
    expect(group).toHaveAttribute("data-size", "sm");

    const action = screen.getByRole("button", { name: "Paste" });
    // outline signature + small height propagated from the root
    expect(action).toHaveClass("border-input", "h-6");
    expect(action).toHaveAttribute("data-variant", "outline");
    expect(action).toHaveAttribute("data-size", "sm");

    // Trigger maps size=sm -> the square icon-sm size, keeps outline variant
    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger).toHaveClass("border-input", "size-6");
    expect(trigger).toHaveAttribute("data-variant", "outline");
    expect(trigger).toHaveAttribute("data-size", "sm");
  });

  it("maps each shared size to the Trigger's matching square icon size", () => {
    const cases = [
      ["sm", "size-6"],
      ["default", "size-8"],
      ["lg", "size-10"],
    ] as const;
    for (const [size, squareClass] of cases) {
      const { unmount } = render(
        <SplitButton size={size}>
          <SplitButtonAction>Paste</SplitButtonAction>
          <SplitButtonTrigger />
        </SplitButton>
      );
      expect(screen.getByRole("button", { name: "More options" })).toHaveClass(
        squareClass
      );
      unmount();
    }
  });

  it("lets a part override the shared variant/size locally", () => {
    render(
      <SplitButton variant="default" size="default">
        <SplitButtonAction variant="destructive">Delete</SplitButtonAction>
        <SplitButtonTrigger size="sm" />
      </SplitButton>
    );
    const action = screen.getByRole("button", { name: "Delete" });
    expect(action).toHaveClass("bg-destructive");
    expect(action).toHaveAttribute("data-variant", "destructive");

    // trigger overrode size to sm -> square icon-sm even though root is default
    expect(screen.getByRole("button", { name: "More options" })).toHaveClass(
      "size-6"
    );
  });

  it("applies the per-variant divider color", () => {
    const { rerender } = render(
      <SplitButton variant="default">
        <SplitButtonAction>A</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    expect(screen.getByRole("button", { name: "More options" })).toHaveClass(
      "border-l-brand-60"
    );

    rerender(
      <SplitButton variant="outline">
        <SplitButtonAction>A</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    expect(screen.getByRole("button", { name: "More options" })).toHaveClass(
      "border-l-input"
    );
  });

  it("merges a caller className without dropping the join/variant classes", () => {
    render(
      <SplitButton className="custom-group">
        <SplitButtonAction className="custom-action">Paste</SplitButtonAction>
        <SplitButtonTrigger className="custom-trigger" />
      </SplitButton>
    );
    expect(screen.getByRole("group")).toHaveClass("custom-group", "inline-flex");
    expect(screen.getByRole("button", { name: "Paste" })).toHaveClass(
      "custom-action",
      "rounded-r-none",
      "bg-primary"
    );
    expect(screen.getByRole("button", { name: "More options" })).toHaveClass(
      "custom-trigger",
      "rounded-l-none"
    );
  });

  // --- accessible name of the icon-only trigger ---------------------------

  it("gives the icon-only Trigger a default accessible name that is overridable", () => {
    const { rerender } = render(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    expect(
      screen.getByRole("button", { name: "More options" })
    ).toBeInTheDocument();

    rerender(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger aria-label="Paste options" />
      </SplitButton>
    );
    expect(
      screen.getByRole("button", { name: "Paste options" })
    ).toBeInTheDocument();
  });

  it("a bare Trigger carries no menu state (haspopup/expanded come from composition)", () => {
    render(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger).not.toHaveAttribute("aria-haspopup");
    expect(trigger).not.toHaveAttribute("aria-expanded");
  });

  // --- interaction: independence ------------------------------------------

  it("fires the Action onClick without opening the menu", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<PasteSplitButton onPaste={onPaste} />);

    await user.click(screen.getByRole("button", { name: "Paste" }));

    expect(onPaste).toHaveBeenCalledTimes(1);
    // the Action must NOT open the menu
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Paste options" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("the Trigger opens the menu without firing the Action", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<PasteSplitButton onPaste={onPaste} />);

    const trigger = screen.getByRole("button", { name: "Paste options" });
    // aria-haspopup/aria-expanded arrive from the DropdownMenuTrigger composition
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(onPaste).not.toHaveBeenCalled();
  });

  it("selecting a menu item runs its handler and closes the menu", async () => {
    const user = userEvent.setup();
    const onKeepText = vi.fn();
    render(<PasteSplitButton onKeepText={onKeepText} />);

    const trigger = screen.getByRole("button", { name: "Paste options" });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    await user.click(screen.getByRole("menuitem", { name: "Keep Text Only" }));
    expect(onKeepText).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  // --- keyboard: two tab stops --------------------------------------------

  it("activates the Action with Enter and Space when focused", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<PasteSplitButton onPaste={onPaste} />);

    const action = screen.getByRole("button", { name: "Paste" });
    action.focus();
    expect(action).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onPaste).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(onPaste).toHaveBeenCalledTimes(2);
    // still no menu — the Action never opens it
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu from the Trigger via the keyboard (ArrowDown)", async () => {
    const user = userEvent.setup();
    render(<PasteSplitButton />);

    const trigger = screen.getByRole("button", { name: "Paste options" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");

    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("keeps the Action and Trigger as two separate tab stops", async () => {
    const user = userEvent.setup();
    render(
      <SplitButton>
        <SplitButtonAction>Paste</SplitButtonAction>
        <SplitButtonTrigger />
      </SplitButton>
    );
    const action = screen.getByRole("button", { name: "Paste" });
    const trigger = screen.getByRole("button", { name: "More options" });

    await user.tab();
    expect(action).toHaveFocus();
    await user.tab();
    expect(trigger).toHaveFocus();
  });

  // --- disabled: each part independent ------------------------------------

  it("a disabled Action is blocked while the Trigger still opens", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<PasteSplitButton onPaste={onPaste} disabledAction />);

    const action = screen.getByRole("button", { name: "Paste" });
    expect(action).toBeDisabled();
    await user.click(action);
    expect(onPaste).not.toHaveBeenCalled();

    const trigger = screen.getByRole("button", { name: "Paste options" });
    expect(trigger).not.toBeDisabled();
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
  });

  it("a disabled Trigger is blocked while the Action still fires", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<PasteSplitButton onPaste={onPaste} disabledTrigger />);

    const trigger = screen.getByRole("button", { name: "Paste options" });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const action = screen.getByRole("button", { name: "Paste" });
    expect(action).not.toBeDisabled();
    await user.click(action);
    expect(onPaste).toHaveBeenCalledTimes(1);
  });

  // --- ref forwarding ------------------------------------------------------

  it("forwards refs to both part buttons (React 19 ref-as-prop)", () => {
    let actionNode: HTMLButtonElement | null = null;
    let triggerNode: HTMLButtonElement | null = null;
    render(
      <SplitButton>
        <SplitButtonAction
          ref={(el) => {
            actionNode = el;
          }}
        >
          Paste
        </SplitButtonAction>
        <SplitButtonTrigger
          ref={(el) => {
            triggerNode = el;
          }}
        />
      </SplitButton>
    );
    expect(actionNode).toBeInstanceOf(HTMLButtonElement);
    expect(triggerNode).toBeInstanceOf(HTMLButtonElement);
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations (joined pair, closed)", async () => {
    const { container } = render(<PasteSplitButton />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations with the menu open", async () => {
    const user = userEvent.setup();
    render(<PasteSplitButton />);
    await user.click(screen.getByRole("button", { name: "Paste options" }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    // popup is portalled to <body>; disable the region rule (page-structure
    // concern, not a component one) — mirrors dropdown-menu.test.tsx.
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
