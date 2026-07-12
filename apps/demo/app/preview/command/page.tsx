"use client";

// Client Component preview (sanctioned deviation from conventions §8, toast
// precedent): the dialog palette passes a render-function CommandList child —
// functions cannot cross the RSC boundary, so this page must render inside a
// client boundary to prerender.

import { Button } from "@kit/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@kit/components/ui/command";

/**
 * Command preview — a plain Server Component (conventions §8).
 *
 * Two examples, both uncontrolled so no client handlers are needed:
 * 1. A standalone always-open palette with grouped commands, leading inline-SVG
 *    icons, keyboard-shortcut hints and a separator.
 * 2. A `CommandDialog` opened by a kit `Button` (passed as the `trigger` element,
 *    forwarded to the Dialog trigger's `render` prop) — filterable via the
 *    `items` prop + a render-function `CommandList` child.
 */

// Inline SVGs so the demo needs no icon dependency (conventions §8).
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.63.77 1.09 1.51 1.09H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const DIALOG_COMMANDS = [
  "New File",
  "New Folder",
  "Open Settings",
  "Open Profile",
  "Save All",
  "Close Window",
];

export default function CommandPreview() {
  return (
    <div className="min-h-screen space-y-10 bg-background p-8 text-foreground">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Command</h1>
        <p className="text-sm text-muted-foreground">
          An always-open command palette on Base UI Autocomplete — items fire
          actions, no cmdk dependency.
        </p>
      </div>

      {/* Standalone always-open palette */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Standalone palette
        </h2>
        <Command className="w-full max-w-md">
          <CommandInput placeholder="Type a command or search…" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandList>
            <CommandGroup heading="Files">
              <CommandItem>
                <FileIcon />
                New File
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <FolderIcon />
                New Folder
                <CommandShortcut>⌘⇧N</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Preferences">
              <CommandItem>
                <GearIcon />
                Open Settings
                <CommandShortcut>⌘,</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <PersonIcon />
                Open Profile
              </CommandItem>
              <CommandItem disabled>
                <GearIcon />
                Advanced (disabled)
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </section>

      {/* Palette in a dialog, opened by a kit Button trigger */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Command dialog
        </h2>
        <CommandDialog
          items={DIALOG_COMMANDS}
          trigger={<Button variant="secondary">Open Command Menu</Button>}
        >
          <CommandInput placeholder="Type a command or search…" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandList>
            {(item: string) => <CommandItem key={item}>{item}</CommandItem>}
          </CommandList>
        </CommandDialog>
      </section>
    </div>
  );
}
