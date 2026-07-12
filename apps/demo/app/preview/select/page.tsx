import type { ReactNode } from "react";

import { Label } from "@kit/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@kit/components/ui/select";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Select preview — basic, grouped (labels + separator), disabled select,
 * disabled item, invalid, and a long scrolling list, each paired with the kit
 * `Label` via `aria-labelledby`, rendered on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is itself a plain Server
 * Component — it holds no client state of its own. Note that `select.tsx` *does*
 * carry `"use client"` (its `@fluentui/react-icons` imports force it — see the
 * select.tsx doc comment and conventions §9), but that's the component's own
 * client boundary: a Server Component tree renders that client child directly,
 * so this page needs no `"use client"` of its own.
 *
 * Base UI's `Select.Value` shows the *raw* value unless `<Select>` gets an
 * `items` prop, so the examples with a `defaultValue` pass `items` to render
 * the friendly label in the trigger (see select.tsx divergence note).
 *
 * The open flyout, item highlight, and focus accent are interactive states that
 * a static server render can't capture — click a trigger to open the popup, and
 * tab to a trigger to see the Fluent bottom brand accent.
 */

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "dragonfruit", label: "Dragonfruit" },
  { value: "elderberry", label: "Elderberry" },
];

const TIMEZONES = [
  "UTC-12:00",
  "UTC-11:00",
  "UTC-10:00",
  "UTC-09:00",
  "UTC-08:00",
  "UTC-07:00",
  "UTC-06:00",
  "UTC-05:00",
  "UTC-04:00",
  "UTC-03:00",
  "UTC-02:00",
  "UTC-01:00",
  "UTC+00:00",
  "UTC+01:00",
  "UTC+02:00",
  "UTC+03:00",
  "UTC+04:00",
  "UTC+05:00",
  "UTC+06:00",
  "UTC+07:00",
  "UTC+08:00",
  "UTC+09:00",
  "UTC+10:00",
  "UTC+11:00",
  "UTC+12:00",
];

function Field({
  labelId,
  label,
  children,
}: {
  labelId: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label id={labelId}>{label}</Label>
      {children}
    </div>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid max-w-xs gap-6">
      {/* Basic — items on Root so the selected label shows in the trigger */}
      <Field labelId={id("basic")} label="Favorite fruit">
        <Select items={FRUITS}>
          <SelectTrigger
            id={id("basic-trigger")}
            aria-labelledby={`${id("basic")} ${id("basic-trigger")}`}
          >
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            {FRUITS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Sizes — Fluent field sizes on the Button height scale (sm/default/lg) */}
      {(["sm", "lg"] as const).map((size) => (
        <Field
          key={size}
          labelId={id(`size-${size}`)}
          label={`Size ${size} (${size === "sm" ? "24px" : "40px"})`}
        >
          <Select items={FRUITS}>
            <SelectTrigger
              size={size}
              id={id(`size-${size}-trigger`)}
              aria-labelledby={`${id(`size-${size}`)} ${id(`size-${size}-trigger`)}`}
            >
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ))}

      {/* Grouped — GroupLabel headings + a Separator between groups */}
      <Field labelId={id("grouped")} label="Produce">
        <Select>
          <SelectTrigger
            id={id("grouped-trigger")}
            aria-labelledby={`${id("grouped")} ${id("grouped-trigger")}`}
          >
            <SelectValue placeholder="Select produce" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="cherry">Cherry</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
              <SelectItem value="potato">Potato</SelectItem>
              <SelectItem value="spinach">Spinach</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {/* Preselected value — items maps the value to its label */}
      <Field labelId={id("preselected")} label="Preselected">
        <Select items={FRUITS} defaultValue="cherry">
          <SelectTrigger
            id={id("preselected-trigger")}
            aria-labelledby={`${id("preselected")} ${id("preselected-trigger")}`}
          >
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            {FRUITS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Disabled select — whole control inert */}
      <Field labelId={id("disabled")} label="Disabled">
        <Select disabled>
          <SelectTrigger
            id={id("disabled-trigger")}
            aria-labelledby={`${id("disabled")} ${id("disabled-trigger")}`}
          >
            <SelectValue placeholder="Unavailable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Disabled item — one option greyed out and unselectable */}
      <Field labelId={id("disabled-item")} label="With a disabled option">
        <Select>
          <SelectTrigger
            id={id("disabled-item-trigger")}
            aria-labelledby={`${id("disabled-item")} ${id("disabled-item-trigger")}`}
          >
            <SelectValue placeholder="Pick a plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise" disabled>
              Enterprise (contact sales)
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Invalid — aria-invalid on the trigger swaps the field to destructive */}
      <Field labelId={id("invalid")} label="Invalid">
        <Select>
          <SelectTrigger
            id={id("invalid-trigger")}
            aria-invalid
            aria-labelledby={`${id("invalid")} ${id("invalid-trigger")}`}
          >
            <SelectValue placeholder="Required — choose one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Long list — overflows the popup so the scroll arrows appear */}
      <Field labelId={id("long")} label="Timezone (scrolls)">
        <Select>
          <SelectTrigger
            id={id("long-trigger")}
            aria-labelledby={`${id("long")} ${id("long-trigger")}`}
          >
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export default function SelectPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Select</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Basic, grouped (labels + separator),
            preselected, disabled, disabled-option, invalid, and a long
            scrolling list — each paired with the kit Label. Click a trigger to
            open the flyout.
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
