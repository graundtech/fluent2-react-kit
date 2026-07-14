"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  ReactElement,
  ReactNode,
  Ref,
} from "react";

import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Overflow,
  OverflowDivider,
  OverflowItem,
  useIsOverflowGroupVisible,
  useIsOverflowItemVisible,
  useOverflowMenu,
} from "./overflow";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  CollapseGroup,
  GroupCollapse,
  useGroupMode,
  useIsScrollMode,
} from "./ribbon-collapse";
import type {
  CollapseGetGap,
  CollapseGetOverflowSize,
  CollapseGetSize,
} from "./ribbon-collapse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "./toolbar";

/**
 * Ribbon — the kit's flagship composite: an Office-style **single-line** Ribbon
 * (Word Online's "Faixa de Opções de Linha Única"). It composes three primitives
 * that already exist in the kit — `Tabs` (the guide strip), `Toolbar` (the
 * command row, APG roving-tabindex), and the headless `Overflow` priority system
 * (which drops the lowest-priority commands into a "…" menu as the row shrinks) —
 * and adds the **item model** that makes every command render two ways at once:
 * an icon control in the bar, and an icon + full-label row inside the overflow
 * menu, grouped under a header named after its source group. That dual
 * presentation is the behavioral heart captured live from Word Online in
 * `docs/design/ribbon-behavior-spec.md` ("Single-line mode").
 *
 * ## Licensing / provenance
 * Fluent 2 is a **visual/behavioral reference only** (conventions §0). No Fluent
 * UI source was consulted; the contract comes from the spec doc + kit tokens.
 *
 * ## Part family (shadcn compound style)
 * | Part                  | Renders over            | Role                                            |
 * | --------------------- | ----------------------- | ----------------------------------------------- |
 * | `Ribbon`              | kit `Tabs` (Root)       | root: tab + collapse state + context            |
 * | `RibbonTabList`       | `TabsList`              | the guide strip                                 |
 * | `RibbonTab`           | `TabsTrigger`           | one guide (stamps the id the row is labelled by)|
 * | `RibbonContent`       | `TabsContent`           | one tab's single-line command row (Overflow+Toolbar) |
 * | `RibbonGroup`         | context + `OverflowDivider` | a logical command group + its trailing divider |
 * | `RibbonItem`          | `OverflowItem` + registry | one command: bar-form child + menu-form metadata |
 * | `RibbonOverflowMenu`  | `useOverflowMenu` + `DropdownMenu` | the "…" trigger + grouped menu (auto-rendered) |
 * | `RibbonSeparator`     | `ToolbarSeparator`      | a standalone divider outside a group            |
 *
 * A consumer only writes `Ribbon` → `RibbonTabList`/`RibbonTab` +
 * `RibbonContent` → `RibbonGroup` → `RibbonItem`. `RibbonContent` wires the
 * `Overflow` provider, the measured `Toolbar`, the item registry, **and** the
 * `RibbonOverflowMenu` for you (it appends the trigger after your groups) — this
 * productizes exactly the wiring proven in `apps/demo/app/preview/overflow`.
 *
 * ## The dual-presentation item model
 * `RibbonItem` does two things:
 * 1. wraps its `children` (the bar-form control — a `ToolbarButton`, `Toggle`,
 *    `SplitButton`, dropdown trigger, …) in an `OverflowItem`, so the shared
 *    priority manager can hide it (via CSS `display:none`, never unmount) when
 *    the row is too narrow; and
 * 2. registers `{ id, label, icon, groupId, groupLabel, overflowRender?, onSelect? }`
 *    in a `RibbonContent`-scoped registry, so `RibbonOverflowMenu` can render the
 *    **hidden** ones as menu rows. The default menu form is a `DropdownMenuItem`
 *    (icon + `label`, firing `onSelect`); a complex control supplies its own via
 *    `overflowRender` (e.g. a split button → a submenu, a combo → a labeled
 *    field). The container decides the form from context, not the item's props —
 *    exactly the spec's "API implications" §1.
 *
 * ## Two layouts, one tree (v2 — the classic band)
 * The SAME `RibbonGroup`/`RibbonItem` tree renders in both layouts; the form
 * parts adapt to the root `layout`. This is the v2-plan "one tree, two layouts +
 * escape hatch" decision.
 * - **`layout="single-line"`** (default) — the v1 command row above: `Overflow`
 *   priority manager + the "…" menu. Unchanged; the v1 e2e suite is its
 *   regression guard.
 * - **`layout="classic"`** — Word's two-row **classic band** (~96px content
 *   area). `RibbonContent` swaps the `Overflow` row for a `GroupCollapse`
 *   provider (the headless C1 group-collapse manager) wrapping the SAME
 *   `Toolbar`, and each `RibbonGroup` renders its classic anatomy: a horizontal
 *   cluster of controls over a centered muted group label, an optional
 *   dialog-launcher (↘), and a trailing hairline. When the band can't fit,
 *   whole groups collapse — highest `collapsePriority` first — to a single
 *   dropdown button whose flyout (kit `Popover`) holds the group's SAME
 *   children; when every group is collapsed and it still overflows, the band
 *   reports `scrollMode` (C1 stamps `data-scroll-mode`; the scroll UI is C3).
 *   There is **no "…" overflow menu** in classic — Word classic has none; its
 *   fallback is scroll. **Unknown `layout` values degrade to single-line** so
 *   forward-compat callers never break.
 *
 * ### Escape hatch — per-layout content (`layouts`)
 * Word genuinely shows different command sets per layout, so both `RibbonItem`
 * and `RibbonGroup` accept `layouts?: ("single-line" | "classic")[]`: when set
 * and the active layout isn't listed, the part renders nothing (and, in
 * single-line, does not register in the overflow/menu registry). Default: both.
 *
 * ### Collapsed-flyout children placement (design note)
 * A group's children are a single React subtree that lives in exactly ONE place
 * per mode: inside the expanded shell when the group is expanded, and inside the
 * `Popover` flyout when the group is collapsed (and the flyout is open). The two
 * form SHELLS both stay mounted for measurement (C1's model), but the children
 * are never double-rendered — the collapsed shell is a fixed icon+label+chevron
 * button whose size is independent of the children. Flipping mode therefore
 * **remounts** the children (they move between the band and the portal); ribbon
 * controls are stateless commands, so this is acceptable (v2-plan design risk).
 *
 * ## The other two API axes (mirroring Word's own switcher)
 * - **`collapsed`** — Word's "Mostrar apenas as guias" (tabs-only). A
 *   controlled/uncontrolled pair (`collapsed` / `defaultCollapsed` /
 *   `onCollapsedChange`): when collapsed, the command rows are hidden (via CSS,
 *   not unmounted — see `RibbonContent`'s `keepMounted` note); activating **any**
 *   tab un-collapses (Word's behavior). Applies to both layouts. **Divergence
 *   from desktop Office:** desktop shows the active tab's ribbon as a temporary
 *   *overlay flyout* on click while staying collapsed; v1 simply un-collapses
 *   (no overlay), matching the simpler web model.
 * - **`autoAdjust`** — Word's "Ajustar automaticamente", the **classic** adaptive
 *   resize toggle. `true` (default) is the staged group collapse then scroll
 *   fallback; `false` skips group collapse entirely — every group stays expanded
 *   and the band goes **straight to the horizontal-scroll UI** the moment it
 *   overflows (implemented by not mounting the `GroupCollapse` provider and
 *   letting the always-scrollable band's clip detection drive the edge arrows).
 *   **Ignored in single-line** (Word only exposes it for classic; the single-line
 *   row always adapts via `Overflow`).
 *
 * ## Classic fallbacks (C3)
 * - **Horizontal scroll** — when every group has collapsed and the band still
 *   overflows (`useIsScrollMode()`), or always once `autoAdjust={false}`, the band
 *   scrolls horizontally (programmatic; no native scrollbar — Word's model) with
 *   `‹`/`›` edge arrow buttons that appear only when there is clipped content on
 *   that side. The arrows are **pointer affordances** rendered as absolute
 *   siblings *outside* the `Toolbar` (so Base UI's roving tabindex never owns
 *   them) and taken out of the tab order (`tabIndex={-1}`); keyboard users move
 *   through commands with the toolbar's roving focus and the browser scrolls the
 *   focused item into view natively (the band is a real scroll container even
 *   though its overflow is clipped). Programmatic scroll respects
 *   `prefers-reduced-motion` (`behavior:"auto"` instead of `"smooth"`).
 * - **Tab-strip overflow** — the `RibbonTabList` reuses the v1 `Overflow`
 *   machinery: each `RibbonTab` is an `OverflowItem` (its child is cloned, no
 *   wrapper element, so `TabsList`'s roving + sliding indicator keep working) and
 *   a `⌄` chevron menu lists the hidden (trailing) tabs; selecting one activates
 *   it. The active tab is pinned dynamically so it can never fold. Applies to
 *   **both** layouts (Word folds tabs in single-line too).
 *
 * ## Accessibility contract
 * There is **no ARIA "ribbon" pattern** — the composite is APG **Tabs** (from kit
 * `Tabs`) over APG **Toolbar** (from kit `Toolbar`). Each command row is a
 * `role="toolbar"` labelled by its owning tab via `aria-labelledby` (reusing the
 * tab's own id — the same id Base UI's `Tabs` already links the panel to, so no
 * new wiring is invented). The "…" trigger is an icon-only button and carries an
 * `aria-label` announcing the overflow count. Overflowed items are `aria-hidden`
 * in the row (the `Overflow` module sets this) and instead offered in the menu.
 *
 * ### Focus preservation on overflow (phase-2 handoff)
 * When the item holding focus is pushed into the "…" menu (its element becomes
 * `display:none`), focus would otherwise fall to `document.body`. `RibbonItem`
 * detects that transition — it snapshots, *during the render that flips it
 * hidden* (pre-commit DOM, so focus is still on it), whether it holds focus — and
 * on the following effect moves focus to the "…" trigger (which has, in the same
 * commit, become visible because something overflowed).
 *
 * ## Styling
 * Token-driven only (conventions §3). The row is a transparent surface on
 * `--background` with a `border-b` hairline — Word's ribbon band reads as chrome.
 * No new tokens. The Fluent tab underline comes from kit `Tabs`, untouched.
 *
 * ## `"use client"` — required
 * Owns React context, the item registry store, refs, and focus effects; also
 * pulls in client-only primitives (`Tabs`, `DropdownMenu`, `Overflow`).
 */

