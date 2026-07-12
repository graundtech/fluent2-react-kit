import { defineConfig } from "tsup";

export default defineConfig({
  // Per-file transpilation (`bundle: false`) instead of a single bundle: each
  // module must keep its own `"use client"` directive. A bundle can't — tsup
  // drops the directives entirely (client components crash in RSC trees), and
  // a global `"use client"` banner would turn the deliberately server-safe
  // modules (button, card, breadcrumb, …) into client references, breaking
  // `buttonVariants()`-style calls from Server Components.
  entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.*", "!src/test/**"],
  format: ["esm"],
  bundle: false,
  dts: true,
  clean: true,
  sourcemap: true
});
