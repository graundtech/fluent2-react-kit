"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Checkbox } from "@kit/components/ui/checkbox";
import { Label } from "@kit/components/ui/label";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Checkbox preview — unchecked, checked, indeterminate, disabled, and invalid
 * states, each paired with the kit's own `Label`, plus an interactive
 * "select all" demo that derives a parent checkbox's `indeterminate` state
 * from its children, rendered on `bg-background` in both light and dark
 * contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`.
 *
 * This route carries `"use client"` — unlike most other preview pages — solely
 * for the "select all" demo below: driving a parent checkbox's `checked`/
 * `indeterminate` props from its children's state needs real React state
 * living in this file's own component tree (conventions §8 allows previews to
 * be client components when the demo itself needs interactivity). The static
 * rows above it (unchecked/checked/indeterminate/disabled/invalid) don't
 * actually need this page's directive: `checkbox.tsx` is itself a client
 * component — it carries its own `"use client"` because its
 * `@fluentui/react-icons` imports force it (see checkbox.tsx's doc comment and
 * conventions §9), on top of `@base-ui/react/checkbox`'s `Root`/`Indicator`
 * already being client boundaries — so those rows hydrate and toggle
 * regardless of this file's own directive. This page's `"use client"` is a
 * separate concern from the component's.
 */

const FRUIT_ITEMS = ["Apple", "Banana", "Cherry"] as const;

function SelectAllDemo({ idPrefix }: { idPrefix: string }) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    Apple: true,
    Banana: false,
    Cherry: false,
  });

  const values = Object.values(checkedItems);
  const allChecked = values.every(Boolean);
  const noneChecked = values.every((checked) => !checked);
  const indeterminate = !allChecked && !noneChecked;

  function toggleAll(next: boolean) {
    setCheckedItems(
      Object.fromEntries(FRUIT_ITEMS.map((item) => [item, next]))
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Checkbox
          id={`${idPrefix}-select-all`}
          checked={allChecked}
          indeterminate={indeterminate}
          onCheckedChange={toggleAll}
        />
        <Label htmlFor={`${idPrefix}-select-all`}>Select all fruit</Label>
      </div>
      {FRUIT_ITEMS.map((item) => (
        <div key={item} className="flex items-center gap-2 pl-6">
          <Checkbox
            id={`${idPrefix}-${item}`}
            checked={checkedItems[item]}
            onCheckedChange={(next) =>
              setCheckedItems((prev) => ({ ...prev, [item]: next }))
            }
          />
          <Label htmlFor={`${idPrefix}-${item}`}>{item}</Label>
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="flex max-w-sm flex-col gap-6">
      <Row label="Unchecked">
        <div className="flex items-center gap-2">
          <Checkbox id={`${idPrefix}-unchecked`} />
          <Label htmlFor={`${idPrefix}-unchecked`}>
            Subscribe to newsletter
          </Label>
        </div>
      </Row>

      <Row label="Checked">
        <div className="flex items-center gap-2">
          <Checkbox id={`${idPrefix}-checked`} defaultChecked />
          <Label htmlFor={`${idPrefix}-checked`}>Remember this device</Label>
        </div>
      </Row>

      <Row label="Indeterminate">
        <div className="flex items-center gap-2">
          <Checkbox id={`${idPrefix}-indeterminate`} indeterminate />
          <Label htmlFor={`${idPrefix}-indeterminate`}>
            Some items selected
          </Label>
        </div>
      </Row>

      <Row label="Disabled">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox id={`${idPrefix}-disabled-unchecked`} disabled />
            <Label htmlFor={`${idPrefix}-disabled-unchecked`}>
              Disabled, unchecked
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-disabled-checked`}
              disabled
              defaultChecked
            />
            <Label htmlFor={`${idPrefix}-disabled-checked`}>
              Disabled, checked
            </Label>
          </div>
        </div>
      </Row>

      <Row label="Invalid">
        <div className="flex items-center gap-2">
          <Checkbox id={`${idPrefix}-invalid`} aria-invalid="true" />
          <Label htmlFor={`${idPrefix}-invalid`}>Must accept terms</Label>
        </div>
      </Row>

      <Row label='Select all ("indeterminate" demo)'>
        <SelectAllDemo idPrefix={idPrefix} />
      </Row>
    </div>
  );
}

export default function CheckboxPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Checkbox</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Unchecked, checked, indeterminate,
            disabled, and invalid states — each paired with the kit&apos;s own
            Label — plus an interactive &quot;select all&quot; demo driving a
            parent checkbox&apos;s indeterminate state from its children.
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
