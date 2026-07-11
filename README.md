# fluent2-react-kit

Fluent 2-inspired, shadcn-style React component registry for `@graundtech/fluent2-react-kit`.

> **Status:** rebuilding from scratch. This is a clean scaffold — the component kit,
> registry, and docs are being re-created. The scaffold intentionally keeps the monorepo
> structure and a minimal deployable demo so the **Vercel release pipeline stays green**.
> Before you change the folder layout, read [`VERCEL_PIPELINE.md`](./VERCEL_PIPELINE.md).

## Structure

```
.
├── apps/
│   └── demo/                 # Next.js app deployed to Vercel (fluent2-react-kit-demo)
├── packages/
│   └── react/                # @graundtech/fluent2-react-kit (the published package)
├── package.json              # root workspace scripts + packageManager (pnpm)
├── pnpm-workspace.yaml        # declares packages/* and apps/*
├── pnpm-lock.yaml
└── vercel.json               # release pipeline config (root-directory build)
```

## Getting started

```bash
pnpm install
pnpm build        # builds the package, then the demo
pnpm demo:dev     # runs the demo locally
```

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm build` | Build the package then the demo (this is the release build) |
| `pnpm build:package` | Build only `@graundtech/fluent2-react-kit` |
| `pnpm build:demo` | Build only the demo app |
| `pnpm demo:dev` | Run the demo locally |
| `pnpm typecheck` | Typecheck package + demo |

## License

MIT
