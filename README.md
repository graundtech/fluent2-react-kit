# Fluent 2 React Kit

Fluent 2-inspired, shadcn-style React components — copy the source via a registry, or install the package. Built on Tailwind CSS v4 and CSS variables.

> **Disclaimer.** This project is **inspired by Microsoft's Fluent 2 design language**. It is an **independent, community-built open-source project** and is **not affiliated with, sponsored by, or endorsed by Microsoft**. "Fluent" and "Segoe UI" are Microsoft trademarks, referenced here only to describe the visual/behavioral inspiration. **No Fluent UI source code is used** — every token and component in this kit is an original implementation derived from publicly documented Fluent 2 design values (see [`docs/design/tokens-research.md`](docs/design/tokens-research.md) for provenance).

## What this is

`@graundtech/fluent2-react-kit` gives you Fluent 2's visual language with shadcn/ui's developer experience:

- **Fluent 2 aesthetics** — brand blue, flat surfaces, Fluent's radius/elevation/motion scale, Segoe UI-first type stack, all derived from public Fluent 2 design tokens.
- **shadcn/ui philosophy and APIs** — plain function components, `cva` variants, `data-slot` hooks, `asChild` polymorphism, the same prop names (`variant`, `size`, …) shadcn/ui users already know.
- **Registry-first distribution** — every component is a [shadcn registry](https://ui.shadcn.com/docs/registry) item. Install via `npx shadcn add` and get the source copied straight into your project — no runtime dependency required. A traditional npm package is also available.
- **Tailwind v4 + CSS variables** — one token layer (`tokens.css`) drives everything through a Tailwind v4 `@theme inline` bridge. No config-file theming; override CSS custom properties instead.
- **Light, dark, and high-contrast themes** — `.dark` and `.high-contrast` classes, plus automatic `forced-colors` support for Windows high-contrast mode.
- **Tested** — every component ships with Vitest + Testing Library unit tests and an `axe-core` accessibility check (278 tests across the kit today).

Read the full product vision in [`docs/vision.md`](docs/vision.md).

## Quick start

### Using the components (consumers)

**Option A — shadcn registry (recommended).** Point the shadcn CLI at this kit's registry to copy component source directly into your project.

If this is a fresh project, run `init` first (CLI 4.13+ uses presets, not a `--base-color` flag — any preset works, the theme item overrides it):

```bash
npx shadcn@latest init
```

> **Clean up after `init`.** `shadcn init` seeds your global CSS with its own competing theme — delete it before installing `theme`, or it silently wins the cascade over Fluent's tokens. Short version: your global CSS should end up as just `@import "tailwindcss";` followed by the Fluent tokens import, nothing else. Full before/after: [`docs/registry.md`](docs/registry.md#cleaning-up-after-shadcn-init).

Then install the token theme, then any components:

```bash
# 1. Install the token theme first — every component assumes it's present.
npx shadcn@latest add <registry-url>/r/theme.json --yes --overwrite

# 2. Install any component.
npx shadcn@latest add <registry-url>/r/button.json --yes --overwrite
```

> `--yes --overwrite` — `init` pre-creates files like `button.tsx` and `lib/utils.ts` from its preset, so `add` prompts to overwrite them per file; `--overwrite` accepts, and `--yes` is required for that flag to apply non-interactively (scripted installs and CI should always pass both, or the batch hangs/skips files).

> `<registry-url>` is the deployed demo's production domain, `https://fluent2-react-kit.graund.io` — see [`docs/registry.md`](docs/registry.md) for how that constant is wired up and how to point at a local registry (`pnpm demo:dev`) instead.

> [!WARNING]
> **Using Fluent icons in your own components?** Any `@fluentui/react-icons` import must live inside a `"use client"` module. The icons package calls a client-only Griffel styling API at module scope, so importing an icon into a Server Component (e.g. dropping one inside your own `<Alert>` on a Next.js App Router page) fails `next build`. Kit components that ship with icons already carry `"use client"` — this only bites icons *you* import directly.

**Named registry alias.** Configure a short alias once in `components.json` so you can install with `npx shadcn add @fluent2-react-kit/<name>` instead of the full URL:

```json
// components.json
{
  "registries": {
    "@fluent2-react-kit": "https://fluent2-react-kit.graund.io/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @fluent2-react-kit/theme --yes --overwrite
npx shadcn@latest add @fluent2-react-kit/button --yes --overwrite
```

**Option B — npm package.** Install `@graundtech/fluent2-react-kit` and import the token stylesheet:

```bash
npm install @graundtech/fluent2-react-kit
```

```css
/* globals.css */
@import "tailwindcss";
@import "@graundtech/fluent2-react-kit/tokens.css";
```

Full theming details: [`docs/tokens.md`](docs/tokens.md).

### Working on this repo (contributors)

```bash
pnpm install
pnpm build        # builds the package, the registry, then the demo
pnpm test          # runs the component test suite (Vitest + axe)
pnpm demo:dev      # runs the demo/showcase app locally
```

See [`docs/contributing.md`](docs/contributing.md) for the full contributor workflow, including how to add a new component.

## Component status

All items below are at **v0.2.0**.

| Item | Type | Notes |
| --- | --- | --- |
| `theme` | tokens | Light, dark, and high-contrast CSS variable layer + Tailwind v4 bridge |
| `utils` | lib | The `cn()` class-merging helper (`clsx` + `tailwind-merge`) |
| `alert` | component | 5 variants (default, destructive, success, warning, info), MessageBar-style icon + title accent |
| `avatar` | component | Image-with-fallback, built on `@base-ui/react/avatar` |
| `badge` | component | 6 variants: default, secondary, destructive, outline, success, warning |
| `button` | component | 6 variants × 6 sizes, brand state ramp, `asChild` |
| `card` | component | 7-part composable card (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`) |
| `checkbox` | component | Checked/unchecked/indeterminate, built on `@base-ui/react/checkbox` |
| `input` | component | Text field with the Fluent bottom-accent focus treatment |
| `label` | component | Native `<label>`, optional `required` asterisk |
| `link` | component | 2 variants (default, inline), `asChild` |
| `progress` | component | Fluent-thin (2px) determinate/indeterminate bar, built on `@base-ui/react/progress` |
| `radio-group` | component | Roving-tabindex radio group (`RadioGroup`, `RadioGroupItem`), built on `@base-ui/react/radio-group` |
| `select` | component | 9-part composable select (trigger, popup, groups, scroll buttons), built on `@base-ui/react/select` |
| `separator` | component | Horizontal/vertical divider |
| `skeleton` | component | Loading placeholder, `animate-pulse` fill |
| `spinner` | component | Fluent arc-style loading indicator, 4 sizes |
| `switch` | component | Fluent Toggle Switch look (outlined unchecked track), built on `@base-ui/react/switch` |
| `textarea` | component | Multi-line text field, matches `input`'s focus treatment |

That's **17 components + `utils` + `theme`**, all documented in the live demo (`pnpm demo:dev` → `/preview/<name>`). Naming and API conventions are normative in [`docs/component-conventions.md`](docs/component-conventions.md).

For what's planned next — more components, known TODOs, and open backlog — see [`docs/status-and-backlog.md`](docs/status-and-backlog.md).

## Monorepo structure

```
.
├── apps/
│   └── demo/                        # Next.js showcase app, deployed to Vercel
│       ├── app/
│       │   ├── page.tsx             # Landing page (hero, sample composition, registry install snippet)
│       │   └── preview/<name>/      # One route per registry item, renders every variant/size
│       └── public/r/                # Generated registry output (gitignored, built by pnpm build:registry)
├── packages/
│   └── react/                       # @graundtech/fluent2-react-kit (the published package)
│       └── src/
│           ├── components/ui/       # <name>.tsx + <name>.test.tsx per component
│           ├── lib/utils.ts         # cn() helper
│           ├── styles/tokens.css    # the Fluent 2 → shadcn token layer
│           ├── test/                # Vitest setup + shared a11y test
│           └── index.ts             # package barrel (exports + `version`)
├── registry/
│   └── items/                       # One fragment per registry item (<name>.json)
├── scripts/
│   └── build-registry.mjs           # Fragments -> apps/demo/public/r/*.json
├── docs/                            # This documentation set
├── package.json                     # Root workspace scripts + packageManager (pnpm)
├── pnpm-workspace.yaml               # Declares packages/* and apps/*
└── vercel.json                      # Release pipeline config (root-directory build)
```

The Vercel release pipeline depends on this exact layout — read [`VERCEL_PIPELINE.md`](VERCEL_PIPELINE.md) before restructuring folders.

## Documentation

| Doc | What it covers |
| --- | --- |
| [`docs/vision.md`](docs/vision.md) | Product vision, target use cases, source-precedence hierarchy, rendering philosophy |
| [`docs/registry.md`](docs/registry.md) | How the registry build works end-to-end, and how to install from it |
| [`docs/tokens.md`](docs/tokens.md) | The design token system: layers, theming, customization |
| [`docs/status-and-backlog.md`](docs/status-and-backlog.md) | Current status and the full component/infra backlog |
| [`docs/contributing.md`](docs/contributing.md) | Contributor setup, scripts, PR expectations |
| [`docs/component-conventions.md`](docs/component-conventions.md) | The normative authoring contract every component follows |
| [`docs/design/tokens-research.md`](docs/design/tokens-research.md) | Token research and provenance (Fluent 2 → shadcn mapping decisions) |
| [`registry/items/README.md`](registry/items/README.md) | Registry fragment schema reference |
| [`VERCEL_PIPELINE.md`](VERCEL_PIPELINE.md) | The Vercel deployment pipeline and required folder structure |

## License

[MIT](LICENSE)
