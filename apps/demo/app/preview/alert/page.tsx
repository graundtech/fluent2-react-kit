import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@kit/components/ui/alert";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Alert preview — every variant with icon + title + description, a
 * title-only row, and a no-icon row, rendered on `bg-background` in both
 * light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Alert is server-safe, so no `"use client"` is needed.
 *
 * Icon policy: `@fluentui/react-icons` is a dependency of `packages/react`
 * only — it is not installed for `apps/demo`, and
 * docs/component-conventions.md §8 explicitly forbids adding an icon
 * dependency to the demo app ("Keep example icons inline as `<svg>`"). So,
 * unlike the task brief's suggestion of `InfoRegular`/`CheckmarkCircleRegular`/
 * `WarningRegular`/`DismissCircleRegular`, the icons below are hand-drawn
 * inline `<svg>`s that approximate those same four Fluent glyphs (info-i,
 * checkmark-circle, warning-triangle, dismiss-circle) — matching the Badge
 * preview's existing inline-icon pattern instead of introducing a new
 * dependency.
 */

const VARIANTS = ["default", "destructive", "success", "warning", "info"] as const;
type Variant = (typeof VARIANTS)[number];

const TITLES: Record<Variant, string> = {
  default: "Heads up",
  destructive: "Something went wrong",
  success: "Changes saved",
  warning: "This can't be undone",
  info: "New version available",
};

const DESCRIPTIONS: Record<Variant, string> = {
  default: "A neutral message with no particular urgency.",
  destructive: "Your changes were not saved. Try again in a moment.",
  success: "Your changes have been saved successfully.",
  warning: "Confirming this action will permanently delete the item.",
  info: "A new version of the app is ready — refresh to update.",
};

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function CheckmarkCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.75 10.25l2.25 2.25 4.25-4.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.5l7.25 12.5a1 1 0 01-.87 1.5H3.62a1 1 0 01-.87-1.5L10 3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 8.25v3.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14.25" r="0.9" fill="currentColor" />
    </svg>
  );
}

function DismissCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 7.5l5 5M12.5 7.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS: Record<Variant, () => ReactNode> = {
  default: InfoIcon,
  destructive: DismissCircleIcon,
  success: CheckmarkCircleIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function PanelBody() {
  return (
    <div className="max-w-xl space-y-8">
      <Row label="Icon + title + description">
        {VARIANTS.map((variant) => {
          const Icon = ICONS[variant];
          return (
            <Alert key={variant} variant={variant}>
              <Icon />
              <AlertTitle>{TITLES[variant]}</AlertTitle>
              <AlertDescription>{DESCRIPTIONS[variant]}</AlertDescription>
            </Alert>
          );
        })}
      </Row>

      <Row label="Title only, no description">
        {VARIANTS.map((variant) => {
          const Icon = ICONS[variant];
          return (
            <Alert key={variant} variant={variant}>
              <Icon />
              <AlertTitle>{TITLES[variant]}</AlertTitle>
            </Alert>
          );
        })}
      </Row>

      <Row label="No icon">
        {VARIANTS.map((variant) => (
          <Alert key={variant} variant={variant}>
            <AlertTitle>{TITLES[variant]}</AlertTitle>
            <AlertDescription>{DESCRIPTIONS[variant]}</AlertDescription>
          </Alert>
        ))}
      </Row>
    </div>
  );
}

export default function AlertPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Alert</h1>
          <p className="text-muted-foreground">
            Fluent 2 MessageBar visuals, shadcn APIs. Five variants (default,
            destructive, success, warning, info) — icon + title +
            description, title-only, and no-icon rows.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <PanelBody />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <PanelBody />
        </PreviewPanel>
      </div>
    </main>
  );
}
