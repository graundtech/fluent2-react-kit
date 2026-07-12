"use client";

// Client Component preview (sanctioned deviation from conventions §8, toast
// precedent): the filter-list family passes render-function children to
// ComboboxList/MultiSelectList — functions cannot cross the RSC boundary, so
// this page must render inside a client boundary to prerender.

import { Label } from "@kit/components/ui/label";
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
} from "@kit/components/ui/combobox";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Combobox preview — a filterable fruit-picker (Base UI's built-in filtering via
 * the `items` prop + render-function list), a grouped example, a preselected
 * value, a disabled control, a disabled option, and the no-match empty state,
 * each paired with the kit `Label`, rendered on `bg-background` in light + dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server Component —
 * it holds no client state. `combobox.tsx` carries its own `"use client"` (its
 * `@fluentui/react-icons` imports force it — see the combobox.tsx doc comment and
 * conventions §9); a Server Component tree renders that client child directly, so
 * this page needs no `"use client"` of its own, and every example here is
 * uncontrolled (no handlers).
 *
 * Filtering, the open flyout, item highlight, the Clear button, and the focus
 * accent are interactive states a static server render can't capture — focus the
 * field and type to filter, type a nonsense query to see the empty state, and
 * pick an item to see it fill the input with a Clear (✕) button.
 *
 * The input is a labelable form field (unlike Select's button trigger), so each
 * `Label` uses a plain `htmlFor`/`id` pairing.
 */

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "dragonfruit", label: "Dragonfruit" },
  { value: "elderberry", label: "Elderberry" },
  { value: "fig", label: "Fig" },
  { value: "grape", label: "Grape" },
];

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid max-w-xs gap-6">
      {/* Basic — Base UI filters the `items` list against the input text */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("basic")}>Favorite fruit</Label>
        <Combobox items={FRUITS}>
          <ComboboxInput id={id("basic")} placeholder="Search a fruit" />
          <ComboboxContent>
            <ComboboxEmpty>No fruits found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof FRUITS)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Preselected — items maps the value to its label; input starts filled */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("preselected")}>Preselected</Label>
        <Combobox items={FRUITS} defaultValue={FRUITS[2]}>
          <ComboboxInput id={id("preselected")} placeholder="Search a fruit" />
          <ComboboxContent>
            <ComboboxEmpty>No fruits found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof FRUITS)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Grouped — static section headings + a separator (visual grouping).
          Filtered groups need Base UI's `Combobox.Group items` + `Collection`;
          see the combobox.tsx doc comment. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("grouped")}>Produce</Label>
        <Combobox>
          <ComboboxInput id={id("grouped")} placeholder="Pick produce" />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxGroup>
                <ComboboxLabel>Fruits</ComboboxLabel>
                <ComboboxItem value="apple">Apple</ComboboxItem>
                <ComboboxItem value="banana">Banana</ComboboxItem>
              </ComboboxGroup>
              <ComboboxSeparator />
              <ComboboxGroup>
                <ComboboxLabel>Vegetables</ComboboxLabel>
                <ComboboxItem value="carrot">Carrot</ComboboxItem>
                <ComboboxItem value="spinach">Spinach</ComboboxItem>
              </ComboboxGroup>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Disabled option — one item greyed out and unselectable */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("disabled-item")}>With a disabled option</Label>
        <Combobox>
          <ComboboxInput id={id("disabled-item")} placeholder="Pick a plan" />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxItem value="free">Free</ComboboxItem>
              <ComboboxItem value="pro">Pro</ComboboxItem>
              <ComboboxItem value="enterprise" disabled>
                Enterprise (contact sales)
              </ComboboxItem>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Disabled control — the whole field is inert */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("disabled")}>Disabled</Label>
        <Combobox disabled>
          <ComboboxInput id={id("disabled")} placeholder="Unavailable" />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxItem value="a">Option A</ComboboxItem>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Invalid — aria-invalid swaps the field to destructive */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("invalid")}>Invalid</Label>
        <Combobox items={FRUITS}>
          <ComboboxInput
            id={id("invalid")}
            aria-invalid
            placeholder="Required — choose one"
          />
          <ComboboxContent>
            <ComboboxEmpty>No fruits found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof FRUITS)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  );
}

export default function ComboboxPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Combobox</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn-style composable APIs. A filterable
            fruit-picker (type to filter, type a nonsense query for the empty
            state), a preselected value, grouped options, a disabled option, a
            disabled control, and an invalid field — each paired with the kit
            Label. Focus the field and start typing.
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
