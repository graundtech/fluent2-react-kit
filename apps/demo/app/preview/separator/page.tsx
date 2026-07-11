import { Separator } from "@kit/components/ui/separator";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Separator preview — horizontal between text blocks, vertical in a flex row
 * (an explicit height on the row is required since `data-orientation=vertical`
 * sizes to `h-full`), and a decorative-vs-semantic comparison, rendered on
 * `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Separator is server-safe, so no `"use client"` is needed.
 */

function PanelBody() {
  return (
    <>
      {/* Horizontal — between text blocks */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">
          horizontal — between text blocks (decorative)
        </span>
        <div className="max-w-md">
          <div className="space-y-1">
            <h3 className="text-sm leading-none font-medium">
              Fluent2 React Kit
            </h3>
            <p className="text-sm text-muted-foreground">
              Fluent 2 visuals, shadcn/ui APIs.
            </p>
          </div>
          <Separator className="my-4" />
          <div className="space-y-1">
            <h3 className="text-sm leading-none font-medium">Registry</h3>
            <p className="text-sm text-muted-foreground">
              A shadcn-compatible component registry.
            </p>
          </div>
        </div>
      </div>

      {/* Vertical — in a flex row, needs explicit height */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">
          vertical — in a flex row (decorative, explicit height on the row)
        </span>
        <div className="flex h-5 items-center gap-4 text-sm">
          <span>Docs</span>
          <Separator orientation="vertical" />
          <span>Components</span>
          <Separator orientation="vertical" />
          <span>Registry</span>
        </div>
      </div>

      {/* Decorative vs semantic */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">
          decorative vs semantic
        </span>
        <div className="max-w-md space-y-4 text-sm">
          <div>
            <p>
              decorative (default): <code>role=&quot;none&quot;</code>,
              purely visual, ignored by assistive tech.
            </p>
            <Separator className="my-3" />
            <p>the divider above carries no semantic meaning.</p>
          </div>
          <div>
            <p>
              non-decorative: <code>decorative=&#123;false&#125;</code> gives{" "}
              <code>role=&quot;separator&quot;</code>, exposed to assistive
              tech as a real thematic break.
            </p>
            <Separator decorative={false} className="my-3" />
            <p>the divider above is announced as a separator.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SeparatorPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Separator</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Horizontal and vertical
            orientation, plus decorative vs. semantic examples.
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
