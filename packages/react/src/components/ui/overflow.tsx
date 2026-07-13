"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, ReactElement, Ref } from "react";

/**
 * Overflow — a **headless** priority-overflow system (no visuals of its own).
 *
 * This is the core mechanism behind the kit's upcoming single-line **Ribbon**
 * (Fluent 2 / Office). A row of controls (a `Toolbar`) that cannot fit its
 * container hides its **lowest-priority** items into a "…" overflow menu, and
 * restores them, highest-priority-first, as the container grows — exactly the
 * behavior captured live from Word Online in `docs/design/ribbon-behavior-spec.md`
 * ("Single-line mode": items drop into "…", grouped under section headers named
 * after their source group).
 *
 * ## Licensing / provenance
 * This reimplements the **publicly documented priority-overflow *pattern*** —
 * ResizeObserver-driven, priority + pinned ranking, DOM-position tie-break, a
 * subscribe/getSnapshot store, hide-via-CSS so hidden items stay measurable, and
 * the "…"-trigger width reserved from the budget. **No Fluent UI source was
 * consulted or copied** (conventions §0: Fluent 2 is a behavioral reference
 * only). The contract below was designed from the spec doc + public API research.
 *
 * ## What lives here
 * 1. `createOverflowManager` — the framework-agnostic core. Holds registered
 *    items, runs the measure/rank/hide/show loop, and exposes a
 *    `subscribe`/`getSnapshot` store (built for `useSyncExternalStore`). Exported
 *    so the logic is unit-testable with synthetic sizes and reusable outside
 *    React.
 * 2. `<Overflow>` — React provider; attaches a manager to its single child
 *    container element (clone + ref-merge, the Slot idiom) and observes it.
 * 3. `<OverflowItem>` / `<OverflowDivider>` — clone their single child, register
 *    it, and toggle its CSS visibility from the snapshot.
 * 4. `useOverflowMenu` / `useIsOverflowItemVisible` / `useIsOverflowGroupVisible`
 *    / `useOverflowCount` — hooks for the "…" trigger and for building the
 *    overflow menu's contents.
 *
 * ## Ranking (which item survives longer)
 * `pinned` (never hidden) → higher `priority` survives longer → tie-break by DOM
 * position: for `overflowDirection: "end"` the item **nearest the overflow end**
 * (last in document order) hides first and reappears last; `"start"` mirrors it.
 * Because the visible set is always the top-K of this total order, items
 * "reappear in reverse order" of hiding for free as the container grows.
 *
 * ## Measurement & caching model (accurate space accounting, v1.1)
 * A `ResizeObserver` on the container drives updates. Available space =
 * container size on the overflow axis − `padding` (`padding` now defaults to `0`
 * and is pure **consumer slack**, no longer a hand-tuned reserve for costs the
 * manager can't see). Occupied for a candidate visible set models **every** cost
 * the flex row actually pays:
 *   - Σ(visible item sizes);
 *   - Σ(visible **divider** sizes) — dividers register and are measured too (see
 *     "Group tracking"), a divider counting whenever its group has ≥1 visible
 *     item;
 *   - the "…" **trigger** size whenever at least one item is hidden (so the
 *     trigger can never itself cause overflow); and
 *   - the **flex gap**: `gap × (slots − 1)`, where `slots` = visible items +
 *     visible dividers + the trigger (when shown). The gap is read once per
 *     recompute from the container's computed `column-gap`/`row-gap` via an
 *     injectable `getGap` (default: `getComputedStyle`).
 * The greedy prefix loop tracks item size, divider cost, and slot count
 * incrementally as it admits items in importance order, so it decides how many
 * items fit **without** rendering hypotheses.
 *
 * Item/divider sizes are **cached** every time they are measured while visible; a
 * hidden element keeps its last known size, so re-showing it is accurate. Hiding
 * is done via **CSS** (`display:none` set through the React binding) — the element
 * is **never unmounted**, so (a) the overflow menu can still read each item's
 * React metadata, and (b) the element becomes measurable again the moment it is
 * restored. Measurement uses the injectable `getSize` (default:
 * `offsetWidth`/`offsetHeight`) so the loop is testable under jsdom's zero-layout
 * DOM, and it never overwrites a good cached size with a transient `0`.
 *
 * ## Post-layout safety net
 * Predictive accounting is now accurate, but sub-pixel rounding or an
 * un-modelled cost could still leave a hair of overrun. After the React bindings
 * apply a snapshot, `settle()` runs (scheduled by the binding in a layout effect,
 * so the just-committed `display:none` is reflected): if the container **truly**
 * overflows (`getOverflowSize` — `scrollWidth`/`scrollHeight` — exceeds the
 * client size), it hides **one** more item and lets the next commit re-check.
 * The net is **hide-only** within a settle sequence (an oscillation guard: it may
 * never show), its extra-hidden count resets when the container size actually
 * changes or items (un)register, and a hard cap (`items.size`) backstops it. It
 * never hides below the pinned/`minimumVisible` floor.
 *
 * ## Group tracking
 * Each `groupId` derives a tri-state (`OverflowGroupState`): `"visible"` (all its
 * items shown), `"overflow"` (some shown, some hidden), `"hidden"` (all hidden).
 * `<OverflowDivider groupId>` **registers its element** so its width + gap
 * participate in the occupancy sum, and hides itself only when its group is
 * **fully overflowed** (`"hidden"`) — a dangling separator with nothing left
 * beside it. It is not a ranked item (it never hides by rank; its visibility is
 * derived from its group's state). The overflow menu renders a section (header +
 * items) for any group whose state is not `"visible"`.
 *
 * ## SSR story
 * `createOverflowManager` touches no DOM at construction (safe inside a `useState`
 * initializer during server render). No `ResizeObserver` is created and no layout
 * is read during render — the observer is wired only when the container ref
 * attaches (client-only). The initial/server snapshot shows **everything
 * visible** (`getServerSnapshot` returns "visible"/`true`/`0`), so the server
 * markup and the first client paint agree; the first real measurement happens
 * after mount and reflows once (the standard, hydration-safe behavior for this
 * pattern).
 *
 * ## Snapshot shape (referentially stable)
 * `getSnapshot()` returns the same object identity until the derived state
 * actually changes (membership-compared, not rebuilt every tick), so
 * `useSyncExternalStore` never loops:
 *
 * ```ts
 * type OverflowSnapshot = {
 *   visibleItemIds: ReadonlySet<string>;
 *   overflowItemIds: ReadonlySet<string>;   // hidden
 *   overflowCount: number;
 *   hasOverflow: boolean;
 *   groupStates: Readonly<Record<string, OverflowGroupState>>;
 * };
 * ```
 *
 * ## `"use client"` — required
 * This file owns React context, hooks, refs, and a `ResizeObserver`, all
 * client-only. It imports **no** `@fluentui/react-icons` and no styling helpers
 * (`cn`/`cva`) — it renders no visuals, so it has no registry `utils` dependency.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Derived visibility of a `groupId`'s items. */
