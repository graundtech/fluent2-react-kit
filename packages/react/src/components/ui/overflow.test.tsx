import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createOverflowManager,
  Overflow,
  OverflowDivider,
  OverflowItem,
  useIsOverflowGroupVisible,
  useIsOverflowItemVisible,
  useOverflowCount,
  useOverflowMenu,
  type OverflowManager,
  type OverflowManagerOptions,
} from "./overflow";

/**
 * jsdom has no layout (`offsetWidth === 0`) and no `ResizeObserver`. Following
 * the manager's design, every test injects a `getSize` so the measure/rank loop
 * runs on synthetic sizes, and a controllable `ResizeObserver` stub lets the
 * React binding tests drive resizes deterministically.
 *
 * - Core (`createOverflowManager`) tests use **real** jsdom elements appended in
 *   document order (so `compareDocumentPosition` gives a real DOM tie-break) with
 *   sizes from a `Map`, and call `manager.update()` directly.
 * - React binding tests read each element's `data-size` attribute through the
 *   `getSize` prop, and fire the observer stub inside `act`.
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

const managers: OverflowManager[] = [];

afterEach(() => {
  for (const manager of managers) manager.destroy();
  managers.length = 0;
  MockResizeObserver.instances.clear();
});

// ---------------------------------------------------------------------------
// Core manager helpers
// ---------------------------------------------------------------------------

interface AddOptions {
  priority?: number;
  pinned?: boolean;
  groupId?: string;
  size: number;
}

function makeCore(options: Partial<OverflowManagerOptions> = {}) {
  const sizes = new Map<HTMLElement, number>();
  const getSize = (element: HTMLElement) => sizes.get(element) ?? 0;
  const container = document.createElement("div");
  document.body.appendChild(container);

  // Synthetic gap + "true rendered extent" (jsdom has no layout for either).
  let gap = 0;
  let scroll = 0;
  const getGap = () => gap;
  const getOverflowSize = () => scroll;

  const manager = createOverflowManager({
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
    add(id: string, opts: AddOptions) {
      const element = document.createElement("button");
      element.setAttribute("data-id", id);
      container.appendChild(element);
      sizes.set(element, opts.size);
      manager.register({
        id,
        element,
        priority: opts.priority,
        pinned: opts.pinned,
        groupId: opts.groupId,
      });
      return element;
    },
    addDivider(id: string, groupId: string, size: number) {
      const element = document.createElement("hr");
      element.setAttribute("data-divider", id);
      container.appendChild(element);
      sizes.set(element, size);
      manager.registerDivider(id, groupId, element);
      return element;
    },
    addMenu(size: number) {
      const element = document.createElement("button");
      container.appendChild(element);
      sizes.set(element, size);
      manager.setOverflowMenu(element);
      return element;
    },
  };
}

function visibleIds(manager: OverflowManager): string[] {
  return [...manager.getSnapshot().visibleItemIds].sort();
}
function hiddenIds(manager: OverflowManager): string[] {
  return [...manager.getSnapshot().overflowItemIds].sort();
}

// ---------------------------------------------------------------------------
// Core: ranking, budget, floors, groups, store
// ---------------------------------------------------------------------------

describe("createOverflowManager — ranking & budget", () => {
  it("shows everything when it all fits (no overflow, no trigger)", () => {
    const c = makeCore();
    c.setContainerSize(1000);
    c.add("a", { size: 100 });
    c.add("b", { size: 100 });
    c.manager.update();

    expect(c.manager.getSnapshot().overflowCount).toBe(0);
    expect(c.manager.getSnapshot().hasOverflow).toBe(false);
    expect(visibleIds(c.manager)).toEqual(["a", "b"]);
  });

  it("hides the lowest-priority item first (priority beats DOM order)", () => {
    const c = makeCore();
    c.setContainerSize(250);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();

    expect(hiddenIds(c.manager)).toEqual(["c"]);
    expect(visibleIds(c.manager)).toEqual(["a", "b"]);
  });

  it("tie-breaks by DOM position — nearest the end hides first (direction end)", () => {
    const c = makeCore({ overflowDirection: "end" });
    c.setContainerSize(250);
    c.add("a", { size: 100 });
    c.add("b", { size: 100 });
    c.add("c", { size: 100 });
    c.manager.update();

    expect(hiddenIds(c.manager)).toEqual(["c"]); // last in DOM hides first
  });

  it("tie-breaks toward the start when overflowDirection is 'start'", () => {
    const c = makeCore({ overflowDirection: "start" });
    c.setContainerSize(250);
    c.add("a", { size: 100 });
    c.add("b", { size: 100 });
    c.add("c", { size: 100 });
    c.manager.update();

    expect(hiddenIds(c.manager)).toEqual(["a"]); // first in DOM hides first
  });

  it("never hides a pinned item, even at the lowest priority", () => {
    const c = makeCore();
    c.setContainerSize(150);
    c.add("a", { size: 100, priority: 0, pinned: true });
    c.add("b", { size: 100, priority: 10 });
    c.add("c", { size: 100, priority: 10 });
    c.manager.update();

    expect(visibleIds(c.manager)).toEqual(["a"]); // pinned survives, higher-priority go
    expect(hiddenIds(c.manager)).toEqual(["b", "c"]);
  });

  it("reserves the overflow trigger's width from the budget", () => {
    const withoutTrigger = makeCore();
    withoutTrigger.setContainerSize(250);
    withoutTrigger.add("a", { size: 100, priority: 3 });
    withoutTrigger.add("b", { size: 100, priority: 2 });
    withoutTrigger.add("c", { size: 100, priority: 1 });
    withoutTrigger.manager.update();
    // 250 budget → a,b fit, only c overflows.
    expect(visibleIds(withoutTrigger.manager)).toEqual(["a", "b"]);

    const withTrigger = makeCore();
    withTrigger.setContainerSize(250);
    withTrigger.add("a", { size: 100, priority: 3 });
    withTrigger.add("b", { size: 100, priority: 2 });
    withTrigger.add("c", { size: 100, priority: 1 });
    withTrigger.addMenu(60); // 250 - 60 = 190 budget → only a fits
    withTrigger.manager.update();

    expect(visibleIds(withTrigger.manager)).toEqual(["a"]);
    expect(withTrigger.manager.getSnapshot().overflowCount).toBe(2);
  });

  it("respects minimumVisible as a floor on non-pinned items", () => {
    const c = makeCore({ minimumVisible: 2 });
    c.setContainerSize(150); // only 1 item actually fits
    c.add("a", { size: 100, priority: 4 });
    c.add("b", { size: 100, priority: 3 });
    c.add("c", { size: 100, priority: 2 });
    c.add("d", { size: 100, priority: 1 });
    c.manager.update();

    // floor forces the 2 most-important items to stay (they clip, not vanish).
    expect(visibleIds(c.manager)).toEqual(["a", "b"]);
  });

  it("reappears items in reverse order of hiding as space grows", () => {
    const c = makeCore();
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });

    c.setContainerSize(350);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual([]); // all fit

    c.setContainerSize(250);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["c"]); // c hides first

    c.setContainerSize(150);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["b", "c"]); // then b

    c.setContainerSize(250);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["c"]); // b reappears before c

    c.setContainerSize(350);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual([]); // all back
  });

  it("uses the cached size of a hidden item when re-showing it", () => {
    const c = makeCore();
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });

    c.setContainerSize(150);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["b", "c"]);
    // b and c are now "hidden"; a real DOM node would report 0 while display:none.
    // The manager must keep their cached 100 to re-show accurately.
    c.setContainerSize(350);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual([]);
  });
});

describe("createOverflowManager — group states", () => {
  function fourItemsInTwoGroups(opts?: Partial<OverflowManagerOptions>) {
    const c = makeCore(opts);
    c.add("a", { size: 100, priority: 4, groupId: "g1" });
    c.add("b", { size: 100, priority: 3, groupId: "g1" });
    c.add("c", { size: 100, priority: 2, groupId: "g2" });
    c.add("d", { size: 100, priority: 1, groupId: "g2" });
    return c;
  }

  it("marks a group 'visible' when all its items show", () => {
    const c = fourItemsInTwoGroups();
    c.setContainerSize(1000);
    c.manager.update();
    expect(c.manager.getSnapshot().groupStates).toEqual({
      g1: "visible",
      g2: "visible",
    });
  });

  it("marks a group 'overflow' when only some items show", () => {
    const c = fourItemsInTwoGroups();
    c.setContainerSize(350); // a,b,c fit; d overflows
    c.manager.update();
    expect(c.manager.getSnapshot().groupStates.g2).toBe("overflow");
    expect(c.manager.getSnapshot().groupStates.g1).toBe("visible");
  });

  it("marks a group 'hidden' when all its items overflow", () => {
    const c = fourItemsInTwoGroups();
    c.setContainerSize(150); // only a fits
    c.manager.update();
    expect(c.manager.getSnapshot().groupStates.g2).toBe("hidden");
    expect(c.manager.getSnapshot().groupStates.g1).toBe("overflow");
  });
});

describe("createOverflowManager — store", () => {
  it("returns a referentially stable snapshot when nothing changes", () => {
    const c = makeCore();
    c.setContainerSize(250);
    c.add("a", { size: 100, priority: 2 });
    c.add("b", { size: 100, priority: 1 });
    c.manager.update();

    const first = c.manager.getSnapshot();
    c.manager.update(); // identical inputs → identical state
    expect(c.manager.getSnapshot()).toBe(first);
  });

  it("does not notify subscribers on a no-op update, but does on a real change", () => {
    const c = makeCore();
    c.setContainerSize(150); // only "a" fits → "b" overflows
    c.add("a", { size: 100, priority: 2 });
    c.add("b", { size: 100, priority: 1 });
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["b"]);

    const listener = vi.fn();
    const unsubscribe = c.manager.subscribe(listener);

    c.manager.update(); // no change
    expect(listener).not.toHaveBeenCalled();

    c.setContainerSize(1000); // now everything fits → state changes
    c.manager.update();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("recomputes after an item unregisters", () => {
    const c = makeCore();
    c.setContainerSize(250);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["c"]);

    c.manager.unregister("a"); // frees room
    expect(hiddenIds(c.manager)).toEqual([]);
    expect(visibleIds(c.manager)).toEqual(["b", "c"]);
  });

  it("keeps everything visible when the container is not measurable (SSR-safe path)", () => {
    const c = makeCore();
    c.setContainerSize(0); // unmeasured / display:none / server
    c.add("a", { size: 100, priority: 2 });
    c.add("b", { size: 100, priority: 1 });
    c.manager.update();
    expect(c.manager.getSnapshot().overflowCount).toBe(0);
    expect(visibleIds(c.manager)).toEqual(["a", "b"]);
  });

  it("supports the vertical axis without crashing", () => {
    const c = makeCore({ overflowAxis: "vertical" });
    c.setContainerSize(250);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual(["c"]);
  });

  it("applies option changes via setOptions", () => {
    const c = makeCore({ minimumVisible: 0 });
    c.setContainerSize(150);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();
    expect(visibleIds(c.manager)).toEqual(["a"]);

    c.manager.setOptions({ minimumVisible: 2 });
    expect(visibleIds(c.manager)).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Core: accurate space accounting (v1.1) — gaps, dividers, trigger gap share
// ---------------------------------------------------------------------------

describe("createOverflowManager — flex gap accounting", () => {
  it("counts the flex gap between visible slots when deciding what fits", () => {
    // 3×100 = 300 fits a 300 container with gap 0…
    const noGap = makeCore();
    noGap.setContainerSize(300);
    noGap.add("a", { size: 100, priority: 3 });
    noGap.add("b", { size: 100, priority: 2 });
    noGap.add("c", { size: 100, priority: 1 });
    noGap.manager.update();
    expect(hiddenIds(noGap.manager)).toEqual([]);

    // …but with a 20px gap the row needs 300 + 2×20 = 340 → one item must drop.
    const withGap = makeCore();
    withGap.setGap(20);
    withGap.setContainerSize(300);
    withGap.add("a", { size: 100, priority: 3 });
    withGap.add("b", { size: 100, priority: 2 });
    withGap.add("c", { size: 100, priority: 1 });
    withGap.manager.update();
    // a (100) + b (100) + one gap (20) = 220 ≤ 300; adding c needs another
    // 100 + 20 → 340 > 300, so c overflows.
    expect(hiddenIds(withGap.manager)).toEqual(["c"]);
  });

  it("reads the gap through the injectable getGap", () => {
    const c = makeCore({ getGap: () => 50 });
    c.setContainerSize(300);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();
    // a + b + one 50px gap = 250 ≤ 300; c would add 100 + 50 → 400 > 300.
    expect(hiddenIds(c.manager)).toEqual(["c"]);
  });
});

describe("createOverflowManager — divider cost participation", () => {
  it("counts a registered divider's width once its group has a visible item", () => {
    // Two groups of one item each (120), a 60px divider after g1.
    // Without the divider both fit in 300 (240). With it: 120 + 60 + 120 = 300.
    const c = makeCore();
    c.setContainerSize(290); // just under 300 → the divider tips it over
    c.add("a", { size: 120, priority: 2, groupId: "g1" });
    c.addDivider("d1", "g1", 60);
    c.add("b", { size: 120, priority: 1, groupId: "g2" });
    c.manager.update();
    // a (120) + its divider (60) = 180 ≤ 290; b would add 120 → 300 > 290.
    expect(hiddenIds(c.manager)).toEqual(["b"]);
  });

  it("does not count a divider whose group is fully hidden", () => {
    // g1's only item is low priority; when it hides, its divider stops counting.
    const c = makeCore();
    c.setContainerSize(200);
    c.add("a", { size: 120, priority: 1, groupId: "g1" }); // hides first
    c.addDivider("d1", "g1", 60);
    c.add("b", { size: 120, priority: 2, groupId: "g2" });
    c.manager.update();
    // b survives (higher priority); a overflows → g1 hidden → its divider drops.
    expect(hiddenIds(c.manager)).toEqual(["a"]);
    expect(visibleIds(c.manager)).toEqual(["b"]);
  });
});

describe("createOverflowManager — trigger gap share", () => {
  it("reserves both the trigger's width and its gap slot", () => {
    const c = makeCore();
    c.setGap(20);
    c.setContainerSize(250);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.addMenu(40);
    c.manager.update();
    // Overflow → trigger shows. Fitting "a" alone: 100 + trigger 40 + one gap
    // (2 slots) 20 = 160 ≤ 250. Adding "b": 200 + 40 + 2 gaps (3 slots) 40 =
    // 280 > 250 → only "a" fits.
    expect(visibleIds(c.manager)).toEqual(["a"]);
    expect(c.manager.getSnapshot().overflowCount).toBe(2);
  });
});

describe("createOverflowManager — post-layout safety net", () => {
  it("hides one more item when the container still truly overflows", () => {
    const c = makeCore();
    c.setContainerSize(300);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();
    // Accounting (gap 0) says all three fit.
    expect(hiddenIds(c.manager)).toEqual([]);

    // But reality (scrollWidth) overruns by 40px → one settle step hides c.
    c.setScroll(340);
    c.manager.settle();
    expect(hiddenIds(c.manager)).toEqual(["c"]);
  });

  it("is hide-only and converges, hiding one item per settle step (oscillation guard)", () => {
    const c = makeCore();
    c.setContainerSize(300);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();

    c.setScroll(500); // grossly over → net keeps hiding, one per step
    c.manager.settle();
    expect(hiddenIds(c.manager)).toEqual(["c"]);
    c.manager.settle();
    expect(hiddenIds(c.manager).sort()).toEqual(["b", "c"]);

    // Reality now fits → no further hiding, and it never SHOWS anything back.
    c.setScroll(100);
    c.manager.settle();
    expect(hiddenIds(c.manager).sort()).toEqual(["b", "c"]);
  });

  it("never hides below the pinned / minimumVisible floor, even if still overflowing", () => {
    const c = makeCore({ minimumVisible: 1 });
    c.setContainerSize(300);
    c.add("a", { size: 100, priority: 3, pinned: true });
    c.add("b", { size: 100, priority: 2 });
    c.manager.update();

    // Reality always overruns; the net may not drop the pinned "a" nor go below
    // the 1 non-pinned floor → "a" and "b" both stay no matter how many steps.
    c.setScroll(9999);
    for (let i = 0; i < 10; i++) c.manager.settle();
    expect(visibleIds(c.manager).sort()).toEqual(["a", "b"]);
  });

  it("resets the extra-hidden count when the container size actually changes", () => {
    const c = makeCore();
    c.setContainerSize(300);
    c.add("a", { size: 100, priority: 3 });
    c.add("b", { size: 100, priority: 2 });
    c.add("c", { size: 100, priority: 1 });
    c.manager.update();

    c.setScroll(340);
    c.manager.settle();
    expect(hiddenIds(c.manager)).toEqual(["c"]); // net hid one

    // A real resize to a width that fits everything clears the net's extra-hide.
    c.setContainerSize(1000);
    c.setScroll(300);
    c.manager.update();
    expect(hiddenIds(c.manager)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

const readSize = (element: HTMLElement) =>
  Number(element.getAttribute("data-size")) || 0;

function MenuTrigger() {
  const { ref, isOverflowing, overflowCount } = useOverflowMenu();
  return (
    <button
      ref={ref}
      data-size={60}
      data-overflow-menu=""
      aria-label="More commands"
      data-testid="menu"
      // Kept measurable while hidden (out of flow + invisible), not display:none.
      style={
        isOverflowing
          ? undefined
          : { position: "absolute", visibility: "hidden", pointerEvents: "none" }
      }
    >
      {overflowCount}
    </button>
  );
}

function Probe() {
  const count = useOverflowCount();
  const g2 = useIsOverflowGroupVisible("g2");
  const aVisible = useIsOverflowItemVisible("a");
  return (
    <div data-testid="probe">{`${count}|${g2}|${aVisible ? "a-vis" : "a-hid"}`}</div>
  );
}

function Bar({
  width,
  minimumVisible = 0,
  padding = 0,
  withMenu = false,
  withProbe = false,
}: {
  width: number;
  minimumVisible?: number;
  padding?: number;
  withMenu?: boolean;
  withProbe?: boolean;
}) {
  return (
    <Overflow getSize={readSize} minimumVisible={minimumVisible} padding={padding}>
      <div role="toolbar" aria-label="Test bar" data-size={width}>
        <OverflowItem id="a" priority={3} groupId="g1">
          <button data-size={100} aria-label="a">
            a
          </button>
        </OverflowItem>
        <OverflowItem id="b" priority={2} groupId="g1">
          <button data-size={100} aria-label="b">
            b
          </button>
        </OverflowItem>
        <OverflowDivider groupId="g1">
          <div data-testid="divider-g1" />
        </OverflowDivider>
        <OverflowItem id="c" priority={1} groupId="g2">
          <button data-size={100} aria-label="c">
            c
          </button>
        </OverflowItem>
        {withMenu ? <MenuTrigger /> : null}
        {withProbe ? <Probe /> : null}
      </div>
    </Overflow>
  );
}

describe("Overflow — React bindings", () => {
  it("shows all items in a wide container", () => {
    render(<Bar width={1000} />);
    act(() => triggerResize());

    for (const id of ["a", "b", "c"]) {
      expect(screen.getByLabelText(id)).not.toHaveAttribute("data-overflowing");
    }
  });

  // Regression: StrictMode's dev-only unmount/remount double-invoke destroys
  // the useState-held manager on the simulated unmount; the re-run's item
  // registrations and container re-attach must revive it, or every item reads
  // an empty snapshot and hides (found live by the ribbon build).
  it("survives StrictMode's dev double-mount (destroyed manager revives)", () => {
    render(
      <StrictMode>
        <Bar width={1000} withProbe />
      </StrictMode>
    );
    act(() => triggerResize());

    for (const id of ["a", "b", "c"]) {
      expect(screen.getByLabelText(id)).not.toHaveAttribute("data-overflowing");
    }
    // The snapshot pipeline is alive too: probe reports zero overflow.
    expect(screen.getByTestId("probe")).toHaveTextContent("0|visible|a-vis");
  });

  // Same regression at the core level: destroy is disposal, not a tombstone.
  it("createOverflowManager revives after destroy on new registrations", () => {
    const core = makeCore();
    core.setContainerSize(1000);
    core.add("x", { size: 100 });
    core.manager.update();
    expect(core.manager.getSnapshot().visibleItemIds.has("x")).toBe(true);

    core.manager.destroy();
    core.add("y", { size: 100 });
    core.manager.setContainer(core.container);
    core.manager.update();
    expect(core.manager.getSnapshot().visibleItemIds.has("y")).toBe(true);
  });

  it("hides the overflowing item and stamps data-slot/data-overflowing", () => {
    render(<Bar width={250} />);
    act(() => triggerResize());

    const c = screen.getByLabelText("c");
    expect(c).toHaveAttribute("data-slot", "overflow-item");
    expect(c).toHaveAttribute("data-overflowing");
    expect(c).toHaveStyle({ display: "none" });
    expect(c).toHaveAttribute("aria-hidden", "true");

    const a = screen.getByLabelText("a");
    expect(a).not.toHaveAttribute("data-overflowing");
    expect(a).not.toHaveStyle({ display: "none" });
  });

  it("updates visibility when the container resizes", () => {
    const { rerender } = render(<Bar width={1000} />);
    act(() => triggerResize());
    expect(screen.getByLabelText("c")).not.toHaveAttribute("data-overflowing");

    rerender(<Bar width={250} />);
    act(() => triggerResize());
    expect(screen.getByLabelText("c")).toHaveAttribute("data-overflowing");
  });

  it("hides the group divider only when its group is fully overflowed", () => {
    const { rerender } = render(<Bar width={1000} />);
    act(() => triggerResize());
    expect(screen.getByTestId("divider-g1")).toHaveAttribute(
      "data-slot",
      "overflow-divider"
    );
    expect(screen.getByTestId("divider-g1")).not.toHaveAttribute(
      "data-overflowing"
    );

    rerender(<Bar width={50} />); // nothing fits → g1 fully overflowed
    act(() => triggerResize());
    expect(screen.getByTestId("divider-g1")).toHaveAttribute("data-overflowing");
    expect(screen.getByTestId("divider-g1")).toHaveStyle({ display: "none" });
  });

  it("exposes overflow count and group state through hooks", () => {
    const { rerender } = render(<Bar width={1000} withProbe />);
    act(() => triggerResize());
    expect(screen.getByTestId("probe")).toHaveTextContent("0|visible|a-vis");

    rerender(<Bar width={150} withProbe />); // only a fits → g2 hidden
    act(() => triggerResize());
    expect(screen.getByTestId("probe")).toHaveTextContent("2|hidden|a-vis");
  });

  it("budgets the overflow menu trigger and reports isOverflowing", () => {
    const { rerender } = render(<Bar width={1000} withMenu />);
    act(() => triggerResize());
    // Wide: nothing overflows, trigger reports 0.
    expect(screen.getByTestId("menu")).toHaveTextContent("0");

    rerender(<Bar width={250} withMenu />);
    act(() => triggerResize());
    // 250 - 60 (trigger) = 190 budget → only "a" fits, b & c overflow.
    expect(screen.getByTestId("menu")).toHaveTextContent("2");
    expect(screen.getByLabelText("b")).toHaveAttribute("data-overflowing");
    expect(screen.getByLabelText("c")).toHaveAttribute("data-overflowing");
  });

  it("keeps everything visible when the container is unmeasurable (SSR-safe)", () => {
    render(<Bar width={0} />); // getSize(container) === 0
    act(() => triggerResize());
    for (const id of ["a", "b", "c"]) {
      expect(screen.getByLabelText(id)).not.toHaveAttribute("data-overflowing");
    }
  });

  it("throws a helpful error when a part is used without a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <OverflowItem id="x">
          <button aria-label="x">x</button>
        </OverflowItem>
      )
    ).toThrow(/inside an <Overflow> provider/);
    spy.mockRestore();
  });
});

describe("Overflow — accessibility", () => {
  it("has no axe violations with everything visible", async () => {
    const { container } = render(<Bar width={1000} withMenu />);
    act(() => triggerResize());
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations in an overflowed state", async () => {
    const { container } = render(<Bar width={250} withMenu />);
    act(() => triggerResize());
    await expect(container).toHaveNoAxeViolations();
  });
});
