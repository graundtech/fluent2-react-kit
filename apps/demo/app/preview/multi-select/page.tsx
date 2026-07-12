"use client";

// Client Component preview (sanctioned deviation from conventions §8, toast
// precedent): the filter-list family passes render-function children to
// ComboboxList/MultiSelectList — functions cannot cross the RSC boundary, so
// this page must render inside a client boundary to prerender.

import { Label } from "@kit/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectGroup,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectList,
  MultiSelectSeparator,
} from "@kit/components/ui/multi-select";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Multi Select preview — a tags picker built on the kit Combobox. A basic
 * fruit tags field (Base UI's built-in filtering via `items` + a render-function
 * list, multiple selection on by default), a preselected `defaultValue` array
 * that starts with chips, a grouped example, a disabled option, a disabled
 * control, and an invalid field, each paired with the kit `Label`, rendered on
 * `bg-background` in light + dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server Component —
 * it holds no client state. `multi-select.tsx` carries its own `"use client"`
 * (its `@fluentui/react-icons` import forces it — conventions §9); a Server
 * Component tree renders that client child directly, so every example here is
 * uncontrolled (no handlers), and chips still update because Base UI drives the
 * selection state internally.
 *
 * The interactive states a static server render can't capture: focus the field
 * and type to filter, pick several items in a row (the popup stays open in
 * multiple mode), click a chip's ✕ to remove it, or Backspace on the empty input
 * to drop the last chip.
 *
 * Flat string items are used so each selected value renders as a chip via the
 * default `String(value)` chip; the input is a labelable form field, so each
 * `Label` uses a plain `htmlFor`/`id` pairing.
 */

const FRUITS = [
  "Apple",
  "Banana",
  "Cherry",
  "Dragonfruit",
  "Elderberry",
  "Fig",
  "Grape",
];

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid max-w-xs gap-6">
      {/* Basic — Base UI filters the `items` list against the input text;
          selected values reflow as chips above/around the input */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("basic")}>Favorite fruits</Label>
        <MultiSelect items={FRUITS}>
          <MultiSelectInput id={id("basic")} placeholder="Pick fruits" />
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
      </div>

      {/* Preselected — defaultValue array; the field starts with two chips */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("preselected")}>Preselected</Label>
        <MultiSelect items={FRUITS} defaultValue={["Apple", "Cherry"]}>
          <MultiSelectInput id={id("preselected")} placeholder="Add more" />
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
      </div>

      {/* Grouped — static section headings + a separator */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("grouped")}>Produce</Label>
        <MultiSelect>
          <MultiSelectInput id={id("grouped")} placeholder="Pick produce" />
          <MultiSelectContent>
            <MultiSelectList>
              <MultiSelectGroup>
                <MultiSelectLabel>Fruits</MultiSelectLabel>
                <MultiSelectItem value="Apple">Apple</MultiSelectItem>
                <MultiSelectItem value="Banana">Banana</MultiSelectItem>
              </MultiSelectGroup>
              <MultiSelectSeparator />
              <MultiSelectGroup>
                <MultiSelectLabel>Vegetables</MultiSelectLabel>
                <MultiSelectItem value="Carrot">Carrot</MultiSelectItem>
                <MultiSelectItem value="Spinach">Spinach</MultiSelectItem>
              </MultiSelectGroup>
            </MultiSelectList>
          </MultiSelectContent>
        </MultiSelect>
      </div>

      {/* Disabled option — one item greyed out and unselectable */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("disabled-item")}>With a disabled option</Label>
        <MultiSelect>
          <MultiSelectInput id={id("disabled-item")} placeholder="Pick plans" />
          <MultiSelectContent>
            <MultiSelectList>
              <MultiSelectItem value="Free">Free</MultiSelectItem>
              <MultiSelectItem value="Pro">Pro</MultiSelectItem>
              <MultiSelectItem value="Enterprise" disabled>
                Enterprise (contact sales)
              </MultiSelectItem>
            </MultiSelectList>
          </MultiSelectContent>
        </MultiSelect>
      </div>

      {/* Disabled control — the whole field is inert, chips included */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("disabled")}>Disabled</Label>
        <MultiSelect items={FRUITS} defaultValue={["Apple"]} disabled>
          <MultiSelectInput id={id("disabled")} placeholder="Unavailable" />
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
      </div>

      {/* Invalid — aria-invalid swaps the field to destructive */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("invalid")}>Invalid</Label>
        <MultiSelect items={FRUITS}>
          <MultiSelectInput
            id={id("invalid")}
            aria-invalid
            placeholder="Required — choose at least one"
          />
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
      </div>
    </div>
  );
}

export default function MultiSelectPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Multi Select</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn-style composable APIs. A multiple-selection
            combobox with a chips field: pick several fruits in a row (the popup
            stays open), remove a chip with its ✕ or Backspace the empty input, a
            preselected array, grouped options, a disabled option, a disabled
            control, and an invalid field — each paired with the kit Label. Focus
            the field and start typing.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <PanelBody idPrefix="light" />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <PanelBody idPrefix="dark" />
        </PreviewPanel>
      </div>
    </main>
  );
}
