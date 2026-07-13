import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createGroupCollapseManager,
  GroupCollapse,
  CollapseGroup,
  useGroupMode,
  useIsScrollMode,
  type GroupCollapseManager,
  type GroupCollapseManagerOptions,
} from "./ribbon-collapse";

/**
 * jsdom has no layout (`offsetWidth === 0`) and no `ResizeObserver`. Mirroring
 * `overflow.test.tsx`, every test injects a `getSize` so the measure/collapse
 * loop runs on synthetic sizes, and a controllable `ResizeObserver` stub lets the
 * React binding tests drive resizes deterministically.
 *
 * - Core (`createGroupCollapseManager`) tests use **real** jsdom elements
 *   appended in document order (so `compareDocumentPosition` gives a real DOM
 *   tie-break) with sizes from a `Map`, and call `manager.update()` directly.
 * - React binding tests read each form's `data-size` attribute through the
 *   `getSize` prop, and fire the observer stub inside `act`.
 *
 * Because a group's collapsed form is `display:none` (size 0) until it collapses,
 * accounting tests pass `collapsedEstimate` equal to the synthetic collapsed size
 * so the predictive loop matches reality on the first pass (no measure-cycle
 * dependence); a dedicated caching test exercises the estimate → measured
 * transition.
 */
class MockResizeObserver {
  static instances = new Set<MockResizeObserver>();
  private cb: ResizeObserverCallback;
  disconnected = false;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    MockResizeObserver.instances.add(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
    MockResizeObserver.instances.delete(this);
  }
  fire() {
    this.cb([], this as unknown as ResizeObserver);
  }
}

