import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import axe, { type ElementContext, type RunOptions } from "axe-core";
import { afterEach, expect } from "vitest";

// Unmount React trees between tests so the jsdom document stays clean.
afterEach(() => {
  cleanup();
});

/**
 * Custom async accessibility matcher built directly on axe-core.
 *
 * We deliberately do NOT depend on `vitest-axe`: its only stable release (0.1.0)
 * has been unmaintained since early 2025 and its peer range predates Vitest 1-4.
 * Running axe-core ourselves keeps the pipeline on a first-party, maintained dep.
 */
expect.extend({
  async toHaveNoAxeViolations(received: ElementContext, options?: RunOptions) {
    const context = received ?? document;
    const results = options
      ? await axe.run(context, options)
      : await axe.run(context);
    const { violations } = results;
    const pass = violations.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? "expected element to contain accessibility violations, but none were found"
          : [
              `expected no accessibility violations but found ${violations.length}:`,
              ...violations.map(
                (v) => `  - [${v.id}] ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`
              )
            ].join("\n")
    };
  }
});

interface AxeMatchers<R = unknown> {
  toHaveNoAxeViolations(options?: RunOptions): Promise<R>;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends AxeMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
