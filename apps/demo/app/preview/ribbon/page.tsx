"use client";

/**
 * Ribbon preview — SANCTIONED DEVIATION from conventions §8 (Client Component,
 * the overflow/toast precedent).
 *
 * Reproduces Word Online's single-line ribbon ("Faixa de Opções de Linha
 * Única") with kit primitives: three tabs (Início / Inserir / Exibir), and an
 * Início tab with ~6 groups / ~16 commands mixing ToolbarButtons, B/I/U Toggles,
 * a Paste SplitButton whose overflow form is a submenu, tooltips on icon-only
 * controls, and one pinned command (Desfazer). A width slider drives the
 * container so you can watch commands drop by priority into the "…" menu (grouped
 * under source-group headers), and a "Mostrar apenas as guias" toggle exercises
 * the collapsed (tabs-only) axis.
 *
 * `"use client"` because it holds slider/collapse/toggle state and composes the
 * Overflow provider, DropdownMenu, and Tooltip.
 *
 * Theme caveat (same as overflow/select): DropdownMenu/Tooltip content portals to
 * `document.body`, outside the `.light`/`.dark` PreviewPanel scope, so an open
 * overflow menu picks up the page-root theme, not the panel it was opened from.
 * The ribbon itself is themed correctly per panel.
 */

import { useState } from "react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@kit/components/ui/dropdown-menu";
import {
  Ribbon,
  RibbonContent,
  RibbonGroup,
  RibbonItem,
  RibbonTab,
  RibbonTabList,
} from "@kit/components/ui/ribbon";
import {
  SplitButton,
  SplitButtonAction,
  SplitButtonTrigger,
} from "@kit/components/ui/split-button";
import { Toggle } from "@kit/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kit/components/ui/tooltip";
import { ToolbarButton } from "@kit/components/ui/toolbar";

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

