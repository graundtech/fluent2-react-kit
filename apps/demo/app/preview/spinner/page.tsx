import { Spinner } from "@kit/components/ui/spinner";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Spinner preview — every size, a labeled example, and an inline-with-text
 * row, rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Spinner is server-safe, so no `"use client"` is needed.
 */

const SIZES = ["sm", "default", "lg", "xl"] as const;

function PanelBody() {
  return (
    <>
      {/* Sizes */}
      <div className="flex flex-wrap items-center gap-6">
        <span className="w-24 text-sm text-muted-foreground">sizes</span>
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <Spinner size={size} />
            <span className="text-xs text-muted-foreground">{size}</span>
          </div>
        ))}
      </div>

      {/* Labeled */}
      <div className="flex flex-wrap items-center gap-6">
        <span className="w-24 text-sm text-muted-foreground">labeled</span>
        <Spinner label="Loading messages" />
        <Spinner size="lg" label="Uploading files" />
      </div>

      {/* Custom aria-label override (no visible label) */}
      <div className="flex flex-wrap items-center gap-6">
        <span className="w-24 text-sm text-muted-foreground">
          aria-label override
        </span>
        <Spinner aria-label="Fetching data" />
      </div>

      {/* Inline with surrounding text */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">inline</span>
        <p className="flex items-center gap-2 text-sm">
          <Spinner size="sm" aria-label="Saving" />
          Saving your changes…
        </p>
      </div>
    </>
  );
}

export default function SpinnerPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Spinner</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. A rotating brand arc in four sizes,
            with labeled, aria-label-override, and inline-with-text examples.
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