function triggerResize() {
  for (const instance of MockResizeObserver.instances) {
    if (!instance.disconnected) instance.fire();
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

const managers: GroupCollapseManager[] = [];

afterEach(() => {
  for (const manager of managers) manager.destroy();
  managers.length = 0;
  MockResizeObserver.instances.clear();
});

// ---------------------------------------------------------------------------
// Core manager helpers
// ---------------------------------------------------------------------------

interface AddGroupOptions {
  collapsePriority?: number;
  expandedSize: number;
  collapsedSize: number;
}

function makeCore(options: Partial<GroupCollapseManagerOptions> = {}) {
  const sizes = new Map<HTMLElement, number>();
  const getSize = (element: HTMLElement) => sizes.get(element) ?? 0;
  const container = document.createElement("div");
  document.body.appendChild(container);

  // Synthetic gap + "true rendered extent" (jsdom has no layout for either).
  let gap = 0;
  let scroll = 0;
  const getGap = () => gap;
  const getOverflowSize = () => scroll;

  const manager = createGroupCollapseManager({
    getSize,
    getGap,
    getOverflowSize,
    ...options,
  });
  managers.push(manager);
  manager.setContainer(container);

  return {
    manager,
    container,
    setContainerSize(size: number) {
      sizes.set(container, size);
    },
    setGap(value: number) {
      gap = value;
    },
    /** Sets the synthetic `scrollWidth` the safety net reads via getOverflowSize. */
    setScroll(value: number) {
      scroll = value;
    },
    addGroup(groupId: string, opts: AddGroupOptions) {
      const expandedElement = document.createElement("div");
      expandedElement.setAttribute("data-group", groupId);
      expandedElement.setAttribute("data-form", "expanded");
      container.appendChild(expandedElement);
      sizes.set(expandedElement, opts.expandedSize);

      const collapsedElement = document.createElement("button");
      collapsedElement.setAttribute("data-group", groupId);
      collapsedElement.setAttribute("data-form", "collapsed");
      container.appendChild(collapsedElement);
      sizes.set(collapsedElement, opts.collapsedSize);

      manager.registerGroup({
        groupId,
        collapsePriority: opts.collapsePriority,
        expandedElement,
        collapsedElement,
      });
      return { expandedElement, collapsedElement };
    },
  };
}

function modeOf(manager: GroupCollapseManager, groupId: string) {
  return manager.getSnapshot().groupModes[groupId];
}
function collapsedIds(manager: GroupCollapseManager): string[] {
  const modes = manager.getSnapshot().groupModes;
  return Object.keys(modes)
    .filter((id) => modes[id] === "collapsed")
    .sort();
}

// ---------------------------------------------------------------------------
// Core: collapse ladder & ordering
// ---------------------------------------------------------------------------

describe("createGroupCollapseManager — collapse ladder", () => {
  // Word Home tab priorities: Parágrafo (50) collapses before Fonte (40),
  // despite Fonte sitting earlier in DOM order. Trailing groups never collapse.
  function wordLikeBand(opts?: Partial<GroupCollapseManagerOptions>) {
    const c = makeCore({ collapsedEstimate: 80, ...opts });
    c.addGroup("clipboard", { collapsePriority: 10, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("font", { collapsePriority: 40, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("paragraph", { collapsePriority: 50, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("styles", { collapsePriority: 30, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("editing", { collapsePriority: 20, expandedSize: 200, collapsedSize: 80 });
    return c;
  }

  it("expands everything when it all fits", () => {
    const c = wordLikeBand();
    c.setContainerSize(1000); // 5×200 = 1000
    c.manager.update();
    expect(c.manager.getSnapshot().scrollMode).toBe(false);
    expect(collapsedIds(c.manager)).toEqual([]);
  });

  it("collapses the highest-collapsePriority group first (priority beats DOM order)", () => {
    const c = wordLikeBand();
    c.setContainerSize(900); // 1000 > 900 → collapse 1
    c.manager.update();
    // Parágrafo (50) is the highest priority → it collapses first, not Fonte.
    expect(collapsedIds(c.manager)).toEqual(["paragraph"]);
    expect(modeOf(c.manager, "font")).toBe("expanded");
  });

  it("collapses Fonte second, matching the Word ladder", () => {
    const c = wordLikeBand();
    c.setContainerSize(800);
    c.manager.update();
    // occupancy(1) = 4×200 + 80 = 880 > 800 → collapse 2nd = Fonte (40).
    expect(collapsedIds(c.manager)).toEqual(["font", "paragraph"]);
    expect(modeOf(c.manager, "clipboard")).toBe("expanded");
    expect(modeOf(c.manager, "styles")).toBe("expanded");
    expect(modeOf(c.manager, "editing")).toBe("expanded");
  });

  it("collapses in strict collapsePriority order as it shrinks further", () => {
    const c = wordLikeBand();
    c.setContainerSize(500); // needs many collapsed
    c.manager.update();
    // Order by priority desc: paragraph(50), font(40), styles(30), editing(20),
    // clipboard(10). Greedy collapses that prefix until it fits.
    // occ(3)=2×200+3×80=640>500; occ(4)=200+4×80=520>500; occ(5)=5×80=400<=500.
    expect(collapsedIds(c.manager).length).toBe(5);
    expect(c.manager.getSnapshot().scrollMode).toBe(false);
  });

  it("un-collapses groups in reverse order as space grows back", () => {
    const c = wordLikeBand();
    c.setContainerSize(800);
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual(["font", "paragraph"]);

    c.setContainerSize(900);
    c.manager.update();
    // Fonte (collapsed last) restores first → only Parágrafo stays collapsed.
    expect(collapsedIds(c.manager)).toEqual(["paragraph"]);

    c.setContainerSize(1000);
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual([]);
  });

  it("sets scrollMode when all groups are collapsed and it still overflows", () => {
    const c = wordLikeBand();
    c.setContainerSize(300); // all-collapsed occupancy = 5×80 = 400 > 300
    c.manager.update();
    expect(collapsedIds(c.manager).length).toBe(5);
    expect(c.manager.getSnapshot().scrollMode).toBe(true);
  });

  it("clears scrollMode once the band fits again", () => {
    const c = wordLikeBand();
    c.setContainerSize(300);
    c.manager.update();
    expect(c.manager.getSnapshot().scrollMode).toBe(true);

    c.setContainerSize(1000);
    c.manager.update();
    expect(c.manager.getSnapshot().scrollMode).toBe(false);
    expect(collapsedIds(c.manager)).toEqual([]);
  });

  it("tie-breaks equal priorities by DOM position (later collapses first)", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(500);
    c.addGroup("a", { collapsePriority: 5, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 5, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 5, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();
    // occ(0)=600>500 → collapse 1; equal priority → later-in-DOM "c" first.
    expect(collapsedIds(c.manager)).toEqual(["c"]);
  });
});

// ---------------------------------------------------------------------------
// Core: accurate space accounting (gap, padding, container padding)
// ---------------------------------------------------------------------------

describe("createGroupCollapseManager — space accounting", () => {
  it("counts the flex gap between group slots when deciding what fits", () => {
    // Note: every group always occupies one slot (collapsed or expanded), so the
    // gap total `gap × (n−1)` is constant — collapsing only removes the
    // expanded↔collapsed size delta, never a gap.
    const noGap = makeCore({ collapsedEstimate: 40 });
    noGap.setContainerSize(300);
    noGap.addGroup("a", { collapsePriority: 1, expandedSize: 100, collapsedSize: 40 });
    noGap.addGroup("b", { collapsePriority: 2, expandedSize: 100, collapsedSize: 40 });
    noGap.addGroup("c", { collapsePriority: 3, expandedSize: 100, collapsedSize: 40 });
    noGap.manager.update();
    expect(collapsedIds(noGap.manager)).toEqual([]); // 300 fits exactly

    const withGap = makeCore({ collapsedEstimate: 40 });
    withGap.setGap(30);
    withGap.setContainerSize(300);
    withGap.addGroup("a", { collapsePriority: 1, expandedSize: 100, collapsedSize: 40 });
    withGap.addGroup("b", { collapsePriority: 2, expandedSize: 100, collapsedSize: 40 });
    withGap.addGroup("c", { collapsePriority: 3, expandedSize: 100, collapsedSize: 40 });
    withGap.manager.update();
    // 300 + 2×30 gap = 360 > 300 → collapse the highest-priority group (c):
    // occ(1) = 40 + 100 + 100 + 60 gap = 300 ≤ 300, so only c collapses.
    expect(collapsedIds(withGap.manager)).toEqual(["c"]);
  });

  it("reads the gap through the injectable getGap", () => {
    const c = makeCore({ collapsedEstimate: 40, getGap: () => 20 });
    c.setContainerSize(300);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 100, collapsedSize: 40 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 100, collapsedSize: 40 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 100, collapsedSize: 40 });
    c.manager.update();
    // 300 + 2×20 = 340 > 300 → occ(1) = 40 + 200 + 40 gap = 280 ≤ 300 → c collapses.
    expect(collapsedIds(c.manager)).toEqual(["c"]);
  });

  it("subtracts the consumer padding slack from available space", () => {
    const c = makeCore({ collapsedEstimate: 80, padding: 60 });
    c.setContainerSize(300);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 100, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 100, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 100, collapsedSize: 80 });
    c.manager.update();
    // available = 300 - 60 = 240; 3×100 = 300 > 240 → collapse until it fits.
    // occ(1) = 2×100 + 80 = 280 > 240; occ(2) = 100 + 160 = 260 > 240;
    // occ(3) = 240 <= 240 → all three collapse.
    expect(collapsedIds(c.manager).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Core: caching & optimistic estimate
// ---------------------------------------------------------------------------

describe("createGroupCollapseManager — caching & estimate", () => {
  it("caches a collapsed form's measured size (used over the estimate) once it is active", () => {
    // Estimate 0 (default): predictively, collapsing b frees its whole width, so
    // occ would be a(200) ≤ 250 and only b collapses. But once b is collapsed its
    // collapsed form is measured (120) and cached, so the real occupancy is
    // a(200) + b(120) = 320 > 250 and a collapses too — proving the *measured*
    // 120 is used, not the estimate 0.
    const c = makeCore();
    c.setContainerSize(250);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 120 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 120 });
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual(["a", "b"]);
  });

  it("keeps everything expanded when the container is not measurable (SSR-safe)", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(0);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual([]);
    expect(c.manager.getSnapshot().scrollMode).toBe(false);
  });

  it("supports the vertical axis without crashing", () => {
    const c = makeCore({ axis: "vertical", collapsedEstimate: 80 });
    c.setContainerSize(300);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();
    // 400 > 300 → collapse highest priority (b).
    expect(collapsedIds(c.manager)).toEqual(["b"]);
  });

  it("applies option changes via setOptions", () => {
    const c = makeCore({ collapsedEstimate: 80, padding: 0 });
    c.setContainerSize(300);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 100, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 100, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 100, collapsedSize: 80 });
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual([]); // 300 fits

    c.manager.setOptions({ padding: 60 }); // available 240 → collapse
    expect(collapsedIds(c.manager).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Core: store (referential stability, notifications)
// ---------------------------------------------------------------------------

describe("createGroupCollapseManager — store", () => {
  it("returns a referentially stable snapshot when nothing changes", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(900);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();

    const first = c.manager.getSnapshot();
    c.manager.update(); // identical inputs → identical state
    expect(c.manager.getSnapshot()).toBe(first);
  });

  it("does not notify on a no-op update, but does on a real change", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(300); // 400 > 300 → one collapses
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual(["b"]);

    const listener = vi.fn();
    const unsubscribe = c.manager.subscribe(listener);

    c.manager.update(); // no change
    expect(listener).not.toHaveBeenCalled();

    c.setContainerSize(1000); // now everything fits → state changes
    c.manager.update();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("recomputes after a group unregisters", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(500);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();
    expect(collapsedIds(c.manager).length).toBeGreaterThan(0);

    c.manager.unregisterGroup("a"); // frees a whole group's width
    // Two groups left, 400 <= 500 → nothing needs to collapse.
    expect(collapsedIds(c.manager)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Core: post-layout safety net
// ---------------------------------------------------------------------------

describe("createGroupCollapseManager — post-layout safety net", () => {
  it("collapses one more group when the container still truly overflows", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(600);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();
    // Accounting (gap 0) says 600 fits all three.
    expect(collapsedIds(c.manager)).toEqual([]);

    // But reality (scrollWidth) overruns → one settle step collapses c (highest).
    c.setScroll(650);
    c.manager.settle();
    expect(collapsedIds(c.manager)).toEqual(["c"]);
  });

  it("is collapse-only and converges, one group per settle step (oscillation guard)", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(600);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();

    c.setScroll(900); // grossly over → keeps collapsing, one per step
    c.manager.settle();
    expect(collapsedIds(c.manager)).toEqual(["c"]);
    c.manager.settle();
    expect(collapsedIds(c.manager)).toEqual(["b", "c"]);

    // Reality now fits → no further collapsing, and it never un-collapses.
    c.setScroll(100);
    c.manager.settle();
    expect(collapsedIds(c.manager)).toEqual(["b", "c"]);
  });

  it("escalates to scrollMode when all groups are collapsed and it still overflows", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(600);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();

    c.setScroll(9999); // always overflowing
    // Collapse both, then the next settle can only escalate to scroll.
    c.manager.settle();
    c.manager.settle();
    expect(collapsedIds(c.manager)).toEqual(["a", "b"]);
    c.manager.settle();
    expect(c.manager.getSnapshot().scrollMode).toBe(true);
  });

  it("resets the extra-collapse count when the container size actually changes", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(600);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("c", { collapsePriority: 3, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();

    c.setScroll(650);
    c.manager.settle();
    expect(collapsedIds(c.manager)).toEqual(["c"]); // net collapsed one

    // A real resize to a width that fits everything clears the net's extra-collapse.
    c.setContainerSize(1000);
    c.setScroll(600);
    c.manager.update();
    expect(collapsedIds(c.manager)).toEqual([]);
    expect(c.manager.getSnapshot().scrollMode).toBe(false);
  });

  it("is capped and never loops past all groups collapsed", () => {
    const c = makeCore({ collapsedEstimate: 80 });
    c.setContainerSize(600);
    c.addGroup("a", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    c.addGroup("b", { collapsePriority: 2, expandedSize: 200, collapsedSize: 80 });
    c.manager.update();

    c.setScroll(9999);
    for (let i = 0; i < 20; i++) c.manager.settle();
    // All collapsed + scrollMode; no crash, no runaway.
    expect(collapsedIds(c.manager)).toEqual(["a", "b"]);
    expect(c.manager.getSnapshot().scrollMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Core: StrictMode-style revival
// ---------------------------------------------------------------------------

describe("createGroupCollapseManager — lifecycle", () => {
  it("revives after destroy on new registrations (destroy is disposal, not a tombstone)", () => {
    const core = makeCore({ collapsedEstimate: 80 });
    core.setContainerSize(1000);
    core.addGroup("x", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    core.manager.update();
    expect(modeOf(core.manager, "x")).toBe("expanded");

    core.manager.destroy();
    core.addGroup("y", { collapsePriority: 1, expandedSize: 200, collapsedSize: 80 });
    core.manager.setContainer(core.container);
    core.manager.update();
    expect(modeOf(core.manager, "y")).toBe("expanded");
  });
});

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

const readSize = (element: HTMLElement) =>
  Number(element.getAttribute("data-size")) || 0;

interface GroupModel {
  id: string;
  label: string;
  collapsePriority: number;
}

const BAND_GROUPS: GroupModel[] = [
  { id: "clipboard", label: "Clipboard", collapsePriority: 10 },
  { id: "font", label: "Font", collapsePriority: 40 },
  { id: "paragraph", label: "Paragraph", collapsePriority: 50 },
  { id: "styles", label: "Styles", collapsePriority: 30 },
  { id: "editing", label: "Editing", collapsePriority: 20 },
];

function Probe() {
  const paragraph = useGroupMode("paragraph");
  const font = useGroupMode("font");
  const scroll = useIsScrollMode();
  return (
    <div data-testid="probe">{`${paragraph}|${font}|${scroll ? "scroll" : "no-scroll"}`}</div>
  );
}

function Band({
  width,
  withProbe = false,
}: {
  width: number;
  withProbe?: boolean;
}) {
  return (
    <GroupCollapse getSize={readSize} collapsedEstimate={80}>
      <div
        role="toolbar"
        aria-label="Home"
        data-size={width}
        data-testid="band"
      >
        {BAND_GROUPS.map((group) => (
          <CollapseGroup
            key={group.id}
            groupId={group.id}
            collapsePriority={group.collapsePriority}
            expanded={
              <div data-size={200} aria-label={`${group.label} group`}>
                <button aria-label={`${group.label} command`}>c</button>
              </div>
            }
            collapsed={
              <button data-size={80} aria-label={`${group.label} (collapsed)`}>
                {group.label}
              </button>
            }
          />
        ))}
        {withProbe ? <Probe /> : null}
      </div>
    </GroupCollapse>
  );
}

function modeAttr(container: HTMLElement, groupId: string) {
  return container
    .querySelector(`[data-slot="collapse-group"][data-group-id="${groupId}"]`)
    ?.getAttribute("data-mode");
}

describe("GroupCollapse — React bindings", () => {
  it("keeps all groups expanded in a wide container", () => {
    const { container } = render(<Band width={1000} />);
    act(() => triggerResize());
    for (const group of BAND_GROUPS) {
      expect(modeAttr(container, group.id)).toBe("expanded");
    }
    expect(screen.getByTestId("band")).not.toHaveAttribute("data-scroll-mode");
  });

  it("collapses Parágrafo first, then Fonte, as it narrows (Word ladder)", () => {
    const { container, rerender } = render(<Band width={900} />);
    act(() => triggerResize());
    expect(modeAttr(container, "paragraph")).toBe("collapsed");
    expect(modeAttr(container, "font")).toBe("expanded");

    rerender(<Band width={800} />);
    act(() => triggerResize());
    expect(modeAttr(container, "paragraph")).toBe("collapsed");
    expect(modeAttr(container, "font")).toBe("collapsed");
    expect(modeAttr(container, "clipboard")).toBe("expanded");
  });

  it("toggles each form's display and stamps data-mode / data-collapse-form", () => {
    const { container } = render(<Band width={900} />);
    act(() => triggerResize());

    const paragraph = container.querySelector(
      `[data-slot="collapse-group"][data-group-id="paragraph"]`
    )!;
    const expandedForm = paragraph.querySelector(`[data-collapse-form="expanded"]`);
    const collapsedForm = paragraph.querySelector(`[data-collapse-form="collapsed"]`);
    expect(expandedForm).toHaveStyle({ display: "none" });
    expect(collapsedForm).not.toHaveStyle({ display: "none" });
    expect(expandedForm).toHaveAttribute("aria-hidden", "true");

    const clipboard = container.querySelector(
      `[data-slot="collapse-group"][data-group-id="clipboard"]`
    )!;
    expect(
      clipboard.querySelector(`[data-collapse-form="expanded"]`)
    ).not.toHaveStyle({ display: "none" });
    expect(clipboard.querySelector(`[data-collapse-form="collapsed"]`)).toHaveStyle(
      { display: "none" }
    );
  });

  it("stamps data-scroll-mode on the container at the narrow end", () => {
    render(<Band width={300} />); // all-collapsed occupancy 400 > 300
    act(() => triggerResize());
    expect(screen.getByTestId("band")).toHaveAttribute("data-scroll-mode");
  });

  it("exposes group modes and scroll mode through hooks", () => {
    const { rerender } = render(<Band width={1000} withProbe />);
    act(() => triggerResize());
    expect(screen.getByTestId("probe")).toHaveTextContent(
      "expanded|expanded|no-scroll"
    );

    rerender(<Band width={800} withProbe />);
    act(() => triggerResize());
    expect(screen.getByTestId("probe")).toHaveTextContent(
      "collapsed|collapsed|no-scroll"
    );

    rerender(<Band width={300} withProbe />);
    act(() => triggerResize());
    expect(screen.getByTestId("probe")).toHaveTextContent(
      "collapsed|collapsed|scroll"
    );
  });

  it("updates modes when the container resizes back up", () => {
    const { container, rerender } = render(<Band width={800} />);
    act(() => triggerResize());
    expect(modeAttr(container, "font")).toBe("collapsed");

    rerender(<Band width={1000} />);
    act(() => triggerResize());
    for (const group of BAND_GROUPS) {
      expect(modeAttr(container, group.id)).toBe("expanded");
    }
  });

  // Regression (found live by the v1 ribbon build): StrictMode's dev-only
  // unmount/remount double-invoke destroys the useState-held manager on the
  // simulated unmount; the re-run's registrations + container re-attach must
  // revive it, or every group reads an empty snapshot.
  it("survives StrictMode's dev double-mount (destroyed manager revives)", () => {
    const { container } = render(
      <StrictMode>
        <Band width={1000} withProbe />
      </StrictMode>
    );
    act(() => triggerResize());
    for (const group of BAND_GROUPS) {
      expect(modeAttr(container, group.id)).toBe("expanded");
    }
    expect(screen.getByTestId("probe")).toHaveTextContent(
      "expanded|expanded|no-scroll"
    );
  });

  it("throws a helpful error when a part is used without a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <CollapseGroup
          groupId="x"
          expanded={<div>x</div>}
          collapsed={<button>x</button>}
        />
      )
    ).toThrow(/inside a <GroupCollapse> provider/);
    spy.mockRestore();
  });
});

describe("GroupCollapse — accessibility", () => {
  it("has no axe violations with all groups expanded", async () => {
    const { container } = render(<Band width={1000} />);
    act(() => triggerResize());
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations with groups collapsed", async () => {
    const { container } = render(<Band width={800} />);
    act(() => triggerResize());
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations in scroll mode", async () => {
    const { container } = render(<Band width={300} />);
    act(() => triggerResize());
    await expect(container).toHaveNoAxeViolations();
  });
});
