import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Ribbon,
  RibbonColumn,
  RibbonContent,
  RibbonGroup,
  RibbonItem,
  RibbonLargeButton,
  RibbonRow,
  RibbonSeparator,
  RibbonTab,
  RibbonTabList,
} from "./ribbon";
import { Toggle } from "./toggle";
import { ToolbarButton } from "./toolbar";

/**
 * jsdom has no layout (`offsetWidth === 0`) and no `ResizeObserver`. Base UI's
 * composite roots (Tabs/Toolbar) attach listeners that expect `ResizeObserver`
 * to exist, and the kit `Overflow` manager drives its measure loop from one —
 * so we install a *fireable* stub (the exact pattern `overflow.test.tsx` uses)
 * and, wherever a test needs real overflow, inject a `getSize` that reads
 * synthetic sizes off attributes, then fire the observer inside `act`.
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

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const Icon = () => <svg data-testid="icon" viewBox="0 0 20 20" aria-hidden />;

/**
 * A synthetic-size getSize: the container reports the closed-over width, the
 * "…" trigger a fixed 40, and every item its `data-size` attribute. Callers set
 * sizes on the item buttons and vary `state.width`.
 */
function makeGetSize(state: { width: number }) {
  return (el: HTMLElement) => {
    if (el.getAttribute("data-overflow-container") !== null) return state.width;
    if (el.getAttribute("data-slot") === "ribbon-overflow-trigger") return 40;
    return Number(el.getAttribute("data-size")) || 0;
  };
}

/** Home tab with two groups (Font: bold/italic/underline, Paragraph: bullets/align). */
function HomeRibbon({
  width = 1000,
  onBold,
  onBullets,
  ...ribbonProps
}: {
  width?: number;
  onBold?: () => void;
  onBullets?: () => void;
} & Partial<React.ComponentProps<typeof Ribbon>>) {
  const state = { width };
  return (
    <Ribbon defaultValue="home" {...ribbonProps}>
      <RibbonTabList aria-label="Ribbon">
        <RibbonTab value="home">Home</RibbonTab>
        <RibbonTab value="insert">Insert</RibbonTab>
      </RibbonTabList>

      <RibbonContent value="home" getSize={makeGetSize(state)}>
        <RibbonGroup groupId="font" label="Font">
          <RibbonItem
            id="bold"
            label="Bold"
            icon={<Icon />}
            priority={80}
            pinned
            onSelect={onBold}
          >
            <ToolbarButton size="icon" aria-label="Bold" data-size={100}>
              B
            </ToolbarButton>
          </RibbonItem>
          <RibbonItem id="italic" label="Italic" icon={<Icon />} priority={70}>
            <ToolbarButton size="icon" aria-label="Italic" data-size={100}>
              I
            </ToolbarButton>
          </RibbonItem>
          <RibbonItem
            id="underline"
            label="Underline"
            icon={<Icon />}
            priority={60}
          >
            <ToolbarButton size="icon" aria-label="Underline" data-size={100}>
              U
            </ToolbarButton>
          </RibbonItem>
        </RibbonGroup>

        <RibbonGroup groupId="paragraph" label="Paragraph">
          <RibbonItem
            id="bullets"
            label="Bullets"
            icon={<Icon />}
            priority={50}
            onSelect={onBullets}
          >
            <ToolbarButton size="icon" aria-label="Bullets" data-size={100}>
              •
            </ToolbarButton>
          </RibbonItem>
          <RibbonItem id="align" label="Align left" icon={<Icon />} priority={40}>
            <ToolbarButton size="icon" aria-label="Align left" data-size={100}>
              L
            </ToolbarButton>
          </RibbonItem>
        </RibbonGroup>
      </RibbonContent>

      <RibbonContent value="insert" getSize={makeGetSize(state)}>
        <RibbonGroup groupId="tables" label="Tables">
          <RibbonItem id="table" label="Table" icon={<Icon />} priority={50}>
            <ToolbarButton size="icon" aria-label="Table" data-size={100}>
              T
            </ToolbarButton>
          </RibbonItem>
        </RibbonGroup>
      </RibbonContent>
    </Ribbon>
  );
}

/** Render + settle the first overflow measurement. */
function renderSettled(ui: React.ReactElement) {
  const result = render(ui);
  act(() => triggerResize());
  return result;
}

/* -------------------------------------------------------------------------- */
/* Structure / data-slots                                                      */
/* -------------------------------------------------------------------------- */

