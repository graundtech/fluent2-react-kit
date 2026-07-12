import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/**
 * jsdom has no layout engine, so Base UI's floating-ui positioning
 * (`ResizeObserver`) and its "scroll the highlighted item into view"
 * (`scrollIntoView`) are not implemented. Stub them so the popup can open.
 * Everything else — portalling, roving focus, keyboard nav, selection,
 * `data-*` state hooks — runs for real in jsdom.
 *
 * Documented jsdom limits (mirrors `select.test.tsx`):
 *
 * 1. **Opening is done via the keyboard where determinism matters.** Focusing
 *    the trigger and pressing `{ArrowDown}` opens the menu and highlights the
 *    first item deterministically; a `click`-open smoke test is included, but
 *    the rest of the suite uses `openWithKeyboard`. This still exercises the
 *    real keyboard-activation path conventions §5 requires.
 * 2. **"Closed" is asserted via `aria-expanded="false"` on the trigger.** CSS
 *    transitions never fire `transitionend` in jsdom, so Base UI's popup lingers
 *    in its exit state after close (it is *hidden*, not unmounted, in a real
 *    browser); `aria-expanded` on the trigger flips immediately. Submenu
 *    hover-open and the hidden-on-close/`display:none` behavior are deferred to
 *    Playwright (see the component report).
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

/**
 * Focus the trigger and open the menu with the keyboard (deterministic in
 * jsdom). `{ArrowDown}` opens the popup and highlights the first item. Returns
 * the trigger for follow-up assertions.
 */
async function openWithKeyboard(
  user: ReturnType<typeof userEvent.setup>
): Promise<HTMLElement> {
  const trigger = screen.getByRole("button", { name: "Open menu" });
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  return trigger;
}

