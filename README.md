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
- **Tested** — every component ships with Vitest + Testing Library unit tests and an `axe-core` accessibility check (155 tests across the kit today).

Read the full product vision in [`docs/vision.md`](docs/vision.md).

## Quick start

### Using the components (consumers)

**Option A — shadcn registry (recommended).** Point the shadcn CLI at this kit's registry to copy component source directly into your project:

```bash
# 1. Install the token theme first — every component assumes it's present.
npx shadcn@latest add <registry-url>/r/theme.json

# 2. Install any component.
npx shadcn@latest add <registry-url>/r/button.json
```

> `<registry-url>` is the deployed demo's production domain. **The registry is not yet deployed to a stable production URL** — see [`docs/registry.md`](docs/registry.md) for the current placeholder and how to use the kit locally in the meantime.

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

All items below are at **v0.1.0**.

| Item | Type | Notes |
| --- | --- | --- |
| `theme` | tokens | Light, dark, and high-contrast CSS variable layer + Tailwind v4 bridge |
| `utils` | lib | The `cn()` class-merging helper (`clsx` + `tailwind-merge`) |
| `avatar` | component | Image-with-fallback, built on `@base-ui/react/avatar` |
| `badge` | component | 6 variants: default, secondary, destructive, outline, success, warning |
| `button` | component | 6 variants × 6 sizes, brand state ramp, `asChild` |
| `card` | component | 7-part composable card (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`) |
| `input` | component | Text field with the Fluent bottom-accent focus treatment |
| `label` | component | Native `<label>`, optional `required` asterisk |
| `link` | component | 2 variants (default, inline), `asChild` |
| `separator` | component | Horizontal/vertical divider |
| `spinner` | component | Fluent arc-style loading indicator, 4 sizes |

That's **9 components + `utils` + `theme`**, all documented in the live demo (`pnpm demo:dev` → `/preview/<name>`). Naming and API conventions are normative in [`docs/component-conventions.md`](docs/component-conventions.md).

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
