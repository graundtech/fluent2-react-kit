import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

/**
 * jsdom notes (same territory as select.test.tsx, adapted for Dialog):
 *
 * - Base UI internals may consult `ResizeObserver`; jsdom has none, so stub it
 *   (harmless if unused). Dialog has no Positioner, so no other layout shims
 *   are needed.
 * - Unlike Select, the trigger is a plain `<button>` whose click *toggles*
 *   state (no pointerdown-open/pointerup-select race against a zero-size
 *   portal), so pointer open works deterministically in jsdom — tests cover
 *   BOTH the click and keyboard open paths.
 * - **"Closed" is asserted via the `dialog` role leaving the accessibility
 *   tree and/or the `onOpenChange` spy, never `toHaveCount(0)` on the popup
 *   element.** In a real browser Base UI 1.6.0 HIDES the popup
 *   (`display:none`) after the exit transition rather than unmounting it (see
 *   e2e/select.spec.ts); in jsdom transitions never fire, so Base UI's
 *   animation detection finds none and unmounts immediately — either way the
 *   role leaves the a11y tree, which is the assertion that holds everywhere.
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
});

/** The canonical dialog used across most tests. */
function ProfileDialog({
  onOpenChange,
  defaultOpen,
  showCloseButton,
}: {
  onOpenChange?: (open: boolean, eventDetails: unknown) => void;
  defaultOpen?: boolean;
  showCloseButton?: boolean;
} = {}) {
  return (
    <Dialog onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here.
          </DialogDescription>
        </DialogHeader>
        <p>Body content</p>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  // --- structure / slots (closed) -----------------------------------------

  it("renders the trigger as a button with dialog popup semantics; content stays unrendered", () => {
    render(<ProfileDialog />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="dialog-content"]')
    ).not.toBeInTheDocument();
  });

  // --- open: click AND keyboard --------------------------------------------

  it("opens on trigger click, rendering the dialog role with overlay and content slots", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "dialog-content");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // the smoke layer renders beneath the popup
    expect(
      document.querySelector('[data-slot="dialog-overlay"]')
    ).toBeInTheDocument();
  });

  it("opens via the keyboard (Enter on the focused trigger)", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    trigger.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  // --- accessible wiring ----------------------------------------------------

  it("wires aria-labelledby to the title and aria-describedby to the description (Base UI auto-ids)", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = await screen.findByRole("dialog");
    const title = document.querySelector('[data-slot="dialog-title"]');
    const description = document.querySelector(
      '[data-slot="dialog-description"]'
    );
    expect(title).toHaveTextContent("Edit profile");
    expect(description).toHaveTextContent("Make changes to your profile here.");
    expect(title).toHaveAttribute("id");
    expect(description).toHaveAttribute("id");
    expect(dialog).toHaveAttribute("aria-labelledby", title?.getAttribute("id"));
    expect(dialog).toHaveAttribute(
      "aria-describedby",
      description?.getAttribute("id")
    );
    // the dialog is accessibly named by its title
    expect(
      screen.getByRole("dialog", { name: "Edit profile" })
    ).toBeInTheDocument();
  });

  it("moves focus into the dialog on open", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
  });

  // --- close paths ----------------------------------------------------------

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ProfileDialog onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    onOpenChange.mockClear();

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("closes via the built-in ✕ close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ProfileDialog onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    onOpenChange.mockClear();

    // the ✕ is icon-only; its accessible name comes from the sr-only span
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("closes via a custom DialogClose in the footer", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ProfileDialog onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    onOpenChange.mockClear();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("showCloseButton={false} omits the built-in ✕", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog showCloseButton={false} />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    expect(
      screen.queryByRole("button", { name: "Close" })
    ).not.toBeInTheDocument();
  });

  // --- controlled -----------------------------------------------------------

  it("supports controlled open/onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const controlled = (open: boolean) => (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Controlled</DialogTitle>
          <DialogDescription>Controlled dialog.</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const { rerender } = render(controlled(true));

    // renders open with no interaction
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Escape requests a close but cannot close a controlled dialog by itself
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // flipping the prop closes it
    rerender(controlled(false));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("open={false} renders no dialog", () => {
    render(
      <Dialog open={false}>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Never shown</DialogTitle>
          <DialogDescription>Hidden.</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // --- layout parts / styling ----------------------------------------------

  it("renders header, footer, title and description with data-slots and Fluent type styles", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    const header = document.querySelector('[data-slot="dialog-header"]');
    const footer = document.querySelector('[data-slot="dialog-footer"]');
    const title = document.querySelector('[data-slot="dialog-title"]');
    const description = document.querySelector(
      '[data-slot="dialog-description"]'
    );
    expect(header).toHaveClass("flex", "flex-col", "gap-1.5");
    expect(footer).toHaveClass("flex", "flex-col-reverse", "gap-2");
    expect(title?.tagName).toBe("H2");
    expect(title).toHaveClass("text-xl", "font-semibold");
    expect(description?.tagName).toBe("P");
    expect(description).toHaveClass("text-sm", "text-muted-foreground");
  });

  it("merges a caller className on the content without dropping base classes", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent className="custom-content max-w-sm">
          <DialogTitle>Custom</DialogTitle>
          <DialogDescription>Custom width.</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveClass(
      "custom-content",
      "rounded-xl",
      "shadow-64",
      "bg-background"
    );
    // tailwind-merge lets the caller's max-w-sm win over the base max-w-lg
    expect(dialog).toHaveClass("max-w-sm");
    expect(dialog).not.toHaveClass("max-w-lg");
  });

  it("forwards a ref to the underlying popup element", async () => {
    const user = userEvent.setup();
    let node: HTMLDivElement | null = null;
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent
          ref={(el) => {
            node = el;
          }}
        >
          <DialogTitle>Ref</DialogTitle>
          <DialogDescription>Ref target.</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    expect(node).toBeInstanceOf(HTMLDivElement);
    expect(node).toHaveAttribute("data-slot", "dialog-content");
  });

  // --- accessibility -------------------------------------------------------

  it("has no axe violations when closed", async () => {
    const { container } = render(<ProfileDialog />);
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<ProfileDialog />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");
    // The popup is portalled to <body>, so scope axe to the whole document
    // body. Disable the `region` best-practice rule: it flags page content not
    // wrapped in a landmark (`<main>` etc.), which is a page-structure concern,
    // not a component one — an isolated render legitimately has no landmarks.
    await expect(document.body).toHaveNoAxeViolations({
      rules: { region: { enabled: false } },
    });
  });
});