/* -------------------------------------------------------------------------- */
/* Small ref helpers (local, no external dep — mirrors overflow.tsx)          */
/* -------------------------------------------------------------------------- */

type PossibleRef<T> = Ref<T> | undefined;

function assignRef<T>(ref: PossibleRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

function mergeRefs<T>(...refs: PossibleRef<T>[]) {
  return (value: T | null) => {
    for (const ref of refs) assignRef(ref, value);
  };
}

/** In React 19 a JSX `ref` lives on `element.props.ref`. */
function getChildRef(element: ReactElement): PossibleRef<HTMLElement> {
  return (element.props as { ref?: PossibleRef<HTMLElement> }).ref;
}

// useLayoutEffect on the client, useEffect on the server (avoids the SSR warning
// — the same isomorphic pattern overflow.tsx uses).
const useLayoutEffectSafe =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

/* -------------------------------------------------------------------------- */
/* Item registry (RibbonContent-scoped store for the overflow menu)           */
/* -------------------------------------------------------------------------- */

/** Metadata a `RibbonItem` publishes so the overflow menu can render it. */
export interface RibbonItemMeta {
  id: string;
  label: string;
  icon?: ReactNode;
  groupId?: string;
  groupLabel?: string;
  /** Custom menu form (split-button submenu, combo field, …). */
  overflowRender?: () => ReactNode;
  /** Fired by the *default* menu form (a `DropdownMenuItem`). */
  onSelect?: () => void;
}

interface RibbonRegistry {
  register: (meta: RibbonItemMeta) => void;
  unregister: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
  /** Registered items in source (registration) order. */
  getSnapshot: () => RibbonItemMeta[];
  getServerSnapshot: () => RibbonItemMeta[];
}

const EMPTY_META: RibbonItemMeta[] = [];

function createRibbonRegistry(): RibbonRegistry {
  const items = new Map<string, RibbonItemMeta>();
  const listeners = new Set<() => void>();
  let snapshot: RibbonItemMeta[] = EMPTY_META;

  function rebuild() {
    // New array identity only on membership change → useSyncExternalStore stable.
    snapshot = [...items.values()];
    for (const listener of listeners) listener();
  }

  return {
    register(meta) {
      const existing = items.get(meta.id);
      if (existing) {
        // Same membership: mutate in place so an open menu reads fresh
        // icon/label/closures on its next natural render, WITHOUT a new snapshot
        // identity (which would loop, since icon/overflowRender/onSelect get new
        // identities every parent render).
        Object.assign(existing, meta);
        return;
      }
      items.set(meta.id, { ...meta });
      rebuild();
    },
    unregister(id) {
      if (items.delete(id)) rebuild();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    getServerSnapshot() {
      return EMPTY_META;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Contexts                                                                    */
/* -------------------------------------------------------------------------- */

type RibbonLayout = "single-line" | "classic";

interface RibbonContextValue {
  layout: RibbonLayout;
  collapsed: boolean;
  /**
   * Adaptive resize in **classic** (Word's "Ajustar automaticamente"). `true`
   * (default) = staged group collapse then scroll; `false` = no collapse,
   * straight to the scroll UI when the band overflows. Ignored in single-line.
   */
  autoAdjust: boolean;
  /** The currently-selected tab value (so `RibbonTab` can pin the active tab). */
  activeValue?: string;
  /** Activate a tab by value (used by the tab-strip overflow menu); un-collapses. */
  selectValue: (value: string) => void;
  /** Un-collapse when a tab is activated (Word behavior). */
  onTabActivate: () => void;
  /** Deterministic tab-element id for a value; the row is labelled by it. */
  tabId: (value: unknown) => string;
}

const RibbonContext = createContext<RibbonContextValue | null>(null);

function useRibbonContext(): RibbonContextValue {
  const ctx = useContext(RibbonContext);
  if (!ctx) {
    throw new Error("Ribbon parts must be rendered inside a <Ribbon>.");
  }
  return ctx;
}

interface RibbonContentContextValue {
  registry: RibbonRegistry;
  /** Set by `RibbonOverflowMenu`; read by `RibbonItem`'s focus effect. */
  overflowTriggerRef: { current: HTMLElement | null };
}

const RibbonContentContext = createContext<RibbonContentContextValue | null>(
  null
);

function useRibbonContentContext(): RibbonContentContextValue {
  const ctx = useContext(RibbonContentContext);
  if (!ctx) {
    throw new Error(
      "RibbonGroup / RibbonItem / RibbonOverflowMenu must be inside a <RibbonContent>."
    );
  }
  return ctx;
}

interface RibbonGroupContextValue {
  groupId?: string;
  groupLabel?: string;
}

const RibbonGroupContext = createContext<RibbonGroupContextValue>({});

/**
 * `RibbonTabList`-scoped registry, mirroring the `RibbonContent` item registry:
 * each `RibbonTab` publishes `{ id: value, label, icon }` so the tab-strip
 * overflow menu can list the tabs that folded behind its chevron.
 */
interface RibbonTabListContextValue {
  registry: RibbonRegistry;
}

const RibbonTabListContext = createContext<RibbonTabListContextValue | null>(
  null
);

/* -------------------------------------------------------------------------- */
/* Controlled/uncontrolled helper                                              */
/* -------------------------------------------------------------------------- */

function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;
  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue];
}

/* -------------------------------------------------------------------------- */
/* Ribbon (root)                                                               */
/* -------------------------------------------------------------------------- */

export interface RibbonProps
  extends Omit<ComponentProps<typeof Tabs>, "value" | "defaultValue"> {
  /** `"single-line"` (default) or `"classic"` (Word's two-row band). Unknown values degrade to single-line. */
  layout?: RibbonLayout | (string & {});
  /** Selected tab value (controlled). */
  value?: string;
  /** Initially-selected tab value (uncontrolled). */
  defaultValue?: string;
  /** Tabs-only "Mostrar apenas as guias" mode (controlled). */
  collapsed?: boolean;
  /** Initial tabs-only state (uncontrolled). */
  defaultCollapsed?: boolean;
  /** Called when the collapsed state changes. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * **classic only** (Word's "Ajustar automaticamente"). `true` (default) =
   * staged group collapse then scroll; `false` = no collapse, straight to the
   * scroll UI when the band overflows. Accepted but ignored in single-line.
   */
  autoAdjust?: boolean;
}

/**
 * Ribbon (root) — wraps kit `Tabs` and owns the two state axes (selected tab +
 * collapsed). Provides `RibbonContext`. Stamps `data-slot="ribbon"`,
 * `data-layout`, and `data-collapsed`.
 */
function Ribbon({
  className,
  layout = "single-line",
  value,
  defaultValue,
  onValueChange,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  autoAdjust = true,
  children,
  ...props
}: RibbonProps) {
  const baseId = useId();
  const resolvedLayout: RibbonLayout =
    layout === "classic" ? "classic" : "single-line";

  const [collapsedState, setCollapsedState] = useControllableState(
    collapsed,
    defaultCollapsed,
    onCollapsedChange
  );

  // Own the selected tab value (controllable) so the tab-strip overflow menu can
  // activate a folded tab and `RibbonTab` can pin the active one. External
  // `onValueChange` still fires with Base UI's original args (value, event).
  const [activeValue, setActiveValueInternal] = useControllableState<
    string | undefined
  >(value, defaultValue);
  const handleValueChange = useCallback(
    (next: string, ...rest: unknown[]) => {
      setActiveValueInternal(next);
      (onValueChange as ((v: string, ...r: unknown[]) => void) | undefined)?.(
        next,
        ...rest
      );
    },
    [setActiveValueInternal, onValueChange]
  );

  const tabId = useCallback(
    (v: unknown) => `${baseId}-tab-${String(v)}`,
    [baseId]
  );

  const onTabActivate = useCallback(() => {
    // Activating any tab exits tabs-only mode (Word behavior).
    setCollapsedState(false);
  }, [setCollapsedState]);

  const selectValue = useCallback(
    (next: string) => {
      handleValueChange(next);
      setCollapsedState(false);
    },
    [handleValueChange, setCollapsedState]
  );

  const ctx = useMemo<RibbonContextValue>(
    () => ({
      layout: resolvedLayout,
      collapsed: collapsedState,
      autoAdjust,
      activeValue,
      selectValue,
      onTabActivate,
      tabId,
    }),
    [
      resolvedLayout,
      collapsedState,
      autoAdjust,
      activeValue,
      selectValue,
      onTabActivate,
      tabId,
    ]
  );

  return (
    <RibbonContext.Provider value={ctx}>
      <Tabs
        data-slot="ribbon"
        data-layout={resolvedLayout}
        data-collapsed={collapsedState ? "" : undefined}
        value={activeValue}
        onValueChange={handleValueChange}
        className={cn("gap-0", className)}
        {...props}
      >
        {children}
      </Tabs>
    </RibbonContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonTabList / RibbonTab                                                    */
/* -------------------------------------------------------------------------- */

export interface RibbonTabListProps extends ComponentProps<typeof TabsList> {
  /**
   * **Extra** slack subtracted from the measured strip width, on top of the
   * `Overflow` manager's accurate accounting (tabs + flex gaps + the `⌄` trigger
   * are measured). Default `0`.
   */
  padding?: number;
  /**
   * Injectable measurement fn forwarded to the tab-strip `Overflow`. Default
   * reads `offsetWidth`. Escape hatch for tests/SSR — you rarely set this.
   */
  getSize?: ComponentProps<typeof Overflow>["getSize"];
}

/**
 * RibbonTabList — the guide strip. Composes kit `TabsList` (the Fluent sliding
 * underline is Figma-validated there) and wires the v1 `Overflow` machinery so
 * that when the strip is too narrow the **trailing** tabs fold behind a `⌄`
 * chevron menu (Word's tab-strip overflow, captured live at ~680px). The active
 * tab is pinned (see `RibbonTab`) so it can never fold. Stamps
 * `data-slot="ribbon-tab-list"`.
 */
function RibbonTabList({
  className,
  children,
  padding = 0,
  getSize,
  ...props
}: RibbonTabListProps) {
  const [registry] = useState(() => createRibbonRegistry());
  const tabListCtx = useMemo<RibbonTabListContextValue>(
    () => ({ registry }),
    [registry]
  );
  return (
    <RibbonTabListContext.Provider value={tabListCtx}>
      {/* The Overflow container is a flex viewport wrapping the TabsList and the
          `⌄` trigger. The trigger is a SIBLING of the tablist, never a child of
          it: a non-tab button inside `role="tablist"` fails axe's
          `aria-required-children` (tablists may contain only tabs). The tabs
          stay inside TabsList, so its roving tabindex and sliding indicator are
          untouched. */}
      <Overflow padding={padding} getSize={getSize}>
        <div
          data-slot="ribbon-tab-list-viewport"
          className="relative flex w-full items-center overflow-hidden"
        >
          <TabsList
            data-slot="ribbon-tab-list"
            className={cn("flex-nowrap", className)}
            {...props}
          >
            {children}
          </TabsList>
          <RibbonTabOverflowMenu />
        </div>
      </Overflow>
    </RibbonTabListContext.Provider>
  );
}

export interface RibbonTabProps extends ComponentProps<typeof TabsTrigger> {
  value: string;
  /**
   * Menu-form text for the tab-strip overflow menu when this tab folds. Defaults
   * to `children` when it is a string, else `value`.
   */
  label?: string;
  /** Icon shown beside the label in the tab-strip overflow menu. */
  icon?: ReactNode;
}

/**
 * RibbonTab — one guide. Composes kit `TabsTrigger` and stamps the deterministic
 * `id` its command row is labelled by (`aria-labelledby`). Clicking it (mouse or
 * keyboard) un-collapses a tabs-only ribbon, even when it is already the active
 * tab (Word behavior) — hence the un-collapse rides `onClick`, not just tab
 * selection.
 *
 * For tab-strip overflow it is wrapped in an `OverflowItem` (the child is cloned
 * — no wrapper element — so `TabsList`'s roving tabindex and the sliding
 * indicator keep working) and registered in the tab-list registry so the `⌄`
 * menu can offer it while it is folded. It is **pinned while it is the active
 * tab** (`pinned={value === activeValue}`) so the active tab can never fold; the
 * pinned flip re-registers with the `Overflow` manager, which re-ranks, so a just
 * -activated (previously folded) tab immediately becomes visible.
 *
 * `data-slot="ribbon-tab"` is applied **after** the spread so it survives the
 * `OverflowItem` clone (which would otherwise stamp `overflow-item`).
 */
function RibbonTab({
  className,
  value,
  id,
  label,
  icon,
  children,
  onClick,
  ...props
}: RibbonTabProps) {
  const { tabId, onTabActivate, activeValue } = useRibbonContext();
  const tabListCtx = useContext(RibbonTabListContext);
  const menuLabel =
    label ?? (typeof children === "string" ? children : String(value));

  // Publish to the tab-list registry so the overflow menu can render this tab
  // while it is folded (mutates in place for an existing id — no snapshot churn).
  useLayoutEffectSafe(() => {
    tabListCtx?.registry.register({ id: value, label: menuLabel, icon });
  });
  useLayoutEffectSafe(() => {
    return () => tabListCtx?.registry.unregister(value);
  }, [tabListCtx, value]);

  const trigger = (
    <RibbonTabTrigger
      id={id ?? tabId(value)}
      value={value}
      onClick={(event) => {
        onTabActivate();
        onClick?.(event);
      }}
      // h-9 (36px): Word's ribbon guide strip is compact (~36px), unlike the
      // kit Tabs default 44px (Figma-validated for standalone use) — see
      // docs/design/ribbon-validation.md finding #1.
      className={cn("h-9", className)}
      {...props}
    >
      {children}
    </RibbonTabTrigger>
  );

  // Outside a tab-list registry (defensive) there is no overflow wiring.
  if (!tabListCtx) return trigger;

  return (
    <OverflowItem id={value} pinned={value === activeValue}>
      {trigger}
    </OverflowItem>
  );
}

/**
 * Inner tab trigger. `OverflowItem` clones its child and injects
 * `data-slot="overflow-item"`; this wrapper re-applies `data-slot="ribbon-tab"`
 * **after** the spread so the tab keeps its public slot (the overflow wiring —
 * ref/style/`aria-hidden`/`data-overflowing` — still flows through the spread).
 */
function RibbonTabTrigger(props: ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger {...props} data-slot="ribbon-tab" />;
}

function useRibbonTabListContext(): RibbonTabListContextValue {
  const ctx = useContext(RibbonTabListContext);
  if (!ctx) {
    throw new Error("RibbonTab overflow parts must be inside a <RibbonTabList>.");
  }
  return ctx;
}

/**
 * RibbonTabOverflowMenu — the `⌄` chevron + menu for folded tabs. Rendered
 * automatically by `RibbonTabList` (you don't place it), as the last child of the
 * `TabsList` so it stays inside the tab-strip `Overflow` context and its width is
 * reserved from the budget (`useOverflowMenu`). It is kept measurable-but-hidden
 * (out of flow + `visibility:hidden`) until a tab folds, then shows at the strip's
 * end. The menu lists only the **hidden** tabs (source order); choosing one
 * activates it via the ribbon context (which also un-collapses a tabs-only
 * ribbon). It is a real keyboard-reachable button (the only route to folded tabs).
 */
function RibbonTabOverflowMenu() {
  const { registry } = useRibbonTabListContext();
  const { ref, isOverflowing, overflowCount } =
    useOverflowMenu<HTMLButtonElement>();

  const tabs = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getServerSnapshot
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            ref={ref}
            type="button"
            data-slot="ribbon-tab-overflow-trigger"
            data-overflow-menu=""
            aria-label={
              overflowCount === 1 ? "1 guia oculta" : `${overflowCount} guias ocultas`
            }
            title="Mais guias"
            className={cn(
              "flex h-9 shrink-0 items-center justify-center rounded-md px-2 text-muted-foreground",
              "cursor-pointer outline-none transition-colors duration-fast ease-ease",
              "hover:bg-accent hover:text-foreground active:bg-accent/80 dark:hover:bg-accent/50",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isOverflowing ? "ml-auto" : undefined
            )}
            style={isOverflowing ? undefined : HIDDEN_TRIGGER_STYLE}
          >
            <ChevronGlyph className="size-4" />
          </button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        data-slot="ribbon-tab-overflow-menu"
      >
        {tabs.map((tab) => (
          <RibbonHiddenTabRow key={tab.id} meta={tab} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One folded tab, rendered only while it is hidden from the strip. */
function RibbonHiddenTabRow({ meta }: { meta: RibbonItemMeta }) {
  const { selectValue } = useRibbonContext();
  const visible = useIsOverflowItemVisible(meta.id);
  if (visible) return null;
  return (
    <DropdownMenuItem onClick={() => selectValue(meta.id)}>
      {meta.icon}
      {meta.label}
    </DropdownMenuItem>
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonContent (the command row)                                             */
/* -------------------------------------------------------------------------- */

export interface RibbonContentProps
  extends Omit<ComponentProps<typeof TabsContent>, "value"> {
  value: string;
  /**
   * **Extra** slack subtracted from the measured row width, on top of the
   * `Overflow` manager's accurate accounting (item widths + group dividers +
   * flex gaps + the "…" trigger are all measured now — you no longer hand-tune
   * this to cover them). Default `0`.
   */
  padding?: number;
  /** Floor on non-pinned items kept in the bar (they clip rather than vanish). Default `1`. */
  minimumVisible?: number;
  /**
   * Injectable measurement fn. **single-line:** forwarded to `Overflow`;
   * **classic:** forwarded to `GroupCollapse` (its `axis` second arg is ignored
   * by an `(el) => number` fn). Default reads `offsetWidth`. Escape hatch for
   * tests/SSR where layout is unavailable — you almost never set this in app code.
   */
  getSize?: ComponentProps<typeof Overflow>["getSize"];
  /**
   * **classic only.** Optimistic width used for a group's collapsed dropdown
   * button *before* it has been measured (a `display:none` form reports 0).
   * Kept low so the collapse loop only under-collapses and the C1 settle net
   * corrects (see `ribbon-collapse.tsx`). Default `64`.
   */
  collapsedEstimate?: number;
  /** **classic only.** Injectable flex-gap reader forwarded to `GroupCollapse`. */
  getGap?: CollapseGetGap;
  /** **classic only.** Injectable overflow-extent reader for the C1 settle net. */
  getOverflowSize?: CollapseGetOverflowSize;
}

/**
 * RibbonContent — one tab's command band.
 *
 * **single-line:** a kit `Toolbar` wrapped in `Overflow`, wired end-to-end, with
 * the `RibbonOverflowMenu` appended after your groups (~40px tall, thin group
 * dividers).
 *
 * **classic:** the SAME `Toolbar` wrapped in a `GroupCollapse` provider (the C1
 * group-collapse manager) — a ~96px two-row band, no "…" menu (Word classic has
 * none; the terminal fallback is scroll, which `GroupCollapse` flags by stamping
 * `data-scroll-mode` on the band — the scroll UI itself is C3). Both layouts take
 * the toolbar's accessible name from the owning tab (`aria-labelledby` → tab id).
 *
 * When the ribbon is `collapsed` (tabs-only), the band is hidden (via the
 * `hidden` attribute, not unmounted — the `keepMounted` note below).
 */
function RibbonContent({
  className,
  value,
  padding = 0,
  minimumVisible = 1,
  getSize,
  collapsedEstimate = 64,
  getGap,
  getOverflowSize,
  children,
  ...props
}: RibbonContentProps) {
  const { tabId, collapsed, layout, autoAdjust } = useRibbonContext();
  const isClassic = layout === "classic";
  const [registry] = useState(() => createRibbonRegistry());
  const overflowTriggerRef = useRef<HTMLElement | null>(null);

  const contentCtx = useMemo<RibbonContentContextValue>(
    () => ({ registry, overflowTriggerRef }),
    [registry]
  );

  // Mark the last RibbonGroup so it drops its trailing divider (no dangling
  // hairline before the "…"). Only injected when the consumer didn't set it.
  const preparedChildren = useMemo(() => {
    const array = Children.toArray(children);
    let lastGroupIndex = -1;
    array.forEach((child, index) => {
      if (isValidElement(child) && child.type === RibbonGroup) {
        lastGroupIndex = index;
      }
    });
    if (lastGroupIndex === -1) return children;
    return array.map((child, index) => {
      if (
        index === lastGroupIndex &&
        isValidElement(child) &&
        (child.props as RibbonGroupProps).withTrailingDivider === undefined
      ) {
        return cloneElement(child as ReactElement<RibbonGroupProps>, {
          withTrailingDivider: false,
        });
      }
      return child;
    });
  }, [children]);

  return (
    <TabsContent
      data-slot="ribbon-content"
      value={value}
      // Keep every panel mounted so the `Overflow` manager is created exactly
      // once (at first render) and never unmounted by a tab switch. The overflow
      // manager tears itself down on unmount; remounting it under React
      // StrictMode's dev double-invoke would leave it destroyed (its items would
      // read an empty snapshot and all hide). Keeping panels mounted — and
      // hiding the row with CSS when `collapsed` rather than unmounting — sidesteps
      // that entirely and is also cheaper (no re-measure on every tab switch).
      keepMounted
      data-collapsed={collapsed ? "" : undefined}
      className={cn("pt-0 outline-none", className)}
      {...props}
    >
      <RibbonContentContext.Provider value={contentCtx}>
        {/*
          When collapsed, hide the band with the `hidden` attribute (real
          display:none, and — unlike a CSS class — honoured by jsdom / the
          accessibility tree) instead of unmounting, so the `Overflow` /
          `GroupCollapse` manager survives (see the `keepMounted` note above).
        */}
        <div hidden={collapsed || undefined}>
          {isClassic ? (
            <ClassicBand
              value={value}
              tabId={tabId}
              autoAdjust={autoAdjust}
              collapsedEstimate={collapsedEstimate}
              padding={padding}
              getSize={getSize as CollapseGetSize | undefined}
              getGap={getGap}
              getOverflowSize={getOverflowSize}
            >
              {preparedChildren}
            </ClassicBand>
          ) : (
            <Overflow
              padding={padding}
              minimumVisible={minimumVisible}
              getSize={getSize}
            >
              <Toolbar
                aria-labelledby={tabId(value)}
                className={cn(
                  // ~40px transparent band with a chrome hairline; clip residuals.
                  "relative min-h-10 w-full flex-nowrap items-center overflow-hidden",
                  "border-b border-border bg-background px-1"
                )}
              >
                {preparedChildren}
                <RibbonOverflowMenu />
              </Toolbar>
            </Overflow>
          )}
        </div>
      </RibbonContentContext.Provider>
    </TabsContent>
  );
}

/* -------------------------------------------------------------------------- */
/* Classic band + horizontal-scroll fallback (C3)                              */
/* -------------------------------------------------------------------------- */

interface ClassicBandProps {
  value: string;
  tabId: (value: unknown) => string;
  autoAdjust: boolean;
  collapsedEstimate: number;
  padding: number;
  getSize?: CollapseGetSize;
  getGap?: CollapseGetGap;
  getOverflowSize?: CollapseGetOverflowSize;
  children: ReactNode;
}

/**
 * ClassicBand — the classic command band plus its C3 horizontal-scroll fallback.
 *
 * The `Toolbar` is always a real (clipped) horizontal scroll container. Two paths:
 * - **`autoAdjust` (default):** the band is wrapped in the `GroupCollapse`
 *   provider (staged group collapse). A zero-DOM `ScrollModeReporter` inside the
 *   band lifts `useIsScrollMode()` up here, so the edge arrows only arm once every
 *   group has collapsed and the band *still* overflows (the terminal scroll
 *   fallback) — no arrow flicker during collapse.
 * - **`autoAdjust={false}`:** no `GroupCollapse` at all — every group stays
 *   expanded (see `RibbonGroupClassicStatic`) and the arrows are always armed, so
 *   the band goes straight to scroll the moment it overflows.
 *
 * The `‹`/`›` buttons are absolute siblings of the `Toolbar` (outside it, so Base
 * UI's roving tabindex never owns them) inside a `relative` wrapper; each shows
 * only when there is clipped content on its side.
 */
function ClassicBand({
  value,
  tabId,
  autoAdjust,
  collapsedEstimate,
  padding,
  getSize,
  getGap,
  getOverflowSize,
  children,
}: ClassicBandProps) {
  const bandRef = useRef<HTMLElement | null>(null);
  const [scrollMode, setScrollMode] = useState(false);

  // Non-adaptive: no collapse, so arm the arrows whenever content clips.
  // Adaptive: arm only in the terminal scroll fallback (all groups collapsed).
  const armed = autoAdjust ? scrollMode : true;
  const { left, right } = useScrollAffordance(bandRef, armed);

  const toolbar = (
    <Toolbar
      ref={bandRef as Ref<HTMLDivElement>}
      aria-labelledby={tabId(value)}
      className={cn(
        // ~96px two-row classic band: content area + group labels row.
        // `items-stretch` so each group form fills the band height and can pin
        // its label to the bottom; `overflow-hidden` clips residuals so the C1
        // accounting + settle net see a real overrun AND makes the band a
        // programmatic (scrollbar-less) horizontal scroll container — Word's model.
        "relative h-24 w-full flex-nowrap items-stretch overflow-hidden",
        "border-b border-border bg-background px-1"
      )}
    >
      {children}
      {autoAdjust ? <ScrollModeReporter onChange={setScrollMode} /> : null}
    </Toolbar>
  );

  return (
    <div data-slot="ribbon-classic-band" className="relative">
      {autoAdjust ? (
        <GroupCollapse
          collapsedEstimate={collapsedEstimate}
          padding={padding}
          getSize={getSize}
          getGap={getGap}
          getOverflowSize={getOverflowSize}
        >
          {toolbar}
        </GroupCollapse>
      ) : (
        toolbar
      )}
      {left ? (
        <ClassicScrollButton
          direction="left"
          onClick={() => scrollBandBy(bandRef.current, "left")}
        />
      ) : null}
      {right ? (
        <ClassicScrollButton
          direction="right"
          onClick={() => scrollBandBy(bandRef.current, "right")}
        />
      ) : null}
    </div>
  );
}

/**
 * ScrollModeReporter — a zero-DOM child that lives inside the `GroupCollapse`
 * context, reads `useIsScrollMode()`, and lifts it to `ClassicBand`. Rendering it
 * inside the band (rather than reading scroll mode outside `GroupCollapse`, where
 * the context is unavailable) keeps the arrows fully driven by the C1 snapshot
 * while staying siblings of the `Toolbar`. Returns `null`, so it neither joins the
 * roving order nor contributes to measurement.
 */
function ScrollModeReporter({
  onChange,
}: {
  onChange: (scrollMode: boolean) => void;
}) {
  const scrollMode = useIsScrollMode();
  useEffect(() => {
    onChange(scrollMode);
  }, [onChange, scrollMode]);
  return null;
}

/** Does the user prefer reduced motion? (SSR-safe.) */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Scroll a band by ~half its visible width toward `direction` (motion-aware). */
function scrollBandBy(el: HTMLElement | null, direction: "left" | "right") {
  if (!el) return;
  const amount = Math.max(1, Math.floor(el.clientWidth / 2));
  el.scrollBy({
    left: direction === "left" ? -amount : amount,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/**
 * useScrollAffordance — tracks whether the band has clipped content on each edge.
 * `left` when `scrollLeft > 0`; `right` when there is more scrollable extent past
 * the right edge (with a 1px tolerance). Re-measures on scroll, on container
 * resize (`ResizeObserver`), and whenever `enabled` flips. State only changes when
 * a boolean actually flips, so it settles without loops (showing/hiding an
 * absolute arrow never resizes the observed band).
 */
function useScrollAffordance(
  ref: { current: HTMLElement | null },
  enabled: boolean
): { left: boolean; right: boolean } {
  const [state, setState] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setState((prev) =>
        prev.left || prev.right ? { left: false, right: false } : prev
      );
      return;
    }
    const left = el.scrollLeft > 0;
    const right = el.scrollWidth - el.clientWidth - el.scrollLeft > 1;
    setState((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    );
  }, [ref, enabled]);

  useLayoutEffectSafe(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => measure());
      observer.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [measure]);

  return state;
}

/** Left/right chevron glyph for the scroll arrows (inline SVG, breadcrumb style). */
function ScrollChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d={direction === "left" ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ClassicScrollButton — one edge arrow. A real `<button>` with an `aria-label`
 * (NOT `aria-hidden` — it is an interactive control), but taken out of the tab
 * order (`tabIndex={-1}`): it is a **pointer affordance**, since keyboard users
 * reach clipped commands through the toolbar's roving focus, which scrolls the
 * focused item into view natively. Absolute-positioned over the band edge with a
 * token-driven gradient fade. Stamps `data-slot="ribbon-scroll-button"`.
 */
function ClassicScrollButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  const isLeft = direction === "left";
  return (
    <button
      type="button"
      tabIndex={-1}
      data-slot="ribbon-scroll-button"
      data-direction={direction}
      aria-label={
        isLeft
          ? "Rolar comandos para a esquerda"
          : "Rolar comandos para a direita"
      }
      onClick={onClick}
      className={cn(
        "absolute inset-y-px z-10 flex w-11 items-center from-background from-45% to-transparent outline-none",
        isLeft
          ? "left-0 justify-start bg-gradient-to-r pl-0.5"
          : "right-0 justify-end bg-gradient-to-l pr-0.5"
      )}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-8",
          "transition-colors duration-fast ease-ease hover:bg-accent hover:text-foreground active:bg-accent/80 dark:hover:bg-accent/50"
        )}
      >
        <ScrollChevron direction={direction} />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonGroup                                                                  */
/* -------------------------------------------------------------------------- */

export interface RibbonGroupProps extends ComponentProps<"div"> {
  /** Stable group id; inherited by the group's items and used for its divider. */
  groupId: string;
  /** Human label — the overflow section header (single-line) / the centered muted band label + collapsed-button name (classic). */
  label: string;
  /** Render the trailing divider (auto-suppressed on the last group). Default `true`. */
  withTrailingDivider?: boolean;
  /**
   * **classic only.** Higher collapses FIRST as the band shrinks (Word:
   * Parágrafo before Fonte). Governs classic collapse order; **ignored in
   * single-line** (there `RibbonItem.priority` rules). Default `0`.
   */
  collapsePriority?: number;
  /** **classic only.** Icon shown on the group's collapsed dropdown button. */
  icon?: ReactNode;
  /**
   * **classic only.** Dialog-launcher (↘) slot in the group's bottom-right. Pass
   * a custom node here (full control), OR pass `onLauncherClick` for the default
   * ↘ icon-button. `launcher` wins if both are set. Omit both for no launcher.
   */
  launcher?: ReactNode;
  /** **classic only.** Sugar for the default ↘ launcher button (see `launcher`). */
  onLauncherClick?: () => void;
  /**
   * Render this group only in the listed layouts (Word shows different command
   * sets per mode). When set and the active layout isn't listed, the group
   * renders nothing. Default: both layouts.
   */
  layouts?: RibbonLayout[];
}

/**
 * RibbonGroup — a logical command cluster. Adapts to the root `layout`:
 * - **single-line:** a context provider (no DOM box) that flattens its items +
 *   an `OverflowDivider`-wrapped `RibbonSeparator` into the toolbar row.
 * - **classic:** a `CollapseGroup` (C1) rendering the group's two forms — the
 *   expanded band anatomy and the collapsed dropdown button.
 *
 * The `layouts` escape hatch renders nothing (and, in single-line, registers
 * nothing) when the active layout isn't listed.
 */
function RibbonGroup(props: RibbonGroupProps) {
  const { layout, autoAdjust } = useRibbonContext();
  if (props.layouts && !props.layouts.includes(layout)) return null;
  if (layout === "classic") {
    // `autoAdjust={false}` → no GroupCollapse provider is mounted, so the group
    // must NOT call `useGroupMode`/render a `CollapseGroup` (both need that
    // context). It renders its expanded form only; the band goes straight to
    // scroll when it overflows.
    return autoAdjust ? (
      <RibbonGroupClassic {...props} />
    ) : (
      <RibbonGroupClassicStatic {...props} />
    );
  }
  return <RibbonGroupSingleLine {...props} />;
}

/**
 * RibbonGroup (single-line) — the v1 behavior, unchanged. Provides
 * `groupId` + `label` to its `RibbonItem`s via context (so each item inherits
 * its group + section header), renders them, then an `OverflowDivider`-wrapped
 * `RibbonSeparator`. The divider hides itself only when the whole group is
 * overflowed (`useIsOverflowGroupVisible` → `"hidden"`), so no separator dangles.
 * Renders no DOM element of its own.
 */
function RibbonGroupSingleLine({
  groupId,
  label,
  withTrailingDivider = true,
  children,
}: RibbonGroupProps) {
  const ctx = useMemo<RibbonGroupContextValue>(
    () => ({ groupId, groupLabel: label }),
    [groupId, label]
  );
  return (
    <RibbonGroupContext.Provider value={ctx}>
      {children}
      {withTrailingDivider ? (
        <OverflowDivider groupId={groupId}>
          <RibbonSeparator />
        </OverflowDivider>
      ) : null}
    </RibbonGroupContext.Provider>
  );
}

/** Down-chevron glyph — inline SVG (no icon dependency), à la split-button. */
function ChevronGlyph({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dialog-launcher glyph (↘) — the Fluent "open dialog" corner arrow. */
function DialogLauncherGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5">
      <path
        d="M13 5h2v2M15 5l-4 4M6 6v8h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * RibbonGroup (classic) — the crux. Renders a `CollapseGroup` (C1) with two form
 * shells, both kept mounted for measurement:
 *
 * - **expanded:** a `role="group"` div — the horizontal cluster of children over
 *   a centered muted `label`, an optional ↘ launcher bottom-right, and a trailing
 *   hairline (suppressed on the last group). Children render here **only while
 *   expanded**.
 * - **collapsed:** a fixed-size icon + label + chevron `ToolbarButton` (a kit
 *   `Popover` trigger, so it joins the toolbar roving-tabindex) whose flyout holds
 *   the group's SAME children — rendered there **only while collapsed** (and the
 *   flyout is open). The shell's size is independent of the children.
 *
 * **Focus-on-collapse:** if the focused control's group flips to collapsed, focus
 * moves to that group's collapsed dropdown button — the ribbon's focus-to-trigger
 * pattern at group level (snapshot focus during the flipping render, move it in
 * the post-commit effect).
 */
function RibbonGroupClassic({
  groupId,
  label,
  icon,
  collapsePriority = 0,
  launcher,
  onLauncherClick,
  withTrailingDivider = true,
  className,
  children,
}: RibbonGroupProps) {
  const groupCtx = useMemo<RibbonGroupContextValue>(
    () => ({ groupId, groupLabel: label }),
    [groupId, label]
  );
  const mode = useGroupMode(groupId);
  const isCollapsed = mode === "collapsed";
  const [open, setOpen] = useState(false);

  const expandedShellRef = useRef<HTMLDivElement | null>(null);
  const collapsedButtonRef = useRef<HTMLButtonElement | null>(null);
  const heldFocusBeforeCollapseRef = useRef(false);

  // Snapshot focus during the render that flips this group collapsed — the DOM
  // is still pre-commit here (the expanded shell is visible and holds focus), so
  // we capture "did a control in me hold focus?" before C1's `display:none` lands.
  if (
    isCollapsed &&
    typeof document !== "undefined" &&
    expandedShellRef.current &&
    expandedShellRef.current.contains(document.activeElement)
  ) {
    heldFocusBeforeCollapseRef.current = true;
  }

  // After the collapse commit (expanded shell now display:none, collapsed button
  // visible) move focus to the button so it isn't dropped to <body>.
  useLayoutEffectSafe(() => {
    if (isCollapsed && heldFocusBeforeCollapseRef.current) {
      collapsedButtonRef.current?.focus();
      heldFocusBeforeCollapseRef.current = false;
    }
  }, [isCollapsed]);

  // Un-collapsing while the flyout is open would leave a dangling popover.
  useEffect(() => {
    if (!isCollapsed && open) setOpen(false);
  }, [isCollapsed, open]);

  const showSeparator = withTrailingDivider !== false;
  const separator = showSeparator ? (
    <span
      aria-hidden="true"
      data-slot="ribbon-group-separator"
      className="my-2 w-px shrink-0 self-stretch bg-border"
    />
  ) : null;

  const launcherNode =
    launcher ??
    (onLauncherClick ? (
      <ToolbarButton
        size="icon-sm"
        aria-label={`${label} — mais opções`}
        data-slot="ribbon-launcher"
        onClick={onLauncherClick}
        className="size-5 text-muted-foreground"
      >
        <DialogLauncherGlyph />
      </ToolbarButton>
    ) : null);

  const expanded = (
    <div
      ref={expandedShellRef}
      role="group"
      aria-label={label}
      data-slot="ribbon-group"
      data-group-id={groupId}
      className={cn("flex shrink-0 items-stretch", className)}
    >
      <div className="flex min-w-0 flex-col justify-between px-1 py-1">
        <RibbonGroupContext.Provider value={groupCtx}>
          <div className="flex flex-1 items-start justify-center gap-0.5">
            {!isCollapsed ? children : null}
          </div>
        </RibbonGroupContext.Provider>
        <div className="relative flex items-center justify-center pt-0.5">
          <span className="px-1 text-[11px] leading-none text-muted-foreground">
            {label}
          </span>
          {launcherNode ? (
            <span className="absolute right-0 flex items-center">
              {launcherNode}
            </span>
          ) : null}
        </div>
      </div>
      {separator}
    </div>
  );

  const collapsed = (
    <div
      data-slot="ribbon-group-collapsed"
      data-group-id={groupId}
      className="flex shrink-0 items-stretch"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <ToolbarButton
              ref={collapsedButtonRef}
              variant="ghost"
              aria-label={label}
              data-slot="ribbon-group-trigger"
              className="flex h-auto min-h-full w-[72px] flex-col items-center justify-center gap-1 px-1 py-1"
            >
              <span className="flex items-center justify-center [&_svg:not([class*='size-'])]:size-5">
                {icon}
              </span>
              <span className="flex max-w-full items-center gap-0.5 text-[11px] leading-none">
                <span className="truncate">{label}</span>
                <ChevronGlyph />
              </span>
            </ToolbarButton>
          }
        />
        <PopoverContent
          aria-label={label}
          align="start"
          side="bottom"
          className="w-auto min-w-56 p-2"
        >
          <RibbonGroupContext.Provider value={groupCtx}>
            <div className="flex items-start gap-0.5">
              {isCollapsed ? children : null}
            </div>
          </RibbonGroupContext.Provider>
        </PopoverContent>
      </Popover>
      {separator}
    </div>
  );

  return (
    <CollapseGroup
      groupId={groupId}
      collapsePriority={collapsePriority}
      expanded={expanded}
      collapsed={collapsed}
    />
  );
}

/**
 * RibbonGroupClassicStatic — the `autoAdjust={false}` classic group: the expanded
 * band anatomy only, always showing its children. It calls **no** collapse hooks
 * and renders no `CollapseGroup` (there is no `GroupCollapse` provider in this
 * mode), so the band never collapses — it simply overflows into the scroll UI.
 * `collapsePriority`/`icon` are irrelevant here (nothing collapses) and ignored.
 */
function RibbonGroupClassicStatic({
  groupId,
  label,
  launcher,
  onLauncherClick,
  withTrailingDivider = true,
  className,
  children,
}: RibbonGroupProps) {
  const groupCtx = useMemo<RibbonGroupContextValue>(
    () => ({ groupId, groupLabel: label }),
    [groupId, label]
  );

  const separator =
    withTrailingDivider !== false ? (
      <span
        aria-hidden="true"
        data-slot="ribbon-group-separator"
        className="my-2 w-px shrink-0 self-stretch bg-border"
      />
    ) : null;

  const launcherNode =
    launcher ??
    (onLauncherClick ? (
      <ToolbarButton
        size="icon-sm"
        aria-label={`${label} — mais opções`}
        data-slot="ribbon-launcher"
        onClick={onLauncherClick}
        className="size-5 text-muted-foreground"
      >
        <DialogLauncherGlyph />
      </ToolbarButton>
    ) : null);

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="ribbon-group"
      data-group-id={groupId}
      className={cn("flex shrink-0 items-stretch", className)}
    >
      <div className="flex min-w-0 flex-col justify-between px-1 py-1">
        <RibbonGroupContext.Provider value={groupCtx}>
          <div className="flex flex-1 items-start justify-center gap-0.5">
            {children}
          </div>
        </RibbonGroupContext.Provider>
        <div className="relative flex items-center justify-center pt-0.5">
          <span className="px-1 text-[11px] leading-none text-muted-foreground">
            {label}
          </span>
          {launcherNode ? (
            <span className="absolute right-0 flex items-center">
              {launcherNode}
            </span>
          ) : null}
        </div>
      </div>
      {separator}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonItem (the crux)                                                        */
/* -------------------------------------------------------------------------- */

export interface RibbonItemProps {
  /** Required, unique within the row. */
  id: string;
  /** Menu-form text (bar form may be icon-only). */
  label: string;
  /** Icon reused in the menu form. */
  icon?: ReactNode;
  /**
   * **single-line only.** Higher survives longer as the row shrinks (priority
   * beats DOM order). **Ignored in classic** — there the group's
   * `collapsePriority` rules and the whole group collapses together.
   */
  priority?: number;
  /**
   * **single-line only.** Never overflows (e.g. Undo, a pinned command).
   * **Ignored in classic** (nothing item-overflows; groups collapse whole).
   */
  pinned?: boolean;
  /** **single-line only.** Custom menu form (split-button submenu, labeled combo, …). */
  overflowRender?: () => ReactNode;
  /** **single-line only.** Fired by the default menu form (a `DropdownMenuItem`). */
  onSelect?: () => void;
  /**
   * Render this item only in the listed layouts (Word shows different command
   * sets per mode). When set and the active layout isn't listed, the item renders
   * nothing — and, in single-line, does not register in the overflow menu.
   * Default: both layouts.
   */
  layouts?: RibbonLayout[];
  /** The bar-form control (ToolbarButton, Toggle, SplitButton, RibbonLargeButton, …). */
  children: ReactElement;
}

/**
 * RibbonItem — one command. Adapts to the root `layout`:
 * - **single-line:** wraps `children` in an `OverflowItem` and registers its
 *   menu-form metadata (`RibbonOverflowMenu` renders it when hidden); owns the
 *   focus-preservation move to the "…" trigger. `priority`/`pinned`/`onSelect`/
 *   `overflowRender` apply here only.
 * - **classic:** renders `children` directly — no `OverflowItem`, no registry
 *   ("…" doesn't exist in classic). Nothing item-overflows; the group collapses
 *   whole (`RibbonGroup.collapsePriority`).
 *
 * The `layouts` escape hatch renders (and, in single-line, registers) nothing
 * when the active layout isn't listed.
 */
function RibbonItem(props: RibbonItemProps) {
  const { layout } = useRibbonContext();
  if (props.layouts && !props.layouts.includes(layout)) return null;
  if (layout === "classic") return <>{props.children}</>;
  return <RibbonItemSingleLine {...props} />;
}

/** RibbonItem's v1 (single-line) body — the OverflowItem + registry + focus move. */
function RibbonItemSingleLine({
  id,
  label,
  icon,
  priority,
  pinned,
  overflowRender,
  onSelect,
  children,
}: RibbonItemProps) {
  const { registry, overflowTriggerRef } = useRibbonContentContext();
  const { groupId, groupLabel } = useContext(RibbonGroupContext);
  const visible = useIsOverflowItemVisible(id);

  const childElementRef = useRef<HTMLElement | null>(null);
  const heldFocusBeforeHideRef = useRef(false);

  // Keep the registry entry current every commit (no deps). `register` mutates
  // in place for an existing id — no new snapshot identity, no re-render loop —
  // and only rebuilds + notifies on a membership change (first mount).
  useLayoutEffectSafe(() => {
    registry.register({
      id,
      label,
      icon,
      groupId,
      groupLabel,
      overflowRender,
      onSelect,
    });
  });

  // Unregister on unmount / id change.
  useLayoutEffectSafe(() => {
    return () => registry.unregister(id);
  }, [registry, id]);

  // Snapshot focus during the render that flips this item hidden — the DOM is
  // still pre-commit here (item visible, focus still on it), so we can capture
  // "did I hold focus?" before `OverflowItem`'s `display:none` lands this commit.
  if (
    !visible &&
    typeof document !== "undefined" &&
    childElementRef.current &&
    childElementRef.current.contains(document.activeElement)
  ) {
    heldFocusBeforeHideRef.current = true;
  }

  // A layout effect runs after the display:none commit, when the trigger is
  // already visible — move focus there so it isn't dropped to <body>.
  useLayoutEffectSafe(() => {
    if (!visible && heldFocusBeforeHideRef.current) {
      overflowTriggerRef.current?.focus();
      heldFocusBeforeHideRef.current = false;
    }
  }, [visible, overflowTriggerRef]);

  const captureChild = useCallback((el: HTMLElement | null) => {
    childElementRef.current = el;
  }, []);

  const child = Children.only(children);
  if (!isValidElement(child)) {
    throw new Error("<RibbonItem> expects a single element child.");
  }
  // Merge our capture ref with the child's own ref. `OverflowItem` merges again
  // with its measure ref (it reads `child.props.ref`), so the element carries
  // both. The merged ref is memoised on the child + captureChild so it doesn't
  // detach/reattach every render.
  const mergedRef = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(child), captureChild),
    [child, captureChild]
  );
  const childWithRef = cloneElement(child, {
    ref: mergedRef,
  } as Record<string, unknown>);

  return (
    <OverflowItem id={id} priority={priority} pinned={pinned} groupId={groupId}>
      {childWithRef}
    </OverflowItem>
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonSeparator                                                              */
/* -------------------------------------------------------------------------- */

/**
 * RibbonSeparator — a standalone vertical divider for the row (kit
 * `ToolbarSeparator`). Used inside `RibbonGroup` (wrapped in an `OverflowDivider`)
 * and available on its own for ad-hoc separation outside a group.
 */
function RibbonSeparator({
  className,
  ...props
}: ComponentProps<typeof ToolbarSeparator>) {
  return (
    <ToolbarSeparator
      data-slot="ribbon-separator"
      className={cn(className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Classic form parts (RibbonLargeButton / RibbonRow / RibbonColumn)           */
/* -------------------------------------------------------------------------- */

export interface RibbonLargeButtonProps extends ComponentProps<"button"> {
  /** The ~24px icon shown above the label. */
  icon?: ReactNode;
  /** Append a down chevron (for a menu/split composition — see the doc comment). */
  chevron?: boolean;
}

/**
 * RibbonLargeButton — the classic band's **large stacked button** (Word's
 * "Colar"): a ~24px icon over a (possibly two-line) label, ~68px tall, Fluent
 * *subtle* (ghost) look. A real `<button>` that forwards `ref` + props (React 19),
 * so it composes as a menu trigger via the Base UI `render` idiom
 * (`<DropdownMenuTrigger render={<RibbonLargeButton chevron … />} />`) or a split
 * button — set `chevron` to show the down-caret in those compositions. Icon +
 * label are laid out for you; pass the label as children.
 */
function RibbonLargeButton({
  className,
  icon,
  chevron = false,
  children,
  ...props
}: RibbonLargeButtonProps) {
  return (
    <button
      data-slot="ribbon-large-button"
      className={cn(
        "flex h-[68px] w-16 shrink-0 cursor-pointer flex-col items-center justify-start gap-1 rounded-md px-1 py-1.5 text-xs font-normal text-foreground select-none",
        "outline-none transition-colors duration-fast ease-ease",
        "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/70",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {icon != null ? (
        <span className="flex items-center justify-center [&_svg:not([class*='size-'])]:size-6">
          {icon}
        </span>
      ) : null}
      <span className="flex max-w-full items-center gap-0.5 text-center leading-tight">
        <span className="line-clamp-2">{children}</span>
        {chevron ? <ChevronGlyph /> : null}
      </span>
    </button>
  );
}

/**
 * RibbonRow — a tiny horizontal flex helper (`data-slot="ribbon-row"`) for
 * composing a group's controls, e.g. one row of a 2×3 small-icon-button grid.
 * Forwards `ref` + props (React 19).
 */
function RibbonRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="ribbon-row"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

/**
 * RibbonColumn — a tiny vertical flex helper (`data-slot="ribbon-column"`) for
 * stacking `RibbonRow`s (the 2×3 grid) or a vertical list of medium icon+label
 * buttons. Forwards `ref` + props (React 19).
 */
function RibbonColumn({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="ribbon-column"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonOverflowMenu (the "…" trigger + grouped menu)                         */
/* -------------------------------------------------------------------------- */

// Kept measurable while hidden (out of flow + invisible), NOT display:none, so
// the manager can still read the trigger's width to reserve it from the budget
// (overflow.tsx's `useOverflowMenu` documents this requirement).
const HIDDEN_TRIGGER_STYLE: CSSProperties = {
  position: "absolute",
  right: 4,
  visibility: "hidden",
  pointerEvents: "none",
};

/** Fluent-style "…" glyph — inline SVG (no icon dependency), à la split-button. */
function MoreGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-4">
      <circle cx="5" cy="10" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="15" cy="10" r="1.4" />
    </svg>
  );
}

/**
 * RibbonOverflowMenu — the "…" trigger + its menu. Rendered automatically by
 * `RibbonContent` (you don't place it). The trigger is a ghost icon-only
 * `ToolbarButton` wired via `useOverflowMenu` (kept measurable-but-hidden until
 * something overflows). The menu renders **only hidden** items, grouped: a
 * `DropdownMenuLabel` header per group whose items include a hidden one, then
 * each hidden item's menu form (default `DropdownMenuItem`, or its custom
 * `overflowRender`), source order preserved, separators between groups.
 */
function RibbonOverflowMenu() {
  const { registry, overflowTriggerRef } = useRibbonContentContext();
  const { ref, isOverflowing, overflowCount } =
    useOverflowMenu<HTMLButtonElement>();

  const items = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getServerSnapshot
  );

  // Group items in first-seen (source) order. Ungrouped items collapse into a
  // single trailing headerless section.
  const sections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<
      string,
      { groupId?: string; groupLabel?: string; items: RibbonItemMeta[] }
    >();
    for (const item of items) {
      const key = item.groupId ?? "__ungrouped__";
      let entry = map.get(key);
      if (!entry) {
        entry = {
          groupId: item.groupId,
          groupLabel: item.groupLabel,
          items: [],
        };
        map.set(key, entry);
        order.push(key);
      }
      entry.items.push(item);
    }
    return order.map((key) => map.get(key)!);
  }, [items]);

  const triggerRef = useCallback(
    (el: HTMLButtonElement | null) => {
      ref(el);
      overflowTriggerRef.current = el;
    },
    [ref, overflowTriggerRef]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <ToolbarButton
            ref={triggerRef}
            size="icon"
            data-slot="ribbon-overflow-trigger"
            data-overflow-menu=""
            aria-label={
              overflowCount === 1
                ? "1 more command"
                : `${overflowCount} more commands`
            }
            className={isOverflowing ? "ml-auto" : undefined}
            style={isOverflowing ? undefined : HIDDEN_TRIGGER_STYLE}
          >
            <MoreGlyph />
          </ToolbarButton>
        }
      />
      <DropdownMenuContent
        align="end"
        className="min-w-56"
        data-slot="ribbon-overflow-menu"
      >
        {sections.map((section, index) =>
          section.groupId ? (
            <RibbonOverflowGroupSection
              key={section.groupId}
              groupId={section.groupId}
              groupLabel={section.groupLabel}
              items={section.items}
              index={index}
            />
          ) : (
            <RibbonOverflowUngroupedSection
              key="__ungrouped__"
              items={section.items}
              index={index}
            />
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A grouped section — header + hidden rows, shown only when the group isn't fully visible. */
function RibbonOverflowGroupSection({
  groupId,
  groupLabel,
  items,
  index,
}: {
  groupId: string;
  groupLabel?: string;
  items: RibbonItemMeta[];
  index: number;
}) {
  const state = useIsOverflowGroupVisible(groupId);
  if (state === "visible") return null;
  return (
    <>
      {index > 0 ? <DropdownMenuSeparator /> : null}
      <DropdownMenuGroup>
        {groupLabel ? <DropdownMenuLabel>{groupLabel}</DropdownMenuLabel> : null}
        {items.map((item) => (
          <RibbonOverflowRow key={item.id} meta={item} />
        ))}
      </DropdownMenuGroup>
    </>
  );
}

/** Ungrouped items — no header; each row self-hides while visible. */
function RibbonOverflowUngroupedSection({
  items,
  index,
}: {
  items: RibbonItemMeta[];
  index: number;
}) {
  return (
    <>
      {index > 0 ? <DropdownMenuSeparator /> : null}
      <DropdownMenuGroup>
        {items.map((item) => (
          <RibbonOverflowRow key={item.id} meta={item} />
        ))}
      </DropdownMenuGroup>
    </>
  );
}

/** One command, rendered only while it is overflowed (hidden in the row). */
function RibbonOverflowRow({ meta }: { meta: RibbonItemMeta }) {
  const visible = useIsOverflowItemVisible(meta.id);
  if (visible) return null;
  if (meta.overflowRender) return <>{meta.overflowRender()}</>;
  return (
    <DropdownMenuItem
      onClick={() => meta.onSelect?.()}
    >
      {meta.icon}
      {meta.label}
    </DropdownMenuItem>
  );
}

export {
  Ribbon,
  RibbonTabList,
  RibbonTab,
  RibbonContent,
  RibbonGroup,
  RibbonItem,
  RibbonOverflowMenu,
  RibbonSeparator,
  RibbonLargeButton,
  RibbonRow,
  RibbonColumn,
};
