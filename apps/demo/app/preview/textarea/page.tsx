import type { ReactNode } from "react";

import { Label } from "@kit/components/ui/label";
import { Textarea } from "@kit/components/ui/textarea";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Textarea preview — default, placeholder, disabled, aria-invalid, and
 * auto-growing states, each paired with the kit's own `Label` component
 * (both are stable v0.1.0 siblings), rendered on `bg-background` in both
 * light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Textarea is server-safe, so no `"use client"` is needed.
 *
 * Focus is an interactive-only state (Fluent's 2px brand bottom accent, see
 * textarea.tsx for the implementation) — it can't be captured in a static
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
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="grid max-w-sm gap-6">
      <Field id={`${idPrefix}-default`} label="Default">
        <Textarea id={`${idPrefix}-default`} name="default" />
      </Field>

      <Field id={`${idPrefix}-placeholder`} label="With placeholder">
        <Textarea
          id={`${idPrefix}-placeholder`}
          name="placeholder"
          placeholder="Tell us a little about yourself"
        />
      </Field>

      <Field id={`${idPrefix}-focus-note`} label="Focus (tab into this field)">
        <Textarea
          id={`${idPrefix}-focus-note`}
          name="focus-note"
          placeholder="Tab here to see the bottom brand accent"
        />
      </Field>

      <Field id={`${idPrefix}-disabled`} label="Disabled">
        <Textarea
          id={`${idPrefix}-disabled`}
          name="disabled"
          disabled
          defaultValue="Can't edit this"
        />
      </Field>

      <Field id={`${idPrefix}-invalid`} label="Invalid">
        <Textarea
          id={`${idPrefix}-invalid`}
          name="invalid"
          aria-invalid="true"
          defaultValue="Too short"
        />
      </Field>

      <Field id={`${idPrefix}-autogrow`} label="Auto-growing (field-sizing-content)">
        <Textarea
          id={`${idPrefix}-autogrow`}
          name="autogrow"
          defaultValue={
            "This field grows with its content instead of scrolling.\n" +
            "Keep typing or paste a longer paragraph here and the box\n" +
            "will expand to fit it, up to the browser's natural limits."
          }
        />
      </Field>
    </div>
  );
}

export default function TextareaPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Textarea</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Default, placeholder, disabled,
            invalid, and auto-growing states, each paired with the kit&apos;s
            own <code>Label</code> component.
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
