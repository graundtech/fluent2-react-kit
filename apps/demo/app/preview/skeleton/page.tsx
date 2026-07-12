import { Skeleton } from "@kit/components/ui/skeleton";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Skeleton preview — text-line rows, an avatar+lines "card" skeleton, and
 * button/input-shaped blocks, rendered on `bg-background` in both light and
 * dark panels.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Skeleton is server-safe, so no `"use client"` is needed.
 *
 * The "card" composition below mirrors `Card`'s visual shell (border,
 * `rounded-lg`, `shadow-4`, `p-4`) with plain `<div>`s rather than importing
 * the real `Card` component — matching the Card preview's own precedent of
 * not cross-importing sibling components built in parallel by other agents.
 * It also demonstrates the a11y guidance from `skeleton.tsx`'s doc comment:
 * the loading region itself carries `aria-busy="true"`, not the individual
 * `Skeleton` blocks.
 */

function PanelBody() {
  return (
    <>
      {/* Text lines — a paragraph placeholder of decreasing-width lines */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">text lines</span>
        <div aria-busy="true" className="max-w-sm space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>

      {/* Avatar + lines — mirrors a Card layout (header: avatar + name/subtitle) */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">
          avatar + lines (card)
        </span>
        <div
          aria-busy="true"
          className="flex max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-2 border-t border-border pt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>

      {/* Button / input-shaped blocks */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">
          button / input shapes
        </span>
        <div aria-busy="true" className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="size-9" />
        </div>
      </div>
    </>
  );
}

export default function SkeletonPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Skeleton</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Text lines, an avatar+lines card
            composition, and button/input-shaped blocks — each loading
            region carries <code>aria-busy=&quot;true&quot;</code>, not the
            individual blocks.
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
