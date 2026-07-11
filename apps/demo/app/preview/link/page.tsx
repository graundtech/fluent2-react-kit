import NextLink from "next/link";

import { Link } from "@kit/components/ui/link";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Link preview — standalone links, an inline-in-prose paragraph, an
 * aria-disabled example, and asChild wrapping both a plain anchor and Next's
 * own `<Link>` (the primary reason `asChild` exists on this component),
 * rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. `next/link` is already a
 * dependency of this demo app (not a new package added for this preview).
 * This route is a plain Server Component: `Link` is server-safe, so no
 * `"use client"` is needed here — Next's own `<Link>` carries its own client
 * boundary internally.
 */

function PanelBody() {
  return (
    <>
      {/* Standalone links (variant="default" — no underline until hover) */}
      <div className="space-y-3">
        <span className="block text-sm text-muted-foreground">
          standalone (default variant)
        </span>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="https://fluent2.microsoft.design" target="_blank" rel="noreferrer">
            Fluent 2 design system
          </Link>
          <Link href="#top">Back to top</Link>
          <Link href="/docs">Read the docs</Link>
        </div>
      </div>

      {/* Inline-in-prose links (variant="inline" — persistent underline) */}
      <div className="space-y-3">
        <span className="block text-sm text-muted-foreground">
          inline (inline variant, always underlined)
        </span>
        <p className="max-w-prose text-sm leading-6">
          This kit follows Fluent 2 in looks and shadcn/ui in API. Read the{" "}
          <Link href="/docs" variant="inline">
            component conventions
          </Link>{" "}
          before adding a new one, and check the{" "}
          <Link href="https://storybooks.fluentui.dev/react" variant="inline" target="_blank" rel="noreferrer">
            Fluent 2 reference
          </Link>{" "}
          for the visual spec. Fluent requires an always-on underline for
          links embedded in body text, since color contrast against
          surrounding text alone isn&apos;t a reliable way to tell them apart.
        </p>
      </div>

      {/* Visited state */}
      <div className="space-y-2">
        <span className="block text-sm text-muted-foreground">
          visited state
        </span>
        <p className="max-w-prose text-sm text-muted-foreground">
          This component does not style <code>:visited</code> — Fluent 2 does
          not define a distinct visited color, and browsers already apply
          their own default treatment (and restrict what CSS can change on
          it). Consumers who need a custom visited color can target{" "}
          <code>[data-slot=&quot;link&quot;]:visited</code> in their own app.
        </p>
      </div>

      {/* aria-disabled */}
      <div className="space-y-3">
        <span className="block text-sm text-muted-foreground">
          aria-disabled
        </span>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/unavailable" aria-disabled="true" tabIndex={-1}>
            Unavailable action
          </Link>
          <Link aria-disabled="true">No href, disabled</Link>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">
          Anchors have no native <code>disabled</code> attribute. Prefer
          omitting <code>href</code> entirely on a disabled link (right
          example) so assistive tech drops it from the tab order; when the
          href must stay for layout/routing (left example), pair{" "}
          <code>aria-disabled=&quot;true&quot;</code> with{" "}
          <code>tabIndex={"{-1}"}</code> to fully remove it from keyboard
          activation.
        </p>
      </div>

      {/* asChild */}
      <div className="space-y-3">
        <span className="block text-sm text-muted-foreground">asChild</span>
        <div className="flex flex-wrap items-center gap-6">
          <Link asChild>
            <NextLink href="/preview/link">Wrapping next/link</NextLink>
          </Link>
          <Link asChild variant="inline">
            <a href="#top">Wrapping a plain anchor</a>
          </Link>
        </div>
      </div>
    </>
  );
}

export default function LinkPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Link</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Standalone and inline-in-prose
            variants, a visited-state note, an <code>aria-disabled</code>{" "}
            example, and <code>asChild</code> wrapping both a plain anchor and{" "}
            <code>next/link</code>.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <PanelBody />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <PanelBody />
        </PreviewPanel>
      </div>
    </main>
  );
}