const HighlightIcon = () => (
  <Icon>
    <path d="m11 4 5 5-6 6H7l-1-1zM5 16l-1.5 2h5" />
  </Icon>
);
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
const PainterIcon = () => (
  <Icon>
    <path d="M5 5h8v3H5zM7 8v2h3v3h2M10 13v3" />
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
const StyleIcon = () => (
  <Icon>
    <path d="M4 15 10 5l6 10M6.5 11h7" />
  </Icon>
);
const FindIcon = () => (
  <Icon>
    <path d="M9 4a5 5 0 1 0 0 10A5 5 0 0 0 9 4zM13 12l3 3" />
  </Icon>
);
const ReplaceIcon = () => (
  <Icon>
    <path d="M4 6h7l-2-2M16 14H9l2 2M4 6l2 2M16 14l-2-2" />
  </Icon>
);
const TableIcon = () => (
  <Icon>
    <path d="M4 5h12v10H4zM4 9h12M4 12h12M9 5v10" />
  </Icon>
);
const ImageIcon = () => (
  <Icon>
    <path d="M4 5h12v10H4zM7 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2M5 14l4-4 3 3 2-2 1 1" />
  </Icon>
);
const LinkIcon = () => (
  <Icon>
    <path d="M8 12a3 3 0 0 1 0-4l2-2a3 3 0 0 1 4 4l-1 1M12 8a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1" />
  </Icon>
);
const CommentIcon = () => (
  <Icon>
    <path d="M4 5h12v8H9l-3 3v-3H4z" />
  </Icon>
);
const RulerIcon = () => (
  <Icon>
    <path d="M4 8h12v4H4zM7 8v2M10 8v2M13 8v2" />
  </Icon>
);
const GridIcon = () => (
  <Icon>
    <path d="M4 4h12v12H4zM4 8h12M4 12h12M8 4v12M12 4v12" />
  </Icon>
);
const ZoomIcon = () => (
  <Icon>
    <path d="M9 4a5 5 0 1 0 0 10A5 5 0 0 0 9 4zM13 12l3 3M7 9h4M9 7v4" />
  </Icon>
);

/* -------------------------------------------------------------------------- */
/* Tooltip helper — the measured element for a RibbonItem must be a real DOM   */
/* box, so the tooltip trigger button is wrapped in an inline-flex span (that  */
/* span is what Overflow measures / hides).                                    */
/* -------------------------------------------------------------------------- */

function TipButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: ReactNode;
} & React.ComponentProps<typeof ToolbarButton>) {
  return (
    <span className="inline-flex">
      <Tooltip>
        <TooltipTrigger
          render={
            <ToolbarButton size="icon" aria-label={label} {...props}>
              {children}
            </ToolbarButton>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* The single-line ribbon (Início / Inserir / Exibir)                          */
/* -------------------------------------------------------------------------- */

function WordRibbon({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
}) {
  return (
    <TooltipProvider>
      <Ribbon
        defaultValue="inicio"
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      >
        <RibbonTabList aria-label="Faixa de Opções">
          <RibbonTab value="inicio">Início</RibbonTab>
          <RibbonTab value="inserir">Inserir</RibbonTab>
          <RibbonTab value="exibir">Exibir</RibbonTab>
        </RibbonTabList>

        {/* ---------------------------------------------------------------- */}
        {/* Início — the full Home tab                                        */}
        {/* ---------------------------------------------------------------- */}
        {/* No `padding` reserve: the Overflow manager (v1.1) measures the flex
            gaps, the 5 group dividers, and the "…" trigger directly, so this
            dense 16-command row no longer clips between breakpoints (the old
            ~47px overrun documented in e2e/ribbon.spec.ts is gone). */}
        <RibbonContent value="inicio">
          <RibbonGroup groupId="desfazer" label="Desfazer">
            <RibbonItem id="undo" label="Desfazer" icon={<UndoIcon />} priority={100} pinned>
              <TipButton label="Desfazer">
                <UndoIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup groupId="clipboard" label="Área de Transferência">
            <RibbonItem
              id="paste"
              label="Colar"
              icon={<PasteIcon />}
              priority={95}
              overflowRender={() => (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <PasteIcon />
                    Colar
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Manter formatação original</DropdownMenuItem>
                    <DropdownMenuItem>Mesclar formatação</DropdownMenuItem>
                    <DropdownMenuItem>Manter somente texto</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            >
              <SplitButton variant="secondary" size="sm" className="inline-flex">
                <SplitButtonAction aria-label="Colar" className="gap-1.5">
                  <PasteIcon />
                  Colar
                </SplitButtonAction>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<SplitButtonTrigger aria-label="Opções de colagem" />}
                  />
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>Manter formatação original</DropdownMenuItem>
                    <DropdownMenuItem>Mesclar formatação</DropdownMenuItem>
                    <DropdownMenuItem>Manter somente texto</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SplitButton>
            </RibbonItem>
            <RibbonItem id="cut" label="Recortar" icon={<CutIcon />} priority={40}>
              <TipButton label="Recortar">
                <CutIcon />
              </TipButton>
            </RibbonItem>
            <RibbonItem id="copy" label="Copiar" icon={<CopyIcon />} priority={38}>
              <TipButton label="Copiar">
                <CopyIcon />
              </TipButton>
            </RibbonItem>
            <RibbonItem id="painter" label="Pincel de Formatação" icon={<PainterIcon />} priority={70}>
              <TipButton label="Pincel de Formatação">
                <PainterIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup groupId="font" label="Fonte">
            <RibbonItem id="bold" label="Negrito" icon={<BoldIcon />} priority={90}>
              <span className="inline-flex">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Toggle size="sm" aria-label="Negrito">
                        <BoldIcon />
                      </Toggle>
                    }
                  />
                  <TooltipContent>Negrito</TooltipContent>
                </Tooltip>
              </span>
            </RibbonItem>
            <RibbonItem id="italic" label="Itálico" icon={<ItalicIcon />} priority={85}>
              <span className="inline-flex">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Toggle size="sm" aria-label="Itálico">
                        <ItalicIcon />
                      </Toggle>
                    }
                  />
                  <TooltipContent>Itálico</TooltipContent>
                </Tooltip>
              </span>
            </RibbonItem>
            <RibbonItem id="underline" label="Sublinhado" icon={<UnderlineIcon />} priority={80}>
              <span className="inline-flex">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Toggle size="sm" aria-label="Sublinhado">
                        <UnderlineIcon />
                      </Toggle>
                    }
                  />
                  <TooltipContent>Sublinhado</TooltipContent>
                </Tooltip>
              </span>
            </RibbonItem>
            <RibbonItem
              id="highlight"
              label="Realce"
              icon={<HighlightIcon />}
              priority={28}
              overflowRender={() => (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <HighlightIcon />
                    Realce
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Amarelo</DropdownMenuItem>
                    <DropdownMenuItem>Verde</DropdownMenuItem>
                    <DropdownMenuItem>Rosa</DropdownMenuItem>
                    <DropdownMenuItem>Sem realce</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            >
              <SplitButton variant="ghost" size="sm" className="inline-flex">
                <SplitButtonAction aria-label="Realce">
                  <HighlightIcon />
                </SplitButtonAction>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<SplitButtonTrigger aria-label="Opções de realce" />}
                  />
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>Amarelo</DropdownMenuItem>
                    <DropdownMenuItem>Verde</DropdownMenuItem>
                    <DropdownMenuItem>Rosa</DropdownMenuItem>
                    <DropdownMenuItem>Sem realce</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SplitButton>
            </RibbonItem>
            <RibbonItem id="color" label="Cor da Fonte" icon={<ColorIcon />} priority={30}>
              <TipButton label="Cor da Fonte">
                <ColorIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup groupId="paragraph" label="Parágrafo">
            <RibbonItem id="bullets" label="Marcadores" icon={<BulletsIcon />} priority={60}>
              <TipButton label="Marcadores">
                <BulletsIcon />
              </TipButton>
            </RibbonItem>
            <RibbonItem id="numbers" label="Numeração" icon={<NumbersIcon />} priority={35}>
              <TipButton label="Numeração">
                <NumbersIcon />
              </TipButton>
            </RibbonItem>
            <RibbonItem id="align-left" label="Alinhar à Esquerda" icon={<AlignLeftIcon />} priority={55}>
              <TipButton label="Alinhar à Esquerda">
                <AlignLeftIcon />
              </TipButton>
            </RibbonItem>
            <RibbonItem id="align-center" label="Centralizar" icon={<AlignCenterIcon />} priority={15}>
              <TipButton label="Centralizar">
                <AlignCenterIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup groupId="styles" label="Estilos">
            <RibbonItem id="style" label="Estilo" icon={<StyleIcon />} priority={58}>
              <TipButton label="Estilo">
                <StyleIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup groupId="editing" label="Edição">
            <RibbonItem id="find" label="Localizar" icon={<FindIcon />} priority={65}>
              <TipButton label="Localizar">
                <FindIcon />
              </TipButton>
            </RibbonItem>
            <RibbonItem id="replace" label="Substituir" icon={<ReplaceIcon />} priority={20}>
              <TipButton label="Substituir">
                <ReplaceIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>

        {/* ---------------------------------------------------------------- */}
        {/* Inserir                                                           */}
        {/* ---------------------------------------------------------------- */}
        <RibbonContent value="inserir">
          <RibbonGroup groupId="tables" label="Tabelas">
            <RibbonItem id="table" label="Tabela" icon={<TableIcon />} priority={80}>
              <TipButton label="Tabela">
                <TableIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup groupId="illustrations" label="Ilustrações">
            <RibbonItem id="image" label="Imagem" icon={<ImageIcon />} priority={70}>
              <TipButton label="Imagem">
                <ImageIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup groupId="links" label="Links">
            <RibbonItem id="link" label="Link" icon={<LinkIcon />} priority={60}>
              <TipButton label="Link">
                <LinkIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup groupId="comments" label="Comentários">
            <RibbonItem id="comment" label="Comentário" icon={<CommentIcon />} priority={50}>
              <TipButton label="Comentário">
                <CommentIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>

        {/* ---------------------------------------------------------------- */}
        {/* Exibir                                                            */}
        {/* ---------------------------------------------------------------- */}
        <RibbonContent value="exibir">
          <RibbonGroup groupId="show" label="Mostrar">
            <RibbonItem id="ruler" label="Régua" icon={<RulerIcon />} priority={80}>
              <span className="inline-flex">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Toggle size="sm" aria-label="Régua">
                        <RulerIcon />
                      </Toggle>
                    }
                  />
                  <TooltipContent>Régua</TooltipContent>
                </Tooltip>
              </span>
            </RibbonItem>
            <RibbonItem id="grid" label="Linhas de Grade" icon={<GridIcon />} priority={70}>
              <span className="inline-flex">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Toggle size="sm" aria-label="Linhas de Grade">
                        <GridIcon />
                      </Toggle>
                    }
                  />
                  <TooltipContent>Linhas de Grade</TooltipContent>
                </Tooltip>
              </span>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup groupId="zoom" label="Zoom">
            <RibbonItem id="zoom" label="Zoom" icon={<ZoomIcon />} priority={60}>
              <TipButton label="Zoom">
                <ZoomIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    </TooltipProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* Width-controllable demo + collapse toggle                                  */
/* -------------------------------------------------------------------------- */

function RibbonDemo() {
  const [width, setWidth] = useState(760);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <label
            htmlFor="ribbon-width"
            className="text-sm font-medium text-muted-foreground"
          >
            Largura
          </label>
          <input
            id="ribbon-width"
            type="range"
            min={240}
            max={1100}
            step={10}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
            className="w-64 accent-primary"
          />
          <span className="w-14 text-sm tabular-nums text-muted-foreground">
            {width}px
          </span>
        </div>

        <Toggle
          size="sm"
          pressed={collapsed}
          onPressedChange={setCollapsed}
          aria-label="Mostrar apenas as guias"
        >
          Mostrar apenas as guias
        </Toggle>
      </div>

      <div
        style={{ width }}
        className="max-w-full rounded-lg border border-border bg-background shadow-8"
      >
        <WordRibbon collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>

      <p className="text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Desfazer</strong> is
        pinned (never overflows). Drag the slider to shrink the row — commands
        drop by <strong className="font-medium text-foreground">priority</strong>
        , not position, into the “…” menu, grouped under their source-group
        headers. <strong className="font-medium text-foreground">Colar</strong>{" "}
        keeps its split-button menu as a submenu when overflowed. Toggle{" "}
        <em>Mostrar apenas as guias</em> for the tabs-only mode; selecting any tab
        brings the row back.
      </p>
    </div>
  );
}

export default function RibbonPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Ribbon</h1>
          <p className="text-muted-foreground">
            An Office-style single-line Ribbon (Word Online&apos;s “Faixa de
            Opções de Linha Única”), composed from the kit Tabs, Toolbar, and the
            headless Overflow priority system. Every command renders as an icon in
            the bar and as an icon + label row inside the “…” overflow menu.
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
