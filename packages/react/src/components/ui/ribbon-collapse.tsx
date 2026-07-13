"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, ReactElement, Ref } from "react";

/**
 * Ribbon collapse — a **headless** group-collapse system (no visuals of its own).
 *
 * This is the mechanism behind the kit's **classic (expanded) Ribbon** layout
 * (Fluent 2 / Office). When a two-row classic band cannot fit its container, it
 * collapses whole **groups** — highest-`collapsePriority` first — from their
 * expanded form (a cluster of controls with a bottom label) to a single
 * **collapsed dropdown button** (icon + label + chevron that opens the group as
 * a flyout). When every group is collapsed and it *still* overflows, the band
 * reports a `scrollMode` flag (the terminal horizontal-scroll fallback; the
 * scroll UI itself is rendered by phase C3, not here).
 *
 * This reproduces the Word-Online classic ladder captured live in
 * `docs/design/ribbon-behavior-spec.md` ("Classic mode"): `Parágrafo` collapses
 * at ~1240px, `Fonte` at ~1000px, and the whole thing falls back to horizontal
 * scroll at ~840px. Collapse order is by **explicit group priority, not DOM
 * order** — `Parágrafo` (higher `collapsePriority`) collapses before `Fonte`
 * even though it sits later in the tab. **Locked scope (v2 plan §1):** whole
 * group → dropdown, with NO per-item large→medium→small size ladder.
 *
 * ## Licensing / provenance
 * This reimplements the **publicly documented ribbon-resizing *pattern*** —
 * per-group staged collapse by explicit priority, then scroll fallback
 * (the model MS Learn `cmd-ribbons` and Aurora's `RibbonResizing.md` describe).
 * **No Fluent UI source was consulted or copied** (conventions §0: Fluent 2 is
 * a behavioral reference only). The contract below was designed from the spec
 * doc + public API research, and it deliberately mirrors this kit's already-
 * shipped v1.1 priority-overflow manager (`overflow.tsx`) — its proven
 * subscribe/getSnapshot store, ResizeObserver wiring, accurate space accounting,
 * post-layout `settle()` safety net, and StrictMode-revivable lifecycle.
 *
 * ## `priority` / `pinned` do NOT apply here
 * Those are **single-line** (v1 `overflow.tsx`) concepts. Classic collapse is
 * governed **solely** by each group's `collapsePriority`. There is no per-item
 * ranking, no pinned floor, and no "…" trigger in this module.
 *
 * ## What lives here
 * 1. `createGroupCollapseManager` — the framework-agnostic core. Holds
 *    registered groups, runs the measure/collapse loop, and exposes a
 *    `subscribe`/`getSnapshot` store (built for `useSyncExternalStore`).
 *    Exported so the logic is unit-testable with synthetic sizes and reusable
 *    outside React.
 * 2. `<GroupCollapse>` — React provider; attaches a manager to its single child
 *    container element (clone + ref-merge, the Slot idiom `<Overflow>` uses) and
 *    observes it. It also **subscribes to the store and schedules `settle()`** in
 *    a layout effect after each commit — the provider MUST subscribe or the
 *    safety net never fires (the key v1.1 insight). Stamps `data-scroll-mode` on
 *    the container when the snapshot says so.
 * 3. `<CollapseGroup groupId collapsePriority>` — renders BOTH the group's
 *    `expanded` and `collapsed` forms (passed as element props), registers both
 *    DOM elements, and toggles each form's CSS visibility from the snapshot's
 *    `groupModes[groupId]`. Stamps `data-slot="collapse-group"` + `data-mode`.
 * 4. `useGroupMode(groupId)` / `useIsScrollMode()` — hooks for phases C2/C3 to
 *    consume the snapshot when rendering the real classic band + collapsed-group
 *    flyout + scroll fallback.
 *
 * ## Collapse order (which group collapses first)
 * Higher `collapsePriority` collapses FIRST (matches Word: `Parágrafo` before
 * `Fonte`); ties break by DOM position, later-in-DOM first. The collapsed set is
 * always the top-K of this total order, so as the container grows groups
 * **un-collapse in reverse** — the last group collapsed is the first restored.
 *
 * ## Measurement, caching & accounting (mirrors overflow.tsx's v1.1 model)
 * A `ResizeObserver` on the container drives updates. Both a group's expanded and
 * collapsed forms are always **mounted**; the inactive one is `display:none`
 * (set through the React binding), so it stays in the tree but out of flow.
 * Because a `display:none` form reports 0, only the **currently-active** form is
 * measured on each pass, and its size is **cached** — re-collapsing or
 * re-expanding a group reuses the last good size. The not-yet-measured collapsed
 * form uses an **optimistic estimate** (`collapsedEstimate`, default `0`): 0
 * assumes collapsing frees the group's whole expanded width, so the loop only
 * ever **under**-collapses predictively, and the `settle()` net corrects the
 * residual (the v1.1 pattern that makes optimistic estimates safe — a low
 * estimate can never cause over-collapse, which `settle` could not undo).
 *
 * Occupied for a candidate collapse count models every cost the classic flex row
 * pays: Σ(each group's current-mode size) + the **flex gap** `gap × (n − 1)`
 * across the `n` group slots (one visible form per group), read once per
 * recompute from the container's computed `column-gap`/`row-gap` via an
 * injectable `getGap`. Available space = container size on the axis − the
 * container's own inline padding − the consumer `padding` slack (default 0).
 * (Separators are not modeled as measured participants in C1 — the group gap
 * covers the visual hairline; C2 may fold them in if needed.)
 *
 * ## Compute loop
 * Start all-expanded. While `occupied > available`, collapse the next group in
 * collapse order (swap its contribution from expanded size to collapsed size),
 * up to all `n` groups. If all groups are collapsed and it STILL overflows →
 * `scrollMode = true`.
 *
 * ## Post-layout safety net
 * After the React bindings apply a snapshot, `settle()` runs (scheduled by the
 * provider in a layout effect, so the just-committed `display:none` is
 * reflected). If the container **truly** overflows (`getOverflowSize` —
 * `scrollWidth`/`scrollHeight` — exceeds the client size), it collapses **one**
 * more group (next in collapse order); if none remain expanded it escalates to
 * `scrollMode`. The net is **collapse-only** within a settle sequence (an
 * oscillation guard: it may never un-collapse), its extra-collapse count resets
 * when the container size actually changes or a group (un)registers, and a hard
 * cap (`groups.size`) backstops it.
 *
 * ## Snapshot shape (referentially stable)
 * `getSnapshot()` returns the same object identity until the derived state
 * actually changes (membership-compared, not rebuilt every tick), so
 * `useSyncExternalStore` never loops:
 *
 * ```ts
 * type GroupCollapseSnapshot = {
 *   groupModes: Readonly<Record<string, "expanded" | "collapsed">>;
 *   scrollMode: boolean;
 * };
 * ```
 *
 * ## SSR story
 * `createGroupCollapseManager` touches no DOM at construction (safe inside a
 * `useState` initializer during server render). No `ResizeObserver` is created
 * and no layout is read during render — the observer is wired only when the
 * container ref attaches (client-only). The initial/server snapshot shows
 * **all groups expanded** and `scrollMode: false` (`getServerSnapshot` returns
 * these), so the server markup and the first client paint agree; the first real
 * measurement happens after mount and reflows once (the standard, hydration-safe
 * behavior for this pattern).
 *
 * ## `"use client"` — required
 * This file owns React context, hooks, refs, and a `ResizeObserver`, all
 * client-only. It imports **no** `@fluentui/react-icons` and no styling helpers
 * (`cn`/`cva`) — it renders no visuals, so it has no registry `utils` dependency.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A group's current presentation. */
