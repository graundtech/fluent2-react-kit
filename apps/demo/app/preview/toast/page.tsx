"use client";

/**
 * Toast preview — SANCTIONED DEVIATION from conventions §8.
 *
 * Every other `/preview/<name>` route is a plain Server Component, but a toast
 * cannot be demonstrated without *firing* it, which requires client state (the
 * Base UI toast manager, `useToast().add`, and onClick handlers defined in this
 * file). So this page carries `"use client"` at the top — the deviation is
 * explicitly allowed for Toast in the build brief. Everything else follows the
 * pattern: the examples render inside `PreviewPanel` on `bg-background`, using
 * the kit `Button` as the fire triggers.
 *
 * Base UI toasts live in a manager scoped to `ToastProvider` and are rendered by
 * a caller-owned map over `useToast().toasts` (see toast.tsx's firing recipe) —
 * that map is `ToastList` below. The visual `variant` is stashed on each toast's
 * `data` payload and read back in the list.
 *
 * Note the portal caveat (same as select, see e2e/select.spec.ts): the toast
 * viewport portals to `document.body`, outside the `.light`/`.dark` PreviewPanel
 * scope, so a fired toast picks up the page-root theme, not the panel it was
 * fired from. Both fire panels share one Provider/Viewport for that reason.
 */

import { Button } from "@kit/components/ui/button";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToast,
} from "@kit/components/ui/toast";

import { PreviewPanel } from "../../../components/preview-panel";

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

type ToastData = {
  variant?: ToastVariant;
};

/** The caller-owned render loop over the manager's live `toasts` array. */
function ToastList() {
  const { toasts } = useToast();
  return (
    <>
      {toasts.map((toast) => {
        const data = toast.data as ToastData | undefined;
        const withAction = Boolean(
          (toast.data as { action?: boolean } | undefined)?.action
        );
        return (
          <Toast key={toast.id} toast={toast} variant={data?.variant}>
            <ToastTitle />
            <ToastDescription />
            {withAction ? (
              <ToastAction onClick={() => console.log("Undo clicked")}>
                Undo
              </ToastAction>
            ) : null}
            <ToastClose />
          </Toast>
        );
      })}
    </>
  );
}

/** Buttons that fire each example toast. */
function ToastTriggers() {
  const { add } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "Note",
            description: "This is a default notification.",
          })
        }
      >
        Default
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "Something went wrong",
            description: "Your changes could not be saved.",
            priority: "high",
            data: { variant: "destructive" },
          })
        }
      >
        Destructive
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "Changes saved",
            description: "Your profile was updated.",
            data: { variant: "success" },
          })
        }
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "Storage almost full",
            description: "You have used 90% of your quota.",
            data: { variant: "warning" },
          })
        }
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "New version available",
            description: "Refresh to get the latest features.",
            data: { variant: "info" },
          })
        }
      >
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "Message deleted",
            description: "The message was moved to Trash.",
            data: { variant: "default", action: true },
          })
        }
      >
        With action
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          add({
            title: "Copied to clipboard",
            data: { variant: "success" },
          })
        }
      >
        Title only
      </Button>
    </div>
  );
}

export default function ToastPreviewPage() {
  return (
    <ToastProvider>
      <main className="min-h-dvh space-y-8 bg-background p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Toast</h1>
          <p className="text-sm text-muted-foreground">
            Fire a toast from any button below. Toasts stack in the bottom-right;
            hover the stack to expand, click ✕ to dismiss, or swipe.
          </p>
        </div>

        <PreviewPanel title="Light" className="light">
          <ToastTriggers />
        </PreviewPanel>

        <PreviewPanel title="Dark" className="dark">
          <ToastTriggers />
        </PreviewPanel>
      </main>

      {/* One shared viewport for the whole page (portals to <body>). */}
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </ToastProvider>
  );
}
