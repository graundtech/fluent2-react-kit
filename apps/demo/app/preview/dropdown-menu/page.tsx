import { Button } from "@kit/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@kit/components/ui/dropdown-menu";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * DropdownMenu preview — a basic menu, one with groups/labels/separators/
 * shortcuts, one with checkbox + radio items, one with a submenu, and one with
 * disabled + destructive items, rendered on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server Component
 * — it holds no client state and defines no handlers. `dropdown-menu.tsx` *does*
 * carry `"use client"` (its `@fluentui/react-icons` imports force it — see the
 * dropdown-menu.tsx doc comment and conventions §9), but that is the component's
 * own client boundary: a Server Component tree renders that client child fine.
 *
 * Composition note: Base UI parts compose via a `render` prop (not shadcn's
 * `asChild`), so the kit `Button` is passed to the trigger as
 * `render={<Button …/>}` (see divergence 3 in the component doc comment).
 *
 * The open flyout, item highlight, submenu, and check/radio markers are
 * interactive states a static server render can't capture — click a trigger to
 * open the menu, and hover a "More" row to open its submenu.
 */

const ChevronDownIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden
  >
    <path
      d="M6 8l4 4 4-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-wrap items-start gap-4">
      {/* Basic — kit Button as the trigger via Base UI's render prop */}
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id("basic")}
          render={
            <Button variant="outline">
              Actions
              <ChevronDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem>Archive</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Grouped — labels, a separator, shortcuts */}
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id("grouped")}
          render={<Button variant="outline">Account</Button>}
        />
        <DropdownMenuContent className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Team</DropdownMenuLabel>
            <DropdownMenuItem>Invite users</DropdownMenuItem>
            <DropdownMenuItem>New team</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Checkbox + radio — view settings */}
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id("view")}
          render={<Button variant="outline">View</Button>}
        />
        <DropdownMenuContent className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem defaultChecked>
              Status bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Activity bar</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem defaultChecked>
              Panel
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Layout</DropdownMenuLabel>
            <DropdownMenuRadioGroup defaultValue="comfortable">
              <DropdownMenuRadioItem value="comfortable">
                Comfortable
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="compact">
                Compact
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Submenu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id("share")}
          render={<Button variant="outline">Share</Button>}
        />
        <DropdownMenuContent className="min-w-44">
          <DropdownMenuItem>Copy link</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Send to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
              <DropdownMenuItem>Messages</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>More…</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem>Embed</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Disabled + destructive */}
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id("more")}
          render={<Button variant="outline">More</Button>}
        />
        <DropdownMenuContent className="min-w-44">
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem disabled>Move (unavailable)</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            Delete
            <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DropdownMenuPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Dropdown Menu</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Basic, grouped (labels + separator +
            shortcuts), checkbox + radio items, a submenu, and disabled +
            destructive items — each triggered by the kit Button. Click a trigger
            to open the flyout.
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
