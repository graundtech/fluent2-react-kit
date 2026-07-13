"use client";

/**
 * Ribbon collapse preview — SANCTIONED DEVIATION from conventions §8 (Client
 * Component, the overflow/toast precedent).
 *
 * This is the classic-Ribbon collapse PROOF: a two-row Word-style band built
 * from `GroupCollapse` + `CollapseGroup`, inside a width-controllable container.
 * Drag the range slider to shrink the band and watch whole GROUPS collapse — in
 * `collapsePriority` order, NOT DOM order: Parágrafo (priority 50) collapses to a
 * dropdown button first, then Fonte (40), exactly as captured live from Word
 * Online in `docs/design/ribbon-behavior-spec.md` ("Classic mode": Parágrafo at
 * ~1240px, Fonte at ~1000px). Shrink further and every group collapses; at the
 * narrow end the band reports `scrollMode` (a `>` scroll indicator appears and
 * `data-scroll-mode` is stamped on the container) — the terminal horizontal-
 * scroll fallback that phase C3 will render for real. The collapsed form here is
 * a stub button (icon + label + chevron); phase C2 wires its flyover.
 *
 * It needs `"use client"` because it holds slider state and uses the
 * GroupCollapse provider/hooks (context + `ResizeObserver`).
 */

import { useState } from "react";
import type { ReactNode } from "react";

import {
  CollapseGroup,
  GroupCollapse,
  useIsScrollMode,
} from "@kit/components/ui/ribbon-collapse";

import { PreviewPanel } from "../../../components/preview-panel";

/* -------------------------------------------------------------------------- */
/* Inline icons (conventions §8 — no icon dependency in the demo)             */
/* -------------------------------------------------------------------------- */

