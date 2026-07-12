import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@kit/components/ui/tabs";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Tabs preview — a basic 3-tab example, one with a disabled tab, and one with
 * inline icons, each rendered on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. `tabs.tsx` carries its own
 * `"use client"` (see its doc comment — `Tabs.Indicator` measures DOM layout
 * in an effect), so this route stays a plain Server Component; a Server
 * Component tree renders that client child directly.
 *
 * The sliding brand underline (`Tabs.Indicator`) needs real layout to
 * position itself, so it's only visible/animated once this page is actually
 * rendered in a browser — a static read of the markup won't show the slide.
 * Icons are inline `<svg>` per conventions §8 (no icon dependency in the demo
 * app).
 */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 9.5 10 3l7 6.5M5 8v8.5a.5.5 0 0 0 .5.5H8v-4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V17h2.5a.5.5 0 0 0 .5-.5V8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="2.5" />
      <path
        d="M10 3v2M10 15v2M17 10h-2M5 10H3M14.66 5.34l-1.41 1.41M6.75 13.25l-1.41 1.41M14.66 14.66l-1.41-1.41M6.75 6.75 5.34 5.34"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 8a5 5 0 0 1 10 0c0 3.5 1 4.5 1 4.5H4S5 11.5 5 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 15a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
    </svg>
  );
}

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid max-w-md gap-10">
      {/* Basic — 3 tabs with panels, default activation */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Basic</h3>
        <Tabs defaultValue="overview" aria-label={id("basic")}>
          <TabsList aria-label="Project sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-sm text-foreground">
              A summary of the project: status, owners, and recent milestones.
            </p>
          </TabsContent>
          <TabsContent value="activity">
            <p className="text-sm text-foreground">
              A chronological feed of comments, commits, and status changes.
            </p>
          </TabsContent>
          <TabsContent value="settings">
            <p className="text-sm text-foreground">
              Notification preferences, access control, and integrations.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Disabled tab — Settings is inert and unselectable */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          With a disabled tab
        </h3>
        <Tabs defaultValue="overview" aria-label={id("disabled")}>
          <TabsList aria-label="Project sections (one disabled)">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings" disabled>
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-sm text-foreground">
              Settings is disabled — it can&apos;t be focused, clicked, or
              reached with the arrow keys.
            </p>
          </TabsContent>
          <TabsContent value="activity">
            <p className="text-sm text-foreground">
              A chronological feed of comments, commits, and status changes.
            </p>
          </TabsContent>
          <TabsContent value="settings">
            <p className="text-sm text-foreground">
              Notification preferences, access control, and integrations.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* With icons — inline svg leading each label */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          With icons
        </h3>
        <Tabs defaultValue="home" aria-label={id("icons")}>
          <TabsList aria-label="Sections with icons">
            <TabsTrigger value="home" className="inline-flex items-center gap-1.5">
              <HomeIcon className="size-4" />
              Home
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="inline-flex items-center gap-1.5"
            >
              <BellIcon className="size-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="inline-flex items-center gap-1.5"
            >
              <SettingsIcon className="size-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="home">
            <p className="text-sm text-foreground">Your dashboard at a glance.</p>
          </TabsContent>
          <TabsContent value="notifications">
            <p className="text-sm text-foreground">
              Nothing new — you&apos;re all caught up.
            </p>
          </TabsContent>
          <TabsContent value="settings">
            <p className="text-sm text-foreground">
              Notification preferences, access control, and integrations.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function TabsPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Tabs</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. A transparent tab list with a
            sliding brand underline (not a muted pill) — basic, with a
            disabled tab, and with leading icons. Click a tab or focus one and
            press an arrow key, then Enter, to activate it.
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
