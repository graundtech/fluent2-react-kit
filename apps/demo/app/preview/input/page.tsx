import type { ReactNode } from "react";

import { Input } from "@kit/components/ui/input";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Input preview — default, placeholder, disabled, aria-invalid, and file
 * states, each paired with a plain native `<label htmlFor>` (no sibling Label
 * component import — this route only needs to prove Input itself), rendered
 * on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Input is server-safe, so no `"use client"` is needed.
 *
 * Focus is an interactive-only state (Fluent's 2px brand bottom accent, see
 * input.tsx for the implementation) — it can't be captured in a static
 * server-rendered page, so the fields below are just rendered; tab into any
 * of them to see the accent.
 */

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="grid max-w-sm gap-6">
        <Field id={`${idPrefix}-default`} label="Default">
          <Input id={`${idPrefix}-default`} name="default" />
        </Field>

        <Field id={`${idPrefix}-placeholder`} label="With placeholder">
          <Input
            id={`${idPrefix}-placeholder`}
            name="placeholder"
            placeholder="jane@example.com"
          />
        </Field>

        <Field id={`${idPrefix}-focus-note`} label="Focus (tab into this field)">
          <Input
            id={`${idPrefix}-focus-note`}
            name="focus-note"
            placeholder="Tab here to see the bottom brand accent"
          />
        </Field>

        <Field id={`${idPrefix}-disabled`} label="Disabled">
          <Input id={`${idPrefix}-disabled`} name="disabled" disabled defaultValue="Can't edit this" />
        </Field>

        <Field id={`${idPrefix}-invalid`} label="Invalid">
          <Input
            id={`${idPrefix}-invalid`}
            name="invalid"
            aria-invalid="true"
            defaultValue="not-an-email"
          />
        </Field>

        <Field id={`${idPrefix}-file`} label="File">
          <Input id={`${idPrefix}-file`} name="file" type="file" />
        </Field>
      </div>
  );
}

export default function InputPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Input</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Default, placeholder, disabled,
            invalid, and file states — each paired with a plain native label.
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
