import { Button } from "@kit/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kit/components/ui/tooltip";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Tooltip preview — a trigger on all four sides, a long-text example that
 * wraps at `max-w-60` instead of stretching edge to edge, and an icon-only
 * trigger, rendered on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is itself a plain
 * Server Component — it holds no client state of its own. `tooltip.tsx`
 * intentionally carries no `"use client"` of its own either (every Base UI
 * Tooltip part is already its own client boundary — see the component's doc
 * comment and conventions §9), so this page renders straight through without
 * any client wrapper needed.
 *
 * Every trigger below composes the kit `Button` via Base UI's `render` prop
 * (`<TooltipTrigger render={<Button>...</Button>} />`) — the primitive's
 * analogue to shadcn's `asChild` boolean (see tooltip.tsx divergence 3). The
 * icon-only trigger gives its `Button` an `aria-label` directly, per Base
 * UI's own accessibility guidance for tooltips (divergence 6).
 *
 * The open flyout is an interactive state a static server render can't
 * capture — hover or focus (Tab to it) a trigger to see it. The default open
 * delay is 600ms (`TooltipProvider`'s default, conventions-documented in
 * tooltip.tsx); Escape or moving focus/pointer away closes it.
 */

function HelpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.8 7.75c.2-1 1.1-1.65 2.2-1.65 1.24 0 2.25.83 2.25 1.9 0 .9-.6 1.32-1.35 1.77-.65.4-1.1.75-1.1 1.53"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}

function PanelBody() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-10">
        {/* Four sides */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">
            Sides — top / right / bottom / left
          </span>
          <div className="flex flex-wrap items-center gap-6 py-8">
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline">Top</Button>} />
              <TooltipContent side="top">Tooltip on top</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline">Right</Button>}
              />
              <TooltipContent side="right">
                Tooltip on the right
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline">Bottom</Button>}
              />
              <TooltipContent side="bottom">
                Tooltip on the bottom
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline">Left</Button>} />
              <TooltipContent side="left">Tooltip on the left</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Long text — wraps at max-w-60 instead of stretching edge to edge */}
        <div className="flex items-center gap-3">
          <span className="w-28 text-sm text-muted-foreground">long text</span>
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="secondary">Hover for details</Button>}
            />
            <TooltipContent>
              This tooltip has a longer description that wraps onto multiple
              lines instead of stretching the flyout edge to edge.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Icon-only trigger — accessible name comes from the Button's own aria-label */}
        <div className="flex items-center gap-3">
          <span className="w-28 text-sm text-muted-foreground">icon only</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="icon" aria-label="Help">
                  <HelpIcon />
                </Button>
              }
            />
            <TooltipContent>Get help</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function TooltipPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Tooltip</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. A neutral <code>bg-popover</code>
            {" "}flyout (not shadcn&rsquo;s inverted brand bubble) on all four
            sides, a long-text wrapping example, and an icon-only trigger.
            Hover or focus a trigger to open it.
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