export type GroupMode = "expanded" | "collapsed";

/** Which axis the classic band flows on (horizontal is first-class). */
export type CollapseAxis = "horizontal" | "vertical";

/** Injectable measurement fn (default reads `offsetWidth`/`offsetHeight`). */
export type CollapseGetSize = (element: HTMLElement, axis: CollapseAxis) => number;

/** Injectable flex-gap reader (default reads computed `column-gap`/`row-gap`). */
export type CollapseGetGap = (element: HTMLElement, axis: CollapseAxis) => number;

/**
 * Injectable "true rendered extent" reader for the post-layout safety net
 * (default reads `scrollWidth`/`scrollHeight`).
 */
export type CollapseGetOverflowSize = (
  element: HTMLElement,
  axis: CollapseAxis
) => number;

export interface GroupCollapseManagerOptions {
  /** Overflow/flow axis. `"horizontal"` (default) is first-class; `"vertical"` is supported and must not crash. */
  axis?: CollapseAxis;
  /**
   * **Extra** slack the consumer wants on top of the manager's accurate space
   * accounting (group sizes + flex gap + container padding are all modelled).
   * Default `0`.
   */
  padding?: number;
  /**
   * Optimistic size used for a group's collapsed form **before** it has been
   * measured (a `display:none` form reports 0). Kept **low** on purpose so the
   * predictive loop only ever under-collapses and the `settle()` net corrects —
   * a high estimate could cause over-collapse, which `settle` cannot undo.
   * Default `0`.
   */
  collapsedEstimate?: number;
  getSize?: CollapseGetSize;
  /** Reads the container's flex gap on the axis (default: computed style). */
  getGap?: CollapseGetGap;
  /** Reads the container's true rendered extent for the safety net (default: `scrollWidth`). */
  getOverflowSize?: CollapseGetOverflowSize;
}

