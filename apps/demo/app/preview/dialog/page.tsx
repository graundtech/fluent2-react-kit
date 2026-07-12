import { Button } from "@kit/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kit/components/ui/dialog";
import { Input } from "@kit/components/ui/input";
import { Label } from "@kit/components/ui/label";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Dialog preview — a basic confirm dialog, a form dialog (Label + Input), and
 * a footer-actions-only dialog (`showCloseButton={false}`), rendered on
 * `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is a plain Server
 * Component — no client state, no handlers (`dialog.tsx` carries its own
 * `"use client"` boundary; see its doc comment and conventions §9), so there
 * is no controlled example here.
 *
 * Base UI has no `asChild`; triggers and footer buttons compose the kit
 * `Button` via the `render` prop instead (dialog.tsx divergence 4):
 * `<DialogTrigger render={<Button variant="secondary" />}>Open</DialogTrigger>`.
 *
 * The smoke backdrop, open/close fade + zoom motion, and focus trap are
 * interactive states a static server render can't capture — click a trigger
 * to see them. Note the portal mounts the popup on `document.body`, outside
 * the Dark panel's `.dark` scope, so the popup itself follows the page theme,
 * not the panel (a known portal behavior; see e2e/select.spec.ts).
 */

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-wrap items-start gap-4">
      {/* Basic — title + description + cancel/confirm footer */}
      <Dialog>
        <DialogTrigger render={<Button variant="secondary" />}>
          Delete repository
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this repository?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The repository and all of its
              contents will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Cancel
            </DialogClose>
            <DialogClose render={<Button variant="destructive" />}>
              Delete
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form — Label + Input fields inside the dialog body */}
      <Dialog>
        <DialogTrigger render={<Button variant="secondary" />}>
          Edit profile
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you are done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={id("name")}>Name</Label>
              <Input id={id("name")} defaultValue="Ada Lovelace" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={id("username")}>Username</Label>
              <Input id={id("username")} defaultValue="@ada" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Cancel
            </DialogClose>
            <DialogClose render={<Button />}>Save changes</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer actions only — no built-in ✕, dismiss via explicit buttons */}
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Terms of service
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Terms of service</DialogTitle>
            <DialogDescription>
              Please review the terms before continuing. You must accept or
              decline using the actions below.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-foreground">
            By continuing you agree to the acceptable-use policy and the data
            processing addendum. This example hides the built-in close button
            (<code>showCloseButton=&#123;false&#125;</code>) so dismissal goes
            through the explicit footer actions.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Decline
            </DialogClose>
            <DialogClose render={<Button />}>Accept</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DialogPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Dialog</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. A basic confirm dialog, a form
            dialog, and a footer-actions-only dialog without the built-in close
            button. Click a trigger to open the modal — the popup portals to
            the document body, so it follows the page theme rather than the
            panel.
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
