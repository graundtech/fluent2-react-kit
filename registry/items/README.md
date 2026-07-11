# Registry item fragments

This directory holds one **fragment** per registry item. A fragment is a plain
JSON file describing a shadcn registry item *without* embedding file content —
it points at the real source file in the monorepo instead. `scripts/build-registry.mjs`
reads every fragment here, inlines the referenced source files, and emits the
schema-conformant JSON that `apps/demo/public/r/` serves.

JSON has no comments, so the field reference lives here instead of inline.

## Why fragments, not embedded content

Multiple agents add components in parallel. If registry items embedded file
content directly, every component addition would touch a shared JSON blob and
conflict constantly. Instead:

- Each item is its own file: `registry/items/<name>.json`.
- The fragment references the source file's real path in the repo
  (e.g. `packages/react/src/components/ui/button.tsx`) and never duplicates
  its content.
- The build script (`pnpm build:registry`) inlines content at build time, right
  before `next build` runs, so `apps/demo/public/r/*.json` is always generated
  fresh from the current source.

**One fragment file per registry item. Do not edit other fragments — add your own.**

## File naming

The fragment's filename **must** be `<name>.json`, matching the top-level
`"name"` field exactly (e.g. `name: "button"` → `registry/items/button.json`).
The build script rejects a mismatch.

## Fragment schema

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `name` | yes | string | Unique registry item name (kebab-case). Must equal the filename stem. |
| `type` | yes | string | One of the shadcn `registry:*` types: `registry:lib`, `registry:ui`, `registry:component`, `registry:block`, `registry:hook`, `registry:page`, `registry:file`, `registry:style`, `registry:base`, `registry:theme`, `registry:font`, `registry:item`. |
| `title` | yes | string | Short human-readable title. |
| `description` | yes | string | One or two sentences describing what the item does. |
| `files` | yes | array (non-empty) | See **Files** below. |
| `author` | no | string | Recommended format: `Name <url>`. |
| `dependencies` | no | string[] | npm package names the installed code needs (e.g. `"clsx"`). Pin a version only if the item truly requires an exact one (`"clsx@2.1.1"`). |
| `devDependencies` | no | string[] | Same shape as `dependencies`, for dev-only packages. |
| `registryDependencies` | no | string[] | Names of other registry items this one depends on (e.g. `"utils"`), or full URLs to items in other registries. Keep names **bare** in the fragment — the build script rewrites each bare name to an absolute URL under this registry's origin (`<REGISTRY_BASE_URL>/r/<name>.json`) in the generated output, so the shadcn CLI resolves it against **our** registry rather than ui.shadcn.com. Entries that are already full `http(s)://` URLs pass through untouched. |
| `categories` | no | string[] | Free-form tags for browsing/filtering. |
| `docs` | no | string | Markdown shown to consumers after install (special instructions, etc.). |
| `meta` | no | object | Free-form metadata passthrough. |
| `cssVars` | no | object | `{ theme?, light?, dark? }` — see **cssVars / css / theme items** below. |
| `css` | no | object | Raw CSS rules (`@layer`, `@keyframes`, `@utility`, `@plugin`, selectors) to merge into the consumer's CSS. |
| `envVars` | no | object | Key/value env vars to append to the consumer's `.env`. |

### Files

Each entry in `files`:

| Field | Required | Notes |
| --- | --- | --- |
| `path` | yes | Source file path **relative to the repo root**, e.g. `packages/react/src/components/ui/button.tsx`. Must exist — the build fails loudly if it doesn't. |
| `target` | yes (fragment convention) | Install path in the consumer's project, e.g. `components/ui/button.tsx` or `lib/utils.ts`. This is what actually lands in the user's app. |
| `type` | no | Per-file registry type, same enum as the item `type`. Omit to inherit the item's top-level `type` — only set this when one item bundles files of different kinds (e.g. a block with a component + a hook). |

The build script inlines each source file's content and writes the emitted
file entry as `{ path: target, type, target, content }` — `path` mirrors
`target` since this registry has no `registry/<style>/...` subtree.

## Minimal example: a hypothetical `button` UI item

```json
{
  "name": "button",
  "type": "registry:ui",
  "title": "Button",
  "description": "A Fluent 2-styled button with variant and size props.",
  "dependencies": ["class-variance-authority"],
  "registryDependencies": ["utils"],
  "files": [
    {
      "path": "packages/react/src/components/ui/button.tsx",
      "target": "components/ui/button.tsx"
    }
  ]
}
```

Save this as `registry/items/button.json`.

## cssVars / css / theme items

Two ways to ship design tokens through the registry, matching the shadcn
schema:

1. **A component that needs its own tokens** — add a `cssVars` block to that
   component's fragment. Keys omit the leading `--`:

   ```json
   "cssVars": {
     "theme": { "font-sans": "Segoe UI, sans-serif" },
     "light": { "brand": "oklch(0.7 0.15 250)" },
     "dark": { "brand": "oklch(0.6 0.15 250)" }
   }
   ```

   The shadcn CLI merges these into the consumer's CSS file on install.

2. **A dedicated tokens/theme package** (for the upcoming Fluent 2 tokens
   work) — create a fragment with `"type": "registry:theme"`, and put the
   full token set under `cssVars.theme` / `cssVars.light` / `cssVars.dark`.

   > Current limitation: the build script requires every fragment's `files`
   > array to be non-empty (see `scripts/build-registry.mjs`). A pure
   > `registry:theme` fragment with cssVars only and no files will fail
   > validation as written today. Until the script is relaxed for
   > `registry:theme`/`registry:style` types, give the tokens fragment at
   > least one real file — e.g. reference
   > `packages/react/src/styles/tokens.css` itself with a `target` like
   > `styles/fluent2-tokens.css` — even if the meaningful payload is the
   > `cssVars` block. Flag this to the registry owner if it's a blocker.

## Build output (generated, do not hand-edit)

`pnpm build:registry` reads every fragment here and writes:

- `apps/demo/public/r/<name>.json` — one full registry-item JSON per fragment,
  with source content inlined.
- `apps/demo/public/r/registry.json` — the registry index listing all items
  (no embedded file content).

`apps/demo/public/r/` is gitignored — it's rebuilt on every `pnpm build`.
