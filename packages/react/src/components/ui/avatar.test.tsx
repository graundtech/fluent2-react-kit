import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

/**
 * jsdom never performs real network/image decoding, so Base UI's
 * `useImageLoadingStatus` hook (which drives `AvatarImage` mounting +
 * `AvatarFallback` visibility) never naturally reaches the `"loaded"` status.
 * That is exactly right for the "no image loads" tests below (the default,
 * unmocked jsdom behavior). To also exercise the "image resolves" branch —
 * needed to assert the image's data-slot/alt/className land on a real `<img>`
 * — this stubs the global `Image` constructor so setting `.src` synchronously
 * triggers `onload`, the same technique used to test Radix's Avatar.
 */
class MockLoadingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";
  set src(value: string) {
    this._src = value;
    setTimeout(() => this.onload?.(), 0);
  }
  get src() {
    return this._src;
  }
}

describe("Avatar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- structure / slots -------------------------------------------------

  it("renders the root as a span with the avatar data-slot", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    const root = container.querySelector('[data-slot="avatar"]');
    expect(root).toBeInTheDocument();
    expect(root?.tagName).toBe("SPAN");
  });

  it("renders the fallback (with its data-slot) when the image never loads — jsdom never fires the image load event", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    const fallback = screen.getByText("JD");
    expect(fallback).toBeVisible();
    expect(fallback).toHaveAttribute("data-slot", "avatar-fallback");
    // the image never resolves in jsdom, so it never mounts alongside the fallback
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("mounts the image with its data-slot, alt text and src once loading resolves, and hides the fallback", async () => {
    vi.stubGlobal("Image", MockLoadingImage);
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    const img = await waitFor(() => {
      const el = document.querySelector("img");
      expect(el).toBeInTheDocument();
      return el as HTMLImageElement;
    });

    expect(img).toHaveAttribute("data-slot", "avatar-image");
    expect(img).toHaveAttribute("alt", "Jane Doe");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
    expect(screen.queryByText("JD")).not.toBeInTheDocument();
  });

  // --- className merge on all three parts --------------------------------

  it("merges a caller className on Avatar without dropping the base classes", () => {
    const { container } = render(
      <Avatar className="ring-2 custom-avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    const root = container.querySelector('[data-slot="avatar"]');
    expect(root).toHaveClass("ring-2", "custom-avatar", "rounded-full", "size-8");
  });

  it("merges a caller className on AvatarFallback without dropping the base classes", () => {
    render(
      <Avatar>
        <AvatarFallback className="custom-fallback">JD</AvatarFallback>
      </Avatar>
    );
    const fallback = screen.getByText("JD");
    expect(fallback).toHaveClass("custom-fallback", "bg-brand-160", "rounded-full");
  });

  it("merges a caller className on AvatarImage without dropping the base classes", async () => {
    vi.stubGlobal("Image", MockLoadingImage);
    render(
      <Avatar>
        <AvatarImage
          src="https://example.com/avatar.png"
          alt="Jane Doe"
          className="custom-image"
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    const img = await waitFor(() => {
      const el = document.querySelector("img");
      expect(el).toBeInTheDocument();
      return el as HTMLImageElement;
    });
    expect(img).toHaveClass("custom-image", "aspect-square", "object-cover");
  });

  // --- ref -----------------------------------------------------------------

  it("forwards a ref to the underlying root span", () => {
    let node: HTMLSpanElement | null = null;
    render(
      <Avatar
        ref={(el) => {
          node = el;
        }}
      >
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
  });

  // --- accessibility ---------------------------------------------------------

  it("has no axe violations (fallback initials)", async () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    await expect(container).toHaveNoAxeViolations();
  });

  it("has no axe violations (loaded image)", async () => {
    vi.stubGlobal("Image", MockLoadingImage);
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    await waitFor(() => {
      expect(document.querySelector("img")).toBeInTheDocument();
    });
    await expect(container).toHaveNoAxeViolations();
  });
});
