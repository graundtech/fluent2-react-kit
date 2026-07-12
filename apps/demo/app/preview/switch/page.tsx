"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Label } from "@kit/components/ui/label";
import { Switch } from "@kit/components/ui/switch";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Switch preview — off, on, disabled (off + on), and invalid states, each
 * paired with the kit's own `Label`, plus an interactive controlled demo,
 * rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`.
 *
 * This route carries `"use client"` — like `preview/checkbox` and
 * `preview/radio-group` — solely for the controlled demo below: driving
 * `Switch`'s `checked`/`onCheckedChange` from visible app state needs real
 * React state living in this file's own component tree (conventions §8
 * allows previews to be client components when the demo itself needs
 * interactivity). The static rows above it (off/on/disabled/invalid) don't
 * actually need this: `Switch` is already a client boundary on its own
 * (`@base-ui/react/switch`'s `Root`/`Thumb` each carry their own
 * `"use client"`), so they hydrate and toggle regardless of this file's own
 * directive.
 */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ControlledDemo({ idPrefix }: { idPrefix: string }) {
  const [checked, setChecked] = useState(false);
  const id = `${idPrefix}-controlled`;

  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor={id}>
        Wi-Fi is {checked ? "on" : "off"} (click to toggle)
      </Label>
    </div>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="flex max-w-sm flex-col gap-6">
      <Row label="Off (unchecked)">
        <div className="flex items-center gap-2">
          <Switch id={`${idPrefix}-off`} />
          <Label htmlFor={`${idPrefix}-off`}>Airplane mode</Label>
        </div>
      </Row>

      <Row label="On (checked)">
        <div className="flex items-center gap-2">
          <Switch id={`${idPrefix}-on`} defaultChecked />
          <Label htmlFor={`${idPrefix}-on`}>Sync across devices</Label>
        </div>
      </Row>

      <Row label="Disabled">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Switch id={`${idPrefix}-disabled-off`} disabled />
            <Label htmlFor={`${idPrefix}-disabled-off`}>
              Disabled, off
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`${idPrefix}-disabled-on`} disabled defaultChecked />
            <Label htmlFor={`${idPrefix}-disabled-on`}>Disabled, on</Label>
          </div>
        </div>
      </Row>

      <Row label="Invalid">
        <div className="flex items-center gap-2">
          <Switch id={`${idPrefix}-invalid`} aria-invalid="true" />
          <Label htmlFor={`${idPrefix}-invalid`}>Must be acknowledged</Label>
        </div>
      </Row>

      <Row label="Controlled demo">
        <ControlledDemo idPrefix={idPrefix} />
      </Row>
    </div>
  );
}

export default function SwitchPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Switch</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Off, on, disabled, and invalid
            states — each paired with the kit&apos;s own Label — plus an
            interactive controlled demo.
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
