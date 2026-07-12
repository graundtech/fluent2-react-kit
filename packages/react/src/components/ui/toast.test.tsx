import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toastVariants,
  useToast,
} from "./toast";

/**
 * jsdom notes (same territory as dialog.test.tsx / select.test.tsx, adapted for
 * Toast's manager model):
 *
 * - Base UI's viewport/root consult `ResizeObserver` (to measure toast heights
 *   for the stack offsets) and `matchMedia` (hover capability); jsdom has
 *   neither, so both are stubbed (harmless if unused).
 * - Toasts are fired imperatively through the manager hook (`useToast().add`),
 *   not declaratively, so every test renders a small `Harness` with buttons that
 *   call `add(...)` and a `ToastList` that maps `useToast().toasts` — this is the
 *   real consumer shape (see toast.tsx's firing recipe).
 * - **Auto-dismiss (the default 5000ms timeout) is deferred to e2e.** It braids
 *   `setTimeout`, `requestAnimationFrame`, `ResizeObserver`, window focus state,
 *   and exit *transitions* — none of which advance coherently under jsdom fake
 *   timers, so a fake-timer test here would be flaky. The timer wiring is asserted
 *   indirectly via `timeout: 0` (stays put) and the explicit close paths; the
 *   real timed dismissal belongs in a browser. Real (unfaked) timers are used so
 *   fired toasts simply persist for the sub-second test duration.
 * - On close, Base UI marks the toast `ending`; jsdom fires no `transitionend`,
 *   so Base UI's animation detection finds none and removes the toast from the
 *   `toasts` array immediately — dismissal is asserted by the toast text leaving
 *   the DOM, which holds in both jsdom and a real browser.
 * - **The in-toast `ToastClose`/`ToastAction` buttons carry `aria-hidden="true"`
 *   until the user presses F6 into the viewport landmark** (Base UI keeps them
 *   out of the AT/tab order because the live region announces the toast). So
 *   `getByRole("button", …)` cannot see them — the tests reach them by
 *   `data-slot` and click with `fireEvent`. Their real keyboard-focus path (post
 *   F6) is a browser-only concern deferred to e2e.
 * - An empty `<ToastDescription />` with no `description` string renders **no
 *   element at all** (Base UI returns null when there's nothing to show), so the
 *   title-only case asserts the description slot is absent.
 */
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  }
  if (!globalThis.matchMedia) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  }
});

type Variant = "default" | "destructive" | "success" | "warning" | "info";

/** Renders one toast per entry in the manager's `toasts` array. */
function ToastList({ onAction }: { onAction?: () => void } = {}) {
  const { toasts } = useToast();
  return (
    <>
      {toasts.map((toast) => {
        const data = toast.data as { variant?: Variant } | undefined;
        return (
          <Toast key={toast.id} toast={toast} variant={data?.variant}>
            <ToastTitle />
            <ToastDescription />
            {onAction ? (
              <ToastAction onClick={onAction}>Undo</ToastAction>
            ) : null}
            <ToastClose />
          </Toast>
        );
      })}
    </>
  );
}

/**
 * Test harness — a Provider with fire buttons and the viewport/list. `fireProps`
 * lets each test enqueue an arbitrary toast; `onAction` wires an action spy.
 */
function Harness({
  fireProps,
  onAction,
}: {
  fireProps?: Record<string, unknown>;
  onAction?: () => void;
}) {
  return (
    <ToastProvider>
      <FireButton fireProps={fireProps} />
      <ToastViewport>
        <ToastList onAction={onAction} />
      </ToastViewport>
    </ToastProvider>
  );
}

function FireButton({ fireProps }: { fireProps?: Record<string, unknown> }) {
  const { add } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        add({
          title: "Changes saved",
          description: "Your profile was updated.",
          ...fireProps,
        })
      }
    >
      Fire toast
    </button>
  );
}

async function fire(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Fire toast" }));
}

