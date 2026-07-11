import { Badge } from "@kit/components/ui/badge";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Badge preview — every variant, plus with-icon and asChild-link rows,
 * rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server Component:
 * Badge is server-safe, so no `"use client"` is needed.
 *
 * Icons are kept as inline `<svg>` per the demo's icon policy (no icon
 * dependency added to `apps/demo`) — matches the Button preview pattern.
 */

const VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "success",
  "warning",
] as const;

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PanelBody() {
  return (
    <>
      {/* Variants */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">variants</span>
        {VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </div>

      {/* With leading icon */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">with icon</span>
        {VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            <CheckmarkIcon />
            {variant}
          </Badge>
        ))}
      </div>

      {/* asChild link */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">asChild</span>
        <Badge asChild>
          <a href="#top">v2.0</a>
        </Badge>
        <Badge asChild variant="outline">
          <a href="#top">docs</a>
        </Badge>
        <Badge asChild variant="secondary">
          <a href="#top">changelog</a>
        </Badge>
      </div>
    </>
  );
}

export default function BadgePreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Badge</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Every variant, with-icon, and{" "}
            <code>asChild</code> examples.
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
