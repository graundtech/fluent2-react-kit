import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { version } from "./index";

/**
 * Drift guard for the duplicated version value (backlog: "`version` is
 * duplicated"). `packages/react/package.json` and `src/index.ts` each carry
 * the version by hand — build tooling can't share it without bundling the
 * package.json into consumers — so this test makes the drift impossible to
 * ship instead: bumping one without the other fails the suite.
 */
describe("version export", () => {
  it("matches package.json (the two hand-maintained copies cannot drift)", () => {
    // jsdom rewrites import.meta.url to an http: URL, so resolve via cwd —
    // vitest always runs with cwd = packages/react (the config's directory).
    const pkg = JSON.parse(
      readFileSync("package.json", "utf8")
    ) as { version: string };
    expect(version).toBe(pkg.version);
  });
});