export type OverflowGroupState = "visible" | "overflow" | "hidden";

/** Which end items overflow toward, and which axis the container flows on. */
export type OverflowDirection = "end" | "start";
export type OverflowAxis = "horizontal" | "vertical";

/** Injectable measurement fn (default reads `offsetWidth`/`offsetHeight`). */
export type OverflowGetSize = (element: HTMLElement, axis: OverflowAxis) => number;

/** Injectable flex-gap reader (default reads computed `column-gap`/`row-gap`). */
export type OverflowGetGap = (element: HTMLElement, axis: OverflowAxis) => number;

/**
 * Injectable "true rendered extent" reader for the post-layout safety net
 * (default reads `scrollWidth`/`scrollHeight`).
 */
export type OverflowGetOverflowSize = (
  element: HTMLElement,
  axis: OverflowAxis
) => number;

export interface OverflowManagerOptions {
  overflowDirection?: OverflowDirection;
  overflowAxis?: OverflowAxis;
  /**
   * **Extra** slack the consumer wants on top of the manager's accurate space
   * accounting (item sizes + dividers + flex gap + trigger are all modelled now).
   * Default `0` — you no longer hand-tune this to cover gaps/dividers.
   */
  padding?: number;
  /** Floor on the number of **non-pinned** items kept visible (pinned are always visible and never counted here). */
  minimumVisible?: number;
  getSize?: OverflowGetSize;
  /** Reads the container's flex gap on the overflow axis (default: computed style). */
  getGap?: OverflowGetGap;
  /** Reads the container's true rendered extent for the safety net (default: `scrollWidth`). */
  getOverflowSize?: OverflowGetOverflowSize;
}

