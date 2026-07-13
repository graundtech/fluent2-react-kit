import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/components/ui/dropdown-menu";
import {
  SplitButton,
  SplitButtonAction,
  SplitButtonTrigger,
} from "@kit/components/ui/split-button";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * SplitButton preview — the joined-pair matrix (every variant × size), a working
 * DropdownMenu composition (Word-style "Paste ▾"), and the two independent
 * disabled states (disabled Action + live Trigger, and live Action + disabled
 * Trigger), rendered on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server Component;
 * `split-button.tsx` and `dropdown-menu.tsx` carry their own `"use client"`
 * boundaries, which a Server Component tree renders fine.
 *
 * Composition note: Base UI parts compose via a `render` prop (not shadcn's
 * `asChild`), so the chevron is handed to the menu trigger as
 * `render={<SplitButtonTrigger aria-label="…" />}`. Click "Paste" to run the
 * default command; click its chevron to open the menu.
 */

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
] as const;

const SIZES = ["sm", "default", "lg"] as const;

/** A static joined pair (no menu) at a given variant/size. */
function JoinedPair({
  variant,
  size,
}: {
  variant: (typeof VARIANTS)[number];
  size: (typeof SIZES)[number];
}) {
  return (
    <SplitButton variant={variant} size={size}>
      <SplitButtonAction>Save</SplitButtonAction>
      <SplitButtonTrigger aria-label="Save options" />
    </SplitButton>
  );
}

function PanelBody() {
  return (
    <>
      {/* Variant × size matrix (static joined pairs) */}
      <div className="space-y-4">
        <span className="text-sm text-muted-foreground">variants × sizes</span>
        {VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-4">
            <span className="w-24 text-xs text-muted-foreground">
              {variant}
            </span>
            {SIZES.map((size) => (
              <JoinedPair key={size} variant={variant} size={size} />
            ))}
          </div>
        ))}
      </div>

      {/* Working DropdownMenu composition — Word-style Paste split button */}
      <div className="space-y-4">
        <span className="text-sm text-muted-foreground">
          with a menu (click the chevron)
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <DropdownMenu>
            <SplitButton>
              <SplitButtonAction>Paste</SplitButtonAction>
              <DropdownMenuTrigger
                render={<SplitButtonTrigger aria-label="Paste options" />}
              />
            </SplitButton>
            <DropdownMenuContent>
              <DropdownMenuItem>Keep Source Formatting</DropdownMenuItem>
              <DropdownMenuItem>Merge Formatting</DropdownMenuItem>
              <DropdownMenuItem>Keep Text Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <SplitButton variant="secondary">
              <SplitButtonAction>Export</SplitButtonAction>
              <DropdownMenuTrigger
                render={<SplitButtonTrigger aria-label="Export options" />}
              />
            </SplitButton>
            <DropdownMenuContent>
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem>Export as PNG</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Print…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <SplitButton variant="outline">
              <SplitButtonAction>Reply</SplitButtonAction>
              <DropdownMenuTrigger
                render={<SplitButtonTrigger aria-label="Reply options" />}
              />
            </SplitButton>
            <DropdownMenuContent>
              <DropdownMenuItem>Reply all</DropdownMenuItem>
              <DropdownMenuItem>Forward</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Independent disabled states */}
      <div className="space-y-4">
        <span className="text-sm text-muted-foreground">disabled states</span>
        <div className="flex flex-wrap items-center gap-4">
          {/* disabled Action, live Trigger */}
          <SplitButton>
            <SplitButtonAction disabled>Send</SplitButtonAction>
            <SplitButtonTrigger aria-label="Send options" />
          </SplitButton>

          {/* live Action, disabled Trigger */}
          <SplitButton variant="outline">
            <SplitButtonAction>Send</SplitButtonAction>
            <SplitButtonTrigger aria-label="Send options" disabled />
          </SplitButton>

          {/* both disabled */}
          <SplitButton variant="secondary">
            <SplitButtonAction disabled>Send</SplitButtonAction>
            <SplitButtonTrigger aria-label="Send options" disabled />
          </SplitButton>
        </div>
      </div>
    </>
  );
}

export default function SplitButtonPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Split Button</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, kit-original composition. A primary command joined
            to an icon-only chevron trigger that opens a menu — sharing variant
            and size across both parts, with a per-variant joining divider. The
            chevron composes with the kit DropdownMenu via Base UI&apos;s render
            prop.
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