/** The canonical actions menu used across most tests. */
function ActionsMenu({
  onSelect,
}: {
  onSelect?: (e: React.MouseEvent) => void;
} = {}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onSelect}>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders the trigger as a button with a menu haspopup and collapsed state", () => {
    render(<ActionsMenu />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("data-slot", "dropdown-menu-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("does not render the menu until it is opened", () => {
    render(<ActionsMenu />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // --- open (keyboard + pointer) ------------------------------------------

  it("opens with the keyboard and renders items in a menu", async () => {
    const user = userEvent.setup();
    render(<ActionsMenu />);
    const trigger = await openWithKeyboard(user);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(3);
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
      "data-slot",
      "dropdown-menu-item"
    );
  });

  it("opens on a pointer click as well", async () => {
    const user = userEvent.setup();
    render(<ActionsMenu />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await waitFor(() =>
      expect(screen.getByRole("menu")).toBeInTheDocument()
    );
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("exposes the content data-slot and surface classes", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent className="custom-content">
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);

    const content = document.querySelector(
      '[data-slot="dropdown-menu-content"]'
    );
    expect(content).toHaveClass("custom-content", "bg-popover", "shadow-16");
  });

  // --- selection / activation ---------------------------------------------

  it("clicking an item fires its handler and closes the menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ActionsMenu onSelect={onSelect} />);
    const trigger = await openWithKeyboard(user);

    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  // --- keyboard ------------------------------------------------------------

  it("arrow keys move the highlight and Enter activates the highlighted item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ActionsMenu onSelect={onSelect} />);
    const trigger = await openWithKeyboard(user);

    // ArrowDown opened the menu and highlighted the first item
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
        "data-highlighted"
      )
    );

    // ArrowDown moves the highlight to the second item
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "Duplicate" })
      ).toHaveAttribute("data-highlighted")
    );
    expect(screen.getByRole("menuitem", { name: "Edit" })).not.toHaveAttribute(
      "data-highlighted"
    );

    // ArrowUp back to the first, Enter commits it
    await user.keyboard("{ArrowUp}");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ActionsMenu />);
    const trigger = await openWithKeyboard(user);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  // --- disabled item -------------------------------------------------------

  it("a disabled item is marked disabled and does not fire on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem disabled onClick={onSelect}>
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);

    const disabled = screen.getByRole("menuitem", { name: "Archive" });
    expect(disabled).toHaveAttribute("data-disabled");
    expect(disabled).toHaveAttribute("aria-disabled", "true");

    await user.click(disabled);
    expect(onSelect).not.toHaveBeenCalled();
  });

  // --- checkbox items ------------------------------------------------------

  it("a checkbox item toggles its aria-checked state", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem defaultChecked={false}>
            Show grid
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);

    const box = screen.getByRole("menuitemcheckbox", { name: "Show grid" });
    expect(box).toHaveAttribute("data-slot", "dropdown-menu-checkbox-item");
    expect(box).toHaveAttribute("aria-checked", "false");
    // no check indicator svg while unchecked
    expect(box.querySelector("svg")).not.toBeInTheDocument();

    await user.click(box);
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemcheckbox", { name: "Show grid" })
      ).toHaveAttribute("aria-checked", "true")
    );
    // the CheckmarkRegular indicator mounts once checked
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "Show grid" })
        .querySelector("svg")
    ).toBeInTheDocument();
  });

  // --- radio group ---------------------------------------------------------

  it("selecting a radio item marks it checked and unchecks its siblings", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup defaultValue="list">
            <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);

    const list = screen.getByRole("menuitemradio", { name: "List" });
    const grid = screen.getByRole("menuitemradio", { name: "Grid" });
    expect(list).toHaveAttribute("data-slot", "dropdown-menu-radio-item");
    expect(list).toHaveAttribute("aria-checked", "true");
    expect(grid).toHaveAttribute("aria-checked", "false");

    await user.click(grid);
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemradio", { name: "Grid" })
      ).toHaveAttribute("aria-checked", "true")
    );
    expect(
      screen.getByRole("menuitemradio", { name: "List" })
    ).toHaveAttribute("aria-checked", "false");
  });

  // --- grouping / labels / separators / shortcut --------------------------

  it("renders groups, labels, separators and shortcuts with their data-slots", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              Edit
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Danger</DropdownMenuLabel>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);

    const labels = document.querySelectorAll(
      '[data-slot="dropdown-menu-label"]'
    );
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveTextContent("Actions");
    expect(labels[0]).toHaveClass("text-xs", "font-bold", "text-foreground-2");

    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]')
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-slot="dropdown-menu-group"]')
    ).toHaveLength(2);

    const shortcut = document.querySelector(
      '[data-slot="dropdown-menu-shortcut"]'
    );
    expect(shortcut).toHaveTextContent("⌘E");
    expect(shortcut).toHaveClass("ml-auto", "text-muted-foreground");
  });

  // --- prop-driven classes -------------------------------------------------

  it("inset and variant props emit their data hooks and classes", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem inset>Inset item</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          <DropdownMenuItem>Plain</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);

    const inset = screen.getByRole("menuitem", { name: "Inset item" });
    expect(inset).toHaveAttribute("data-inset");
    expect(inset).toHaveClass("data-[inset]:pl-8");

    const destructive = screen.getByRole("menuitem", { name: "Delete" });
    expect(destructive).toHaveAttribute("data-variant", "destructive");
    expect(destructive).toHaveClass("data-[variant=destructive]:text-destructive");

    const plain = screen.getByRole("menuitem", { name: "Plain" });
    expect(plain).toHaveAttribute("data-variant", "default");
    expect(plain).not.toHaveAttribute("data-inset");
  });

  it("merges a caller className on an item without dropping base classes", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="custom-item">Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);
    const item = screen.getByRole("menuitem", { name: "Edit" });
    expect(item).toHaveClass("custom-item", "rounded-md", "h-8");
  });

  it("forwards a ref to the underlying trigger button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={(el: HTMLElement | null) => {
            node = el as HTMLButtonElement | null;
          }}
        >
          Open menu
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations when closed", async () => {
    const { container } = render(<ActionsMenu />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem defaultChecked>
            Show grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup defaultValue="list">
            <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await openWithKeyboard(user);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // The popup is portalled to <body>, so scope axe to the whole document
    // body. Disable the `region` best-practice rule: it flags page content not
    // wrapped in a landmark, a page-structure concern, not a component one.
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