describe("Ribbon — structure & data-slots", () => {
  it("renders the tab strip, the tabs, and the active command row (toolbar)", () => {
    renderSettled(<HomeRibbon />);
    expect(screen.getByRole("tablist", { name: "Ribbon" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Insert" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("stamps each part's data-slot", () => {
    renderSettled(<HomeRibbon />);
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "data-slot",
      "ribbon-tab-list"
    );
    expect(screen.getByRole("tab", { name: "Home" })).toHaveAttribute(
      "data-slot",
      "ribbon-tab"
    );
    // Ribbon root carries data-slot="ribbon" + data-layout
    const root = screen
      .getByRole("tablist")
      .closest('[data-slot="ribbon"]') as HTMLElement;
    expect(root).toHaveAttribute("data-layout", "single-line");
  });

  it("defaults layout to single-line and treats unknown layouts as single-line", () => {
    const { rerender } = renderSettled(<HomeRibbon />);
    let root = screen
      .getByRole("tablist")
      .closest('[data-slot="ribbon"]') as HTMLElement;
    expect(root).toHaveAttribute("data-layout", "single-line");

    // an unknown value degrades gracefully (v2's "classic" is not implemented)
    rerender(<HomeRibbon layout={"space-age" as never} />);
    root = screen
      .getByRole("tablist")
      .closest('[data-slot="ribbon"]') as HTMLElement;
    expect(root).toHaveAttribute("data-layout", "single-line");
  });

  it("labels the command row by its owning tab (aria-labelledby → tab id)", () => {
    renderSettled(<HomeRibbon />);
    const toolbar = screen.getByRole("toolbar");
    const labelledBy = toolbar.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const tab = screen.getByRole("tab", { name: "Home" });
    expect(tab).toHaveAttribute("id", labelledBy!);
    // Base UI also links the panel to the same tab id → the accessible name works
    expect(screen.getByRole("toolbar", { name: "Home" })).toBe(toolbar);
  });

  it("RibbonSeparator renders a toolbar separator with data-slot", () => {
    render(
      <Ribbon defaultValue="a">
        <RibbonTabList aria-label="r">
          <RibbonTab value="a">A</RibbonTab>
        </RibbonTabList>
        <RibbonContent value="a">
          <RibbonSeparator />
        </RibbonContent>
      </Ribbon>
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("data-slot", "ribbon-separator");
  });
});

/* -------------------------------------------------------------------------- */
/* Tab switching                                                               */
/* -------------------------------------------------------------------------- */

describe("Ribbon — tab switching", () => {
  it("swaps the command row when a different tab is selected", async () => {
    const user = userEvent.setup();
    renderSettled(<HomeRibbon />);

    // Home row shows Bold; Insert's Table is not mounted (inactive panel).
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Table" })).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Insert" }));
    act(() => triggerResize());

    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bold" })).toBeNull();
  });

  it("supports controlled tab selection via value/onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function Controlled() {
      const [value, setValue] = useState("home");
      return (
        <HomeRibbon
          value={value}
          onValueChange={(next: unknown, ...rest: unknown[]) => {
            onValueChange(next, ...rest);
            setValue(next as string);
          }}
        />
      );
    }
    renderSettled(<Controlled />);
    await user.click(screen.getByRole("tab", { name: "Insert" }));
    expect(onValueChange).toHaveBeenCalledWith("insert", expect.anything());
  });
});

/* -------------------------------------------------------------------------- */
/* Roving tabindex within the row                                             */
/* -------------------------------------------------------------------------- */

describe("Ribbon — toolbar keyboard (APG roving tabindex)", () => {
  it("is a single tab stop; arrow keys move focus among commands", async () => {
    const user = userEvent.setup();
    renderSettled(
      <>
        <HomeRibbon />
        <button type="button">After</button>
      </>
    );

    const bold = screen.getByRole("button", { name: "Bold" });
    bold.focus();
    expect(bold).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(bold).toHaveFocus();
  });
});

/* -------------------------------------------------------------------------- */
/* Overflow integration                                                        */
/* -------------------------------------------------------------------------- */

