"use client";

import { useState, type ReactNode } from "react";

import { Label } from "@kit/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@kit/components/ui/radio-group";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Radio Group preview — vertical (default) and horizontal layouts, a
 * disabled item, a fully disabled group, an invalid group, and a controlled
 * demo, each paired with the kit `Label`, rendered on `bg-background` in
 * both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`.
 *
 * This route carries `"use client"` — like `preview/progress` — because the
 * controlled demo genuinely needs client state (`useState` driving
 * `RadioGroup`'s `value`/`onValueChange`). `RadioGroup`/`RadioGroupItem`
 * themselves stay server-renderable wrappers (see radio-group.tsx; Base UI's
 * own parts are already client boundaries on their own) — only this preview
 * route pays the client-boundary cost, and only to demonstrate the
 * controlled case.
 */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

function ControlledDemo({ idPrefix }: { idPrefix: string }) {
  const [value, setValue] = useState("standard");

  return (
    <Row label={`Controlled — selected: "${value}"`}>
      <RadioGroup
        value={value}
        onValueChange={setValue}
        aria-label="Shipping speed"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="standard" id={`${idPrefix}-ship-standard`} />
          <Label htmlFor={`${idPrefix}-ship-standard`}>
            Standard (5-7 days)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="express" id={`${idPrefix}-ship-express`} />
          <Label htmlFor={`${idPrefix}-ship-express`}>
            Express (2-3 days)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem
            value="overnight"
            id={`${idPrefix}-ship-overnight`}
          />
          <Label htmlFor={`${idPrefix}-ship-overnight`}>Overnight</Label>
        </div>
      </RadioGroup>
    </Row>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="flex max-w-md flex-col gap-8">
      <Row label="Vertical (default layout — grid gap-2)">
        <RadioGroup defaultValue="comfortable" aria-label="Density">
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="compact"
              id={`${idPrefix}-density-compact`}
            />
            <Label htmlFor={`${idPrefix}-density-compact`}>Compact</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="comfortable"
              id={`${idPrefix}-density-comfortable`}
            />
            <Label htmlFor={`${idPrefix}-density-comfortable`}>
              Comfortable
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="spacious"
              id={`${idPrefix}-density-spacious`}
            />
            <Label htmlFor={`${idPrefix}-density-spacious`}>Spacious</Label>
          </div>
        </RadioGroup>
      </Row>

      <Row label="Horizontal (className override)">
        <RadioGroup
          defaultValue="light"
          aria-label="Theme"
          className="flex flex-row gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="light" id={`${idPrefix}-theme-light`} />
            <Label htmlFor={`${idPrefix}-theme-light`}>Light</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="dark" id={`${idPrefix}-theme-dark`} />
            <Label htmlFor={`${idPrefix}-theme-dark`}>Dark</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="system" id={`${idPrefix}-theme-system`} />
            <Label htmlFor={`${idPrefix}-theme-system`}>System</Label>
          </div>
        </RadioGroup>
      </Row>

      <Row label="Disabled item">
        <RadioGroup defaultValue="monthly" aria-label="Billing cycle">
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="monthly"
              id={`${idPrefix}-billing-monthly`}
            />
            <Label htmlFor={`${idPrefix}-billing-monthly`}>Monthly</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="annual"
              id={`${idPrefix}-billing-annual`}
              disabled
            />
            <Label htmlFor={`${idPrefix}-billing-annual`}>
              Annual (currently unavailable)
            </Label>
          </div>
        </RadioGroup>
      </Row>

      <Row label="Disabled group">
        <RadioGroup
          defaultValue="email"
          aria-label="Notification channel"
          disabled
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="email" id={`${idPrefix}-channel-email`} />
            <Label htmlFor={`${idPrefix}-channel-email`}>Email</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sms" id={`${idPrefix}-channel-sms`} />
            <Label htmlFor={`${idPrefix}-channel-sms`}>SMS</Label>
          </div>
        </RadioGroup>
      </Row>

      <Row label="Invalid">
        <div className="flex flex-col gap-1.5">
          <RadioGroup
            aria-label="Payment method"
            aria-describedby={`${idPrefix}-payment-error`}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="card"
                id={`${idPrefix}-payment-card`}
                aria-invalid="true"
              />
              <Label htmlFor={`${idPrefix}-payment-card`}>Credit card</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="paypal"
                id={`${idPrefix}-payment-paypal`}
                aria-invalid="true"
              />
              <Label htmlFor={`${idPrefix}-payment-paypal`}>PayPal</Label>
            </div>
          </RadioGroup>
          {/* The error states a group-level constraint ("choose one"), not a
              per-radio fault, so per APG the aria-describedby association lives
              on the role="radiogroup" container — a screen reader announces it
              once on entering the group instead of repeating it on every radio.
              The per-item aria-invalid above stays: it drives each item's
              visual destructive ring, which is the state this demo showcases. */}
          <p
            id={`${idPrefix}-payment-error`}
            className="text-sm text-destructive"
          >
            Select a payment method to continue.
          </p>
        </div>
      </Row>

      <ControlledDemo idPrefix={idPrefix} />
    </div>
  );
}

export default function RadioGroupPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Radio Group</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals (a 16px brand ring with a centered brand dot on
            the checked item), shadcn API (`RadioGroup` / `RadioGroupItem`).
            Vertical and horizontal layouts, disabled item, disabled group,
            invalid, and a controlled demo.
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