/** What `<OverflowItem>` hands to the manager on register. */
export interface OverflowItemRegistration {
  id: string;
  element: HTMLElement | null;
  priority?: number;
  pinned?: boolean;
  groupId?: string;
}

export interface OverflowSnapshot {
  visibleItemIds: ReadonlySet<string>;
  overflowItemIds: ReadonlySet<string>;
  overflowCount: number;
  hasOverflow: boolean;
  groupStates: Readonly<Record<string, OverflowGroupState>>;
}

export interface OverflowManager {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => OverflowSnapshot;
  register: (registration: OverflowItemRegistration) => void;
  unregister: (id: string) => void;
  setItemElement: (id: string, element: HTMLElement | null) => void;
  /**
   * Register a group **divider** as a measured (but non-ranked) participant. Its
   * width + gap count toward occupancy whenever its group has a visible item; it
   * never hides by rank (its visibility is derived from its group's state).
   */
  registerDivider: (id: string, groupId: string, element: HTMLElement | null) => void;
  setDividerElement: (id: string, element: HTMLElement | null) => void;
  setContainer: (element: HTMLElement | null) => void;
  setOverflowMenu: (element: HTMLElement | null) => void;
  setOptions: (options: Partial<OverflowManagerOptions>) => void;
  /** Synchronously re-measure and recompute (used by the observer and by tests). */
  update: () => void;
  /**
   * One step of the post-layout safety net: if the container still truly
   * overflows (`getOverflowSize` > client), hide one more item (hide-only,
   * capped, never below the floor). Scheduled by the React binding after a
   * commit that changed visibility; also callable directly in tests.
   */
  settle: () => void;
  /**
   * Dispose current resources (observer, listeners, items). NOT terminal: any
   * subsequent `register`/`setContainer`/`setOverflowMenu` revives the manager.
   * This makes the React binding safe under StrictMode's dev-only
   * unmount/remount double-invoke, where the same useState-held manager is
   * destroyed by the simulated unmount and must rebuild on the re-run.
   */
  destroy: () => void;
}

interface InternalItem {
  id: string;
  element: HTMLElement | null;
  priority: number;
  pinned: boolean;
  groupId?: string;
  /** Last known measured size on the overflow axis; kept across hidden periods. */
  size: number;
  /** Document-order index, recomputed each pass. */
  domIndex: number;
}

interface InternalDivider {
  id: string;
  groupId: string;
  element: HTMLElement | null;
  /** Last known measured size on the overflow axis; kept across hidden periods. */
  size: number;
}

// compareDocumentPosition bitmask constants (avoid a `Node` global reference).
const DOCUMENT_POSITION_PRECEDING = 2;
const DOCUMENT_POSITION_FOLLOWING = 4;

/** Slack tolerated before the safety net treats the row as truly overflowing. */
const SAFETY_TOLERANCE = 1;

const defaultGetSize: OverflowGetSize = (element, axis) =>
  axis === "horizontal" ? element.offsetWidth : element.offsetHeight;

const defaultGetGap: OverflowGetGap = (element, axis) => {
  if (typeof getComputedStyle === "undefined") return 0;
  const style = getComputedStyle(element);
  const raw = axis === "horizontal" ? style.columnGap : style.rowGap;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};

const defaultGetOverflowSize: OverflowGetOverflowSize = (element, axis) =>
  axis === "horizontal" ? element.scrollWidth : element.scrollHeight;

/**
 * The container's own inline padding on the overflow axis — it eats into the
 * space the flex children get, so it's subtracted from `available`. Read from
 * computed style (0 under SSR / jsdom, so synthetic-size tests are unaffected).
 */
