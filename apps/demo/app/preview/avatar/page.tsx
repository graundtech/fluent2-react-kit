import { Avatar, AvatarFallback, AvatarImage } from "@kit/components/ui/avatar";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Avatar preview — image + fallback, size row (via className, no size prop),
 * a broken-image-falls-back-to-initials example, and a grouped/stacked row,
 * rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Avatar's own wrapper carries no `"use client"` (Base UI's
 * Root/Image/Fallback are already client boundaries on their own), so nothing
 * here forces one either.
 *
 * The "photo" avatars use an inline SVG data URI (a flat silhouette-on-brand
 * illustration) so this demo has zero external network dependency.
 */

const PHOTO_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230f6cbd'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%23ffffff'/%3E%3Cellipse cx='32' cy='58' rx='20' ry='16' fill='%23ffffff'/%3E%3C/svg%3E";

const SIZE_ROW = [
  { className: "size-6", label: "size-6" },
  { className: "size-8", label: "size-8 (default)" },
  { className: "size-10", label: "size-10" },
  { className: "size-12", label: "size-12" },
] as const;

const GROUP_INITIALS = ["AC", "TS", "MK", "RJ"] as const;

function PanelBody() {
  return (
    <>
      {/* Image avatar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-sm text-muted-foreground">image</span>
        <Avatar>
          <AvatarImage src={PHOTO_SRC} alt="Avery Chen" />
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
      </div>

      {/* Initials fallback (no image supplied) */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-sm text-muted-foreground">initials</span>
        <Avatar>
          <AvatarFallback>TS</AvatarFallback>
        </Avatar>
      </div>

      {/* Broken image falls back to initials — the behavior the Base UI
          primitive exists for: a real loading/error state, not just markup. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-sm text-muted-foreground">broken image</span>
        <Avatar>
          <AvatarImage src="/this-image-does-not-exist.png" alt="Morgan Kim" />
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
      </div>

      {/* Sizes — no size prop; consumers resize via className */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-sm text-muted-foreground">sizes</span>
        {SIZE_ROW.map(({ className: sizeClassName, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <Avatar className={sizeClassName}>
              <AvatarImage src={PHOTO_SRC} alt="" />
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Grouped / stacked */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-sm text-muted-foreground">grouped</span>
        <div className="flex -space-x-2">
          {GROUP_INITIALS.map((initials) => (
            <Avatar key={initials} className="ring-2 ring-background">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
          <Avatar className="ring-2 ring-background">
            <AvatarFallback>+3</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </>
  );
}

export default function AvatarPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Avatar</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Image with a real loading/error
            state (Base UI), brand-tinted initials fallback, className-driven
            sizing, and a grouped/stacked row.
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
