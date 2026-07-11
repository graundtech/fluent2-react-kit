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
        └── src/index.tsx       # built by tsup into dist/
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

`vercel.json` drives it:

| Setting | Value | Why |
| --- | --- | --- |
| `framework` | `nextjs` | So Vercel treats the output as a Next.js app |
| `installCommand` | `pnpm install --frozen-lockfile` | Installs the whole workspace |
| `buildCommand` | `pnpm build` | Builds the package, then the demo |
| `outputDirectory` | `apps/demo/.next` | Where the deployed Next.js build lands |

`pnpm build` = `pnpm --filter @graundtech/fluent2-react-kit build && pnpm --filter fluent2-react-kit-demo build`.

## Reestablishing the pipeline from scratch

If the Vercel project is gone or disconnected:

1. **Create/import the project** at <https://vercel.com/new>, selecting the
   `graundtech/fluent2-react-kit` GitHub repo.
2. **Root Directory:** leave it as the **repository root** (`./`). This is required for the
   committed `vercel.json` to take effect and for `pnpm build` to see the whole workspace.
   > If you instead set Root Directory to `apps/demo`, Vercel ignores this root
   > `vercel.json` and looks for `apps/demo/vercel.json`. Prefer keeping it at the repo root.
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
# builds packages/react (tsup) then apps/demo (next build) -> apps/demo/.next
```

If that succeeds locally, the Vercel build will succeed too.
