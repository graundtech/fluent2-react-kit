import { Button } from "@kit/components/ui/button";
import { Input } from "@kit/components/ui/input";
import { Label } from "@kit/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kit/components/ui/popover";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Popover preview — a basic composed-form popover (shadcn's classic
 * "Dimensions" example) plus every `side`/`align` combination, rendered on
 * `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is itself a plain
 * Server Component — it holds no client state of its own. `popover.tsx`
 * itself carries **no** `"use client"` (see its doc comment: every Base UI
 * Popover part it wraps is already its own client boundary, and this
 * component imports no `@fluentui/react-icons`), so a Server Component tree
 * can render it directly — same reasoning `avatar.tsx`'s preview relies on.
 *
 * Every `PopoverContent` below carries an `aria-label` or `aria-labelledby`
 * — Base UI's popup always renders `role="dialog"`, so an accessible name is
 * required (divergence 4 in `popover.tsx`'s doc comment).
 *
 * The open flyout, its position, and the focus-accent field inside it are
 * interactive states a static server render can't capture — click a trigger
 * to open the popover.
 */

const SIDES = ["top", "right", "bottom", "left"] as const;
const ALIGNS = ["start", "center", "end"] as const;

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-10">
      {/* Basic — trigger = kit Button, content = a composed kit Input/Label form */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Basic</h3>
        <Popover>
          <PopoverTrigger
            render={<Button variant="outline">Edit dimensions</Button>}
          />
          <PopoverContent aria-labelledby={id("dimensions-title")}>
            <div className="grid gap-4">
              <div className="space-y-1">
                <h4
                  id={id("dimensions-title")}
                  className="leading-none font-medium"
                >
                  Dimensions
                </h4>
                <p className="text-sm text-muted-foreground">
                  Set the dimensions for the layer.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={id("width")}>Width</Label>
                  <Input
                    id={id("width")}
                    defaultValue="100%"
                    className="col-span-2 h-8"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={id("max-width")}>Max width</Label>
                  <Input
                    id={id("max-width")}
                    defaultValue="300px"
                    className="col-span-2 h-8"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={id("height")}>Height</Label>
                  <Input
                    id={id("height")}
                    defaultValue="25px"
                    className="col-span-2 h-8"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={id("max-height")}>Max height</Label>
                  <Input
                    id={id("max-height")}
                    defaultValue="none"
                    className="col-span-2 h-8"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Side — every value of the `side` prop, align left at the default center */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Side</h3>
        <div className="flex flex-wrap gap-3">
          {SIDES.map((side) => (
            <Popover key={side}>
              <PopoverTrigger
                render={
                  <Button variant="secondary" className="capitalize">
                    {side}
                  </Button>
                }
              />
              <PopoverContent
                side={side}
                aria-label={`Popover placed on the ${side} side`}
                className="w-56"
              >
                <p className="text-sm">
                  This panel opens on the <strong>{side}</strong> side of its
                  trigger.
                </p>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      </div>

      {/* Align — every value of the `align` prop, side left at the default bottom */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Align</h3>
        <div className="flex flex-wrap gap-3">
          {ALIGNS.map((align) => (
            <Popover key={align}>
              <PopoverTrigger
                render={
                  <Button variant="secondary" className="capitalize">
                    {align}
                  </Button>
                }
              />
              <PopoverContent
                align={align}
                aria-label={`Popover aligned to ${align}`}
                className="w-56"
              >
                <p className="text-sm">
                  This panel is <strong>{align}</strong>-aligned to its
                  trigger.
                </p>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PopoverPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Popover</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. A basic composed-form popover, plus
            every `side` and `align` variation. Click a trigger to open the
            flyout.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <PanelBody idPrefix="light" />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <PanelBody idPrefix="dark" />
        </PreviewPanel>
      </div>
    </main>
  );
}
