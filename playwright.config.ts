import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e config for the Fluent 2 React Kit demo.
 *
 * These specs cover the interaction paths the Vitest suite cannot reach —
 * jsdom has no layout/paint engine, so pointer click-to-open, collision-aware
 * positioning, exit-transition unmount, and computed visual states are only
 * observable in a real browser (see `docs/status-and-backlog.md` → "Select
 * Playwright coverage" and the doc comment atop `select.test.tsx`).
 *
 * The `webServer` builds and serves the demo in PRODUCTION mode (`next start`)
 * rather than dev, for determinism: no HMR, no dev-only double renders, and the
 * same output Vercel ships. It runs on a dedicated port (3210) to dodge the
 * 3000/51447 ports that are commonly occupied during local dev. Building the
 * demo (`pnpm --filter fluent2-react-kit-demo build`) also runs the registry
 * step and transpiles the workspace package from source, so no separate package
 * build is required.
 *
 * This config is intentionally root-level and touches no app/package build
 * script, `vercel.json`, or `pnpm-workspace.yaml` — the Vercel deploy is
 * unaffected. `@playwright/test` is a root devDependency only.
 */

const PORT = Number(process.env.E2E_PORT ?? 3210);
const HOST = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Fail the CI build if a `test.only` is committed by accident.
  forbidOnly: !!process.env.CI,
  // No retries locally: flakiness must surface and be fixed at the source, not
  // masked. A single CI retry absorbs infra hiccups (and feeds `trace`).
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  // Cap parallelism in CI where cores are scarce; unbounded locally.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: HOST,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `pnpm --filter fluent2-react-kit-demo build && pnpm --filter fluent2-react-kit-demo start --port ${PORT}`,
    url: HOST,
    // Reuse a server already listening on the port during local iteration;
    // always start fresh in CI.
    reuseExistingServer: !process.env.CI,
    // A cold `next build` of the demo can take a while — give it room.
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