/** What `<CollapseGroup>` hands to the manager on register. */
export interface GroupRegistration {
  groupId: string;
  /** Higher collapses FIRST (Word: Parágrafo before Fonte). Default `0`. */
  collapsePriority?: number;
  expandedElement: HTMLElement | null;
  collapsedElement: HTMLElement | null;
}

export interface GroupCollapseSnapshot {
  groupModes: Readonly<Record<string, GroupMode>>;
  scrollMode: boolean;
}

export interface GroupCollapseManager {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => GroupCollapseSnapshot;
  registerGroup: (registration: GroupRegistration) => void;
  unregisterGroup: (groupId: string) => void;
  setGroupExpandedElement: (groupId: string, element: HTMLElement | null) => void;
  setGroupCollapsedElement: (groupId: string, element: HTMLElement | null) => void;
  setContainer: (element: HTMLElement | null) => void;
  setOptions: (options: Partial<GroupCollapseManagerOptions>) => void;
  /** Synchronously re-measure and recompute (used by the observer and by tests). */
  update: () => void;
  /**
   * One step of the post-layout safety net: if the container still truly
   * overflows (`getOverflowSize` > client), collapse one more group (or, if none
   * remain expanded, escalate to `scrollMode`). Collapse-only, capped. Scheduled
   * by the provider after a commit that changed layout; also callable in tests.
   */
  settle: () => void;
  /**
   * Dispose current resources (observer, listeners, groups). NOT terminal: any
   * subsequent `registerGroup`/`setContainer` revives the manager. This makes the
   * React binding safe under StrictMode's dev-only unmount/remount double-invoke,
   * where the same useState-held manager is destroyed by the simulated unmount
   * and must rebuild on the re-run.
   */
  destroy: () => void;
}

interface InternalGroup {
  groupId: string;
  collapsePriority: number;
  expandedElement: HTMLElement | null;
  collapsedElement: HTMLElement | null;
  /** Last measured size of the expanded form on the axis; kept across hidden periods. */
  expandedSize: number;
  /** Last measured size of the collapsed form on the axis; kept across hidden periods. */
  collapsedSize: number;
  /** Document-order index, recomputed each pass. */
  domIndex: number;
}

// compareDocumentPosition bitmask constants (avoid a `Node` global reference).
const DOCUMENT_POSITION_PRECEDING = 2;
const DOCUMENT_POSITION_FOLLOWING = 4;

