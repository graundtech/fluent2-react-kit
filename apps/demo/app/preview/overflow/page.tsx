"use client";

/**
 * Overflow preview — SANCTIONED DEVIATION from conventions §8 (Client Component,
 * the toast/filter-list precedent).
 *
 * This is the mini-Ribbon proof: a single-line formatting bar built from the kit
 * `Toolbar` + `OverflowItem`s inside a width-controllable container. Drag the
 * range slider to shrink the container and watch the lowest-priority commands
 * drop, in priority order (not DOM order), into the "…" overflow menu — and
 * reappear highest-priority-first as it grows. This reproduces Word Online's
 * "Single-line mode" from `docs/design/ribbon-behavior-spec.md`: overflowed
 * commands are grouped in the menu under section headers named after their
 * source group, and each icon-button becomes an icon + full text label there.
 *
 * It needs `"use client"` because it holds slider state, uses the Overflow
 * provider/hooks (context + `ResizeObserver`), and composes the `DropdownMenu`.
 *
 * Theme caveat (same as toast/select): `DropdownMenuContent` portals to
 * `document.body`, outside the `.light`/`.dark` `PreviewPanel` scope, so the open
 * overflow menu picks up the page-root theme, not the panel it was opened from.
 * The bar itself is themed correctly per panel.
 */

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@kit/components/ui/dropdown-menu";
import {
  Overflow,
  OverflowDivider,
  OverflowItem,
  useIsOverflowGroupVisible,
  useIsOverflowItemVisible,
  useOverflowMenu,
} from "@kit/components/ui/overflow";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "@kit/components/ui/toolbar";

import { PreviewPanel } from "../../../components/preview-panel";

/* -------------------------------------------------------------------------- */
/* Inline icons (conventions §8 — no icon dependency in the demo)             */
/* -------------------------------------------------------------------------- */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const UndoIcon = () => (
  <Icon>
    <path d="M7 7 4 10l3 3M4 10h8a4 4 0 0 1 0 8h-1" />
  </Icon>
);
const PasteIcon = () => (
  <Icon>
    <path d="M8 4h4v2H8zM6 5H5v11h10V5h-1M7.5 10h5M7.5 13h5" />
  </Icon>
);
const CutIcon = () => (
  <Icon>
    <path d="M6 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM6 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM7.3 7.7 16 15M7.3 12.3 16 5" />
  </Icon>
);
const CopyIcon = () => (
  <Icon>
    <path d="M7 7h7v9H7zM5 13H4V4h9v1" />
  </Icon>
);
const BoldIcon = () => (
  <Icon>
    <path d="M6 4h4.5a2.75 2.75 0 0 1 0 5.5H6zM6 9.5h5a2.75 2.75 0 0 1 0 5.5H6z" />
  </Icon>
);
const ItalicIcon = () => (
  <Icon>
    <path d="M8 4h6M6 16h6M11.5 4 8.5 16" />
  </Icon>
);
const UnderlineIcon = () => (
  <Icon>
    <path d="M6 4v5a4 4 0 0 0 8 0V4M5 16.5h10" />
  </Icon>
);
const ColorIcon = () => (
  <Icon>
    <path d="M7 12 10 5l3 7M8 10h4M5 16h10" />
  </Icon>
);
const BulletsIcon = () => (
  <Icon>
    <path d="M8 5.5h8M8 10h8M8 14.5h8M4.5 5.5h.01M4.5 10h.01M4.5 14.5h.01" />
  </Icon>
);
const NumbersIcon = () => (
  <Icon>
    <path d="M9 5.5h7M9 10h7M9 14.5h7M4 4.5 5 4v4M4 12h1.6L4 15h1.8" />
  </Icon>
);
const AlignLeftIcon = () => (
  <Icon>
    <path d="M4 5h12M4 8.5h8M4 12h12M4 15.5h8" />
  </Icon>
);
const AlignCenterIcon = () => (
  <Icon>
    <path d="M4 5h12M6 8.5h8M4 12h12M6 15.5h8" />
  </Icon>
);
const MoreIcon = () => (
  <Icon>
    <path d="M5 10h.01M10 10h.01M15 10h.01" />
  </Icon>
);

/* -------------------------------------------------------------------------- */
/* Ribbon model — every command carries icon + label so it can render both as */
/* a bar icon-button and as a labeled menu row (spec "API implications" §1).  */
/* -------------------------------------------------------------------------- */

interface RibbonGroup {
  id: string;
  label: string;
}

interface RibbonCommand {
  id: string;
  label: string;
  icon: ReactNode;
  priority: number;
  groupId: string;
  pinned?: boolean;
}

const GROUPS: RibbonGroup[] = [
  { id: "clipboard", label: "Clipboard" },
  { id: "font", label: "Font" },
  { id: "paragraph", label: "Paragraph" },
];

// Priorities (higher survives longer) intentionally cut across DOM order and
// across groups, mirroring the Word ladder where Font combos drop before N/I/S.
const COMMANDS: RibbonCommand[] = [
  { id: "undo", label: "Undo", icon: <UndoIcon />, priority: 100, groupId: "clipboard", pinned: true },
  { id: "paste", label: "Paste", icon: <PasteIcon />, priority: 90, groupId: "clipboard" },
  { id: "cut", label: "Cut", icon: <CutIcon />, priority: 55, groupId: "clipboard" },
  { id: "copy", label: "Copy", icon: <CopyIcon />, priority: 50, groupId: "clipboard" },
  { id: "bold", label: "Bold", icon: <BoldIcon />, priority: 80, groupId: "font" },
  { id: "italic", label: "Italic", icon: <ItalicIcon />, priority: 75, groupId: "font" },
  { id: "underline", label: "Underline", icon: <UnderlineIcon />, priority: 70, groupId: "font" },
  { id: "color", label: "Font color", icon: <ColorIcon />, priority: 30, groupId: "font" },
  { id: "bullets", label: "Bullets", icon: <BulletsIcon />, priority: 60, groupId: "paragraph" },
  { id: "numbers", label: "Numbering", icon: <NumbersIcon />, priority: 40, groupId: "paragraph" },
  { id: "align-left", label: "Align left", icon: <AlignLeftIcon />, priority: 25, groupId: "paragraph" },
  { id: "align-center", label: "Align center", icon: <AlignCenterIcon />, priority: 15, groupId: "paragraph" },
];

