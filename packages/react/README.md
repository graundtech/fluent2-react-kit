# @graundtech/fluent2-react-kit

Fluent 2-inspired React components with shadcn/ui-style APIs — plain function components, `cva` variants, `asChild` polymorphism, the prop names (`variant`, `size`, …) shadcn/ui users already know. Built on [Base UI](https://base-ui.com) primitives, Tailwind CSS v4, and CSS variables.

- **Demo & docs:** <https://fluent2-react-kit.graund.io>
- **Source & registry:** <https://github.com/graundtech/fluent2-react-kit>

> **Prefer owning the source?** Every component is also a [shadcn registry](https://ui.shadcn.com/docs/registry) item — `npx shadcn add` copies the code straight into your project, no runtime dependency. See the [repo README](https://github.com/graundtech/fluent2-react-kit#readme) for the registry workflow. This package is the traditional alternative: a versioned dependency with managed updates.

## Requirements

- React ≥ 18
- Tailwind CSS v4 (the components are styled with Tailwind utilities driven by the kit's design tokens)

## Install

```bash
npm install @graundtech/fluent2-react-kit
```

## Set up the styles

Add the token stylesheet and point Tailwind at the package in your global CSS — all three lines matter:

```css
/* globals.css */
@import "tailwindcss";
@import "@graundtech/fluent2-react-kit/tokens.css";
@source "../node_modules/@graundtech/fluent2-react-kit/dist";
```

- `tokens.css` carries the full Fluent 2 token system (light, dark, and high-contrast themes) expressed in the shadcn/ui CSS-variable contract, plus the Tailwind v4 `@theme` bridge. It must come **after** `@import "tailwindcss"`.
- `@source` is required because Tailwind v4 doesn't scan `node_modules` — without it the components render unstyled. The path is relative to your CSS file; adjust the `../` depth to match where it lives (e.g. `../../node_modules/...` from `src/app/globals.css`).

Dark mode follows the shadcn convention: add `.dark` to any ancestor (usually `<html>`).

## Use

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle } from "@graundtech/fluent2-react-kit";

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello Fluent</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Get started</Button>
      </CardContent>
    </Card>
  );
}
```

## Server Components

The package ships per-module `"use client"` directives, mirroring how the components are authored:

- Interactive components (`Dialog`, `Combobox`, `DropdownMenu`, `Select`, `Tabs`, `Toast`, …) are Client Components and just work in a Next.js App Router tree.
- Presentational components (`Button`, `Card`, `Badge`, `Breadcrumb`, `Alert`, …) carry no directive and stay Server Component-safe — including calling their `cva` variant helpers (`buttonVariants(...)`, `badgeVariants(...)`) from server code.

## What's inside

29 components (`Accordion`, `Alert`, `Avatar`, `Badge`, `Breadcrumb`, `Button`, `Card`, `Checkbox`, `Combobox`, `Command`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Link`, `MultiSelect`, `Pagination`, `Popover`, `Progress`, `RadioGroup`, `Select`, `Separator`, `Skeleton`, `Spinner`, `Switch`, `Tabs`, `Textarea`, `Toast`, `Tooltip`), the `cn()` helper, and the token stylesheet. The full component matrix with per-component notes lives in the [repo README](https://github.com/graundtech/fluent2-react-kit#component-status).

## License

[MIT](https://github.com/graundtech/fluent2-react-kit/blob/main/LICENSE)
