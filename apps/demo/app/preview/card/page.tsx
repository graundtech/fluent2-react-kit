import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@kit/components/ui/card";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Card preview — a basic composition, a composition with `CardAction`, and an
 * elevation row (shadow-2/4/8/16) on bare card shells, rendered in both light
 * and dark panels.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Card is server-safe, so no `"use client"` is needed.
 *
 * Icons are kept as inline `<svg>` (matches the Button preview's pattern) —
 * `@fluentui/react-icons` is available in the package but must not be added
 * to the demo app, and sibling components (e.g. Button) must not be imported
 * here, so `CardAction` uses a plain styled `<button>`.
 */

const ELEVATIONS = ["shadow-2", "shadow-4", "shadow-8", "shadow-16"] as const;

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <circle cx="4" cy="10" r="1.25" fill="currentColor" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" />
      <circle cx="16" cy="10" r="1.25" fill="currentColor" />
    </svg>
  );
}

function PanelBody() {
  return (
    <>
      {/* Basic composition: header / title / description / content / footer */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">basic</span>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Meeting notes</CardTitle>
            <CardDescription>Weekly sync — engineering team</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Discussed the Q3 roadmap, staffing needs, and the upcoming
              design review.
            </p>
          </CardContent>
          <CardFooter className="border-t">
            <p className="text-sm text-muted-foreground">Updated 2h ago</p>
          </CardFooter>
        </Card>
      </div>

      {/* Interactive — hover raises elevation to shadow-8 (Fluent clickable card) */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">interactive</span>
        <Card interactive className="max-w-sm">
          <CardHeader>
            <CardTitle>Open project</CardTitle>
            <CardDescription>Hover to see the elevation raise</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Visual-only states — compose with an anchor or button for
              semantics.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* With CardAction — plain styled button, no sibling components */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">with card action</span>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Project Aurora</CardTitle>
            <CardDescription>Due next Friday</CardDescription>
            <CardAction>
              <button
                type="button"
                aria-label="More actions"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-fast ease-ease hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <MoreIcon />
              </button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Three tasks remaining before the milestone is complete.
            </p>
          </CardContent>
          <CardFooter className="gap-2 border-t">
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none transition-colors duration-fast ease-ease hover:bg-brand-70 active:bg-brand-60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-brand-80"
            >
              View project
            </button>
          </CardFooter>
        </Card>
      </div>

      {/* Elevation row — Fluent shadow-2/4/8/16 on bare card shells */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">elevation</span>
        <div className="flex flex-wrap items-center gap-6">
          {ELEVATIONS.map((elevation) => (
            <Card
              key={elevation}
              className={`w-32 items-center justify-center ${elevation}`}
            >
              <CardContent className="px-0 text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  {elevation}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

export default function CardPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Card</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. A basic composition, a composition
            with <code>CardAction</code>, and an elevation row.
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
