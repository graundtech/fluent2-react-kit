# Vercel release pipeline

This repo deploys to Vercel. There is **no CI workflow in the repo** — the pipeline is a
Vercel Git integration (push to the connected branch → Vercel builds and deploys). The build
config now lives in [`vercel.json`](./vercel.json) so it is versioned and reproducible.

> ⚠️ **Read this before restructuring folders.** The pipeline depends on the monorepo layout
> below. If you move, rename, or delete these paths, the Vercel build breaks.

## Required folder structure

The pipeline will only build if all of this is present and intact:

```
.
├── vercel.json                 # build/install/output config (see below)
├── package.json                # MUST keep "packageManager": "pnpm@11.9.0" + the build scripts
├── pnpm-workspace.yaml         # MUST declare: packages/* and apps/*
├── pnpm-lock.yaml              # committed lockfile (installCommand uses --frozen-lockfile)
├── .npmrc
├── apps/
│   └── demo/                   # the Next.js app that gets deployed
│       ├── package.json        # name: fluent2-react-kit-demo, has "build": "next build"
│       ├── next.config.mjs     # transpilePackages: ["@graundtech/fluent2-react-kit"]
│       └── app/                # App Router entry (layout.tsx, page.tsx)
└── packages/
    └── react/                  # the workspace package the demo imports
        ├── package.json        # name: @graundtech/fluent2-react-kit
        └── src/index.ts        # built by tsup into dist/
```

Key invariants:

- **`apps/demo` must build.** The demo imports `@graundtech/fluent2-react-kit`
  (`workspace:*`), so the package must build first. `pnpm build` does both, in order.
- **Package name stays `@graundtech/fluent2-react-kit`.** The demo's dependency,
  `next.config.mjs` `transpilePackages`, and `apps/demo/tsconfig.json` path alias all
  reference it by that exact name.
- **`pnpm-lock.yaml` must be committed and current.** The install command uses
  `--frozen-lockfile`; a stale lockfile fails the build. Re-run `pnpm install` and commit
  the lockfile after any dependency change.

## How the build runs

The Vercel project's **Root Directory is set to `apps/demo`** (project setting in the
dashboard, not in the repo). Commands therefore run inside `apps/demo`, and `vercel.json`
paths are relative to it:

| Setting | Value | Why |
| --- | --- | --- |
| `framework` | `nextjs` | So Vercel treats the output as a Next.js app |
| `installCommand` | `pnpm install --frozen-lockfile` | pnpm walks up and installs the whole workspace |
| `buildCommand` | `pnpm build` | Runs **`apps/demo`'s** build script (see below) |
| `outputDirectory` | `.next` | Relative to the Root Directory (`apps/demo/.next`) |

Because the build command runs in `apps/demo`, the demo's own `build` script is the release
build: `node ../../scripts/build-registry.mjs && next build`. The registry step is part of the
demo build precisely so it can never be skipped on Vercel — Next.js only serves what's already
in `apps/demo/public/` at build time, so if the registry JSON isn't generated before
`next build`, every `/r/*.json` 404s in production (this happened once; that's why the step
lives here and not only in the root `pnpm build` chain). The demo imports the workspace
package from source via `transpilePackages` + the tsconfig path alias, so `tsup` output is not
required for the deploy.

`node scripts/build-registry.mjs` reads the registry item fragments in `registry/items/*.json`,
inlines each item's source file, and writes the static JSON the shadcn CLI consumes to
`apps/demo/public/r/` (`registry.json` plus one `<name>.json` per item). The script resolves
all paths from its own file location, so it works from any working directory.
`apps/demo/public/r/` is a generated, gitignored directory; nothing there is committed. See
`registry/items/README.md` for the fragment format.

The root `pnpm build` (package → registry → demo) remains the local full-chain build; the
registry step running twice there is harmless (idempotent).

## Reestablishing the pipeline from scratch

If the Vercel project is gone or disconnected:

1. **Create/import the project** at <https://vercel.com/new>, selecting the
   `graundtech/fluent2-react-kit` GitHub repo.
2. **Root Directory:** set it to **`apps/demo`** (this is how the live project is configured;
   `vercel.json`'s `outputDirectory: ".next"` and the demo-level build script assume it).
   Enable "Include files outside the Root Directory" so the workspace install can see the
   whole monorepo.
3. **Build & install:** Vercel reads them from `vercel.json`, so the dashboard fields can be
   left on "override off" / default. If you configure them manually instead, match the table
   above.
4. **Package manager / Node:** pnpm is auto-detected from the `packageManager` field in the
   root `package.json`. Corepack picks up `pnpm@11.9.0`.
5. **Connect Git & pick the production branch** (`main`). Every push to it triggers a deploy;
   pull requests get preview deployments.
6. **Environment variables:** none are required by this scaffold today. Add any real ones in
   Vercel → Project → Settings → Environment Variables (they are not stored in the repo).
7. **Trigger a deploy** by pushing to `main` (or "Redeploy" in the dashboard) and confirm the
   build is green.

## Local sanity check (same steps as the pipeline)

```bash
pnpm install --frozen-lockfile
pnpm build
# builds packages/react (tsup), then the registry (apps/demo/public/r/*.json),
# then apps/demo (next build) -> apps/demo/.next
```

If that succeeds locally, the Vercel build will succeed too.
