import { Button } from "@kit/components/ui/button";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Button preview — every variant × size, plus disabled / with-icon / asChild
 * rows, rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server Component:
 * Button is server-safe, so no `"use client"` is needed.
 */

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

const TEXT_SIZES = ["sm", "default", "lg"] as const;
const ICON_SIZES = ["icon-sm", "icon", "icon-lg"] as const;

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PanelBody() {
  return (
    <>
      {/* Variant × text-size matrix */}
      <div className="space-y-4">
        {VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-sm text-muted-foreground">{variant}</span>
            {TEXT_SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
            <Button variant={variant} size="default" disabled>
              disabled
            </Button>
          </div>
        ))}
      </div>

      {/* With leading icon */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">with icon</span>
        {TEXT_SIZES.map((size) => (
          <Button key={size} size={size}>
            <PlusIcon />
            Create
          </Button>
        ))}
        <Button variant="secondary">
          <PlusIcon />
          Add item
        </Button>
      </div>

      {/* Icon-only */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">icon only</span>
        {ICON_SIZES.map((size) => (
          <Button key={size} size={size} aria-label={`Create (${size})`}>
            <PlusIcon />
          </Button>
        ))}
        {ICON_SIZES.map((size) => (
          <Button
            key={`${size}-outline`}
            variant="outline"
            size={size}
            aria-label={`Create outline (${size})`}
          >
            <PlusIcon />
          </Button>
        ))}
      </div>

      {/* asChild link */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">asChild</span>
        <Button asChild>
          <a href="#top">Anchor as primary button</a>
        </Button>
        <Button asChild variant="link">
          <a href="#top">Anchor as link button</a>
        </Button>
      </div>
    </>
  );
}

export default function ButtonPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Button</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Every variant and size, with disabled,
            with-icon, icon-only, and <code>asChild</code> examples.
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