describe("Ribbon — overflow integration", () => {
  it("drops low-priority commands into the menu as width shrinks, grouped under source-group headers", async () => {
    const user = userEvent.setup();
    // Budget 260 - 40 (trigger) = 220 → only the 2 most-important items fit
    // (bold pinned + italic). Everything else overflows.
    const { container } = renderSettled(<HomeRibbon width={260} />);

    // A high-priority command stays in the row; an overflowed one leaves the
    // a11y tree entirely (display:none + aria-hidden).
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Underline" })).toBeNull();
    // …and it carries the overflow markers in the DOM.
    const underline = container.querySelector(
      '[aria-label="Underline"]'
    ) as HTMLElement;
    expect(underline).toHaveAttribute("aria-hidden", "true");
    expect(underline).toHaveStyle({ display: "none" });

    // The "…" trigger is visible and announces the count.
    const trigger = screen.getByRole("button", { name: /more command/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    // Menu shows section headers named after the source groups.
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Font")).toBeInTheDocument();
    expect(within(menu).getByText("Paragraph")).toBeInTheDocument();
    // hidden commands appear as labeled rows
    expect(
      within(menu).getByRole("menuitem", { name: /Underline/ })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /Bullets/ })
    ).toBeInTheDocument();
    // a fully-visible command is NOT in the menu (bold is pinned, always shown)
    expect(within(menu).queryByRole("menuitem", { name: /Bold/ })).toBeNull();
  });

  it("keeps everything in the row (no trigger, no menu items) when it all fits", () => {
    const { container } = renderSettled(<HomeRibbon width={2000} />);
    for (const name of ["Bold", "Italic", "Underline", "Bullets", "Align left"]) {
      expect(screen.getByRole("button", { name })).not.toHaveAttribute(
        "aria-hidden"
      );
    }
    // Nothing overflows → the "…" trigger stays in the DOM (measurable) but is
    // visually/aria hidden, so it doesn't appear as an accessible button.
    expect(screen.queryByRole("button", { name: /more command/i })).toBeNull();
    const trigger = container.querySelector(
      '[data-slot="ribbon-overflow-trigger"]'
    ) as HTMLElement;
    expect(trigger).toHaveStyle({ visibility: "hidden" });
  });

  it("preserves source order in the menu (Font before Paragraph, Underline before Bullets)", async () => {
    const user = userEvent.setup();
    renderSettled(<HomeRibbon width={200} />);
    await user.click(screen.getByRole("button", { name: /more command/i }));
    const menu = await screen.findByRole("menu");
    const texts = within(menu)
      .getAllByRole("menuitem")
      .map((el) => el.textContent);
    const underlineAt = texts.findIndex((t) => t?.includes("Underline"));
    const bulletsAt = texts.findIndex((t) => t?.includes("Bullets"));
    expect(underlineAt).toBeGreaterThanOrEqual(0);
    expect(bulletsAt).toBeGreaterThan(underlineAt);
  });

  it("hides a group's divider only when the whole group overflows", () => {
    const state = { width: 1000 };
    // Font (low priority, NOT the last group → keeps its trailing divider) +
    // Paragraph (high priority, last group → no trailing divider). Shrinking
    // makes Font fully overflow, so its divider should hide.
    function App({ width }: { width: number }) {
      state.width = width;
      return (
        <Ribbon defaultValue="home">
          <RibbonTabList aria-label="r">
            <RibbonTab value="home">Home</RibbonTab>
          </RibbonTabList>
          <RibbonContent value="home" getSize={makeGetSize(state)}>
            <RibbonGroup groupId="font" label="Font">
              <RibbonItem id="b" label="Bold" priority={5}>
                <ToolbarButton aria-label="Bold" data-size={100}>
                  B
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup groupId="para" label="Paragraph">
              <RibbonItem id="l" label="Bullets" priority={90}>
                <ToolbarButton aria-label="Bullets" data-size={100}>
                  L
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
          </RibbonContent>
        </Ribbon>
      );
    }
    const { container, rerender } = render(<App width={1000} />);
    act(() => triggerResize());
    // Wide: the Font group's trailing divider is present and NOT overflowing.
    // (Wrapped by OverflowDivider, which stamps data-slot="overflow-divider".)
    const divider = container.querySelector(
      '[data-slot="overflow-divider"]'
    ) as HTMLElement;
    expect(divider).not.toHaveAttribute("data-overflowing");

    // Narrow enough that Font (its single low-priority item) fully overflows.
    // (150, not 200: with the v1.1 accurate accounting `padding` defaults to 0,
    // so 2×100px items exactly fill a 200px row — 150 forces the real drop.)
    rerender(<App width={150} />);
    act(() => triggerResize());
    // Font's item left the row…
    expect(screen.queryByRole("button", { name: "Bold" })).toBeNull();
    // …and Font's now-dangling divider hides itself.
    expect(divider).toHaveAttribute("data-overflowing");
    expect(divider).toHaveStyle({ display: "none" });
  });
});

/* -------------------------------------------------------------------------- */
/* Menu forms: default onSelect + custom overflowRender                        */
/* -------------------------------------------------------------------------- */

