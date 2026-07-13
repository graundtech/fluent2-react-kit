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
 * ## Three API axes (mirroring Word's own switcher)
 * - **`layout`** — `"single-line"` (v1, default). The prop exists now so v2's
 *   `"classic"` (two-row, per-group staged collapse → horizontal scroll) lands
 *   without a breaking change; **unknown values are ignored** (treated as
 *   single-line) so forward-compat callers degrade gracefully.
 * - **`collapsed`** — Word's "Mostrar apenas as guias" (tabs-only). A
 *   controlled/uncontrolled pair (`collapsed` / `defaultCollapsed` /
 *   `onCollapsedChange`): when collapsed, the command rows are hidden (via CSS,
 *   not unmounted — see `RibbonContent`'s `keepMounted` note); activating **any**
 *   tab un-collapses (Word's behavior). **Divergence from
 *   desktop Office:** desktop shows the active tab's ribbon as a temporary
 *   *overlay flyout* on click while staying collapsed; v1 simply un-collapses
 *   (no overlay), matching the simpler web model.
 * - **`autoAdjust`** — **not implemented in v1.** Word exposes it ("Ajustar
 *   automaticamente") to toggle the *classic* adaptive resize; single-line always
 *   adapts via `Overflow`. Reserved for the v2 classic mode.
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
  /** v1 implements only `"single-line"` (default). `"classic"` is reserved for v2; unknown values are treated as single-line. */
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

  const tabId = useCallback(
    (v: unknown) => `${baseId}-tab-${String(v)}`,
    [baseId]
  );

  const onTabActivate = useCallback(() => {
    // Activating any tab exits tabs-only mode (Word behavior).
    setCollapsedState(false);
  }, [setCollapsedState]);

  const ctx = useMemo<RibbonContextValue>(
    () => ({
      layout: resolvedLayout,
      collapsed: collapsedState,
      onTabActivate,
      tabId,
    }),
    [resolvedLayout, collapsedState, onTabActivate, tabId]
  );

  return (
    <RibbonContext.Provider value={ctx}>
      <Tabs
        data-slot="ribbon"
        data-layout={resolvedLayout}
        data-collapsed={collapsedState ? "" : undefined}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
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

/**
 * RibbonTabList — the guide strip. Pure composition over kit `TabsList` (the
 * Fluent sliding underline is already Figma-validated there); only stamps
 * `data-slot="ribbon-tab-list"`.
 */
function RibbonTabList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      data-slot="ribbon-tab-list"
      className={cn(className)}
      {...props}
    />
  );
}

export interface RibbonTabProps extends ComponentProps<typeof TabsTrigger> {
  value: string;
}

/**
 * RibbonTab — one guide. Composes kit `TabsTrigger` and stamps the deterministic
 * `id` its command row is labelled by (`aria-labelledby`). Clicking it (mouse or
 * keyboard) un-collapses a tabs-only ribbon, even when it is already the active
 * tab (Word behavior) — hence the un-collapse rides `onClick`, not just tab
 * selection.
 */
function RibbonTab({
  className,
  value,
  id,
  onClick,
  ...props
}: RibbonTabProps) {
  const { tabId, onTabActivate } = useRibbonContext();
  return (
    <TabsTrigger
      data-slot="ribbon-tab"
      id={id ?? tabId(value)}
      value={value}
      onClick={(event) => {
        onTabActivate();
        onClick?.(event);
      }}
      className={cn(className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonContent (the command row)                                             */
/* -------------------------------------------------------------------------- */

export interface RibbonContentProps
  extends Omit<ComponentProps<typeof TabsContent>, "value"> {
  value: string;
  /**
   * Slack subtracted from the measured row width to account for inter-item gaps
   * and group dividers (the `Overflow` manager sums item widths only). The "…"
   * trigger's own width is reserved automatically. Default `16`.
   */
  padding?: number;
  /** Floor on non-pinned items kept in the bar (they clip rather than vanish). Default `1`. */
  minimumVisible?: number;
  /**
   * Injectable measurement fn, forwarded to `Overflow` (default reads
   * `offsetWidth`). Escape hatch for tests/SSR where layout is unavailable — you
   * almost never set this in app code.
   */
  getSize?: ComponentProps<typeof Overflow>["getSize"];
}

/**
 * RibbonContent — one tab's single-line command row: a kit `Toolbar` wrapped in
 * `Overflow`, wired end-to-end, with the `RibbonOverflowMenu` appended after your
 * groups. The toolbar takes its accessible name from the owning tab
 * (`aria-labelledby` → the tab's id). ~40px tall, transparent surface, thin group
 * dividers, `overflow-hidden`. When the ribbon is `collapsed`, the row is not
 * rendered (tabs-only mode).
 */
function RibbonContent({
  className,
  value,
  padding = 16,
  minimumVisible = 1,
  getSize,
  children,
  ...props
}: RibbonContentProps) {
  const { tabId, collapsed } = useRibbonContext();
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
          When collapsed, hide the row with the `hidden` attribute (real
          display:none, and — unlike a CSS class — honoured by jsdom / the
          accessibility tree) instead of unmounting, so the `Overflow` manager
          survives (see the `keepMounted` note above).
        */}
        <div hidden={collapsed || undefined}>
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
        </div>
      </RibbonContentContext.Provider>
    </TabsContent>
  );
}

/* -------------------------------------------------------------------------- */
/* RibbonGroup                                                                  */
/* -------------------------------------------------------------------------- */

export interface RibbonGroupProps extends ComponentProps<"div"> {
  /** Stable group id; inherited by the group's items and used for its divider. */
  groupId: string;
  /** Human label — the overflow menu's section header for this group. */
  label: string;
  /** Render the trailing divider (auto-suppressed on the last group). Default `true`. */
  withTrailingDivider?: boolean;
}

/**
 * RibbonGroup — a logical cluster inside the row. Provides `groupId` + `label`
 * to its `RibbonItem`s via context (so each item inherits its group + section
 * header), renders them, then an `OverflowDivider`-wrapped `RibbonSeparator`
 * after the group. The divider hides itself only when the whole group is
 * overflowed (`useIsOverflowGroupVisible` → `"hidden"`), so no separator dangles
 * next to nothing. Renders no DOM element of its own (a context provider) —
 * items and the divider are flattened straight into the toolbar's flex row.
 */
function RibbonGroup({
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
  /** Higher survives longer as the row shrinks (priority beats DOM order). */
  priority?: number;
  /** Never overflows (e.g. Undo, a pinned command). */
  pinned?: boolean;
  /** Custom menu form (split-button submenu, labeled combo, …). */
  overflowRender?: () => ReactNode;
  /** Fired by the default menu form (a `DropdownMenuItem`). */
  onSelect?: () => void;
  /** The bar-form control (ToolbarButton, Toggle, SplitButton, dropdown, …). */
  children: ReactElement;
}

/**
 * RibbonItem — one command. Inherits `groupId`/`groupLabel` from the enclosing
 * `RibbonGroup`, wraps `children` (the bar-form control) in an `OverflowItem`,
 * and registers its menu-form metadata so `RibbonOverflowMenu` can render it when
 * hidden. Also owns the **focus-preservation** behavior: when it is pushed into
 * the "…" menu while holding focus, it moves focus to the trigger.
 */
function RibbonItem({
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
};
