import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

/**
 * jsdom has no layout engine. The palette renders its list INLINE (no
 * portal/positioner — `Autocomplete inline open`), so there is no floating-ui
 * positioning to stub, but Base UI still scrolls the highlighted item into view
 * and may consult `ResizeObserver`; stub both so keyboard nav runs.
 *
 * Everything the palette relies on — the always-open inline list, the built-in
 * text FILTER, roving highlight via `data-highlighted`, per-item `onClick` firing
 * on click and on Enter-when-highlighted, and `data-*` state hooks — runs for real
 * in jsdom. Two deferred paths (Playwright TODOs), mirroring select/combobox:
 * 1. **CommandDialog pointer-open** works here (the trigger is a plain toggling
 *    `<button>`, no zero-size-portal race), so both click and keyboard opens are
 *    covered; the dialog's exit ANIMATION unmount is the deferred bit.
 * 2. **"Dialog closed" is asserted via the `dialog` role leaving the a11y tree**,
 *    never element-count — CSS transitions never fire `transitionend` in jsdom.
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

/** Flat string items so the built-in filter matches on the string value. */
const COMMANDS = ["New File", "Open File", "Save", "Close Window"];

/** The canonical filterable palette used across most tests. */
function FilePalette({
  onItemClick,
}: {
  onItemClick?: (value: string) => void;
} = {}) {
  return (
    <Command items={COMMANDS}>
      <CommandInput aria-label="Command" placeholder="Type a command…" />
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandList>
        {(item: string) => (
          <CommandItem key={item} onClick={() => onItemClick?.(item)}>
            {item}
          </CommandItem>
        )}
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  // --- structure / slots ---------------------------------------------------

  it("renders the palette panel, a search input, and the always-open list", () => {
    render(<FilePalette />);
    // panel
    const panel = document.querySelector('[data-slot="command"]');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass("bg-popover", "border", "flex-col");
    // input row + input
    const input = screen.getByRole("combobox", { name: "Command" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("data-slot", "command-input");
    expect(
      document.querySelector('[data-slot="command-input-wrapper"]')
    ).toBeInTheDocument();
    // the leading search icon
    expect(
      document
        .querySelector('[data-slot="command-input-wrapper"]')
        ?.querySelector("svg")
    ).toBeInTheDocument();
    // the list is open with no interaction (inline open)
    const list = screen.getByRole("listbox");
    expect(list).toHaveAttribute("data-slot", "command-list");
    expect(screen.getAllByRole("option")).toHaveLength(COMMANDS.length);
  });

  it("merges caller className on the panel, wrapperClassName on the row, and className on the input", () => {
    render(
      <Command items={COMMANDS} className="custom-panel w-96">
        <CommandInput
          aria-label="X"
          className="custom-input"
          wrapperClassName="custom-row"
        />
        <CommandList>
          {(item: string) => <CommandItem key={item}>{item}</CommandItem>}
        </CommandList>
      </Command>
    );
    expect(document.querySelector('[data-slot="command"]')).toHaveClass(
      "custom-panel",
      "w-96",
      "bg-popover"
    );
    expect(
      document.querySelector('[data-slot="command-input-wrapper"]')
    ).toHaveClass("custom-row", "border-b");
    expect(screen.getByRole("combobox")).toHaveClass(
      "custom-input",
      "bg-transparent"
    );
  });

  it("forwards a ref to the underlying input element", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Command items={COMMANDS}>
        <CommandInput
          aria-label="R"
          ref={(el) => {
            node = el;
          }}
        />
        <CommandList>
          {(item: string) => <CommandItem key={item}>{item}</CommandItem>}
        </CommandList>
      </Command>
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
    expect(node).toHaveAttribute("data-slot", "command-input");
  });

  // --- filtering -----------------------------------------------------------

  it("typing filters the list down to matches", async () => {
    const user = userEvent.setup();
    render(<FilePalette />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.type(input, "File");
    // "New File" + "Open File" match; "Save" + "Close Window" drop out
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    expect(
      screen.getByRole("option", { name: "New File" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Save" })
    ).not.toBeInTheDocument();
  });

  it("renders the Empty part when nothing matches", async () => {
    const user = userEvent.setup();
    render(<FilePalette />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.type(input, "zzz");
    await waitFor(() =>
      expect(screen.queryByRole("option")).not.toBeInTheDocument()
    );
    const empty = document.querySelector('[data-slot="command-empty"]');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent("No results found.");
  });

  // --- item actions --------------------------------------------------------

  it("clicking an item fires its onClick handler", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(<FilePalette onItemClick={onItemClick} />);

    await user.click(screen.getByRole("option", { name: "Save" }));
    expect(onItemClick).toHaveBeenCalledWith("Save");
  });

  it("ArrowDown highlights, moves, and Enter fires the highlighted item's handler", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(<FilePalette onItemClick={onItemClick} />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "New File" })).toHaveAttribute(
        "data-highlighted"
      )
    );

    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Open File" })).toHaveAttribute(
        "data-highlighted"
      )
    );
    expect(
      screen.getByRole("option", { name: "New File" })
    ).not.toHaveAttribute("data-highlighted");

    await user.keyboard("{Enter}");
    expect(onItemClick).toHaveBeenCalledWith("Open File");
  });

  it("End highlights the last item (Home/End are wired by the engine)", async () => {
    const user = userEvent.setup();
    render(<FilePalette />);
    const input = screen.getByRole("combobox");
    input.focus();
    await user.keyboard("{ArrowDown}");

    await user.keyboard("{End}");
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Close Window" })
      ).toHaveAttribute("data-highlighted")
    );
  });

  // --- disabled item -------------------------------------------------------

  it("a disabled item is marked disabled and does not fire on click", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(
      <Command>
        <CommandInput aria-label="Command" />
        <CommandList>
          <CommandItem onClick={() => onItemClick("a")}>Enabled</CommandItem>
          <CommandItem disabled onClick={() => onItemClick("b")}>
            Disabled
          </CommandItem>
        </CommandList>
      </Command>
    );

    const disabled = screen.getByRole("option", { name: "Disabled" });
    expect(disabled).toHaveAttribute("data-disabled");
    expect(disabled).toHaveAttribute("aria-disabled", "true");

    await user.click(disabled);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  // --- groups / labels / separators / shortcut -----------------------------

  it("renders groups with headings, a separator and a shortcut, each with data-slots", () => {
    render(
      <Command>
        <CommandInput aria-label="Command" />
        <CommandList>
          <CommandGroup heading="Files">
            <CommandItem>
              New File
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Edit">
            <CommandItem>Undo</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    const groups = document.querySelectorAll('[data-slot="command-group"]');
    expect(groups).toHaveLength(2);
    const headings = document.querySelectorAll(
      '[data-slot="command-group-heading"]'
    );
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent("Files");
    expect(headings[0]).toHaveClass("text-xs", "font-bold", "text-foreground-2");
    expect(
      document.querySelector('[data-slot="command-separator"]')
    ).toBeInTheDocument();
    const shortcut = document.querySelector('[data-slot="command-shortcut"]');
    expect(shortcut).toHaveTextContent("⌘N");
    expect(shortcut).toHaveClass("ml-auto", "text-muted-foreground");
  });

  it("merges a caller className on an item without dropping base classes", () => {
    render(
      <Command>
        <CommandInput aria-label="Command" />
        <CommandList>
          <CommandItem className="custom-item">Only</CommandItem>
        </CommandList>
      </Command>
    );
    const item = screen.getByRole("option", { name: "Only" });
    expect(item).toHaveClass("custom-item", "rounded-md", "h-8");
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations (standalone palette)", async () => {
    const { container } = render(<FilePalette />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe("CommandDialog", () => {
  function DialogPalette({
    onOpenChange,
    defaultOpen,
  }: {
    onOpenChange?: (open: boolean, details: unknown) => void;
    defaultOpen?: boolean;
  } = {}) {
    return (
      <CommandDialog
        onOpenChange={onOpenChange}
        defaultOpen={defaultOpen}
        trigger={<button type="button">Open palette</button>}
      >
        <CommandInput aria-label="Command" placeholder="Type a command…" />
        <CommandList>
          <CommandItem>New File</CommandItem>
        </CommandList>
      </CommandDialog>
    );
  }

  it("stays closed until the trigger is used; no palette in the tree", () => {
    render(<DialogPalette />);
    expect(
      screen.getByRole("button", { name: "Open palette" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("opens on trigger click and contains the palette with an accessible (sr-only) title", async () => {
    const user = userEvent.setup();
    render(<DialogPalette />);

    await user.click(screen.getByRole("button", { name: "Open palette" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Command Palette",
    });
    expect(dialog).toBeInTheDocument();
    // the palette lives inside the dialog
    expect(screen.getByRole("combobox", { name: "Command" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "New File" })).toBeInTheDocument();
    // the title is present but visually hidden
    const title = document.querySelector('[data-slot="dialog-title"]');
    expect(title).toHaveTextContent("Command Palette");
    expect(title?.closest('[data-slot="dialog-header"]')).toHaveClass("sr-only");
  });

  it("opens via the keyboard (Enter on the focused trigger)", async () => {
    const user = userEvent.setup();
    render(<DialogPalette />);
    const trigger = screen.getByRole("button", { name: "Open palette" });

    trigger.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DialogPalette onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open palette" }));
    await screen.findByRole("dialog");
    onOpenChange.mockClear();

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<DialogPalette />);
    await user.click(screen.getByRole("button", { name: "Open palette" }));
    await screen.findByRole("dialog");
    // The dialog is portalled to <body>; scope axe to the whole body and disable
    // the `region` best-practice rule (page-structure concern, not a component
    // one — an isolated render has no landmarks).
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