function Icon({ children, className = "size-4" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ChevronDown = () => (
  <Icon className="size-3">
    <path d="M5 8l5 5 5-5" />
  </Icon>
);
const ClipboardIcon = () => (
  <Icon className="size-5">
    <path d="M8 4h4v2H8zM6 5H5v11h10V5h-1M7.5 10h5M7.5 13h5" />
  </Icon>
);
const FontIcon = () => (
  <Icon className="size-5">
    <path d="M5 15l4-10 4 10M6.5 11.5h5M14 15V7m0 0a2 2 0 1 1 0 4" />
  </Icon>
);
const ParagraphIcon = () => (
  <Icon className="size-5">
    <path d="M6 5h9M6 9h9M6 13h5M6 17h5" />
  </Icon>
);
const StylesIcon = () => (
  <Icon className="size-5">
    <path d="M4 15l7-7 3 3-7 7H4zM11 8l2-2 3 3-2 2" />
  </Icon>
);
const EditingIcon = () => (
  <Icon className="size-5">
    <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 16c0-2 2-3 4-3s4 1 4 3M13 6h4M13 9h4M13 12h4" />
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
const BulletsIcon = () => (
  <Icon>
    <path d="M8 5.5h8M8 10h8M8 14.5h8M4.5 5.5h.01M4.5 10h.01M4.5 14.5h.01" />
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
const PasteIcon = () => (
  <Icon>
    <path d="M8 4h4v2H8zM6 5H5v11h10V5h-1M7.5 10h5M7.5 13h5" />
  </Icon>
);
const ChevronRight = () => (
  <Icon className="size-4">
    <path d="M8 5l5 5-5 5" />
  </Icon>
);

/* -------------------------------------------------------------------------- */
/* Classic Ribbon model — Word Home tab groups (pt-BR), collapse by priority. */
/* Parágrafo (50) collapses before Fonte (40) despite sitting later in the    */
/* tab — priority beats DOM order (ribbon-behavior-spec.md "Classic mode").   */
/* -------------------------------------------------------------------------- */

interface ClassicGroup {
  id: string;
  label: string;
  collapsePriority: number;
  icon: ReactNode;
  commands: { label: string; icon: ReactNode }[];
}

const GROUPS: ClassicGroup[] = [
  {
    id: "clipboard",
    label: "Área de Transferência",
    collapsePriority: 10,
    icon: <ClipboardIcon />,
    commands: [{ label: "Colar", icon: <PasteIcon /> }],
  },
  {
    id: "font",
    label: "Fonte",
    collapsePriority: 40,
    icon: <FontIcon />,
    commands: [
      { label: "Negrito", icon: <BoldIcon /> },
      { label: "Itálico", icon: <ItalicIcon /> },
      { label: "Sublinhado", icon: <UnderlineIcon /> },
    ],
  },
  {
    id: "paragraph",
    label: "Parágrafo",
    collapsePriority: 50,
    icon: <ParagraphIcon />,
    commands: [
      { label: "Marcadores", icon: <BulletsIcon /> },
      { label: "Alinhar à esquerda", icon: <AlignLeftIcon /> },
      { label: "Centralizar", icon: <AlignCenterIcon /> },
    ],
  },
  {
    id: "styles",
    label: "Estilos",
    collapsePriority: 30,
    icon: <StylesIcon />,
    commands: [
      { label: "Normal", icon: <StylesIcon /> },
      { label: "Título", icon: <StylesIcon /> },
    ],
  },
  {
    id: "editing",
    label: "Editando",
    collapsePriority: 20,
    icon: <EditingIcon />,
    commands: [
      { label: "Localizar", icon: <EditingIcon /> },
      { label: "Substituir", icon: <EditingIcon /> },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* The two group forms                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Expanded form: a cluster of icon-buttons over a centered muted group label.
 *
 * These are **render functions**, not components: `CollapseGroup` clones the
 * element it is handed to inject the measuring `ref`, the `display` toggle, and
 * `data-collapse-form` — so the element must be a real DOM node (a `<div>` /
 * `<button>`), not a custom component that would swallow those injected props.
 */
function renderExpanded(group: ClassicGroup) {
  return (
    <div className="flex shrink-0 flex-col justify-between border-l border-border/60 pl-2 pr-1 first:border-l-0">
      <div className="flex items-center gap-0.5 px-1 py-1.5">
        {group.commands.map((command) => (
          <button
            key={command.label}
            type="button"
            aria-label={command.label}
            className="flex size-9 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {command.icon}
          </button>
        ))}
      </div>
      <div className="pb-1 text-center text-[11px] leading-none text-muted-foreground">
        {group.label}
      </div>
    </div>
  );
}

/**
 * Collapsed form: a single dropdown button (icon over label + chevron) — a stub
 * in C1 (it does not open a real flyout; C2 wires that). Also a render function
 * (see `renderExpanded`) so `CollapseGroup` clones a real `<button>`.
 */
function renderCollapsed(group: ClassicGroup) {
  return (
    <button
      type="button"
      aria-label={`${group.label} (recolhido)`}
      aria-haspopup="menu"
      className="flex w-[76px] shrink-0 flex-col items-center justify-between gap-1 border-l border-border/60 px-2 py-1.5 text-foreground first:border-l-0 hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {group.icon}
      <span className="flex max-w-full items-center gap-0.5 text-[11px] leading-none">
        <span className="truncate">{group.label}</span>
        <ChevronDown />
      </span>
    </button>
  );
}

/**
 * Scroll indicator — the `>` edge arrow Word shows on the clipped edge once
 * group-collapse stops helping and the band falls back to horizontal scroll.
 * Absolutely positioned so it never affects the band's own layout/scrollWidth.
 * A stub in C1 (no real scrolling); phase C3 renders the working scroll UI.
 */
function ScrollIndicator() {
  const scroll = useIsScrollMode();
  if (!scroll) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-1 right-1 flex items-center rounded-md bg-background/80 px-1 text-muted-foreground shadow-8"
    >
      <ChevronRight />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* The width-controllable classic band                                        */
/* -------------------------------------------------------------------------- */

function ClassicRibbonDemo() {
  const [width, setWidth] = useState(760);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="ribbon-collapse-width"
          className="text-sm font-medium text-muted-foreground"
        >
          Largura da faixa
        </label>
        <input
          id="ribbon-collapse-width"
          type="range"
          min={280}
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
        className="max-w-full rounded-md border border-border bg-card shadow-8"
      >
        {/*
          `GroupCollapse` clones this band and observes it. `w-full` fills the
          width-constrained parent; `relative` anchors the scroll indicator;
          `flex-nowrap` + `overflow-hidden` let the accounting + settle net see a
          real overrun. No `padding` reserve is needed — the manager measures the
          flex gaps and each group's active form directly.
        */}
        <GroupCollapse collapsedEstimate={64}>
          <div
            role="toolbar"
            aria-label="Página Inicial"
            className="relative flex h-[92px] w-full flex-nowrap items-stretch gap-1 overflow-hidden p-1"
          >
            {GROUPS.map((group) => (
              <CollapseGroup
                key={group.id}
                groupId={group.id}
                collapsePriority={group.collapsePriority}
                expanded={renderExpanded(group)}
                collapsed={renderCollapsed(group)}
              />
            ))}
            <ScrollIndicator />
          </div>
        </GroupCollapse>
      </div>

      <p className="text-sm text-muted-foreground">
        Groups collapse by <strong className="font-medium text-foreground">explicit
        priority, not DOM order</strong> — <strong className="font-medium text-foreground">Parágrafo</strong>{" "}
        (priority 50) collapses to a dropdown before{" "}
        <strong className="font-medium text-foreground">Fonte</strong> (40), matching
        Word’s classic ribbon. Keep dragging: every group collapses, then the band
        enters <strong className="font-medium text-foreground">scroll mode</strong>{" "}
        (a <strong className="font-medium text-foreground">›</strong> indicator
        appears) — the terminal horizontal-scroll fallback rendered for real in a
        later phase.
      </p>
    </div>
  );
}

export default function RibbonCollapsePreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Ribbon collapse</h1>
          <p className="text-muted-foreground">
            A headless group-collapse system — the mechanism behind a classic
            (expanded) Fluent 2 Ribbon. When the band cannot fit, whole groups
            collapse to a dropdown button (highest priority first), then the band
            falls back to horizontal scroll. Drag the slider to resize it.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <ClassicRibbonDemo />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <ClassicRibbonDemo />
        </PreviewPanel>
      </div>
    </main>
  );
}
