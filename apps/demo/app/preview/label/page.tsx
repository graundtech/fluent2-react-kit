import { Label } from "@kit/components/ui/label";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Label preview — plain label+input pairs, a required example, and the two
 * disabled ergonomics (`peer-disabled`, `group-data-[disabled=true]`),
 * rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*), which
 * Next resolves via `transpilePackages`. This route is a plain Server
 * Component: Label is server-safe, so no `"use client"` is needed.
 *
 * The demo deliberately does NOT import a sibling `Input` component (it may
 * not exist yet in this parallel build) — inputs here are plain `<input>`
 * elements styled inline with the same token utilities/state recipes the
 * conventions doc prescribes.
 */

const inputClassName =
  "h-8 rounded-md border border-input bg-transparent px-3 text-sm text-foreground " +
  "outline-none transition-colors duration-fast ease-ease placeholder:text-muted-foreground " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50";

function Field({
  labelText,
  inputId,
  required,
  placeholder
}: {
  labelText: string;
  inputId: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex w-64 flex-col gap-1.5">
      <Label htmlFor={inputId} required={required}>
        {labelText}
      </Label>
      <input
        id={inputId}
        className={inputClassName}
        placeholder={placeholder}
        required={required}
        aria-required={required ? "true" : undefined}
      />
    </div>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      {/* Basic label + input pairs */}
      <div className="space-y-4">
        <span className="block text-sm text-muted-foreground">basic</span>
        <div className="flex flex-wrap gap-6">
          <Field
            labelText="Full name"
            inputId={`${idPrefix}-name`}
            placeholder="Ada Lovelace"
          />
          <Field
            labelText="Email address"
            inputId={`${idPrefix}-email`}
            placeholder="ada@example.com"
          />
        </div>
      </div>

      {/* Required indicator */}
      <div className="space-y-4">
        <span className="block text-sm text-muted-foreground">required</span>
        <div className="flex flex-wrap gap-6">
          <Field
            labelText="Company"
            inputId={`${idPrefix}-company`}
            required
            placeholder="Acme Corp"
          />
        </div>
      </div>

      {/* Disabled ergonomics */}
      <div className="space-y-4">
        <span className="block text-sm text-muted-foreground">disabled</span>
        <div className="flex flex-wrap items-start gap-6">
          {/* peer-disabled: the label follows a disabled `.peer` sibling in
              DOM order (required for the CSS `~` sibling combinator to apply). */}
          <div className="flex items-center gap-2">
            <input
              id={`${idPrefix}-newsletter`}
              type="checkbox"
              disabled
              className="peer size-4 rounded-sm border border-input accent-primary disabled:pointer-events-none disabled:opacity-50"
            />
            <Label htmlFor={`${idPrefix}-newsletter`}>
              Subscribe to newsletter (peer-disabled)
            </Label>
          </div>

          {/* group-data-[disabled=true]: any ancestor can carry `group` +
              `data-disabled="true"` to gray out the label without disabling
              the label element itself. */}
          <div
            className="group flex w-64 flex-col gap-1.5"
            data-disabled="true"
          >
            <Label htmlFor={`${idPrefix}-plan`}>
              Plan name (group-disabled)
            </Label>
            <input
              id={`${idPrefix}-plan`}
              disabled
              className={inputClassName}
              placeholder="Pro"
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function LabelPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Label</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Basic label+input pairs, the
            required-field asterisk, and the peer/group disabled ergonomics.
          </p>
        </header>

        <PreviewPanel title="Light" className="light">
          <PanelBody idPrefix="light" />
        </PreviewPanel>
        <PreviewPanel title="Dark" className="dark">
          <PanelBody idPrefix="dark" />
        </PreviewPanel>
      </div>
    </main>
  );
}