/* -------------------------------------------------------------------------- */
/* The "…" overflow trigger + menu                                            */
/* -------------------------------------------------------------------------- */

// Kept measurable while hidden (out of flow + invisible), NOT display:none, so
// the manager can still measure the trigger's width to reserve from the budget.
const HIDDEN_TRIGGER_STYLE: CSSProperties = {
  position: "absolute",
  right: 4,
  visibility: "hidden",
  pointerEvents: "none",
};

/** Renders one group's overflowed commands as a menu section (header + rows). */
function OverflowMenuSection({ group }: { group: RibbonGroup }) {
  const state = useIsOverflowGroupVisible(group.id);
  // Nothing in this group overflowed → no section.
  if (state === "visible") return null;
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
      {COMMANDS.filter((command) => command.groupId === group.id).map((command) => (
        <OverflowMenuRow key={command.id} command={command} />
      ))}
    </DropdownMenuGroup>
  );
}

/** One command — rendered only while it is overflowed, as icon + full label. */
function OverflowMenuRow({ command }: { command: RibbonCommand }) {
  const visible = useIsOverflowItemVisible(command.id);
  if (visible) return null;
  return (
    <DropdownMenuItem>
      {command.icon}
      {command.label}
    </DropdownMenuItem>
  );
}

function OverflowMenu() {
  const { ref, isOverflowing, overflowCount } = useOverflowMenu<HTMLButtonElement>();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <ToolbarButton
            ref={ref}
            size="icon"
            data-overflow-menu=""
            aria-label={`${overflowCount} more command${overflowCount === 1 ? "" : "s"}`}
            className={isOverflowing ? "ml-auto" : undefined}
            style={isOverflowing ? undefined : HIDDEN_TRIGGER_STYLE}
          >
            <MoreIcon />
          </ToolbarButton>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        {GROUPS.map((group) => (
          <OverflowMenuSection key={group.id} group={group} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------------------- */
/* The width-controllable single-line ribbon                                  */
/* -------------------------------------------------------------------------- */

function RibbonDemo() {
  const [width, setWidth] = useState(560);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="overflow-width"
          className="text-sm font-medium text-muted-foreground"
        >
          Container width
        </label>
        <input
          id="overflow-width"
          type="range"
          min={260}
          max={900}
          step={10}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
          className="w-64 accent-primary"
        />
        <span className="w-14 text-sm tabular-nums text-muted-foreground">
          {width}px
        </span>
      </div>

      <div
        style={{ width }}
        className="max-w-full rounded-md border border-border bg-card p-1 shadow-8"
      >
        {/*
          `Overflow` clones this Toolbar and observes it. `w-full` fills the
          width-constrained parent; `relative` anchors the hidden trigger;
          `overflow-hidden` clips any residual. `padding` reserves slack for the
          inter-item gaps + dividers the item-size sum doesn't count (64: the
          true extra is ~60px; 44 under-reserved and clipped at 440/380px —
          e2e/overflow.spec.ts finding; rect-extent measuring is the real fix).
        */}
        <Overflow padding={64} minimumVisible={1}>
          <Toolbar
            aria-label="Formatting"
            className="relative w-full flex-nowrap overflow-hidden"
          >
            {GROUPS.map((group, index) => (
              <GroupCluster
                key={group.id}
                group={group}
                withTrailingDivider={index < GROUPS.length - 1}
              />
            ))}
            <OverflowMenu />
          </Toolbar>
        </Overflow>
      </div>

      <p className="text-sm text-muted-foreground">
        Undo is <strong className="font-medium text-foreground">pinned</strong>{" "}
        (never overflows). Commands drop by priority, not by position — e.g. Font
        color and the alignment buttons leave before Bold/Italic even though they
        sit later in some groups and earlier in others. Open the{" "}
        <strong className="font-medium text-foreground">…</strong> menu to see the
        overflowed commands grouped under their source-group headings.
      </p>
    </div>
  );
}

function GroupCluster({
  group,
  withTrailingDivider,
}: {
  group: RibbonGroup;
  withTrailingDivider: boolean;
}) {
  return (
    <>
      {COMMANDS.filter((command) => command.groupId === group.id).map((command) => (
        <OverflowItem
          key={command.id}
          id={command.id}
          priority={command.priority}
          pinned={command.pinned}
          groupId={command.groupId}
        >
          <ToolbarButton size="icon" aria-label={command.label}>
            {command.icon}
          </ToolbarButton>
        </OverflowItem>
      ))}
      {withTrailingDivider ? (
        <OverflowDivider groupId={group.id}>
          <ToolbarSeparator />
        </OverflowDivider>
      ) : null}
    </>
  );
}

export default function OverflowPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Overflow</h1>
          <p className="text-muted-foreground">
            A headless priority-overflow system — the core mechanism of a
            single-line Fluent 2 Ribbon. A row that cannot fit its container hides
            its lowest-priority commands into a “…” menu and restores them,
            highest-priority-first, as it grows. Drag the slider to resize the
            container.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <RibbonDemo />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <RibbonDemo />
        </PreviewPanel>
      </div>
    </main>
  );
}