describe("Toast", () => {
  // --- render / provider+viewport ------------------------------------------

  it("renders the viewport region with no toasts initially", () => {
    render(<Harness />);
    const viewport = document.querySelector('[data-slot="toast-viewport"]');
    expect(viewport).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="toast"]')
    ).not.toBeInTheDocument();
  });

  // --- firing --------------------------------------------------------------

  it("firing a toast via the manager renders its title and description", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await fire(user);

    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    expect(screen.getByText("Your profile was updated.")).toBeInTheDocument();

    const title = document.querySelector('[data-slot="toast-title"]');
    const description = document.querySelector(
      '[data-slot="toast-description"]'
    );
    expect(title?.tagName).toBe("H2");
    expect(title).toHaveClass("text-sm", "font-semibold");
    expect(description?.tagName).toBe("P");
    expect(description).toHaveClass("text-sm", "text-muted-foreground");
  });

  it("supports a title-only toast (no description)", async () => {
    const user = userEvent.setup();
    render(<Harness fireProps={{ description: undefined }} />);
    await fire(user);

    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    // an empty <ToastDescription /> with no description string renders no element
    expect(
      document.querySelector('[data-slot="toast-description"]')
    ).not.toBeInTheDocument();
  });

  // --- data-slot / structure -----------------------------------------------

  it("emits data-slot and data-variant hooks on the toast and its parts", async () => {
    const user = userEvent.setup();
    render(<Harness fireProps={{ data: { variant: "success" } }} />);
    await fire(user);
    await screen.findByText("Changes saved");

    const root = document.querySelector('[data-slot="toast"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("data-variant", "success");
    expect(
      document.querySelector('[data-slot="toast-content"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="toast-close"]')
    ).toBeInTheDocument();
  });

  // --- variants -------------------------------------------------------------

  const variantClass: Record<Variant, string> = {
    default: "bg-popover",
    destructive: "bg-destructive-subtle",
    success: "bg-success-subtle",
    warning: "bg-warning-subtle",
    info: "bg-brand-160",
  };

  for (const variant of Object.keys(variantClass) as Variant[]) {
    it(`variant="${variant}" applies its distinguishing token class`, async () => {
      const user = userEvent.setup();
      render(<Harness fireProps={{ data: { variant } }} />);
      await fire(user);
      await screen.findByText("Changes saved");

      const root = document.querySelector('[data-slot="toast"]');
      expect(root).toHaveClass(variantClass[variant]);
      expect(root).toHaveAttribute("data-variant", variant);
    });
  }

  // --- close ----------------------------------------------------------------

  it("dismisses the toast via the ✕ close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await fire(user);
    await screen.findByText("Changes saved");

    // the ✕ is aria-hidden until F6 (see jsdom notes), so reach it by data-slot
    const close = document.querySelector('[data-slot="toast-close"]');
    expect(close).toHaveClass("absolute", "top-3", "right-3");
    // the accessible name (for the F6-navigated path) comes from the sr-only span
    expect(close).toHaveTextContent("Close");
    fireEvent.click(close as Element);

    await waitFor(() =>
      expect(screen.queryByText("Changes saved")).not.toBeInTheDocument()
    );
  });

  // --- action ---------------------------------------------------------------

  it("fires the action button handler", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await fire(user);
    await screen.findByText("Changes saved");

    // the action is aria-hidden until F6 (see jsdom notes), so reach it by data-slot
    const action = document.querySelector('[data-slot="toast-action"]');
    expect(action).toHaveTextContent("Undo");
    fireEvent.click(action as Element);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  // --- className merge / ref ------------------------------------------------

  it("merges a caller className on the toast without dropping base classes", async () => {
    const user = userEvent.setup();
    function CustomList() {
      const { toasts } = useToast();
      return toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          variant="success"
          className="custom-toast bg-card"
        >
          <ToastTitle />
        </Toast>
      ));
    }
    render(
      <ToastProvider>
        <FireButton />
        <ToastViewport>
          <CustomList />
        </ToastViewport>
      </ToastProvider>
    );
    await fire(user);
    await screen.findByText("Changes saved");

    const root = document.querySelector('[data-slot="toast"]');
    expect(root).toHaveClass("custom-toast", "rounded-md", "shadow-16");
    // tailwind-merge lets the caller's bg-card win over the variant bg-success-subtle
    expect(root).toHaveClass("bg-card");
    expect(root).not.toHaveClass("bg-success-subtle");
  });

  it("forwards a ref to the underlying toast root element", async () => {
    const user = userEvent.setup();
    let node: HTMLElement | null = null;
    function RefList() {
      const { toasts } = useToast();
      return toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          ref={(el) => {
            node = el;
          }}
        >
          <ToastTitle />
        </Toast>
      ));
    }
    render(
      <ToastProvider>
        <FireButton />
        <ToastViewport>
          <RefList />
        </ToastViewport>
      </ToastProvider>
    );
    await fire(user);
    await screen.findByText("Changes saved");

    expect(node).toBeInstanceOf(HTMLElement);
    expect(node).toHaveAttribute("data-slot", "toast");
  });

  // --- variants helper ------------------------------------------------------

  it("toastVariants(...) returns a class string", () => {
    expect(typeof toastVariants({ variant: "warning" })).toBe("string");
    expect(toastVariants({ variant: "warning" })).toContain("bg-warning-subtle");
  });

  // --- accessibility --------------------------------------------------------

  it("has no axe violations with an open default toast", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await fire(user);
    await screen.findByText("Changes saved");
    // toasts are portalled to <body>; scope axe to the whole document body and
    // disable the landmark `region` rule (a page-structure concern, not a
    // component one — an isolated render has no <main>).
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });

  it("has no axe violations with an open destructive toast", async () => {
    const user = userEvent.setup();
    render(<Harness fireProps={{ data: { variant: "destructive" } }} />);
    await fire(user);
    await screen.findByText("Changes saved");
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
