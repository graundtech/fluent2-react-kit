import { Toggle } from "@kit/components/ui/toggle";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Toggle preview — every variant × size, unpressed and pressed, a disabled
 * row, and an icon-only Bold/Italic row (the Ribbon use case this component
 * is built for), rendered on `bg-background` in both light and dark
 * contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: `Toggle` is already a client boundary on its own
 * (`@base-ui/react/toggle`'s `Toggle` carries its own `"use client"`), so
 * the `defaultPressed` rows below hydrate and toggle without this file
 * needing the directive itself — same reasoning as the `button` preview.
 */

const VARIANTS = ["default", "outline"] as const;
const SIZES = ["sm", "default", "lg"] as const;

function BoldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <text
        x="50%"
        y="71%"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="currentColor"
      >
        B
      </text>
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {/* stroke-drawn italic "I" (serif top/bottom + slanted stem) — a
          font-style: italic "I" glyph reads as an ambiguous thin diagonal at
          icon sizes, so this draws the shape explicitly instead, matching
          the stroke-icon convention the button preview uses for PlusIcon. */}
      <path
        d="M8 5h5M7 15h5M11 5 9 15"
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
      {/* Variant × size matrix — unpressed */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Unpressed</h3>
        {VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-sm text-muted-foreground">
              {variant}
            </span>
            {SIZES.map((size) => (
              <Toggle key={size} variant={variant} size={size}>
                {variant} {size}
              </Toggle>
            ))}
          </div>
        ))}
      </div>

      {/* Variant × size matrix — pressed */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Pressed</h3>
        {VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-sm text-muted-foreground">
              {variant}
            </span>
            {SIZES.map((size) => (
              <Toggle key={size} variant={variant} size={size} defaultPressed>
                {variant} {size}
              </Toggle>
            ))}
          </div>
        ))}
      </div>

      {/* Disabled — unpressed and pressed, both variants */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-sm text-muted-foreground">disabled</span>
        <Toggle disabled>unpressed</Toggle>
        <Toggle disabled defaultPressed>
          pressed
        </Toggle>
        <Toggle variant="outline" disabled>
          unpressed
        </Toggle>
        <Toggle variant="outline" disabled defaultPressed>
          pressed
        </Toggle>
      </div>

      {/* Icon-only, Bold/Italic Ribbon style — every size, both variants */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Icon-only (Ribbon style)</h3>
        {VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-sm text-muted-foreground">
              {variant}
            </span>
            {SIZES.map((size) => (
              <Toggle
                key={`bold-${size}`}
                variant={variant}
                size={size}
                aria-label="Bold"
              >
                <BoldIcon />
              </Toggle>
            ))}
            {SIZES.map((size) => (
              <Toggle
                key={`italic-${size}`}
                variant={variant}
                size={size}
                defaultPressed
                aria-label="Italic"
              >
                <ItalicIcon />
              </Toggle>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-24 text-sm text-muted-foreground">disabled</span>
          <Toggle disabled aria-label="Bold (disabled)">
            <BoldIcon />
          </Toggle>
          <Toggle disabled defaultPressed aria-label="Italic (disabled)">
            <ItalicIcon />
          </Toggle>
        </div>
      </div>
    </>
  );
}

export default function TogglePreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Toggle</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Every variant and size, unpressed
            and pressed, disabled, and an icon-only Bold/Italic row for
            Ribbon-style usage.
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