/** Slack tolerated before the safety net treats the band as truly overflowing. */
const SAFETY_TOLERANCE = 1;

const defaultGetSize: CollapseGetSize = (element, axis) =>
  axis === "horizontal" ? element.offsetWidth : element.offsetHeight;

const defaultGetGap: CollapseGetGap = (element, axis) => {
  if (typeof getComputedStyle === "undefined") return 0;
  const style = getComputedStyle(element);
  const raw = axis === "horizontal" ? style.columnGap : style.rowGap;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};

const defaultGetOverflowSize: CollapseGetOverflowSize = (element, axis) =>
  axis === "horizontal" ? element.scrollWidth : element.scrollHeight;

/**
 * The container's own inline padding on the axis — it eats into the space the
 * flex children get, so it's subtracted from `available`. Read from computed
 * style (0 under SSR / jsdom, so synthetic-size tests are unaffected).
 */
function readContainerPadding(element: HTMLElement, axis: CollapseAxis): number {
  if (typeof getComputedStyle === "undefined") return 0;
  const style = getComputedStyle(element);
  const a = parseFloat(axis === "horizontal" ? style.paddingLeft : style.paddingTop);
  const b = parseFloat(
    axis === "horizontal" ? style.paddingRight : style.paddingBottom
  );
  return (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0);
}

// ---------------------------------------------------------------------------
// Core manager (framework-agnostic)
// ---------------------------------------------------------------------------

