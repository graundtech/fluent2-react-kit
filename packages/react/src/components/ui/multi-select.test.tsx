import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  MultiSelect,
  MultiSelectChip,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectGroup,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectList,
} from "./multi-select";

/**
 * Same jsdom stubs as combobox.test.tsx: no layout engine, so Base UI's
 * floating-ui positioning (`ResizeObserver`) and `scrollIntoView` are stubbed so
 * the popup can open. Everything else — portalling, roving focus, keyboard nav,
 * the built-in text FILTER, multiple selection, chip removal, `data-*` hooks —
 * runs for real in jsdom.
 *
 * jsdom-deferred (Playwright TODO, mirrors combobox.test.tsx):
 * 1. Opening is driven from keyboard/typing, not a bare pointer click on a
 *    zero-size portal — `{ArrowDown}` opens deterministically.
 * 2. "Closed" is asserted via `aria-expanded`, not listbox removal (CSS
 *    transitions never fire `transitionend` in jsdom, so the popup lingers in
 *    its exit state; `aria-expanded` flips immediately). The multiple-mode
 *    "stays open after select" assertion below reads `aria-expanded="true"`.
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

const FRUITS = ["Apple", "Banana", "Cherry", "Dragonfruit"];

/** The canonical multi-select fruit tags picker used across most tests. */
function FruitMultiSelect({
  onValueChange,
  defaultValue,
  disabled,
}: {
  onValueChange?: (value: string[], eventDetails: unknown) => void;
  defaultValue?: string[];
  disabled?: boolean;
} = {}) {
  return (
    <MultiSelect
      items={FRUITS}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
    >
      <MultiSelectInput aria-label="Fruit" placeholder="Pick fruits" />
      <MultiSelectContent>
        <MultiSelectEmpty>No fruits found.</MultiSelectEmpty>
        <MultiSelectList>
          {(item: string) => (
            <MultiSelectItem key={item} value={item}>
              {item}
            </MultiSelectItem>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
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

/** All the currently-rendered chips (owned data-slot). */
function chips(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="multi-select-chip"]')
  );
}

describe("MultiSelect", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders a chips field with the owned data-slots and combobox ARIA", () => {
    render(<FruitMultiSelect />);
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("data-slot", "multi-select-input");
    expect(input).toHaveAttribute("aria-expanded", "false");
    // the chips field wrapper is present and carries the field-chrome recipe
    const wrapper = document.querySelector(
      '[data-slot="multi-select-input-wrapper"]'
    );
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("min-h-8", "flex-wrap", "border-input");
    // no chips yet
    expect(chips()).toHaveLength(0);
  });

  it("merges caller className on the input and wrapperClassName on the field", () => {
    render(
      <MultiSelect items={FRUITS}>
        <MultiSelectInput
          aria-label="X"
          className="custom-input"
          wrapperClassName="w-72 custom-wrapper"
        />
        <MultiSelectContent>
          <MultiSelectList>
            {(item: string) => (
              <MultiSelectItem key={item} value={item}>
                {item}
              </MultiSelectItem>
            )}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveClass("custom-input", "flex-1", "bg-transparent");
    const wrapper = document.querySelector(
      '[data-slot="multi-select-input-wrapper"]'
    );
    expect(wrapper).toHaveClass("w-72", "custom-wrapper", "min-h-8");
  });

  it("forwards a ref to the underlying input element", () => {
    let node: HTMLInputElement | null = null;
    render(
      <MultiSelect items={FRUITS}>
        <MultiSelectInput
          aria-label="R"
          ref={(el) => {
            node = el;
          }}
        />
        <MultiSelectContent>
          <MultiSelectList>
            {(item: string) => (
              <MultiSelectItem key={item} value={item}>
                {item}
              </MultiSelectItem>
            )}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
    expect(node).toHaveAttribute("data-slot", "multi-select-input");
  });

  it("passes aria-invalid through to the input", () => {
    render(
      <MultiSelect items={FRUITS}>
        <MultiSelectInput aria-label="Inv" aria-invalid />
        <MultiSelectContent>
          <MultiSelectList>
            {(item: string) => (
              <MultiSelectItem key={item} value={item}>
                {item}
              </MultiSelectItem>
            )}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  // --- preselected chips ---------------------------------------------------

  it("renders a chip for each defaultValue entry, with a remove button", () => {
    render(<FruitMultiSelect defaultValue={["Apple", "Cherry"]} />);
    const rendered = chips();
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toHaveTextContent("Apple");
    expect(rendered[1]).toHaveTextContent("Cherry");
    expect(
      screen.getAllByRole("button", { name: "Remove" })
    ).toHaveLength(2);
    const chipRemove = document.querySelector(
      '[data-slot="multi-select-chip-remove"]'
    );
    expect(chipRemove).toBeInTheDocument();
  });

  it("merges a caller className on a chip via a custom render child", () => {
    render(
      <MultiSelect items={FRUITS} defaultValue={["Apple"]}>
        <MultiSelectInput aria-label="Fruit">
          {(value) => (
            <MultiSelectChip key={String(value)} className="custom-chip">
              {String(value)}
            </MultiSelectChip>
          )}
        </MultiSelectInput>
        <MultiSelectContent>
          <MultiSelectList>
            {(item: string) => (
              <MultiSelectItem key={item} value={item}>
                {item}
              </MultiSelectItem>
            )}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    );
    const chip = document.querySelector('[data-slot="multi-select-chip"]');
    expect(chip).toHaveClass("custom-chip", "rounded-sm", "bg-secondary");
    expect(chip).toHaveTextContent("Apple");
  });

  // --- multiple selection --------------------------------------------------

  it("selecting two options renders two chips and keeps the popup open", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitMultiSelect onValueChange={onValueChange} />);
    const input = await openWithKeyboard(user);

    await user.click(screen.getByRole("option", { name: "Apple" }));
    // multiple mode: popup stays open after a selection
    expect(input).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(chips()).toHaveLength(1));

    await user.click(screen.getByRole("option", { name: "Cherry" }));
    await waitFor(() => expect(chips()).toHaveLength(2));

    // onValueChange received arrays, last with both values
    expect(onValueChange).toHaveBeenLastCalledWith(
      ["Apple", "Cherry"],
      expect.anything()
    );
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("marks selected options and renders their check indicators", async () => {
    const user = userEvent.setup();
    render(<FruitMultiSelect defaultValue={["Banana"]} />);
    await openWithKeyboard(user);

    const selected = screen.getByRole("option", { name: "Banana" });
    const unselected = screen.getByRole("option", { name: "Apple" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(selected.querySelector("svg")).toBeInTheDocument();
    expect(unselected).toHaveAttribute("aria-selected", "false");
    expect(unselected.querySelector("svg")).not.toBeInTheDocument();
  });

  // --- chip removal --------------------------------------------------------

  it("clicking a chip's remove button deselects that value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FruitMultiSelect
        defaultValue={["Apple", "Cherry"]}
        onValueChange={onValueChange}
      />
    );
    expect(chips()).toHaveLength(2);

    // remove the first chip (Apple)
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]!);

    await waitFor(() => expect(chips()).toHaveLength(1));
    expect(chips()[0]!).toHaveTextContent("Cherry");
    expect(onValueChange).toHaveBeenLastCalledWith(
      ["Cherry"],
      expect.anything()
    );
  });

  it("Backspace on an empty input removes the last chip", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FruitMultiSelect
        defaultValue={["Apple", "Cherry"]}
        onValueChange={onValueChange}
      />
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("");
    input.focus();

    await user.keyboard("{Backspace}");

    await waitFor(() => expect(chips()).toHaveLength(1));
    expect(chips()[0]!).toHaveTextContent("Apple");
    expect(onValueChange).toHaveBeenLastCalledWith(
      ["Apple"],
      expect.anything()
    );
  });

  // --- filtering -----------------------------------------------------------

  it("typing filters the list down to matches", async () => {
    const user = userEvent.setup();
    render(<FruitMultiSelect />);
    const input = screen.getByRole("combobox");
    input.focus();

    await user.type(input, "an");
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
    render(<FruitMultiSelect />);
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

  // --- disabled ------------------------------------------------------------

  it("a disabled multi-select cannot be opened", async () => {
    const user = userEvent.setup();
    render(<FruitMultiSelect disabled />);
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
      <MultiSelect onValueChange={onValueChange}>
        <MultiSelectInput aria-label="Fruit" />
        <MultiSelectContent>
          <MultiSelectList>
            <MultiSelectItem value="apple">Apple</MultiSelectItem>
            <MultiSelectItem value="banana" disabled>
              Banana
            </MultiSelectItem>
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    );
    await openWithKeyboard(user);

    const disabled = screen.getByRole("option", { name: "Banana" });
    expect(disabled).toHaveAttribute("data-disabled");
    expect(disabled).toHaveAttribute("aria-disabled", "true");

    await user.click(disabled);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // --- grouping / pass-through content parts -------------------------------

  it("renders groups and labels (pass-through parts keep combobox slots)", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect>
        <MultiSelectInput aria-label="Produce" />
        <MultiSelectContent className="custom-content">
          <MultiSelectList>
            <MultiSelectGroup>
              <MultiSelectLabel>Fruits</MultiSelectLabel>
              <MultiSelectItem value="apple">Apple</MultiSelectItem>
            </MultiSelectGroup>
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    );
    await openWithKeyboard(user);

    const content = document.querySelector('[data-slot="combobox-content"]');
    expect(content).toHaveClass("custom-content", "bg-popover", "shadow-16");
    const label = document.querySelector('[data-slot="combobox-label"]');
    expect(label).toHaveTextContent("Fruits");
    expect(
      document.querySelector('[data-slot="combobox-group"]')
    ).toBeInTheDocument();
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations when closed with chips", async () => {
    const { container } = render(
      <FruitMultiSelect defaultValue={["Apple", "Cherry"]} />
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<FruitMultiSelect defaultValue={["Apple"]} />);
    await openWithKeyboard(user);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
