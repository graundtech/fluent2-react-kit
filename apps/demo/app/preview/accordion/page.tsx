import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@kit/components/ui/accordion";

import { PreviewPanel } from "../../../components/preview-panel";

/**
 * Accordion preview — a single-mode 3-item FAQ, a multiple-mode example, and
 * a disabled-item example, rendered on `bg-background` in light and dark.
 *
 * Imported through the `@kit/*` tsconfig alias (-> packages/react/src/*),
 * which Next resolves via `transpilePackages`. This route is itself a plain
 * Server Component — it holds no client state of its own. `accordion.tsx`
 * *does* carry `"use client"` (its `@fluentui/react-icons` chevron import
 * forces it — see the component's doc comment and conventions §9), but
 * that's the component's own client boundary: a Server Component tree
 * renders that client child directly, so this page needs no `"use client"`
 * of its own.
 *
 * The open/closed panel state and the chevron rotation are interactive
 * states a static server render can't capture — click a trigger to open a
 * panel.
 */

function PanelBody({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid max-w-lg gap-10">
      {/* Single mode (default) — a 3-item FAQ, opening one closes the rest */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Single (default) — FAQ
        </h3>
        <Accordion defaultValue={[id("faq-1")]}>
          <AccordionItem value={id("faq-1")}>
            <AccordionTrigger>Is this component accessible?</AccordionTrigger>
            <AccordionContent>
              Yes — triggers are real buttons with `aria-expanded`, panels
              carry `role=&quot;region&quot;` labelled by their trigger, and
              the whole component ships with axe-clean tests.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={id("faq-2")}>
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              It comes with Fluent 2 default styling that matches the rest of
              this kit, built on top of Base UI&apos;s unstyled Accordion
              primitive.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={id("faq-3")}>
            <AccordionTrigger>Can it be animated?</AccordionTrigger>
            <AccordionContent>
              Yes — the panel height animates open/closed using Base UI&apos;s
              own `--accordion-panel-height` CSS variable and the kit&apos;s
              motion tokens.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Multiple mode — several items can stay open at once */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Multiple — several open at once
        </h3>
        <Accordion multiple defaultValue={[id("multi-1"), id("multi-2")]}>
          <AccordionItem value={id("multi-1")}>
            <AccordionTrigger>First section</AccordionTrigger>
            <AccordionContent>
              Both this panel and the next can be open at the same time when
              `multiple` is set.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={id("multi-2")}>
            <AccordionTrigger>Second section</AccordionTrigger>
            <AccordionContent>
              Toggling one item never closes the others in multiple mode.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={id("multi-3")}>
            <AccordionTrigger>Third section</AccordionTrigger>
            <AccordionContent>
              Click to expand this section alongside the others.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Disabled item — one item inert, the rest interactive */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          With a disabled item
        </h3>
        <Accordion>
          <AccordionItem value={id("plan-free")}>
            <AccordionTrigger>Free plan</AccordionTrigger>
            <AccordionContent>
              Basic features, community support, and up to 3 projects.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={id("plan-pro")}>
            <AccordionTrigger>Pro plan</AccordionTrigger>
            <AccordionContent>
              Everything in Free, plus unlimited projects and priority
              support.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={id("plan-enterprise")} disabled>
            <AccordionTrigger>Enterprise (contact sales)</AccordionTrigger>
            <AccordionContent>Unavailable in this preview.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

export default function AccordionPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-dvh space-y-10 bg-background px-6 py-12 text-foreground"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Accordion</h1>
          <p className="text-muted-foreground">
            Fluent 2 visuals, shadcn APIs. Single-mode FAQ, multiple-open, and
            a disabled item. Click a trigger to expand or collapse its panel.
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