export function createGroupCollapseManager(
  initialOptions: GroupCollapseManagerOptions = {}
): GroupCollapseManager {
  const options: Required<GroupCollapseManagerOptions> = {
    axis: initialOptions.axis ?? "horizontal",
    padding: initialOptions.padding ?? 0,
    collapsedEstimate: initialOptions.collapsedEstimate ?? 0,
    getSize: initialOptions.getSize ?? defaultGetSize,
    getGap: initialOptions.getGap ?? defaultGetGap,
    getOverflowSize: initialOptions.getOverflowSize ?? defaultGetOverflowSize,
  };

  const groups = new Map<string, InternalGroup>();
  const listeners = new Set<() => void>();

  let container: HTMLElement | null = null;
  let containerObserver: ResizeObserver | null = null;

  // Flex gap on the axis, read once per recompute.
  let gap = 0;
  // Post-layout safety net: extra groups collapsed beyond the accounted count,
  // and a forced scroll escalation. Both are collapse-only within a settle
  // sequence and reset on real size change / (un)register.
  let extraCollapsed = 0;
  let settleScroll = false;
  let baseCollapsedCount = 0;
  let lastContainerSize = -1;

  let updating = false;
  let dirty = false;
  let destroyed = false;

  let snapshot: GroupCollapseSnapshot = buildAllExpanded();

  function buildAllExpanded(): GroupCollapseSnapshot {
    const groupModes: Record<string, GroupMode> = {};
    for (const group of groups.values()) groupModes[group.groupId] = "expanded";
    return { groupModes, scrollMode: false };
  }

  function snapshotsEqual(
    a: GroupCollapseSnapshot,
    b: GroupCollapseSnapshot
  ): boolean {
    if (a.scrollMode !== b.scrollMode) return false;
    const aKeys = Object.keys(a.groupModes);
    const bKeys = Object.keys(b.groupModes);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a.groupModes[key] !== b.groupModes[key]) return false;
    }
    return true;
  }

  function commit(next: GroupCollapseSnapshot) {
    if (snapshotsEqual(snapshot, next)) return; // referentially stable no-op
    snapshot = next;
    for (const listener of listeners) listener();
  }

  /** Sort groups into document order and stamp `domIndex`. */
  function stampDomOrder() {
    const list = [...groups.values()];
    const el = (g: InternalGroup) => g.expandedElement ?? g.collapsedElement;
    const withEl = list.filter((g) => el(g));
    const withoutEl = list.filter((g) => !el(g));
    withEl.sort((a, b) => {
      const position = el(a)!.compareDocumentPosition(el(b)!);
      if (position & DOCUMENT_POSITION_FOLLOWING) return -1; // b after a → a first
      if (position & DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    withEl.forEach((g, index) => {
      g.domIndex = index;
    });
    // Not-yet-mounted groups sort last; they carry no size.
    withoutEl.forEach((g) => {
      g.domIndex = withEl.length;
    });
  }

  function recompute() {
    // No container → everything expanded; forget cached geometry.
    if (!container) {
      extraCollapsed = 0;
      settleScroll = false;
      baseCollapsedCount = 0;
      lastContainerSize = -1;
      commit(buildAllExpanded());
      return;
    }

    const containerSize = options.getSize(container, options.axis);
    gap = options.getGap(container, options.axis);
    // A real container-size change ends any settle sequence (reset the net).
    if (containerSize !== lastContainerSize) {
      extraCollapsed = 0;
      settleScroll = false;
      lastContainerSize = containerSize;
    }
    // Not yet measurable / collapsed → everything expanded (SSR-safe path).
    if (!(containerSize > 0)) {
      baseCollapsedCount = 0;
      commit(buildAllExpanded());
      return;
    }

    stampDomOrder();

    // Measure only each group's currently-active form (a hidden `display:none`
    // form reports 0); never clobber a good cached size with a transient 0.
    for (const group of groups.values()) {
      const mode = snapshot.groupModes[group.groupId] ?? "expanded";
      if (mode === "expanded") {
        if (group.expandedElement) {
          const measured = options.getSize(group.expandedElement, options.axis);
          if (measured > 0) group.expandedSize = measured;
        }
      } else if (group.collapsedElement) {
        const measured = options.getSize(group.collapsedElement, options.axis);
        if (measured > 0) group.collapsedSize = measured;
      }
    }

    // Flex children live inside the container's content box, so subtract its own
    // inline padding (plus any extra consumer `padding` slack).
    const available =
      containerSize -
      readContainerPadding(container, options.axis) -
      options.padding;

    // Collapse order: highest collapsePriority first; ties → later-in-DOM first.
    const collapseOrder = [...groups.values()].sort((a, b) => {
      if (a.collapsePriority !== b.collapsePriority)
        return b.collapsePriority - a.collapsePriority;
      return b.domIndex - a.domIndex;
    });
    const n = collapseOrder.length;
    // One visible form per group → `n` slots, `n − 1` gaps.
    const gapTotal = n > 0 ? gap * (n - 1) : 0;

    const groupSize = (group: InternalGroup, collapsed: boolean): number =>
      collapsed
        ? group.collapsedSize > 0
          ? group.collapsedSize
          : options.collapsedEstimate
        : group.expandedSize;

    /** Occupancy when the first `k` groups in collapse order are collapsed. */
    const occupancy = (k: number): number => {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += groupSize(collapseOrder[i]!, i < k);
      }
      return sum + gapTotal;
    };

    // Greedy: collapse the fewest groups (highest priority first) that fit.
    let base = 0;
    while (base < n && occupancy(base) > available) base++;
    const predictiveScroll = base >= n && occupancy(n) > available;
    baseCollapsedCount = base;

    // Post-layout safety net may collapse a few more; never past all `n`.
    const finalCollapsed = Math.min(n, base + extraCollapsed);
    const scrollMode = predictiveScroll || settleScroll;

    const groupModes: Record<string, GroupMode> = {};
    collapseOrder.forEach((group, index) => {
      groupModes[group.groupId] =
        index < finalCollapsed ? "collapsed" : "expanded";
    });

    commit({ groupModes, scrollMode });
  }

  function update() {
    if (destroyed) return;
    if (updating) {
      // Re-entrant call (e.g. a listener mounted/unmounted a group) → loop again.
      dirty = true;
      return;
    }
    updating = true;
    try {
      do {
        dirty = false;
        recompute();
      } while (dirty);
    } finally {
      updating = false;
    }
  }

  /**
   * One step of the post-layout safety net. Runs after a commit reflected the
   * current layout, so `getOverflowSize` sees the real rendered extent. Only ever
   * collapses (oscillation guard); backs off if collapsing one more makes no
   * difference; escalates to `scrollMode` when everything is already collapsed;
   * capped at `groups.size`.
   */
  function settle() {
    if (destroyed || !container) return;
    const client = options.getSize(container, options.axis);
    if (!(client > 0)) return;
    const scroll = options.getOverflowSize(container, options.axis);
    if (scroll <= client + SAFETY_TOLERANCE) return; // no true overflow

    const n = groups.size;
    const finalCollapsed = Math.min(n, baseCollapsedCount + extraCollapsed);
    if (finalCollapsed >= n) {
      // Everything already collapsed; the only remaining move is scroll mode.
      if (!settleScroll) {
        settleScroll = true;
        recompute();
      }
      return;
    }
    if (extraCollapsed >= n) return; // hard cap backstop
    extraCollapsed += 1;
    const before = snapshot;
    recompute();
    // No progress → don't creep toward the cap.
    if (snapshot === before) extraCollapsed -= 1;
  }

  function attachObserver() {
    if (containerObserver || !container) return;
    if (typeof ResizeObserver === "undefined") return; // SSR / unsupported
    containerObserver = new ResizeObserver(() => update());
    containerObserver.observe(container);
  }

  function detachObserver() {
    containerObserver?.disconnect();
    containerObserver = null;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    registerGroup(registration) {
      destroyed = false; // any new use revives a destroyed manager (StrictMode remount)
      const existing = groups.get(registration.groupId);
      groups.set(registration.groupId, {
        groupId: registration.groupId,
        collapsePriority: registration.collapsePriority ?? 0,
        expandedElement: registration.expandedElement,
        collapsedElement: registration.collapsedElement,
        expandedSize: existing?.expandedSize ?? 0, // preserve cached sizes across re-registers
        collapsedSize: existing?.collapsedSize ?? 0,
        domIndex: existing?.domIndex ?? 0,
      });
      extraCollapsed = 0; // membership change ends any settle sequence
      settleScroll = false;
      update();
    },
    unregisterGroup(groupId) {
      if (groups.delete(groupId)) {
        extraCollapsed = 0;
        settleScroll = false;
        update();
      }
    },
    setGroupExpandedElement(groupId, element) {
      const group = groups.get(groupId);
      if (group) group.expandedElement = element;
    },
    setGroupCollapsedElement(groupId, element) {
      const group = groups.get(groupId);
      if (group) group.collapsedElement = element;
    },
    setContainer(element) {
      if (element) destroyed = false; // revive on re-attach (StrictMode remount)
      if (element === container) {
        if (element) attachObserver(); // same node after a destroy → observer is gone
        return;
      }
      detachObserver();
      container = element;
      if (element) attachObserver();
      update();
    },
    setOptions(next) {
      Object.assign(options, {
        ...(next.axis !== undefined && { axis: next.axis }),
        ...(next.padding !== undefined && { padding: next.padding }),
        ...(next.collapsedEstimate !== undefined && {
          collapsedEstimate: next.collapsedEstimate,
        }),
        ...(next.getSize !== undefined && { getSize: next.getSize }),
        ...(next.getGap !== undefined && { getGap: next.getGap }),
        ...(next.getOverflowSize !== undefined && {
          getOverflowSize: next.getOverflowSize,
        }),
      });
      update();
    },
    update,
    settle,
    destroy() {
      destroyed = true;
      detachObserver();
      listeners.clear();
      groups.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Ref helpers (Slot-style merge; no external dependency)
// ---------------------------------------------------------------------------

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

function getChildStyle(element: ReactElement): CSSProperties | undefined {
  return (element.props as { style?: CSSProperties }).style;
}

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

const GroupCollapseContext = createContext<GroupCollapseManager | null>(null);

function useGroupCollapseContext(): GroupCollapseManager {
  const manager = useContext(GroupCollapseContext);
  if (!manager) {
    throw new Error(
      "CollapseGroup / hooks must be rendered inside a <GroupCollapse> provider."
    );
  }
  return manager;
}

const useIsomorphicLayoutEffect =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

export interface GroupCollapseProps extends GroupCollapseManagerOptions {
  /** A single element (e.g. the classic band `div`) used as the measured container. */
  children: ReactElement;
}

/**
 * `<GroupCollapse>` — provider + container binding. Clones its single child and
 * merges in the container ref (the Slot idiom the kit uses for composition), then
 * observes that element. It subscribes to the store so it re-renders on every
 * snapshot change, and schedules `settle()` in a layout effect after each commit
 * (without this subscription the safety net would never run). Stamps
 * `data-scroll-mode` on the container when the snapshot says so.
 *
 * ```tsx
 * <GroupCollapse>
 *   <div data-classic-band className="flex w-full items-stretch gap-2">…</div>
 * </GroupCollapse>
 * ```
 */
function GroupCollapse({
  children,
  axis = "horizontal",
  padding = 0,
  collapsedEstimate = 0,
  getSize,
  getGap,
  getOverflowSize,
}: GroupCollapseProps) {
  const [manager] = useState(() =>
    createGroupCollapseManager({
      axis,
      padding,
      collapsedEstimate,
      getSize,
      getGap,
      getOverflowSize,
    })
  );

  // Keep the manager's options in sync with prop changes.
  useIsomorphicLayoutEffect(() => {
    manager.setOptions({
      axis,
      padding,
      collapsedEstimate,
      getSize,
      getGap,
      getOverflowSize,
    });
  }, [manager, axis, padding, collapsedEstimate, getSize, getGap, getOverflowSize]);

  // Subscribe so the provider itself re-renders on every snapshot change (the
  // group/hook subscriptions alone re-render the children, not this component) —
  // that is what lets the safety-net layout effect below run *after* a commit.
  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot
  );

  // Post-commit safety net: after a commit the DOM reflects the current layout,
  // so a layout-effect read of the container's true extent (`scrollWidth`) is
  // accurate. If it still overruns, `settle()` collapses one more (or escalates
  // to scroll) and the resulting commit re-runs this effect until the band
  // genuinely fits (collapse-only, so it converges). No-ops when nothing overruns.
  useIsomorphicLayoutEffect(() => {
    manager.settle();
  }, [manager, snapshot]);

  // Tear the manager (and its observer) down on unmount.
  useEffect(() => () => manager.destroy(), [manager]);

  const containerRef = useCallback(
    (element: HTMLElement | null) => manager.setContainer(element),
    [manager]
  );

  const child = Children.only(children);
  if (!isValidElement(child)) {
    throw new Error("<GroupCollapse> expects a single element child.");
  }
  const mergedRef = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(child), containerRef),
    [child, containerRef]
  );

  return (
    <GroupCollapseContext.Provider value={manager}>
      {cloneElement(child, {
        ref: mergedRef,
        "data-group-collapse-container": "",
        "data-scroll-mode": snapshot.scrollMode ? "" : undefined,
      } as Record<string, unknown>)}
    </GroupCollapseContext.Provider>
  );
}

export interface CollapseGroupProps {
  groupId: string;
  /** Higher collapses FIRST (Word: Parágrafo before Fonte). Default `0`. */
  collapsePriority?: number;
  /** The group's full expanded form (a single element). */
  expanded: ReactElement;
  /** The group's collapsed dropdown form (a single element). */
  collapsed: ReactElement;
}

/**
 * `<CollapseGroup>` — renders BOTH the group's `expanded` and `collapsed` forms,
 * registers both DOM elements with the manager, and toggles each form's CSS
 * visibility from the snapshot's `groupModes[groupId]` (the inactive form gets
 * inline `display:none` — inline wins over utility classes; neither form is ever
 * unmounted, so the collapsed flyout's children stay live and each form stays
 * measurable when re-shown). The wrapper is `display:contents` so it adds no box
 * of its own — the two forms lay out as direct children of the classic band, one
 * visible per group. Stamps `data-slot="collapse-group"`, `data-group-id`, and
 * `data-mode` (`"expanded" | "collapsed"`) on the wrapper, plus
 * `data-collapse-form` on each form.
 */
function CollapseGroup({
  groupId,
  collapsePriority = 0,
  expanded,
  collapsed,
}: CollapseGroupProps) {
  const manager = useGroupCollapseContext();
  const mode = useGroupMode(groupId);
  const isCollapsed = mode === "collapsed";

  const expandedRef = useRef<HTMLElement | null>(null);
  const collapsedRef = useRef<HTMLElement | null>(null);

  const captureExpanded = useCallback(
    (element: HTMLElement | null) => {
      expandedRef.current = element;
      manager.setGroupExpandedElement(groupId, element);
    },
    [manager, groupId]
  );
  const captureCollapsed = useCallback(
    (element: HTMLElement | null) => {
      collapsedRef.current = element;
      manager.setGroupCollapsedElement(groupId, element);
    },
    [manager, groupId]
  );

  useIsomorphicLayoutEffect(() => {
    manager.registerGroup({
      groupId,
      collapsePriority,
      expandedElement: expandedRef.current,
      collapsedElement: collapsedRef.current,
    });
    return () => manager.unregisterGroup(groupId);
  }, [manager, groupId, collapsePriority]);

  const expandedChild = Children.only(expanded);
  const collapsedChild = Children.only(collapsed);
  if (!isValidElement(expandedChild) || !isValidElement(collapsedChild)) {
    throw new Error(
      "<CollapseGroup> expects single element children for `expanded` and `collapsed`."
    );
  }

  const expandedMerged = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(expandedChild), captureExpanded),
    [expandedChild, captureExpanded]
  );
  const collapsedMerged = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(collapsedChild), captureCollapsed),
    [collapsedChild, captureCollapsed]
  );
  const expandedStyle = getChildStyle(expandedChild);
  const collapsedStyle = getChildStyle(collapsedChild);

  return (
    <div
      data-slot="collapse-group"
      data-group-id={groupId}
      data-mode={mode}
      style={{ display: "contents" }}
    >
      {cloneElement(expandedChild, {
        ref: expandedMerged,
        "data-collapse-form": "expanded",
        "aria-hidden": isCollapsed ? true : undefined,
        style: isCollapsed
          ? { ...expandedStyle, display: "none" }
          : expandedStyle,
      } as Record<string, unknown>)}
      {cloneElement(collapsedChild, {
        ref: collapsedMerged,
        "data-collapse-form": "collapsed",
        "aria-hidden": isCollapsed ? undefined : true,
        style: isCollapsed
          ? collapsedStyle
          : { ...collapsedStyle, display: "none" },
      } as Record<string, unknown>)}
    </div>
  );
}

/**
 * `useGroupMode(groupId)` — the group's current mode
 * (`"expanded" | "collapsed"`). (Server/first paint: `"expanded"`.) For C2 to
 * render the classic anatomy vs. the collapsed dropdown button.
 */
export function useGroupMode(groupId: string): GroupMode {
  const manager = useGroupCollapseContext();
  return useSyncExternalStore(
    manager.subscribe,
    () => manager.getSnapshot().groupModes[groupId] ?? "expanded",
    () => "expanded" as GroupMode
  );
}

/**
 * `useIsScrollMode()` — `true` when every group is collapsed and the band still
 * overflows (the terminal horizontal-scroll fallback). (Server/first paint:
 * `false`.) For C3 to render the scroll UI + edge arrows.
 */
export function useIsScrollMode(): boolean {
  const manager = useGroupCollapseContext();
  return useSyncExternalStore(
    manager.subscribe,
    () => manager.getSnapshot().scrollMode,
    () => false
  );
}

export { GroupCollapse, CollapseGroup };
