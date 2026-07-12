"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Progress } from "@kit/components/ui/progress";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Progress preview — determinate rows (0/33/66/100), a live ticking demo,
 * the indeterminate stand-in, and a thick variant reached via `className`
 * override, rendered on `bg-background` in both light and dark contexts.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`.
 *
 * This route carries `"use client"` — unlike every sibling preview page so
 * far — because the ticking demo genuinely needs client state
 * (`useState`/`useEffect` driving the value on an interval). `Progress`
 * itself stays server-safe (see progress.tsx); only this preview route pays
 * the client-boundary cost, and only to demonstrate the animated case.
 */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

function TickingDemo() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setValue((current) => (current >= 100 ? 0 : current + 10));
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <Row label={`Animated (ticking demo) — ${value}%`}>
      <Progress value={value} aria-label="Animated ticking demo" className="max-w-sm" />
    </Row>
  );
}

function PanelBody() {
  return (
    <div className="flex max-w-sm flex-col gap-6">
      <Row label="0%">
        <Progress value={0} aria-label="0 percent complete" />
      </Row>

      <Row label="33%">
        <Progress value={33} aria-label="33 percent complete" />
      </Row>

      <Row label="66%">
        <Progress value={66} aria-label="66 percent complete" />
      </Row>

      <Row label="100%">
        <Progress value={100} aria-label="100 percent complete" />
      </Row>

      <TickingDemo />

      <Row label="Intent variants (Fluent State axis)">
        <div className="flex flex-col gap-3">
          <Progress value={70} variant="default" aria-label="Default intent, 70 percent" />
          <Progress value={70} variant="success" aria-label="Success intent, 70 percent" />
          <Progress value={70} variant="warning" aria-label="Warning intent, 70 percent" />
          <Progress value={70} variant="destructive" aria-label="Destructive intent, 70 percent" />
        </div>
      </Row>

      <Row label="Indeterminate (value omitted — pulsing stand-in)">
        <Progress aria-label="Loading, progress unknown" />
      </Row>

      <Row label="Thick variant (className override — h-2, shadcn's default height)">
        <Progress value={66} aria-label="66 percent complete, thick variant" className="h-2" />
      </Row>
    </div>
  );
}

export default function ProgressPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Progress</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals (a thin 2px determinate bar), shadcn API
            (`value` 0-100). Omit `value` (or pass `null`) for the
            indeterminate state.
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
