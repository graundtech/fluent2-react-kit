import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

/**
 * jsdom has no layout engine, so Base UI's floating-ui positioning
 * (`ResizeObserver`) and its "scroll the highlighted item into view"
 * (`scrollIntoView`) are not implemented. Stub them so the popup can open.
 * Everything else — portalling, roving focus, keyboard nav, selection,
 * `data-*` state hooks — runs for real in jsdom.
 *
 * Two documented jsdom limits drive the choices below:
 *
 * 1. **Opening is done via the keyboard, not a mouse click.** With no layout
 *    engine, `userEvent.click()` on the trigger opens the portalled popup only
 *    intermittently (the pointerdown-opens / pointerup-lands-on-popup sequence
 *    races against the zero-size portal), and unmounting an *open* Base UI
 *    Select leaves global state that breaks the *next* test's click. Focusing
 *    the trigger and pressing `{ArrowDown}` opens it deterministically across
 *    the whole file, so every test uses `openWithKeyboard`. This still exercises
 *    the real keyboard-activation path conventions §5 requires; verifying the
 *    pointer-open path is a Playwright TODO (see the component's report).
 * 2. **"Closed" is asserted via `aria-expanded="false"`, never listbox removal.**
 *    CSS transitions never fire `transitionend` in jsdom, so Base UI's popup
 *    lingers in its exit state after close; `aria-expanded` flips immediately.
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
 * Focus the trigger and open the popup with the keyboard (deterministic in
 * jsdom — see the note above). `{ArrowDown}` both opens and highlights the
 * first item. Returns the trigger for follow-up assertions.
 */
async function openWithKeyboard(
  user: ReturnType<typeof userEvent.setup>
): Promise<HTMLElement> {
  const trigger = screen.getByRole("combobox");
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  return trigger;
}