describe("Ribbon — menu forms", () => {
  it("the default menu form fires onSelect when chosen", async () => {
    const user = userEvent.setup();
    const onBullets = vi.fn();
    renderSettled(<HomeRibbon width={200} onBullets={onBullets} />);

    await user.click(screen.getByRole("button", { name: /more command/i }));
    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByRole("menuitem", { name: /Bullets/ }));
    expect(onBullets).toHaveBeenCalledTimes(1);
  });

  it("uses a custom overflowRender for the menu form when provided", async () => {
    const user = userEvent.setup();
    // 150 (not 200): padding now defaults to 0, so 2×100px items exactly fill a
    // 200px row — 150 forces Paste to genuinely overflow.
    const state = { width: 150 };
    render(
      <Ribbon defaultValue="home">
        <RibbonTabList aria-label="r">
          <RibbonTab value="home">Home</RibbonTab>
        </RibbonTabList>
        <RibbonContent
          value="home"
          getSize={makeGetSize(state)}
          minimumVisible={0}
        >
          <RibbonGroup groupId="font" label="Font">
            <RibbonItem id="a" label="Keep" priority={80} pinned>
              <ToolbarButton aria-label="Keep" data-size={100}>
                A
              </ToolbarButton>
            </RibbonItem>
            <RibbonItem
              id="paste"
              label="Paste"
              priority={10}
              overflowRender={() => (
                <div role="menuitem" data-testid="custom-form">
                  Custom paste form
                </div>
              )}
            >
              <ToolbarButton aria-label="Paste" data-size={100}>
                P
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    );
    act(() => triggerResize());

    await user.click(screen.getByRole("button", { name: /more command/i }));
    expect(await screen.findByTestId("custom-form")).toBeInTheDocument();
    // and the default DropdownMenuItem form is NOT used for that item
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByText("Paste")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Focus preservation on overflow                                              */
/* -------------------------------------------------------------------------- */

describe("Ribbon — focus preservation", () => {
  it("moves focus to the '…' trigger when the focused command overflows", () => {
    const state = { width: 1000 };
    function App({ width }: { width: number }) {
      state.width = width;
      return (
        <Ribbon defaultValue="home">
          <RibbonTabList aria-label="r">
            <RibbonTab value="home">Home</RibbonTab>
          </RibbonTabList>
          <RibbonContent
            value="home"
            getSize={makeGetSize(state)}
            minimumVisible={0}
          >
            <RibbonGroup groupId="font" label="Font">
              <RibbonItem id="a" label="A" priority={80} pinned>
                <ToolbarButton aria-label="A" data-size={100}>
                  A
                </ToolbarButton>
              </RibbonItem>
              <RibbonItem id="z" label="Z" priority={1}>
                <ToolbarButton aria-label="Z" data-size={100}>
                  Z
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
          </RibbonContent>
        </Ribbon>
      );
    }

    const { rerender } = render(<App width={1000} />);
    act(() => triggerResize());

    const z = screen.getByRole("button", { name: "Z" });
    act(() => z.focus());
    expect(z).toHaveFocus();

    // Shrink so Z (lowest priority) overflows while it holds focus. (150, not
    // 200: padding defaults to 0 now, so 2×100px items exactly fill 200px.)
    act(() => {
      rerender(<App width={150} />);
      triggerResize();
    });

    // Z is now hidden; focus landed on the "…" trigger, not lost to <body>.
    expect(z).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: /more command/i })).toHaveFocus();
  });
});

/* -------------------------------------------------------------------------- */
/* Collapsed (tabs-only) mode                                                   */
/* -------------------------------------------------------------------------- */

