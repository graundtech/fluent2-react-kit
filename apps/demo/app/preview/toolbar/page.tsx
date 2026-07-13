import { Button } from "@kit/components/ui/button";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
} from "@kit/components/ui/toolbar";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Toolbar preview — a formatting toolbar with grouped icon buttons,
 * separators, an inline input and a link; a horizontal + vertical pair; and
 * edge rows (a disabled item, text buttons, and render-prop composition with
 * the kit Button), each on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. `toolbar.tsx` has no `"use client"` of
 * its own (its Base UI parts each carry their own directive — see its doc
 * comment), so this route stays a plain Server Component.
 *
 * Icons are inline `<svg>` per conventions §8 (no icon dependency in the demo
 * app). Every `Toolbar` gets an `aria-label` — a `role="toolbar"` container has
 * no implicit accessible name, so one is required.
 */

function BoldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M6 4h4.5a2.75 2.75 0 0 1 0 5.5H6zM6 9.5h5a2.75 2.75 0 0 1 0 5.5H6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M8 4h6M6 16h6M11.5 4 8.5 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M6 4v5a4 4 0 0 0 8 0V4M5 16.5h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M4 5h12M4 8.5h8M4 12h12M4 15.5h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M4 5h12M6 8.5h8M4 12h12M6 15.5h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M4 5h12M8 8.5h8M4 12h12M8 15.5h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M8.5 11.5 11.5 8.5M9 6l1-1a3 3 0 0 1 4 4l-1 1M11 14l-1 1a3 3 0 0 1-4-4l1-1"
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
    <div className="grid gap-10">
      {/* Formatting toolbar — grouped icon buttons + separators + input + link */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Formatting toolbar
        </h3>
        <Toolbar aria-label="Text formatting">
          <ToolbarGroup aria-label="Font style">
            <ToolbarButton size="icon" aria-label="Bold">
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton size="icon" aria-label="Italic">
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton size="icon" aria-label="Underline">
              <UnderlineIcon />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup aria-label="Alignment">
            <ToolbarButton size="icon" aria-label="Align left">
              <AlignLeftIcon />
            </ToolbarButton>
            <ToolbarButton size="icon" aria-label="Align center">
              <AlignCenterIcon />
            </ToolbarButton>
            <ToolbarButton size="icon" aria-label="Align right">
              <AlignRightIcon />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarInput
            aria-label="Font size"
            defaultValue="12"
            className="w-14"
          />

          <ToolbarSeparator />

          <ToolbarLink href="#help">
            <LinkIcon />
            Help
          </ToolbarLink>
        </Toolbar>
      </div>

      {/* Text buttons + a disabled item */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Text buttons, with a disabled item
        </h3>
        <Toolbar aria-label="Document actions">
          <ToolbarButton>Cut</ToolbarButton>
          <ToolbarButton>Copy</ToolbarButton>
          <ToolbarButton disabled>Paste</ToolbarButton>
          <ToolbarSeparator />
          {/* render-prop composition: the rendered Button participates in the
              toolbar's roving tabindex, but ToolbarButton's own variant/size
              win the class merge (outer beats inner — e2e/toolbar.spec.ts
              finding), so this paints as a subtle/ghost item, NOT brand-filled.
              For a styled toolbar item, set variant/size on ToolbarButton
              itself (it exposes the full buttonVariants surface). */}
          <ToolbarButton
            render={<Button variant="default" size="sm">Publish</Button>}
          />
        </Toolbar>
      </div>

      {/* Vertical orientation */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Vertical orientation
        </h3>
        <Toolbar aria-label="Vertical text formatting" orientation="vertical">
          <ToolbarButton size="icon" aria-label="Bold">
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton size="icon" aria-label="Italic">
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton size="icon" aria-label="Align left">
            <AlignLeftIcon />
          </ToolbarButton>
          <ToolbarButton size="icon" aria-label="Align center" disabled>
            <AlignCenterIcon />
          </ToolbarButton>
        </Toolbar>
      </div>
    </div>
  );
}

export default function ToolbarPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Toolbar</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals on Base UI behavior. A transparent bar of 32px
            controls with a single tab stop — Tab into the toolbar, then use the
            arrow keys to move between items (focus wraps at the ends). Grouped
            icon buttons with separators, an inline input, a link, both
            orientations, a disabled item, and render-prop composition with the
            kit Button.
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
