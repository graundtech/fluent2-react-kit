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
  RibbonColumn,
  RibbonContent,
  RibbonGroup,
  RibbonItem,
  RibbonLargeButton,
  RibbonLayoutSwitcher,
  RibbonRow,
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

/** A small classic icon button (Fluent subtle) — 24px, participates in roving. */
function SmallCmd({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ToolbarButton size="icon-sm" aria-label={label}>
      {children}
    </ToolbarButton>
  );
}

function WordRibbon({
  layout,
  onLayoutChange,
  collapsed,
  onCollapsedChange,
  autoAdjust,
  onAutoAdjustChange,
}: {
  layout: "single-line" | "classic";
  onLayoutChange: (next: "single-line" | "classic") => void;
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  autoAdjust: boolean;
  onAutoAdjustChange: (next: boolean) => void;
}) {
  return (
    <TooltipProvider>
      <Ribbon
        defaultValue="inicio"
        layout={layout}
        onLayoutChange={onLayoutChange}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        autoAdjust={autoAdjust}
        onAutoAdjustChange={onAutoAdjustChange}
      >
        {/* Six tabs so the guide strip itself overflows at narrow widths: the
            trailing tabs fold behind a `⌄` chevron menu (Word at ~680px). The
            RibbonLayoutSwitcher is pinned far-right (Word's finding #10 position)
            via the tab strip's `actions` slot — outside the tablist AND the tab
            overflow budget. */}
        <RibbonTabList
          aria-label="Faixa de Opções"
          actions={<RibbonLayoutSwitcher />}
        >
          <RibbonTab value="inicio">Início</RibbonTab>
          <RibbonTab value="inserir">Inserir</RibbonTab>
          <RibbonTab value="exibir">Exibir</RibbonTab>
          <RibbonTab value="referencias">Referências</RibbonTab>
          <RibbonTab value="revisao">Revisão</RibbonTab>
          <RibbonTab value="ajuda">Ajuda</RibbonTab>
        </RibbonTabList>

        {/* ---------------------------------------------------------------- */}
        {/* Início — ONE tree, both layouts (C4). The command SET differs per   */}
        {/* layout (Word parity), so the `layouts` escape hatch scopes each     */}
        {/* group: the classic groups (layouts=["classic"]) render only the     */}
        {/* two-row band, the single-line groups (layouts=["single-line"]) only */}
        {/* the v1 command row. In single-line the classic groups return null   */}
        {/* (and register nothing), so the single-line projection is byte-       */}
        {/* identical to v1 — the e2e regression guard (ribbon.spec.ts) drives   */}
        {/* it. Classic groups come FIRST so the single-line "Edição" stays the  */}
        {/* last rendered child and auto-drops its trailing divider exactly as   */}
        {/* v1; the last classic group sets withTrailingDivider={false} itself.  */}
        {/* ---------------------------------------------------------------- */}
        <RibbonContent value="inicio">
          {/* == classic-only groups (Word's two-row band) ================== */}
          <RibbonGroup
            groupId="clipboard"
            label="Área de Transferência"
            icon={<PasteIcon />}
            collapsePriority={10}
            layouts={["classic"]}
          >
            {/* Large stacked "Colar" with a paste-options dropdown. Composed
                through ToolbarButton → DropdownMenuTrigger so the large button
                JOINS the band's arrow-roving order (classic-roving fix, C4). */}
            <RibbonItem id="paste" label="Colar">
              <DropdownMenu>
                <RibbonLargeButton
                  icon={<PasteIcon />}
                  chevron
                  render={
                    <ToolbarButton
                      variant="ghost"
                      render={<DropdownMenuTrigger />}
                    />
                  }
                >
                  Colar
                </RibbonLargeButton>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>Manter formatação original</DropdownMenuItem>
                  <DropdownMenuItem>Mesclar formatação</DropdownMenuItem>
                  <DropdownMenuItem>Manter somente texto</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </RibbonItem>
            {/* A small vertical list of the remaining clipboard commands. */}
            <RibbonColumn>
              <SmallCmd label="Recortar">
                <CutIcon />
              </SmallCmd>
              <SmallCmd label="Copiar">
                <CopyIcon />
              </SmallCmd>
              <SmallCmd label="Pincel de Formatação">
                <PainterIcon />
              </SmallCmd>
            </RibbonColumn>
          </RibbonGroup>

          <RibbonGroup
            groupId="font"
            label="Fonte"
            icon={<BoldIcon />}
            collapsePriority={40}
            onLauncherClick={() => {}}
            layouts={["classic"]}
          >
            {/* 2×3 grid of small icon buttons. */}
            <RibbonColumn>
              <RibbonRow>
                <SmallCmd label="Negrito">
                  <BoldIcon />
                </SmallCmd>
                <SmallCmd label="Itálico">
                  <ItalicIcon />
                </SmallCmd>
                <SmallCmd label="Sublinhado">
                  <UnderlineIcon />
                </SmallCmd>
              </RibbonRow>
              <RibbonRow>
                <SmallCmd label="Realce">
                  <HighlightIcon />
                </SmallCmd>
                <SmallCmd label="Cor da Fonte">
                  <ColorIcon />
                </SmallCmd>
                <SmallCmd label="Estilo">
                  <StyleIcon />
                </SmallCmd>
              </RibbonRow>
            </RibbonColumn>
          </RibbonGroup>

          <RibbonGroup
            groupId="paragraph"
            label="Parágrafo"
            icon={<BulletsIcon />}
            collapsePriority={50}
            layouts={["classic"]}
          >
            {/* 2×2 grid. Parágrafo has the highest collapsePriority → collapses first. */}
            <RibbonColumn>
              <RibbonRow>
                <SmallCmd label="Marcadores">
                  <BulletsIcon />
                </SmallCmd>
                <SmallCmd label="Numeração">
                  <NumbersIcon />
                </SmallCmd>
              </RibbonRow>
              <RibbonRow>
                <SmallCmd label="Alinhar à Esquerda">
                  <AlignLeftIcon />
                </SmallCmd>
                <SmallCmd label="Centralizar">
                  <AlignCenterIcon />
                </SmallCmd>
              </RibbonRow>
            </RibbonColumn>
          </RibbonGroup>

          <RibbonGroup
            groupId="editing"
            label="Edição"
            icon={<FindIcon />}
            collapsePriority={20}
            withTrailingDivider={false}
            layouts={["classic"]}
          >
            <RibbonColumn>
              <SmallCmd label="Localizar">
                <FindIcon />
              </SmallCmd>
              <SmallCmd label="Substituir">
                <ReplaceIcon />
              </SmallCmd>
            </RibbonColumn>
            {/* Escape hatch: a large "Ditar" command that exists ONLY in classic.
                render={<ToolbarButton/>} makes the large button a roving item. */}
            <RibbonItem id="dictate" label="Ditar" layouts={["classic"]}>
              <RibbonLargeButton
                icon={<CommentIcon />}
                render={<ToolbarButton variant="ghost" />}
              >
                Ditar
              </RibbonLargeButton>
            </RibbonItem>
          </RibbonGroup>

          {/* == single-line-only groups (v1 command row — UNCHANGED) ======= */}
          {/* No `padding` reserve: the Overflow manager (v1.1) measures the flex
              gaps, the 5 group dividers, and the "…" trigger directly, so this
              dense 16-command row no longer clips between breakpoints (the old
              ~47px overrun documented in e2e/ribbon.spec.ts is gone). */}
          <RibbonGroup groupId="desfazer" label="Desfazer" layouts={["single-line"]}>
            <RibbonItem id="undo" label="Desfazer" icon={<UndoIcon />} priority={100} pinned>
              <TipButton label="Desfazer">
                <UndoIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup
            groupId="clipboard"
            label="Área de Transferência"
            layouts={["single-line"]}
          >
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

          <RibbonGroup groupId="font" label="Fonte" layouts={["single-line"]}>
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

          <RibbonGroup groupId="paragraph" label="Parágrafo" layouts={["single-line"]}>
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

          <RibbonGroup groupId="styles" label="Estilos" layouts={["single-line"]}>
            <RibbonItem id="style" label="Estilo" icon={<StyleIcon />} priority={58}>
              <TipButton label="Estilo">
                <StyleIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>

          <RibbonGroup groupId="editing" label="Edição" layouts={["single-line"]}>
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

        {/* ---------------------------------------------------------------- */}
        {/* Referências / Revisão / Ajuda — light content; these mostly exist */}
        {/* so the guide strip overflows. They render in both layouts.        */}
        {/* ---------------------------------------------------------------- */}
        <RibbonContent value="referencias">
          <RibbonGroup groupId="toc" label="Sumário" collapsePriority={20}>
            <RibbonItem id="toc" label="Sumário" icon={<StyleIcon />}>
              <TipButton label="Sumário">
                <StyleIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup groupId="footnotes" label="Notas de Rodapé" collapsePriority={10}>
            <RibbonItem id="footnote" label="Inserir Nota" icon={<NumbersIcon />}>
              <TipButton label="Inserir Nota">
                <NumbersIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>

        <RibbonContent value="revisao">
          <RibbonGroup groupId="proofing" label="Revisão de Texto">
            <RibbonItem id="spelling" label="Ortografia" icon={<FindIcon />}>
              <TipButton label="Ortografia">
                <FindIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup groupId="comments-r" label="Comentários">
            <RibbonItem id="new-comment" label="Novo Comentário" icon={<CommentIcon />}>
              <TipButton label="Novo Comentário">
                <CommentIcon />
              </TipButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>

        <RibbonContent value="ajuda">
          <RibbonGroup groupId="help" label="Ajuda">
            <RibbonItem id="help" label="Ajuda" icon={<FindIcon />}>
              <TipButton label="Ajuda">
                <FindIcon />
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
  const [layout, setLayout] = useState<"single-line" | "classic">(
    "single-line"
  );
  const [autoAdjust, setAutoAdjust] = useState(true);

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

        {/* The layout switch now lives in the ribbon's own far-right
            RibbonLayoutSwitcher chevron (Word's affordance). These toggles stay
            as convenience controls and expose the same axes through the
            controlled props, so the switcher and the toggles stay in sync. */}
        <Toggle
          size="sm"
          pressed={collapsed}
          onPressedChange={setCollapsed}
          aria-label="Mostrar apenas as guias"
        >
          Mostrar apenas as guias
        </Toggle>

        {/* autoAdjust is classic-only: off = groups never collapse, the band
            goes straight to horizontal scroll (with `‹›` arrows) when it
            overflows. Ignored in single-line. */}
        <Toggle
          size="sm"
          pressed={autoAdjust}
          onPressedChange={setAutoAdjust}
          aria-label="Ajustar automaticamente"
        >
          Ajustar automaticamente
        </Toggle>
      </div>

      <div
        style={{ width }}
        className="max-w-full rounded-lg border border-border bg-background shadow-8"
      >
        <WordRibbon
          layout={layout}
          onLayoutChange={setLayout}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          autoAdjust={autoAdjust}
          onAutoAdjustChange={setAutoAdjust}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Open the far-right <em>display-options chevron</em> (Word&apos;s{" "}
        <strong className="font-medium text-foreground">
          RibbonLayoutSwitcher
        </strong>
        ) to switch <em>Clássica ↔ Linha Única</em> on the same tabs — the active
        tab is preserved. In{" "}
        <strong className="font-medium text-foreground">single-line</strong>,{" "}
        <strong className="font-medium text-foreground">Desfazer</strong> is
        pinned and commands drop by{" "}
        <strong className="font-medium text-foreground">priority</strong> into
        the “…” menu as the row shrinks. In{" "}
        <strong className="font-medium text-foreground">classic</strong>, shrink
        the band and whole groups collapse to a dropdown button —{" "}
        <strong className="font-medium text-foreground">Parágrafo</strong>{" "}
        (collapsePriority 50) before{" "}
        <strong className="font-medium text-foreground">Fonte</strong> (40); open
        a collapsed group to use its commands in a flyout. Toggle{" "}
        <em>Mostrar apenas as guias</em> for tabs-only mode.
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
