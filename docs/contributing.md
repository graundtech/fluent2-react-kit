# Contributing

Thanks for considering a contribution to `@graundtech/fluent2-react-kit`. This doc covers setup, the scripts, and what a PR is expected to include. For the actual component authoring rules — file shapes, class strings, naming — [`docs/component-conventions.md`](component-conventions.md) is the normative doc; read it before writing component code.

## Prerequisites

- **Node ≥ 22**
- **pnpm 11.9** (the workspace pins `packageManager: pnpm@11.9.0` in the root `package.json`; Corepack picks this up automatically)

## Setup

```bash
git clone https://github.com/graundtech/fluent2-react-kit.git
cd fluent2-react-kit
pnpm install
```

## Scripts

Run from the repo root:

| Script | What it does |
| --- | --- |
| `pnpm build` | Builds the package, then the registry, then the demo — the same sequence the Vercel pipeline runs |
| `pnpm build:package` | Builds only `@graundtech/fluent2-react-kit` (`tsup`) |
| `pnpm build:registry` | Rebuilds `apps/demo/public/r/*.json` from `registry/items/*.json` |
| `pnpm build:demo` | Builds only the demo app (`next build`) |
| `pnpm demo:dev` | Runs the demo app locally (`next dev`) — browse component previews at `/preview/<name>` |
| `pnpm test` | Runs the package's Vitest suite |
| `pnpm typecheck` | Typechecks the package and the demo app |

Component-local scripts (run inside `packages/react`, or via the root scripts above): `test:watch` for interactive test runs.

## How to add a component

1. Read [`docs/component-conventions.md`](component-conventions.md) end to end — it's short and every rule in it is enforced by convention, not tooling, so deviating from it is easy to miss in review.
2. Follow its §0 checklist. You touch exactly four files (plus your own preview directory):
   - `packages/react/src/components/ui/<name>.tsx`
   - `packages/react/src/components/ui/<name>.test.tsx`
   - `registry/items/<name>.json`
   - `apps/demo/app/preview/<name>/page.tsx`
3. Run, from the repo root, and get everything green before opening a PR:
   ```bash
   pnpm typecheck && pnpm test && pnpm build:registry && pnpm build
   ```

Do **not** touch `packages/react/src/index.ts`, `src/lib/**`, `src/styles/**`, `src/test/setup.ts`, any other `registry/items/*.json`, `apps/demo/app/` outside your own preview directory, any `tsconfig`/`next.config`/`postcss.config`, or any `package.json`/lockfile/`vitest.config.ts`/`scripts/**` — these are shared files with hard boundaries (component-conventions.md §10), kept off-limits so parallel component work doesn't collide. New npm dependencies are not accepted for component work; everything a component needs (`class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `@base-ui/react`, `@fluentui/react-icons`) is already installed.

## Test requirements

**Vitest + `axe-core` are mandatory**, not optional, for every component. The minimum test checklist (component-conventions.md §6) covers: rendering and accessible name, `data-slot`/`data-variant`/`data-size` presence, each variant/size producing its distinguishing class, `className` merge behavior, primary interaction via `user-event`, disabled state, keyboard activation, `asChild` behavior (where supported), ref forwarding, the `<name>Variants(...)` helper, and an axe check (`toHaveNoAxeViolations()`) on the default state plus at least one secondary state (e.g. disabled/open). Use `button.test.tsx` as the template — it exercises every item on this list.

## Definition of Done

A component isn't done until all of the following are true (from the project brief):

- **Variants and states** implemented — every variant/size the component's Fluent 2 reference specifies, plus the standard interactive states (hover, pressed, focus, disabled, invalid where applicable).
- **Tests** — the full checklist above, passing.
- **Accessibility** — the checklist in component-conventions.md §5: axe-clean, keyboard-operable with a visible focus ring, native semantics preferred over ARIA, state never conveyed by color alone.
- **Registry entry** — a valid `registry/items/<name>.json` fragment that passes `pnpm build:registry`.
- **shadcn API** — component/prop naming matches shadcn/ui conventions (component-conventions.md §11), not Fluent's own naming.
- **Fluent 2 visuals** — the component reads as Fluent 2 (see [`docs/vision.md`](vision.md) for the source-precedence hierarchy that resolves ambiguous cases).
- **Light, dark, and high-contrast** all render correctly — no hardcoded colors, tokens only (component-conventions.md §3), verified visually in the demo preview in all three theme states.

## PR expectations

- Keep PRs scoped to one component (or one clearly-related change) — the shared-files boundary above exists specifically so component PRs don't conflict with each other.
- Include before/after or preview-route screenshots for visual changes when practical.
- Note in the PR description which parts of the Definition of Done you verified manually (e.g. "checked light/dark/high-contrast in the `/preview/<name>` route") versus what's covered by automated tests.
- If you deviate from `component-conventions.md` in any way, say so explicitly and explain why — silent deviation is the main thing review is watching for.

## Disclaimer rules for contributions

This project is independent and unaffiliated with Microsoft (see the [README](../README.md) disclaimer). Contributions must respect that:

- **No Microsoft/Fluent branding.** No `Fluent`/`F`-prefixed component or prop names, no Microsoft logos or trademarked assets, no claims of official affiliation or endorsement anywhere in code, docs, or the demo app.
- **No Fluent UI source code.** Do not copy code from `@fluentui/react` or any Microsoft Fluent UI repository. Visual/behavioral inspiration from Fluent 2's *publicly documented* design values (colors, spacing, motion timings, etc.) is the intended source material — see [`docs/design/tokens-research.md`](design/tokens-research.md) for how existing tokens were derived this way. If you're adding a new token or visual detail, derive it the same way: from a publicly documented design constant, not from reading Fluent UI's source.
- **"Segoe UI" and "Fluent" are Microsoft trademarks**, used in this repo only descriptively (to name the font stack / design language being referenced) — don't imply the project bundles or licenses these vs. referencing them by name in a system font stack.

## Related docs

- [`docs/component-conventions.md`](component-conventions.md) — the normative component-authoring contract (read this first).
- [`docs/vision.md`](vision.md) — why decisions get made the way they do (source-precedence hierarchy).
- [`docs/registry.md`](registry.md) — how the registry fragment you add fits into the build.
- [`docs/tokens.md`](tokens.md) — the token system your component styles against.
- [`docs/status-and-backlog.md`](status-and-backlog.md) — pick up a near-term or long-term backlog item here.