function readContainerPadding(element: HTMLElement, axis: OverflowAxis): number {
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

export function createOverflowManager(
  initialOptions: OverflowManagerOptions = {}
): OverflowManager {
  const options: Required<OverflowManagerOptions> = {
    overflowDirection: initialOptions.overflowDirection ?? "end",
    overflowAxis: initialOptions.overflowAxis ?? "horizontal",
    padding: initialOptions.padding ?? 0,
    minimumVisible: initialOptions.minimumVisible ?? 0,
    getSize: initialOptions.getSize ?? defaultGetSize,
    getGap: initialOptions.getGap ?? defaultGetGap,
    getOverflowSize: initialOptions.getOverflowSize ?? defaultGetOverflowSize,
  };

  const items = new Map<string, InternalItem>();
  const dividers = new Map<string, InternalDivider>();
  const listeners = new Set<() => void>();

  let container: HTMLElement | null = null;
  let containerObserver: ResizeObserver | null = null;
  let overflowMenuEl: HTMLElement | null = null;
  let overflowMenuSize = 0;

  // Flex gap on the overflow axis, read once per recompute.
  let gap = 0;
  // Post-layout safety net: extra items hidden beyond the accounted count.
  // Hide-only within a settle sequence; reset on real size change / (un)register.
  let extraHidden = 0;
  let lastContainerSize = -1;

  let updating = false;
  let dirty = false;
  let destroyed = false;

  let snapshot: OverflowSnapshot = buildAllVisible();

  function buildAllVisible(): OverflowSnapshot {
    const visibleItemIds = new Set<string>();
    const groupStates: Record<string, OverflowGroupState> = {};
    for (const item of items.values()) {
      visibleItemIds.add(item.id);
      if (item.groupId) groupStates[item.groupId] = "visible";
    }
    return {
      visibleItemIds,
      overflowItemIds: new Set(),
      overflowCount: 0,
      hasOverflow: false,
      groupStates,
    };
  }

  function snapshotsEqual(a: OverflowSnapshot, b: OverflowSnapshot): boolean {
    if (a.overflowCount !== b.overflowCount) return false;
    if (a.visibleItemIds.size !== b.visibleItemIds.size) return false;
    for (const id of a.visibleItemIds) if (!b.visibleItemIds.has(id)) return false;
    const aKeys = Object.keys(a.groupStates);
    const bKeys = Object.keys(b.groupStates);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a.groupStates[key] !== b.groupStates[key]) return false;
    }
    return true;
  }

  function commit(next: OverflowSnapshot) {
    if (snapshotsEqual(snapshot, next)) return; // referentially stable no-op
    snapshot = next;
    for (const listener of listeners) listener();
  }

  /** Sort items into document order and stamp `domIndex`. */
  function orderByDom(list: InternalItem[]): InternalItem[] {
    const withEl = list.filter((item) => item.element);
    const withoutEl = list.filter((item) => !item.element);
    withEl.sort((a, b) => {
      const position = a.element!.compareDocumentPosition(b.element!);
      if (position & DOCUMENT_POSITION_FOLLOWING) return -1; // b after a → a first
      if (position & DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    withEl.forEach((item, index) => {
      item.domIndex = index;
    });
    // Elementless items (not yet mounted) sort last; they carry no size.
    withoutEl.forEach((item) => {
      item.domIndex = withEl.length;
    });
    return [...withEl, ...withoutEl];
  }

  /** Positive → `a` is MORE important (survives longer). */
  function importance(a: InternalItem, b: InternalItem): number {
    if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Tie-break by distance from the overflow edge (farther = more important).
    if (options.overflowDirection === "end") return b.domIndex - a.domIndex;
    return a.domIndex - b.domIndex;
  }

  function recompute() {
    // No container → everything visible; forget cached geometry.
    if (!container) {
      extraHidden = 0;
      lastContainerSize = -1;
      commit(buildAllVisible());
      return;
    }

    const containerSize = options.getSize(container, options.overflowAxis);
    gap = options.getGap(container, options.overflowAxis);
    // A real container-size change ends any settle sequence (reset the net).
    if (containerSize !== lastContainerSize) {
      extraHidden = 0;
      lastContainerSize = containerSize;
    }
    // Not yet measurable / collapsed → everything visible.
    if (!(containerSize > 0)) {
      commit(buildAllVisible());
      return;
    }

    const ordered = orderByDom([...items.values()]);

    // Measure only currently-visible items (a hidden `display:none` element
    // reports 0); never clobber a good cached size with a transient 0.
    for (const item of ordered) {
      if (item.element && !snapshot.overflowItemIds.has(item.id)) {
        const measured = options.getSize(item.element, options.overflowAxis);
        if (measured > 0) item.size = measured;
      }
    }
    if (overflowMenuEl) {
      const measured = options.getSize(overflowMenuEl, options.overflowAxis);
      if (measured > 0) overflowMenuSize = measured;
    }
    // Measure dividers that are currently rendered (group not fully hidden).
    for (const divider of dividers.values()) {
      if (
        divider.element &&
        snapshot.groupStates[divider.groupId] !== "hidden"
      ) {
        const measured = options.getSize(divider.element, options.overflowAxis);
        if (measured > 0) divider.size = measured;
      }
    }
    // Divider cost keyed by group (a group's divider is visible iff the group
    // has ≥1 visible item).
    const dividersByGroup = new Map<string, { size: number; count: number }>();
    for (const divider of dividers.values()) {
      const entry = dividersByGroup.get(divider.groupId) ?? { size: 0, count: 0 };
      entry.size += divider.size;
      entry.count += 1;
      dividersByGroup.set(divider.groupId, entry);
    }

    // Flex children live inside the container's content box, so subtract its own
    // inline padding (plus any extra consumer `padding` slack).
    const available =
      containerSize -
      readContainerPadding(container, options.overflowAxis) -
      options.padding;

    // Most-important first. The visible set is always a prefix of this order.
    const ranked = ordered.slice().sort((a, b) => importance(b, a));
    const n = ranked.length;

    // Floors: all pinned (front block) always visible; keep >= minimumVisible
    // non-pinned items (they force-show and clip rather than disappear).
    const pinnedCount = ranked.filter((item) => item.pinned).length;
    const nonPinnedFloor = Math.min(options.minimumVisible, n - pinnedCount);
    const floor = pinnedCount + nonPinnedFloor;

    // Occupancy of the full set (no trigger): item sizes + every divider whose
    // group is present + flex gap across all rendered slots.
    const occupancyAll = (() => {
      let itemSize = 0;
      const groups = new Set<string>();
      for (const item of ranked) {
        itemSize += item.size;
        if (item.groupId) groups.add(item.groupId);
      }
      let dividerSize = 0;
      let dividerCount = 0;
      for (const [groupId, entry] of dividersByGroup) {
        if (groups.has(groupId)) {
          dividerSize += entry.size;
          dividerCount += entry.count;
        }
      }
      const slots = n + dividerCount;
      return itemSize + dividerSize + (slots > 0 ? gap * (slots - 1) : 0);
    })();

    let visibleCount: number;
    if (occupancyAll <= available) {
      visibleCount = n; // everything fits, no trigger needed
    } else {
      // At least one item won't fit → the "…" trigger will show (when present);
      // it takes both a size and a gap slot. Admit items in importance order,
      // tracking item size, divider cost, and slot count incrementally.
      const triggerShown = overflowMenuEl != null;
      const triggerSize = triggerShown ? overflowMenuSize : 0;
      let itemSize = 0;
      let dividerSize = 0;
      let dividerCount = 0;
      const seenGroups = new Set<string>();
      let fit = 0;
      for (let i = 0; i < n; i++) {
        const item = ranked[i]!;
        itemSize += item.size;
        if (item.groupId && !seenGroups.has(item.groupId)) {
          seenGroups.add(item.groupId);
          const entry = dividersByGroup.get(item.groupId);
          if (entry) {
            dividerSize += entry.size;
            dividerCount += entry.count;
          }
        }
        const slots = i + 1 + dividerCount + (triggerShown ? 1 : 0);
        const gapTotal = slots > 0 ? gap * (slots - 1) : 0;
        const occupied = itemSize + dividerSize + gapTotal + triggerSize;
        if (occupied <= available) fit = i + 1;
        else break;
      }
      visibleCount = Math.min(n, Math.max(fit, floor));
    }

    // Post-layout safety net: hide `extraHidden` more, never below the floor.
    visibleCount = Math.max(floor, visibleCount - extraHidden);

    const visibleItemIds = new Set<string>();
    const overflowItemIds = new Set<string>();
    ranked.forEach((item, index) => {
      (index < visibleCount ? visibleItemIds : overflowItemIds).add(item.id);
    });

    const groupTotals = new Map<string, { total: number; visible: number }>();
    for (const item of ranked) {
      if (!item.groupId) continue;
      const entry = groupTotals.get(item.groupId) ?? { total: 0, visible: 0 };
      entry.total += 1;
      if (visibleItemIds.has(item.id)) entry.visible += 1;
      groupTotals.set(item.groupId, entry);
    }
    const groupStates: Record<string, OverflowGroupState> = {};
    for (const [groupId, { total, visible }] of groupTotals) {
      groupStates[groupId] =
        visible === total ? "visible" : visible === 0 ? "hidden" : "overflow";
    }

    commit({
      visibleItemIds,
      overflowItemIds,
      overflowCount: overflowItemIds.size,
      hasOverflow: overflowItemIds.size > 0,
      groupStates,
    });
  }

  function update() {
    if (destroyed) return;
    if (updating) {
      // Re-entrant call (e.g. a listener mounted/unmounted an item) → loop again.
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
   * current visibility, so `getOverflowSize` sees the real rendered extent. Only
   * ever hides (oscillation guard); backs off if hiding one more makes no
   * difference (already at the floor); capped at `items.size`.
   */
  function settle() {
    if (destroyed || !container) return;
    const client = options.getSize(container, options.overflowAxis);
    if (!(client > 0)) return;
    const scroll = options.getOverflowSize(container, options.overflowAxis);
    if (scroll <= client + SAFETY_TOLERANCE) return; // no true overflow
    if (extraHidden >= items.size) return; // hard cap backstop
    extraHidden += 1;
    const before = snapshot;
    recompute();
    // No progress (floor reached) → don't creep toward the cap.
    if (snapshot === before) extraHidden -= 1;
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
    register(registration) {
      destroyed = false; // any new use revives a destroyed manager (StrictMode remount)
      const existing = items.get(registration.id);
      items.set(registration.id, {
        id: registration.id,
        element: registration.element,
        priority: registration.priority ?? 0,
        pinned: registration.pinned ?? false,
        groupId: registration.groupId,
        size: existing?.size ?? 0, // preserve a cached size across re-registers
        domIndex: existing?.domIndex ?? 0,
      });
      extraHidden = 0; // membership change ends any settle sequence
      update();
    },
    unregister(id) {
      const removed = items.delete(id) || dividers.delete(id);
      if (removed) {
        extraHidden = 0;
        update();
      }
    },
    setItemElement(id, element) {
      const item = items.get(id);
      if (item) item.element = element;
    },
    registerDivider(id, groupId, element) {
      destroyed = false;
      const existing = dividers.get(id);
      dividers.set(id, {
        id,
        groupId,
        element,
        size: existing?.size ?? 0, // preserve a cached size across re-registers
      });
      extraHidden = 0;
      update();
    },
    setDividerElement(id, element) {
      const divider = dividers.get(id);
      if (divider) divider.element = element;
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
    setOverflowMenu(element) {
      if (element) destroyed = false; // revive on re-attach (StrictMode remount)
      overflowMenuEl = element;
      update();
    },
    setOptions(next) {
      Object.assign(options, {
        ...(next.overflowDirection !== undefined && {
          overflowDirection: next.overflowDirection,
        }),
        ...(next.overflowAxis !== undefined && { overflowAxis: next.overflowAxis }),
        ...(next.padding !== undefined && { padding: next.padding }),
        ...(next.minimumVisible !== undefined && {
          minimumVisible: next.minimumVisible,
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
      items.clear();
      dividers.clear();
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

const OverflowContext = createContext<OverflowManager | null>(null);

function useOverflowContext(): OverflowManager {
  const manager = useContext(OverflowContext);
  if (!manager) {
    throw new Error(
      "Overflow components must be rendered inside an <Overflow> provider."
    );
  }
  return manager;
}

const useIsomorphicLayoutEffect =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

export interface OverflowProps extends OverflowManagerOptions {
  /** A single element (e.g. a `Toolbar` or `div`) used as the measured container. */
  children: ReactElement;
}

/**
 * `<Overflow>` — provider + container binding. Clones its single child and
 * merges in the container ref (the Slot idiom the kit already uses for
 * composition), then observes that element. Pass the row itself as the child:
 *
 * ```tsx
 * <Overflow padding={16} minimumVisible={1}>
 *   <Toolbar aria-label="Formatting" className="w-full">…</Toolbar>
 * </Overflow>
 * ```
 */
function Overflow({
  children,
  overflowDirection = "end",
  overflowAxis = "horizontal",
  padding = 0,
  minimumVisible = 0,
  getSize,
  getGap,
  getOverflowSize,
}: OverflowProps) {
  const [manager] = useState(() =>
    createOverflowManager({
      overflowDirection,
      overflowAxis,
      padding,
      minimumVisible,
      getSize,
      getGap,
      getOverflowSize,
    })
  );

  // Keep the manager's options in sync with prop changes.
  useIsomorphicLayoutEffect(() => {
    manager.setOptions({
      overflowDirection,
      overflowAxis,
      padding,
      minimumVisible,
      getSize,
      getGap,
      getOverflowSize,
    });
  }, [
    manager,
    overflowDirection,
    overflowAxis,
    padding,
    minimumVisible,
    getSize,
    getGap,
    getOverflowSize,
  ]);

  // Subscribe so the provider itself re-renders on every snapshot change (the
  // item hooks alone re-render the children, not this component) — that is what
  // lets the safety-net layout effect below run *after* a visibility commit.
  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot
  );

  // Post-commit safety net: after a commit the DOM reflects the current
  // visibility, so a layout-effect read of the container's true extent
  // (`scrollWidth`) is accurate. If it still overruns, `settle()` hides one more
  // and the resulting commit re-runs this effect until the row genuinely fits
  // (hide-only, so it converges). No-ops when nothing overflows.
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
    throw new Error("<Overflow> expects a single element child.");
  }
  const mergedRef = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(child), containerRef),
    [child, containerRef]
  );

  return (
    <OverflowContext.Provider value={manager}>
      {cloneElement(child, {
        ref: mergedRef,
        "data-overflow-container": "",
      } as Record<string, unknown>)}
    </OverflowContext.Provider>
  );
}

export interface OverflowItemProps {
  id: string;
  priority?: number;
  pinned?: boolean;
  groupId?: string;
  /** Exactly one child element — it is registered, measured, and CSS-hidden. */
  children: ReactElement;
}

/**
 * `<OverflowItem>` — wraps exactly one element. Registers it on mount (with
 * `id`/`priority`/`pinned`/`groupId`), unregisters on unmount, and applies the
 * hidden treatment (inline `display:none` — inline wins over utility classes;
 * the element is never unmounted) when the snapshot says it overflowed. Stamps
 * `data-slot="overflow-item"` and `data-overflowing` (+ `aria-hidden`, since the
 * item is instead offered inside the overflow menu) when hidden.
 */
function OverflowItem({
  id,
  priority = 0,
  pinned = false,
  groupId,
  children,
}: OverflowItemProps) {
  const manager = useOverflowContext();
  const visible = useIsOverflowItemVisible(id);
  const elementRef = useRef<HTMLElement | null>(null);

  const captureRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      manager.setItemElement(id, element);
    },
    [manager, id]
  );

  useIsomorphicLayoutEffect(() => {
    manager.register({
      id,
      element: elementRef.current,
      priority,
      pinned,
      groupId,
    });
    return () => manager.unregister(id);
  }, [manager, id, priority, pinned, groupId]);

  const child = Children.only(children);
  if (!isValidElement(child)) {
    throw new Error("<OverflowItem> expects a single element child.");
  }
  const mergedRef = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(child), captureRef),
    [child, captureRef]
  );
  const childStyle = getChildStyle(child);

  return cloneElement(child, {
    ref: mergedRef,
    "data-slot": "overflow-item",
    "data-overflowing": visible ? undefined : "",
    "aria-hidden": visible ? undefined : true,
    style: visible ? childStyle : { ...childStyle, display: "none" },
  } as Record<string, unknown>);
}

export interface OverflowDividerProps {
  groupId: string;
  /** A single element (typically a `ToolbarSeparator`). */
  children: ReactElement;
}

/**
 * `<OverflowDivider>` — renders its child (e.g. a `ToolbarSeparator`) and hides
 * itself only when its group is **fully overflowed** (`state === "hidden"`) — a
 * separator with nothing left beside it. Stamps `data-slot="overflow-divider"`.
 * The divider **registers its element** with the manager (a non-ranked measured
 * participant): its width + gap count toward occupancy whenever its group has a
 * visible item, so the row's accounting is exact — no `padding` reserve needed.
 */
function OverflowDivider({ groupId, children }: OverflowDividerProps) {
  const manager = useOverflowContext();
  const state = useIsOverflowGroupVisible(groupId);
  const hidden = state === "hidden";
  const id = useId();
  const elementRef = useRef<HTMLElement | null>(null);

  const captureRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      manager.setDividerElement(id, element);
    },
    [manager, id]
  );

  useIsomorphicLayoutEffect(() => {
    manager.registerDivider(id, groupId, elementRef.current);
    return () => manager.unregister(id);
  }, [manager, id, groupId]);

  const child = Children.only(children);
  if (!isValidElement(child)) {
    throw new Error("<OverflowDivider> expects a single element child.");
  }
  const mergedRef = useMemo(
    () => mergeRefs<HTMLElement>(getChildRef(child), captureRef),
    [child, captureRef]
  );
  const childStyle = getChildStyle(child);

  return cloneElement(child, {
    ref: mergedRef,
    "data-slot": "overflow-divider",
    "data-overflowing": hidden ? "" : undefined,
    "aria-hidden": hidden ? true : undefined,
    style: hidden ? { ...childStyle, display: "none" } : childStyle,
  } as Record<string, unknown>);
}

/**
 * `useOverflowMenu()` — for the "…" trigger. Attach the returned `ref` to the
 * trigger element: the manager measures it and reserves its size from the budget
 * whenever anything overflows (so it never causes overflow itself). Returns
 * `overflowCount` and `isOverflowing`; the trigger should stamp
 * `data-overflow-menu` and be hidden (via CSS) when nothing overflows.
 *
 * **Keep the trigger measurable when hidden.** Unlike items (which are measured
 * once while visible, then cached), the trigger starts hidden, so hiding it with
 * `display:none` would leave it unmeasured. Hide it with `visibility:hidden` +
 * out-of-flow positioning (see the preview) so it stays measurable while not
 * consuming row width.
 */
export function useOverflowMenu<T extends HTMLElement = HTMLElement>(): {
  ref: (element: T | null) => void;
  overflowCount: number;
  isOverflowing: boolean;
} {
  const manager = useOverflowContext();
  const overflowCount = useOverflowCount();
  const ref = useCallback(
    (element: T | null) => manager.setOverflowMenu(element),
    [manager]
  );
  return { ref, overflowCount, isOverflowing: overflowCount > 0 };
}

/** Is item `id` currently visible in the row? (Server/first paint: `true`.) */
export function useIsOverflowItemVisible(id: string): boolean {
  const manager = useOverflowContext();
  return useSyncExternalStore(
    manager.subscribe,
    () => manager.getSnapshot().visibleItemIds.has(id),
    () => true
  );
}

/**
 * Derived visibility of a `groupId` (`"visible" | "overflow" | "hidden"`).
 * (Server/first paint: `"visible"`.) Drives `OverflowDivider` (hide on
 * `"hidden"`) and overflow-menu sections (render when not `"visible"`).
 */
export function useIsOverflowGroupVisible(groupId: string): OverflowGroupState {
  const manager = useOverflowContext();
  return useSyncExternalStore(
    manager.subscribe,
    () => manager.getSnapshot().groupStates[groupId] ?? "visible",
    () => "visible" as OverflowGroupState
  );
}

/** Number of items currently overflowed. (Server/first paint: `0`.) */
export function useOverflowCount(): number {
  const manager = useOverflowContext();
  return useSyncExternalStore(
    manager.subscribe,
    () => manager.getSnapshot().overflowCount,
    () => 0
  );
}

export { Overflow, OverflowItem, OverflowDivider };
