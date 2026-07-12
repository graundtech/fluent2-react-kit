import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "./combobox";

/**
 * jsdom has no layout engine, so Base UI's floating-ui positioning
 * (`ResizeObserver`) and "scroll the highlighted item into view"
 * (`scrollIntoView`) aren't implemented — stub them so the popup can open.
 * Everything else — portalling, roving focus, keyboard nav, the built-in
 * text FILTER, selection, `data-*` state hooks — runs for real in jsdom.
 *
 * Same two jsdom limits as select.test.tsx apply:
 * 1. **Opening is driven from the keyboard/typing, not a bare pointer click on a
 *    zero-size portal.** Focusing the input and pressing `{ArrowDown}` (or
 *    typing) opens it deterministically; that still exercises the real keyboard
 *    path conventions §5 requires. Pointer-open is a Playwright TODO.
 * 2. **"Closed" is asserted via `aria-expanded="false"`, never listbox removal.**
 *    CSS transitions never fire `transitionend` in jsdom, so the popup lingers in
 *    its exit state after close; `aria-expanded` flips immediately.
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

/** Flat string items so `onValueChange` receives clean string values. */
const FRUITS = ["Apple", "Banana", "Cherry", "Dragonfruit"];

/** The canonical filterable fruit combobox used across most tests. */
function FruitCombobox({
  onValueChange,
  defaultValue,
}: {
  onValueChange?: (value: string | null, eventDetails: unknown) => void;
  defaultValue?: string;
} = {}) {
  return (
    <Combobox
      items={FRUITS}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
    >
      <ComboboxInput aria-label="Fruit" placeholder="Search a fruit" />
      <ComboboxContent>
        <ComboboxEmpty>No fruits found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Focus the input and open the popup with ArrowDown (deterministic in jsdom). */
async function openWithKeyboard(
  user: ReturnType<typeof userEvent.setup>
): Promise<HTMLElement> {
  const input = screen.getByRole("combobox");
  input.focus();
  await user.keyboard("{ArrowDown}");
  return input;
}

describe("Combobox", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders the field as a combobox input with the right slots and ARIA", () => {
    render(<FruitCombobox />);
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("data-slot", "combobox-input");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    // the composed field wrapper is present
    expect(
      document.querySelector('[data-slot="combobox-input-wrapper"]')
    ).toBeInTheDocument();
    // the chevron trigger is baked into the field
    expect(
      screen.getByRole("button", { name: "Show options" })
    ).toBeInTheDocument();
  });

  it("merges caller className on the input and wrapperClassName on the wrapper", () => {
    render(
      <Combobox items={FRUITS}>
        <ComboboxInput
          aria-label="X"
          className="custom-input"
          wrapperClassName="w-72 custom-wrapper"
        />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveClass("custom-input", "flex-1", "bg-transparent");
    const wrapper = document.querySelector(
      '[data-slot="combobox-input-wrapper"]'
    );
    expect(wrapper).toHaveClass("w-72", "custom-wrapper", "h-8", "border-input");
  });

  it("forwards a ref to the underlying input element", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Combobox items={FRUITS}>
        <ComboboxInput
          aria-label="R"
          ref={(el) => {
            node = el;
          }}
        />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
    expect(node).toHaveAttribute("data-slot", "combobox-input");
  });

  it("passes aria-invalid through to the input", () => {
    render(
      <Combobox items={FRUITS}>
        <ComboboxInput aria-label="Inv" aria-invalid />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  // --- open / options ------------------------------------------------------

  it("opens and renders all options in a listbox", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox />);
    const input = await openWithKeyboard(user);

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(FRUITS.length);
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
      "data-slot",
      "combobox-item"
    );
    // the scrollable list carries its slot
    expect(
      document.querySelector('[data-slot="combobox-list"]')
    ).toBeInTheDocument();
  });

  // --- filtering (the point of a combobox) --------------------------------

  it("typing filters the list down to matches", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.type(input, "an");
    // "Banana" (an) is the only match; Apple/Cherry/Dragonfruit drop out
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
    expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Apple" })
    ).not.toBeInTheDocument();
  });

  it("renders the Empty part when nothing matches", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.type(input, "zzz");
    await waitFor(() =>
      expect(screen.queryByRole("option")).not.toBeInTheDocument()
    );
    const empty = document.querySelector('[data-slot="combobox-empty"]');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent("No fruits found.");
  });

  // --- selection -----------------------------------------------------------

  it("selecting an option fires onValueChange, fills the input, and closes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitCombobox onValueChange={onValueChange} />);
    const input = await openWithKeyboard(user);

    await user.click(screen.getByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledWith("Banana", expect.anything());
    expect(input).toHaveValue("Banana");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
  });

  it("marks the selected option and renders its check indicator", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox defaultValue="Banana" />);
    await openWithKeyboard(user);

    const selected = screen.getByRole("option", { name: "Banana" });
    const unselected = screen.getByRole("option", { name: "Apple" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(selected.querySelector("svg")).toBeInTheDocument();
    expect(unselected).toHaveAttribute("aria-selected", "false");
    expect(unselected.querySelector("svg")).not.toBeInTheDocument();
  });

  // --- clear ---------------------------------------------------------------

  it("the clear button resets the value and input", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitCombobox onValueChange={onValueChange} defaultValue="Cherry" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("Cherry");

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(input).toHaveValue("");
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.anything());
  });

  // --- keyboard ------------------------------------------------------------

  it("ArrowDown highlights, moves, and Enter commits the highlighted item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitCombobox onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
        "data-highlighted"
      )
    );

    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
        "data-highlighted"
      )
    );
    expect(screen.getByRole("option", { name: "Apple" })).not.toHaveAttribute(
      "data-highlighted"
    );

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("Banana", expect.anything());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox />);
    const input = await openWithKeyboard(user);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
  });

  // --- disabled ------------------------------------------------------------

  it("a disabled combobox cannot be opened", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={FRUITS} disabled>
        <ComboboxInput aria-label="Dis" />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();

    input.focus();
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("a disabled item is marked disabled and does not select on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox onValueChange={onValueChange}>
        <ComboboxInput aria-label="Fruit" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="apple">Apple</ComboboxItem>
            <ComboboxItem value="banana" disabled>
              Banana
            </ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    await openWithKeyboard(user);

    const disabled = screen.getByRole("option", { name: "Banana" });
    expect(disabled).toHaveAttribute("data-disabled");
    expect(disabled).toHaveAttribute("aria-disabled", "true");

    await user.click(disabled);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // --- grouping / content parts -------------------------------------------

  it("renders groups, labels and separators with their data-slots", async () => {
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxInput aria-label="Produce" />
        <ComboboxContent className="custom-content">
          <ComboboxList>
            <ComboboxGroup>
              <ComboboxLabel>Fruits</ComboboxLabel>
              <ComboboxItem value="apple">Apple</ComboboxItem>
            </ComboboxGroup>
            <ComboboxSeparator />
            <ComboboxGroup>
              <ComboboxLabel>Vegetables</ComboboxLabel>
              <ComboboxItem value="carrot">Carrot</ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    await openWithKeyboard(user);

    const content = document.querySelector('[data-slot="combobox-content"]');
    expect(content).toHaveClass("custom-content", "bg-popover", "shadow-16");

    const labels = document.querySelectorAll('[data-slot="combobox-label"]');
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveClass("text-xs", "text-muted-foreground");
    expect(
      document.querySelector('[data-slot="combobox-separator"]')
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-slot="combobox-group"]')
    ).toHaveLength(2);
  });

  it("merges a caller className on an item without dropping base classes", async () => {
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxInput aria-label="Fruit" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="apple" className="custom-item">
              Apple
            </ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
    await openWithKeyboard(user);
    const item = screen.getByRole("option", { name: "Apple" });
    expect(item).toHaveClass("custom-item", "rounded-md", "h-8");
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations when closed", async () => {
    const { container } = render(<FruitCombobox />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox />);
    await openWithKeyboard(user);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // The popup is portalled to <body>, so scope axe to the whole document
    // body. Disable the `region` best-practice rule (page-structure concern,
    // not a component one — an isolated render has no landmarks).
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