/** The canonical fruit select used across most tests. */
function FruitSelect({
  onValueChange,
  defaultValue,
}: {
  onValueChange?: (value: string | null, eventDetails: unknown) => void;
  defaultValue?: string;
} = {}) {
  return (
    <Select onValueChange={onValueChange} defaultValue={defaultValue}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders the trigger as a combobox button with an accessible name", () => {
    render(<FruitSelect />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the placeholder and exposes the data-placeholder hook when empty", () => {
    render(<FruitSelect />);
    const trigger = screen.getByRole("combobox");
    // trigger carries the placeholder styling hook the muted class keys off of
    expect(trigger).toHaveAttribute("data-placeholder");
    const value = trigger.querySelector('[data-slot="select-value"]');
    expect(value).toHaveTextContent("Pick a fruit");
  });

  it("merges a caller className on the trigger without dropping base classes", () => {
    render(
      <Select>
        <SelectTrigger className="w-64 custom-trigger" aria-label="X">
          <SelectValue placeholder="P" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("w-64", "custom-trigger", "h-8", "border-input");
  });

  it("forwards a ref to the underlying trigger button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Select>
        <SelectTrigger
          aria-label="R"
          ref={(el) => {
            node = el;
          }}
        >
          <SelectValue placeholder="P" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes aria-invalid through to the trigger", () => {
    render(
      <Select>
        <SelectTrigger aria-invalid aria-label="Inv">
          <SelectValue placeholder="P" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });

  // --- open / options ------------------------------------------------------

  it("opens and renders the options in a listbox", async () => {
    const user = userEvent.setup();
    render(<FruitSelect />);
    const trigger = await openWithKeyboard(user);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
      "data-slot",
      "select-item"
    );
  });

  // --- selection -----------------------------------------------------------

  it("selecting an option fires onValueChange and closes the popup", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitSelect onValueChange={onValueChange} />);
    const trigger = await openWithKeyboard(user);

    await user.click(screen.getByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana", expect.anything());
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("without an items prop, the trigger reflects the raw selected value (Base UI divergence)", async () => {
    const user = userEvent.setup();
    render(<FruitSelect />);
    const trigger = await openWithKeyboard(user);

    await user.click(screen.getByRole("option", { name: "Cherry" }));

    // Base UI's Select.Value renders the raw value, not the ItemText, unless
    // `items` is supplied to <Select> — see the SelectValue divergence note.
    const value = trigger.querySelector('[data-slot="select-value"]');
    expect(value).toHaveTextContent("cherry");
  });

  it("with an items prop, the trigger renders the matching label", async () => {
    const items = [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
    ];
    render(
      <Select items={items} defaultValue="banana">
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    const value = screen
      .getByRole("combobox")
      .querySelector('[data-slot="select-value"]');
    expect(value).toHaveTextContent("Banana");
  });

  it("marks the selected option aria-selected and renders its check indicator", async () => {
    const user = userEvent.setup();
    render(<FruitSelect defaultValue="banana" />);
    await openWithKeyboard(user);

    const selected = screen.getByRole("option", { name: "Banana" });
    const unselected = screen.getByRole("option", { name: "Apple" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    // the CheckmarkRegular indicator only mounts for the selected item
    expect(selected.querySelector("svg")).toBeInTheDocument();
    expect(unselected).toHaveAttribute("aria-selected", "false");
    expect(unselected.querySelector("svg")).not.toBeInTheDocument();
  });

  // --- keyboard ------------------------------------------------------------

  it("opens and navigates with the keyboard, selecting with Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitSelect onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox");

    trigger.focus();
    // ArrowDown opens the popup and highlights the first item. The highlight is
    // painted via Base UI's `data-highlighted` hook — assert through waitFor
    // since the highlight settles a tick after the popup opens.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
        "data-highlighted"
      )
    );

    // ArrowDown moves the highlight to the second item
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
        "data-highlighted"
      )
    );
    expect(screen.getByRole("option", { name: "Apple" })).not.toHaveAttribute(
      "data-highlighted"
    );

    // Enter commits the highlighted item
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana", expect.anything());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<FruitSelect />);
    const trigger = await openWithKeyboard(user);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  // --- disabled ------------------------------------------------------------

  it("disabled select cannot be opened", async () => {
    const user = userEvent.setup();
    render(
      <Select disabled>
        <SelectTrigger aria-label="Dis">
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("data-disabled");

    // a disabled trigger can't take focus, so keyboard activation is inert too
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("a disabled item is marked disabled and does not select on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana" disabled>
            Banana
          </SelectItem>
        </SelectContent>
      </Select>
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
      <Select>
        <SelectTrigger aria-label="Food">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent className="custom-content">
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            <SelectItem value="carrot">Carrot</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    await openWithKeyboard(user);

    const content = document.querySelector('[data-slot="select-content"]');
    expect(content).toHaveClass("custom-content", "bg-popover", "shadow-16");

    const labels = document.querySelectorAll('[data-slot="select-label"]');
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveTextContent("Fruits");
    expect(labels[0]).toHaveClass("text-xs", "text-muted-foreground");

    expect(
      document.querySelector('[data-slot="select-separator"]')
    ).toBeInTheDocument();
    // groups expose their own slot too
    expect(document.querySelectorAll('[data-slot="select-group"]')).toHaveLength(
      2
    );
  });

  it("merges a caller className on an item without dropping base classes", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple" className="custom-item">
            Apple
          </SelectItem>
        </SelectContent>
      </Select>
    );
    await openWithKeyboard(user);
    const item = screen.getByRole("option", { name: "Apple" });
    expect(item).toHaveClass("custom-item", "rounded-sm", "h-8");
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations when closed", async () => {
    const { container } = render(<FruitSelect />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<FruitSelect />);
    await openWithKeyboard(user);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // The popup is portalled to <body>, so scope axe to the whole document
    // body. Disable the `region` best-practice rule: it flags page content not
    // wrapped in a landmark (`<main>` etc.), which is a page-structure concern,
    // not a component one — an isolated render legitimately has no landmarks.
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
