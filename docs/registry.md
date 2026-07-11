# The registry

This kit distributes components the way shadcn/ui does: as a [shadcn registry](https://ui.shadcn.com/docs/registry) the `shadcn` CLI can install directly into a consumer's project. This doc explains how that registry is built from source and how to install from it. For the fragment file format itself (the thing you edit when adding an item), see [`registry/items/README.md`](../registry/items/README.md).

## End-to-end flow

```
registry/items/<name>.json   (fragment — hand-authored, source of truth)
          │
          │  pnpm build:registry  (scripts/build-registry.mjs)
          ▼
apps/demo/public/r/<name>.json   (full registry item — generated, gitignored)
apps/demo/public/r/registry.json (registry index — generated, gitignored)
          │
          │  next build  (serves public/ as static files)
          ▼
<deployment>/r/<name>.json   (what the shadcn CLI fetches)
```

### 1. Fragments (`registry/items/*.json`)

A fragment is a hand-written, minimal description of one registry item — its metadata (`name`, `type`, `title`, `description`), its npm/registry dependencies, and a `files` array that **points at** the real source file in the monorepo (e.g. `packages/react/src/components/ui/button.tsx`) rather than embedding its content. This keeps fragments small, diff-friendly, and free of merge conflicts when multiple components are added in parallel — full rationale and the field-by-field schema are in [`registry/items/README.md`](../registry/items/README.md).

### 2. The build script (`scripts/build-registry.mjs`)

`pnpm build:registry` runs `node scripts/build-registry.mjs`, a zero-dependency Node script that:

1. Reads every `registry/items/*.json` fragment and validates it (required fields, valid `type`, filename-matches-`name`, no duplicate names).
2. **Inlines file content** — reads each fragment's referenced source file(s) from disk and embeds the content directly into the emitted JSON, so the shadcn CLI can write it straight into a consumer's project without a second fetch.
3. **Rewrites relative imports.** The shadcn CLI's import-rewriting only understands `@/`-prefixed specifiers (against the consumer's configured path aliases); it ships a raw relative import like `../../lib/utils` verbatim, and that path resolves to nothing in a consumer's project. The build script rewrites every `from "../../lib/utils"` to `from "@/lib/utils"` in the emitted content only — component source in `packages/react/src` keeps the relative import so it still compiles inside this monorepo.
4. **Rewrites `registryDependencies` to absolute URLs.** A fragment lists dependencies on other kit items by bare name (e.g. `"registryDependencies": ["utils"]`), which keeps fragments portable. But a bare name in the *emitted* output would resolve against `ui.shadcn.com` in the CLI's dependency resolver, not against this kit's registry. The build script rewrites each bare name to `<REGISTRY_BASE_URL>/r/<name>.json` (full `http(s)://` entries — links to other registries — pass through untouched).
5. **Emits** `apps/demo/public/r/<name>.json` per item (full content, ready to install) and `apps/demo/public/r/registry.json` (the index — same metadata, no embedded file content, per the [`registry.json` schema](https://ui.shadcn.com/schema/registry.json)).

The script fails loudly (non-zero exit, every problem listed) on invalid fragments, name collisions, or a referenced source file that doesn't exist — nothing partial gets written.

`apps/demo/public/r/` is **generated and gitignored**; it's rebuilt fresh on every `pnpm build`. This step must run *before* `next build`, because Next only serves what already exists in `public/` at build time — see [`VERCEL_PIPELINE.md`](../VERCEL_PIPELINE.md) for why this ordering matters in the deploy pipeline.

### 3. Serving

The demo app (`apps/demo`) is a plain Next.js app; `apps/demo/public/r/*.json` is served as static files at `/r/*.json` with no custom route handler. Whatever domain the demo is deployed to *is* the registry's origin.

## Installing from the registry (consumers)

Install the token theme first — every component assumes its CSS variables are already present — then any components you need:

```bash
npx shadcn@latest add <registry-url>/r/theme.json
npx shadcn@latest add <registry-url>/r/button.json
npx shadcn@latest add <registry-url>/r/card.json
```

The `utils` item (the `cn()` helper) is pulled in automatically as a `registryDependency` of every component — you don't need to install it explicitly, though `npx shadcn@latest add <registry-url>/r/utils.json` works too if you want it on its own.

Swap `button` / `card` for any item name in the [component status table](../README.md#component-status).

## The `REGISTRY_BASE_URL` constant

The registry is deployed at **`https://fluent2-react-kit.graund.io`**. Two source files each hardcode this value as an identically-named constant, and both must be updated together if the production domain ever changes:

| File | Constant | Used for |
| --- | --- | --- |
| `apps/demo/app/page.tsx` | `REGISTRY_BASE_URL` (`"https://fluent2-react-kit.graund.io"`) | The copy-paste `npx shadcn add …` snippet shown on the demo's landing page |
| `scripts/build-registry.mjs` | `REGISTRY_BASE_URL` (same value) | Rewriting bare `registryDependencies` names to absolute URLs at build time (step 4 above) |

They are **not** wired to a shared config or env var today — updating one without the other will desync the install snippet shown on the demo page from the URLs actually baked into the generated registry JSON, so treat them as a single coordinated edit.

For local development, `pnpm demo:dev` still installs from a local registry (`http://localhost:3000/r/<name>.json`) — only the deployed constants above point at the production domain.

## Adding a new registry item

Adding a fragment is part of adding a component, not a separate task — see [`registry/items/README.md`](../registry/items/README.md) for the full fragment schema and [`docs/component-conventions.md`](component-conventions.md) §7 for the checklist (what `dependencies`, `registryDependencies`, and `files` should contain for a typical UI component). In short: one file, `registry/items/<name>.json`, whose filename stem matches its `name` field exactly, validated by re-running `pnpm build:registry`.

## Publishing to the shadcn Registry Directory

Once the kit has a stable production deployment, the natural next step is submitting it to the [shadcn Registry Directory](https://ui.shadcn.com/docs/directory) so it's discoverable alongside other community registries. This is a **post-deployment step** — it requires the `REGISTRY_BASE_URL` placeholder above to already point at a real, stable domain, since the directory listing links directly to `registry.json`. Tracked in [`docs/status-and-backlog.md`](status-and-backlog.md).

## Related docs

- [`registry/items/README.md`](../registry/items/README.md) — the fragment schema reference (required when adding an item).
- [`docs/component-conventions.md`](component-conventions.md) — the full checklist for adding a component, including its registry fragment.
- [`VERCEL_PIPELINE.md`](../VERCEL_PIPELINE.md) — why `build:registry` must run before `next build`, and the deploy pipeline this all feeds.
- [`docs/status-and-backlog.md`](status-and-backlog.md) — tracks the `REGISTRY_BASE_URL` TODO and the directory submission step.
