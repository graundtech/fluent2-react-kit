import NextLink from "next/link";
import type { Metadata } from "next";

import { version } from "@graundtech/fluent2-react-kit";
import { Avatar, AvatarFallback } from "@kit/components/ui/avatar";
import { Badge } from "@kit/components/ui/badge";
import { Button } from "@kit/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@kit/components/ui/card";
import { Input } from "@kit/components/ui/input";
import { Label } from "@kit/components/ui/label";
import { Link } from "@kit/components/ui/link";
import { Separator } from "@kit/components/ui/separator";
import { Spinner } from "@kit/components/ui/spinner";

import { ThemeToggle } from "../components/theme-toggle";

/**
 * Showcase home page for the Fluent 2 React Kit demo. Server Component —
 * every kit import goes through the `@kit/*` alias (-> packages/react/src/*),
 * same as the `/preview/<name>` routes, per docs/component-conventions.md §8.
 * `ThemeToggle` is the one client boundary on the page; a Server Component
 * rendering a Client Component child needs no directive of its own.
 */

const PREVIEWS = [
  "accordion",
  "alert",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "card",
  "checkbox",
  "combobox",
  "command",
  "dialog",
  "dropdown-menu",
  "input",
  "label",
  "link",
  "multi-select",
  "overflow",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "ribbon",
  "ribbon-collapse",
  "select",
  "separator",
  "skeleton",
  "spinner",
  "split-button",
  "switch",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "toolbar",
  "tooltip",
] as const;

// Kept identical to the constant in scripts/build-registry.mjs — see
// docs/registry.md for why these two must stay in sync.
const REGISTRY_BASE_URL = "https://fluent2-react-kit.graund.io";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Fluent 2 React Kit — Fluent-inspired components, source-owned",
    description:
      "Accessible, themeable React components with shadcn-style APIs. Copy the source from the registry or install the npm package.",
  },
};

export default function DemoPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-20 px-6 py-16">
        {/* ------------------------------------------------------------ */}
        {/* Hero                                                          */}
        {/* ------------------------------------------------------------ */}
        <header className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge variant="outline">v{version}</Badge>
              <h1 className="text-title1 font-semibold">Fluent 2 React Kit</h1>
              <p className="max-w-xl text-muted-foreground">
                Fluent 2-inspired components with shadcn/ui&apos;s APIs — copy
                the source via a registry, or install the package. Themeable,
                accessible, and built on Tailwind CSS v4.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <p className="text-sm text-muted-foreground">
            Fluent 2-inspired. Not affiliated with Microsoft.
          </p>
        </header>

        {/* ------------------------------------------------------------ */}
        {/* Composed sample — components working together                */}
        {/* ------------------------------------------------------------ */}
        <section aria-labelledby="sample-heading" className="space-y-4">
          <h2 id="sample-heading" className="text-xl font-semibold">
            Built from the same parts
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            A small product snippet, assembled entirely from kit components —
            no bespoke CSS.
          </p>

          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <CardTitle>Jamie Diaz</CardTitle>
                  <CardDescription>jamie@northwind.example</CardDescription>
                </div>
              </div>
              <CardAction>
                <Badge variant="success">Active</Badge>
              </CardAction>
            </CardHeader>

            <Separator />

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="workspace-name" required>
                  Workspace name
                </Label>
                <Input id="workspace-name" defaultValue="Northwind Traders" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-plan">Plan</Label>
                <Input id="workspace-plan" defaultValue="Team" />
              </div>
              <p className="text-sm text-muted-foreground">
                Not sure what fits?{" "}
                <Link asChild variant="inline">
                  <NextLink href="/preview/card">Compare plans</NextLink>
                </Link>
                .
              </p>
            </CardContent>

            <Separator />

            <CardFooter className="items-center justify-between">
              <Spinner size="sm" label="Syncing changes…" />
              <div className="flex gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Create workspace</Button>
              </div>
            </CardFooter>
          </Card>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Component grid                                                */}
        {/* ------------------------------------------------------------ */}
        <section aria-labelledby="previews-heading" className="space-y-4">
          <h2 id="previews-heading" className="text-xl font-semibold">
            Browse every component
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Each preview renders every variant and size, in both light and
            dark, on <code className="font-mono text-foreground">bg-background</code>.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {PREVIEWS.map((name) => (
              <Link
                key={name}
                asChild
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground no-underline shadow-2 transition-colors duration-fast ease-ease hover:bg-accent hover:text-accent-foreground hover:no-underline"
              >
                <NextLink
                  href={`/preview/${name}`}
                  className="flex items-center justify-between"
                >
                  <span className="capitalize">{name}</span>
                  <span aria-hidden="true">&rarr;</span>
                </NextLink>
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Registry install                                              */}
        {/* ------------------------------------------------------------ */}
        <section aria-labelledby="registry-heading" className="space-y-4 pb-8">
          <h2 id="registry-heading" className="text-xl font-semibold">
            Install via the shadcn registry
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Every component ships as a registry item — point the shadcn CLI
            at this deployment to copy a component&apos;s source straight
            into your project, no package dependency required.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 shadow-2">
            <code className="font-mono text-sm text-card-foreground">
              npx shadcn@latest add {REGISTRY_BASE_URL}/r/button.json
            </code>
          </pre>
          <p className="text-sm text-muted-foreground">
            Swap{" "}
            <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-foreground">
              button
            </code>{" "}
            for any item name — every kit component, plus{" "}
            <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-foreground">
              theme
            </code>{" "}
            (the Fluent 2 design tokens) and{" "}
            <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-foreground">
              utils
            </code>{" "}
            (the <code className="font-mono">cn()</code> helper). Install{" "}
            <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-foreground">
              theme
            </code>{" "}
            first — every component assumes its tokens are present.
          </p>
        </section>
      </div>
    </main>
  );
}