describe("Ribbon — collapsed (tabs-only) mode", () => {
  it("hides the command rows when collapsed and shows them otherwise", () => {
    // Collapsed instance: tabs present, no command row.
    const collapsed = renderSettled(<HomeRibbon defaultCollapsed />);
    expect(screen.getByRole("tab", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).toBeNull();
    collapsed.unmount();

    // A non-collapsed instance shows the command row.
    renderSettled(<HomeRibbon />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("un-collapses when any tab is activated (uncontrolled)", async () => {
    const user = userEvent.setup();
    renderSettled(<HomeRibbon defaultCollapsed />);
    expect(screen.queryByRole("toolbar")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Home" }));
    act(() => triggerResize());
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("supports controlled collapsed via collapsed/onCollapsedChange", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    // Controlled + stays collapsed (parent ignores the change): row stays hidden.
    renderSettled(
      <HomeRibbon collapsed onCollapsedChange={onCollapsedChange} />
    );
    expect(screen.queryByRole("toolbar")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Home" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    // still controlled-collapsed (parent didn't flip the prop)
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* className merge / ref forwarding                                            */
/* -------------------------------------------------------------------------- */

describe("Ribbon — className & refs", () => {
  it("merges a caller className on the root without dropping base layout", () => {
    renderSettled(<HomeRibbon className="custom-root" />);
    const root = screen
      .getByRole("tablist")
      .closest('[data-slot="ribbon"]') as HTMLElement;
    expect(root).toHaveClass("custom-root", "flex", "flex-col");
  });

  it("forwards a ref to the underlying command control (ToolbarButton)", () => {
    let node: HTMLElement | null = null;
    render(
      <Ribbon defaultValue="home">
        <RibbonTabList aria-label="r">
          <RibbonTab value="home">Home</RibbonTab>
        </RibbonTabList>
        <RibbonContent value="home">
          <RibbonGroup groupId="g" label="G">
            <RibbonItem id="x" label="X">
              <ToolbarButton
                aria-label="X"
                ref={(el) => {
                  node = el;
                }}
              >
                X
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  it("renders a Toggle command in the bar (B/I/U pattern) and passes its pressed state", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Ribbon defaultValue="home">
        <RibbonTabList aria-label="r">
          <RibbonTab value="home">Home</RibbonTab>
        </RibbonTabList>
        <RibbonContent value="home">
          <RibbonGroup groupId="font" label="Font">
            <RibbonItem id="bold" label="Bold">
              <Toggle aria-label="Bold" onPressedChange={onPressedChange}>
                B
              </Toggle>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    );
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
  });
});

/* -------------------------------------------------------------------------- */
/* Accessibility (axe) — multiple states                                       */
/* -------------------------------------------------------------------------- */

describe("Ribbon — accessibility", () => {
  it("has no axe violations (default, everything visible)", async () => {
    const { container } = renderSettled(<HomeRibbon width={2000} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (overflowed row, trigger visible)", async () => {
    const { container } = renderSettled(<HomeRibbon width={260} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (collapsed, tabs only)", async () => {
    const { container } = renderSettled(<HomeRibbon defaultCollapsed />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (overflow menu open)", async () => {
    const user = userEvent.setup();
    const { container, baseElement } = renderSettled(<HomeRibbon width={260} />);
    await user.click(screen.getByRole("button", { name: /more command/i }));
    await screen.findByRole("menu");
    await expect(container).toHaveNoAxeViolations();
    // The portalled menu lives on baseElement — scan it too. Disable the
    // page-level `region` rule: a bare component render has no landmarks (the
    // real app wraps the ribbon in one), and the menu portals to <body>.
    await expect(baseElement).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});

/* ========================================================================== */
/* CLASSIC LAYOUT (v2 phase C2)                                                */
/* ========================================================================== */

/**
 * A classic-band getSize: the `GroupCollapse` container reports the closed-over
 * width; every group's expanded form reports `EXPANDED`, its collapsed dropdown
 * `COLLAPSED` (both keyed off C1's `data-collapse-form`). With gap/padding 0 in
 * jsdom (no CSS engine), the collapse math is exact: 3 groups all-expanded =
 * 3×EXPANDED; collapsing a group swaps EXPANDED→COLLAPSED. The manager uses the
 * default `collapsedEstimate` (64) for a not-yet-active collapsed form.
 */
const EXPANDED_W = 300;
const COLLAPSED_W = 80;
function makeClassicGetSize(state: { width: number }) {
  return (el: HTMLElement) => {
    if (el.getAttribute("data-group-collapse-container") !== null)
      return state.width;
    const form = el.getAttribute("data-collapse-form");
    if (form === "expanded") return EXPANDED_W;
    if (form === "collapsed") return COLLAPSED_W;
    return 0;
  };
}

/**
 * Home classic band: Clipboard (Colar, collapsePriority 10) | Font (B/I/U,
 * priority 40, launcher) | Paragraph (bullets/align, priority 50). Paragraph
 * collapses FIRST (highest priority), then Font — Word's order.
 */
function ClassicRibbon({
  width = 1000,
  onColar,
  onLauncher,
  ...ribbonProps
}: {
  width?: number;
  onColar?: () => void;
  onLauncher?: () => void;
} & Partial<React.ComponentProps<typeof Ribbon>>) {
  const state = { width };
  return (
    <Ribbon defaultValue="home" layout="classic" {...ribbonProps}>
      <RibbonTabList aria-label="Ribbon">
        <RibbonTab value="home">Home</RibbonTab>
      </RibbonTabList>

      <RibbonContent value="home" getSize={makeClassicGetSize(state)}>
        <RibbonGroup
          groupId="clipboard"
          label="Clipboard"
          icon={<Icon />}
          collapsePriority={10}
        >
          <RibbonItem id="paste" label="Paste">
            <RibbonLargeButton icon={<Icon />} chevron onClick={onColar}>
              Colar
            </RibbonLargeButton>
          </RibbonItem>
        </RibbonGroup>

        <RibbonGroup
          groupId="font"
          label="Font"
          icon={<Icon />}
          collapsePriority={40}
          onLauncherClick={onLauncher}
        >
          <RibbonRow>
            <RibbonItem id="bold" label="Bold">
              <ToolbarButton size="icon" aria-label="Bold">
                B
              </ToolbarButton>
            </RibbonItem>
            <RibbonItem id="italic" label="Italic">
              <ToolbarButton size="icon" aria-label="Italic">
                I
              </ToolbarButton>
            </RibbonItem>
          </RibbonRow>
        </RibbonGroup>

        <RibbonGroup
          groupId="paragraph"
          label="Paragraph"
          icon={<Icon />}
          collapsePriority={50}
        >
          <RibbonColumn>
            <RibbonItem id="bullets" label="Bullets">
              <ToolbarButton size="icon" aria-label="Bullets">
                •
              </ToolbarButton>
            </RibbonItem>
            <RibbonItem id="align" label="Align left">
              <ToolbarButton size="icon" aria-label="Align left">
                L
              </ToolbarButton>
            </RibbonItem>
          </RibbonColumn>
        </RibbonGroup>
      </RibbonContent>
    </Ribbon>
  );
}

/** data-mode of a group's CollapseGroup wrapper. */
function groupMode(container: HTMLElement, groupId: string): string | null {
  const el = container.querySelector(
    `[data-slot="collapse-group"][data-group-id="${groupId}"]`
  );
  return el?.getAttribute("data-mode") ?? null;
}

describe("Ribbon classic — band anatomy", () => {
  it("renders the band toolbar, groups with labels, and inter-group separators", () => {
    const { container } = renderSettled(<ClassicRibbon width={1000} />);

    // Same toolbar labelling wiring as single-line (aria-labelledby → tab id).
    expect(screen.getByRole("toolbar", { name: "Home" })).toBeInTheDocument();

    // The root carries data-layout="classic".
    const root = screen
      .getByRole("tablist")
      .closest('[data-slot="ribbon"]') as HTMLElement;
    expect(root).toHaveAttribute("data-layout", "classic");

    // Each group's expanded shell is a role=group named by its label.
    const font = screen.getByRole("group", { name: "Font" });
    const paragraph = screen.getByRole("group", { name: "Paragraph" });
    expect(font).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();

    // A non-last group carries a trailing separator; the LAST group (Paragraph)
    // drops it (RibbonContent's last-group detection, reused from single-line).
    expect(
      font.querySelector('[data-slot="ribbon-group-separator"]')
    ).not.toBeNull();
    expect(
      paragraph.querySelector('[data-slot="ribbon-group-separator"]')
    ).toBeNull();

    // No "…" overflow trigger exists in classic.
    expect(
      container.querySelector('[data-slot="ribbon-overflow-trigger"]')
    ).toBeNull();
  });

  it("renders the group's children in the expanded band while expanded", () => {
    renderSettled(<ClassicRibbon width={1000} />);
    // All groups expanded → their controls are in the band, not a flyout.
    expect(screen.getByRole("button", { name: "Colar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bullets" })).toBeInTheDocument();
    // No collapsed dropdown buttons at full width.
    expect(screen.queryByRole("button", { name: "Paragraph" })).toBeNull();
  });

  it("renders a default ↘ launcher button when onLauncherClick is set", async () => {
    const user = userEvent.setup();
    const onLauncher = vi.fn();
    renderSettled(<ClassicRibbon width={1000} onLauncher={onLauncher} />);
    const launcher = screen.getByRole("button", { name: /Font — mais opções/ });
    await user.click(launcher);
    expect(onLauncher).toHaveBeenCalledTimes(1);
  });
});

describe("Ribbon classic — collapse ladder", () => {
  it("collapses the highest-collapsePriority group first (Paragraph before Font)", () => {
    // ClassicRibbon closes a fresh getSize over each render's `width`, so a
    // rerender re-points the manager at the new width.
    const { container, rerender } = render(<ClassicRibbon width={1000} />);
    act(() => triggerResize());
    // Wide: everything expanded.
    expect(groupMode(container, "clipboard")).toBe("expanded");
    expect(groupMode(container, "font")).toBe("expanded");
    expect(groupMode(container, "paragraph")).toBe("expanded");

    // One must collapse → Paragraph (priority 50), not Font (40).
    rerender(<ClassicRibbon width={720} />);
    act(() => triggerResize());
    expect(groupMode(container, "paragraph")).toBe("collapsed");
    expect(groupMode(container, "font")).toBe("expanded");
    expect(groupMode(container, "clipboard")).toBe("expanded");

    // Two must collapse → Paragraph + Font, Clipboard survives (lowest priority).
    rerender(<ClassicRibbon width={520} />);
    act(() => triggerResize());
    expect(groupMode(container, "paragraph")).toBe("collapsed");
    expect(groupMode(container, "font")).toBe("collapsed");
    expect(groupMode(container, "clipboard")).toBe("expanded");

    // Grow back → everything expands again (un-collapse in reverse).
    rerender(<ClassicRibbon width={1000} />);
    act(() => triggerResize());
    expect(groupMode(container, "paragraph")).toBe("expanded");
    expect(groupMode(container, "font")).toBe("expanded");
  });

  it("a collapsed group renders a dropdown button whose flyout holds the same children", async () => {
    const user = userEvent.setup();
    const state = { width: 1000 };
    function App({ width }: { width: number }) {
      state.width = width;
      return (
        <Ribbon defaultValue="home" layout="classic">
          <RibbonTabList aria-label="Ribbon">
            <RibbonTab value="home">Home</RibbonTab>
          </RibbonTabList>
          <RibbonContent value="home" getSize={makeClassicGetSize(state)}>
            <RibbonGroup
              groupId="clipboard"
              label="Clipboard"
              icon={<Icon />}
              collapsePriority={10}
            >
              <RibbonItem id="paste" label="Paste">
                <ToolbarButton size="icon" aria-label="Paste">
                  P
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup
              groupId="font"
              label="Font"
              icon={<Icon />}
              collapsePriority={40}
            >
              <RibbonItem id="bold" label="Bold">
                <ToolbarButton size="icon" aria-label="Bold">
                  B
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup
              groupId="paragraph"
              label="Paragraph"
              icon={<Icon />}
              collapsePriority={50}
            >
              <RibbonItem id="bullets" label="Bullets">
                <ToolbarButton size="icon" aria-label="Bullets">
                  •
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
          </RibbonContent>
        </Ribbon>
      );
    }
    const { container, rerender } = render(<App width={1000} />);
    act(() => triggerResize());

    rerender(<App width={720} />);
    act(() => triggerResize());
    expect(groupMode(container, "paragraph")).toBe("collapsed");

    // The collapsed dropdown button is present; "Bullets" is NOT in the band.
    const trigger = screen.getByRole("button", { name: "Paragraph" });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bullets" })).toBeNull();

    // Opening the flyout renders the group's SAME children.
    await user.click(trigger);
    const flyout = await screen.findByRole("dialog", { name: "Paragraph" });
    expect(
      within(flyout).getByRole("button", { name: "Bullets" })
    ).toBeInTheDocument();
  });

  it("moves focus to the group's dropdown button when its focused control collapses", () => {
    const state = { width: 1000 };
    function App({ width }: { width: number }) {
      state.width = width;
      return (
        <Ribbon defaultValue="home" layout="classic">
          <RibbonTabList aria-label="Ribbon">
            <RibbonTab value="home">Home</RibbonTab>
          </RibbonTabList>
          <RibbonContent value="home" getSize={makeClassicGetSize(state)}>
            <RibbonGroup
              groupId="clipboard"
              label="Clipboard"
              icon={<Icon />}
              collapsePriority={10}
            >
              <RibbonItem id="paste" label="Paste">
                <ToolbarButton size="icon" aria-label="Paste">
                  P
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup
              groupId="font"
              label="Font"
              icon={<Icon />}
              collapsePriority={40}
            >
              <RibbonItem id="bold" label="Bold">
                <ToolbarButton size="icon" aria-label="Bold">
                  B
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup
              groupId="paragraph"
              label="Paragraph"
              icon={<Icon />}
              collapsePriority={50}
            >
              <RibbonItem id="bullets" label="Bullets">
                <ToolbarButton size="icon" aria-label="Bullets">
                  •
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
          </RibbonContent>
        </Ribbon>
      );
    }

    const { rerender } = render(<App width={1000} />);
    act(() => triggerResize());

    const bullets = screen.getByRole("button", { name: "Bullets" });
    act(() => bullets.focus());
    expect(bullets).toHaveFocus();

    // Shrink so Paragraph collapses while its "Bullets" holds focus.
    act(() => {
      rerender(<App width={720} />);
      triggerResize();
    });

    // Focus moved to the Paragraph dropdown button, not dropped to <body>.
    expect(screen.getByRole("button", { name: "Paragraph" })).toHaveFocus();
  });
});

describe("Ribbon classic — layouts escape hatch", () => {
  it("renders a classic-only item in classic but not in single-line (and not in its overflow menu)", async () => {
    const user = userEvent.setup();

    // single-line: the classic-only command is absent from the bar AND the menu.
    const state = { width: 150 };
    const singleLine = render(
      <Ribbon defaultValue="home">
        <RibbonTabList aria-label="r">
          <RibbonTab value="home">Home</RibbonTab>
        </RibbonTabList>
        <RibbonContent value="home" getSize={makeGetSize(state)} minimumVisible={0}>
          <RibbonGroup groupId="font" label="Font">
            <RibbonItem id="keep" label="Keep" priority={80} pinned>
              <ToolbarButton aria-label="Keep" data-size={100}>
                A
              </ToolbarButton>
            </RibbonItem>
            {/* A normal low-priority item that DOES overflow → the "…" menu opens. */}
            <RibbonItem id="other" label="Other" priority={20}>
              <ToolbarButton aria-label="Other" data-size={100}>
                O
              </ToolbarButton>
            </RibbonItem>
            <RibbonItem
              id="classic-only"
              label="ClassicOnly"
              priority={10}
              layouts={["classic"]}
            >
              <ToolbarButton aria-label="ClassicOnly" data-size={100}>
                C
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    );
    act(() => triggerResize());
    // The classic-only command never renders in single-line — bar or menu.
    expect(screen.queryByRole("button", { name: "ClassicOnly" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /more command/i }));
    const menu = await screen.findByRole("menu");
    // The normal overflowed item is in the menu; the classic-only one is not
    // (it was never registered).
    expect(within(menu).getByText("Other")).toBeInTheDocument();
    expect(within(menu).queryByText("ClassicOnly")).toBeNull();
    singleLine.unmount();

    // classic: the same item renders in the band; a single-line-only group vanishes.
    const cState = { width: 1000 };
    render(
      <Ribbon defaultValue="home" layout="classic">
        <RibbonTabList aria-label="r">
          <RibbonTab value="home">Home</RibbonTab>
        </RibbonTabList>
        <RibbonContent value="home" getSize={makeClassicGetSize(cState)}>
          <RibbonGroup groupId="font" label="Font" icon={<Icon />}>
            <RibbonItem
              id="classic-only"
              label="ClassicOnly"
              layouts={["classic"]}
            >
              <ToolbarButton size="icon" aria-label="ClassicOnly">
                C
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup
            groupId="sl-only"
            label="SingleLineOnly"
            icon={<Icon />}
            layouts={["single-line"]}
          >
            <RibbonItem id="x" label="X">
              <ToolbarButton size="icon" aria-label="X">
                X
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    );
    act(() => triggerResize());
    expect(
      screen.getByRole("button", { name: "ClassicOnly" })
    ).toBeInTheDocument();
    // The single-line-only group renders nothing in classic.
    expect(screen.queryByRole("group", { name: "SingleLineOnly" })).toBeNull();
  });
});

describe("RibbonLargeButton / RibbonRow / RibbonColumn", () => {
  it("RibbonLargeButton renders a button with data-slot, label, icon and forwards ref", () => {
    let node: HTMLElement | null = null;
    render(
      <RibbonLargeButton
        icon={<Icon />}
        chevron
        ref={(el) => {
          node = el;
        }}
      >
        Paste
      </RibbonLargeButton>
    );
    const button = screen.getByRole("button", { name: "Paste" });
    expect(button).toHaveAttribute("data-slot", "ribbon-large-button");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  it("RibbonLargeButton fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RibbonLargeButton onClick={onClick}>Go</RibbonLargeButton>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("RibbonRow / RibbonColumn stamp their data-slot and forward ref + className", () => {
    let rowNode: HTMLElement | null = null;
    let colNode: HTMLElement | null = null;
    const { container } = render(
      <RibbonRow
        className="custom-row"
        ref={(el) => {
          rowNode = el;
        }}
      >
        <RibbonColumn
          className="custom-col"
          ref={(el) => {
            colNode = el;
          }}
        >
          <span>x</span>
        </RibbonColumn>
      </RibbonRow>
    );
    const row = container.querySelector('[data-slot="ribbon-row"]') as HTMLElement;
    const col = container.querySelector(
      '[data-slot="ribbon-column"]'
    ) as HTMLElement;
    expect(row).toHaveClass("custom-row", "flex");
    expect(col).toHaveClass("custom-col", "flex", "flex-col");
    expect(rowNode).toBeInstanceOf(HTMLDivElement);
    expect(colNode).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Ribbon classic — accessibility", () => {
  it("has no axe violations (classic expanded)", async () => {
    const { container } = renderSettled(<ClassicRibbon width={1000} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (classic with a collapsed group)", async () => {
    const state = { width: 1000 };
    function App({ width }: { width: number }) {
      state.width = width;
      return (
        <Ribbon defaultValue="home" layout="classic">
          <RibbonTabList aria-label="Ribbon">
            <RibbonTab value="home">Home</RibbonTab>
          </RibbonTabList>
          <RibbonContent value="home" getSize={makeClassicGetSize(state)}>
            <RibbonGroup
              groupId="clipboard"
              label="Clipboard"
              icon={<Icon />}
              collapsePriority={10}
            >
              <RibbonItem id="paste" label="Paste">
                <ToolbarButton size="icon" aria-label="Paste">
                  P
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup
              groupId="font"
              label="Font"
              icon={<Icon />}
              collapsePriority={40}
            >
              <RibbonItem id="bold" label="Bold">
                <ToolbarButton size="icon" aria-label="Bold">
                  B
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
            <RibbonGroup
              groupId="paragraph"
              label="Paragraph"
              icon={<Icon />}
              collapsePriority={50}
            >
              <RibbonItem id="bullets" label="Bullets">
                <ToolbarButton size="icon" aria-label="Bullets">
                  •
                </ToolbarButton>
              </RibbonItem>
            </RibbonGroup>
          </RibbonContent>
        </Ribbon>
      );
    }
    const { container, rerender } = render(<App width={1000} />);
    act(() => triggerResize());
    rerender(<App width={520} />);
    act(() => triggerResize());
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (collapsed-group flyout open)", async () => {
    const user = userEvent.setup();
    const state = { width: 720 };
    const { baseElement } = render(
      <Ribbon defaultValue="home" layout="classic">
        <RibbonTabList aria-label="Ribbon">
          <RibbonTab value="home">Home</RibbonTab>
        </RibbonTabList>
        <RibbonContent value="home" getSize={makeClassicGetSize(state)}>
          <RibbonGroup
            groupId="clipboard"
            label="Clipboard"
            icon={<Icon />}
            collapsePriority={10}
          >
            <RibbonItem id="paste" label="Paste">
              <ToolbarButton size="icon" aria-label="Paste">
                P
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup
            groupId="font"
            label="Font"
            icon={<Icon />}
            collapsePriority={40}
          >
            <RibbonItem id="bold" label="Bold">
              <ToolbarButton size="icon" aria-label="Bold">
                B
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
          <RibbonGroup
            groupId="paragraph"
            label="Paragraph"
            icon={<Icon />}
            collapsePriority={50}
          >
            <RibbonItem id="bullets" label="Bullets">
              <ToolbarButton size="icon" aria-label="Bullets">
                •
              </ToolbarButton>
            </RibbonItem>
          </RibbonGroup>
        </RibbonContent>
      </Ribbon>
    );
    act(() => triggerResize());
    await user.click(screen.getByRole("button", { name: "Paragraph" }));
    await screen.findByRole("dialog", { name: "Paragraph" });
    await expect(baseElement).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
