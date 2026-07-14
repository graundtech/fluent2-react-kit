#!/usr/bin/env node
/**
 * Build the shadcn-compatible registry.
 *
 * Reads every fragment in registry/items/*.json (fragment format documented
 * in registry/items/README.md), inlines each fragment's referenced source
 * file content, and emits schema-conformant JSON to apps/demo/public/r/:
 *
 *   - apps/demo/public/r/<name>.json   one full registry-item per fragment,
 *                                      conforming to registry-item.json
 *   - apps/demo/public/r/registry.json the registry index (no embedded file
 *                                      content), conforming to registry.json
 *
 * Schemas: https://ui.shadcn.com/schema/registry-item.json
 *          https://ui.shadcn.com/schema/registry.json
 *
 * Zero npm dependencies — Node built-ins only. Run via `pnpm build:registry`.
 * Must run *before* `next build` so the generated JSON lands in
 * apps/demo/public/ and gets deployed by Vercel.
 *
 * Fails loudly (non-zero exit) on invalid fragments, duplicate item names,
 * or source files that don't exist.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const FRAGMENTS_DIR = join(REPO_ROOT, "registry", "items");
const OUTPUT_DIR = join(REPO_ROOT, "apps", "demo", "public", "r");

const REGISTRY_NAME = "fluent2-react-kit";
const REGISTRY_ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const REGISTRY_SCHEMA = "https://ui.shadcn.com/schema/registry.json";

// The registry origin the shadcn CLI resolves items against. Kept identical
// to the constant in apps/demo/app/page.tsx. registryDependencies are
// rewritten to absolute URLs under this origin (see
// rewriteRegistryDependency) so the CLI resolves them against OUR registry —
// a bare name like "utils" would otherwise resolve against ui.shadcn.com
// (verified in the CLI's resolveRegistryTree).
const REGISTRY_BASE_URL = "https://fluent2-react-kit.graund.io";

// Read the homepage from the root package.json instead of hardcoding it — the
// old duplicated literal already drifted (it was missing package.json's
// `#readme` fragment). Single source of truth.
const REGISTRY_HOMEPAGE = JSON.parse(
  readFileSync(join(REPO_ROOT, "package.json"), "utf8")
).homepage;

// ---------------------------------------------------------------------------
// Emit-time transforms — applied to GENERATED output only, never to the
// component sources (they must keep compiling inside this monorepo).
// ---------------------------------------------------------------------------

// The shadcn CLI's transformImport only rewrites `@/`-prefixed specifiers
// against the consumer's configured aliases; a raw relative import such as
// `../../lib/utils` ships verbatim and resolves to nothing in the consumer's
// project (they have no packages/react/src/lib tree). Rewrite it to the
// `@/lib/utils` alias the CLI understands so the copied source compiles after
// `shadcn add`. All 9 components import exactly this string.
const rewriteSourceImports = (content) =>
  content.replaceAll('from "../../lib/utils"', 'from "@/lib/utils"');

// A bare registryDependencies name (e.g. "utils") resolves against
// ui.shadcn.com in the CLI's resolveRegistryTree. Rewrite bare names to
// absolute URLs under our own registry origin; leave full-URL entries (items
// in other registries) untouched. Fragments stay bare/portable — the rewrite
// happens only in the generated output.
const rewriteRegistryDependency = (dep) =>
  /^https?:\/\//.test(dep) ? dep : `${REGISTRY_BASE_URL}/r/${dep}.json`;

const VALID_TYPES = new Set([
  "registry:lib",
  "registry:block",
  "registry:component",
  "registry:ui",
  "registry:hook",
  "registry:theme",
  "registry:page",
  "registry:file",
  "registry:style",
  "registry:base",
  "registry:font",
  "registry:item",
]);

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const errors = [];
const fail = (message) => errors.push(message);

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value) =>
  Array.isArray(value) && value.every((v) => typeof v === "string" && v.length > 0);

// ---------------------------------------------------------------------------
// 1. Load fragments
// ---------------------------------------------------------------------------

if (!existsSync(FRAGMENTS_DIR)) {
  console.error(`[build-registry] Fragments directory not found: ${FRAGMENTS_DIR}`);
  process.exit(1);
}

const fragmentFiles = readdirSync(FRAGMENTS_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (fragmentFiles.length === 0) {
  console.warn(`[build-registry] No fragments found in ${FRAGMENTS_DIR} — registry will be empty.`);
}

const fragments = [];

for (const file of fragmentFiles) {
  const fullPath = join(FRAGMENTS_DIR, file);
  const raw = readFileSync(fullPath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    fail(`${file}: invalid JSON — ${err.message}`);
    continue;
  }
  fragments.push({ file, data });
}

// ---------------------------------------------------------------------------
// 2. Validate each fragment
// ---------------------------------------------------------------------------

const validFragments = [];

for (const { file, data } of fragments) {
  const localErrors = [];
  const expectedName = basename(file, ".json");

  if (!isPlainObject(data)) {
    fail(`${file}: fragment must be a JSON object`);
    continue;
  }

  if (typeof data.name !== "string" || data.name.length === 0) {
    localErrors.push(`"name" is required and must be a non-empty string`);
  } else if (data.name !== expectedName) {
    localErrors.push(`"name" ("${data.name}") must match the filename ("${expectedName}.json")`);
  } else if (!NAME_RE.test(data.name)) {
    localErrors.push(`"name" ("${data.name}") must be kebab-case (e.g. "button", "input-otp")`);
  }

  if (typeof data.type !== "string" || !VALID_TYPES.has(data.type)) {
    localErrors.push(`"type" is required and must be one of: ${[...VALID_TYPES].join(", ")}`);
  }

  if (typeof data.title !== "string" || data.title.length === 0) {
    localErrors.push(`"title" is required and must be a non-empty string`);
  }

  if (typeof data.description !== "string" || data.description.length === 0) {
    localErrors.push(`"description" is required and must be a non-empty string`);
  }

  if (!Array.isArray(data.files) || data.files.length === 0) {
    localErrors.push(`"files" is required and must be a non-empty array`);
  } else {
    data.files.forEach((f, i) => {
      const fp = `files[${i}]`;
      if (!isPlainObject(f)) {
        localErrors.push(`${fp} must be an object`);
        return;
      }
      if (typeof f.path !== "string" || f.path.length === 0) {
        localErrors.push(`${fp}.path is required and must be a non-empty string`);
      }
      if (typeof f.target !== "string" || f.target.length === 0) {
        localErrors.push(`${fp}.target is required and must be a non-empty string`);
      }
      if (f.type !== undefined && !VALID_TYPES.has(f.type)) {
        localErrors.push(`${fp}.type, if set, must be one of: ${[...VALID_TYPES].join(", ")}`);
      }
    });
  }

  for (const key of ["dependencies", "devDependencies", "registryDependencies", "categories"]) {
    if (data[key] !== undefined && !isStringArray(data[key])) {
      localErrors.push(`"${key}", if set, must be an array of non-empty strings`);
    }
  }

  for (const key of ["cssVars", "css", "meta", "envVars", "font"]) {
    if (data[key] !== undefined && !isPlainObject(data[key])) {
      localErrors.push(`"${key}", if set, must be an object`);
    }
  }

  for (const key of ["docs", "author"]) {
    if (data[key] !== undefined && typeof data[key] !== "string") {
      localErrors.push(`"${key}", if set, must be a string`);
    }
  }

  if (localErrors.length > 0) {
    localErrors.forEach((e) => fail(`${file}: ${e}`));
    continue;
  }

  validFragments.push({ file, data });
}

// ---------------------------------------------------------------------------
// 3. Duplicate name detection
// ---------------------------------------------------------------------------

const seenNames = new Map();

for (const { file, data } of validFragments) {
  if (seenNames.has(data.name)) {
    fail(`${file}: duplicate item name "${data.name}" (already defined in ${seenNames.get(data.name)})`);
  } else {
    seenNames.set(data.name, file);
  }
}

// ---------------------------------------------------------------------------
// 4. Resolve + read referenced source files
//
// Read the content here rather than probing with existsSync first: readFileSync
// itself throws ENOENT for a missing path, so a separate existence check is
// redundant. Map ENOENT to the same clear per-fragment error and collect it, so
// the build still fails loudly (before any output is written), listing every
// missing source at once. Emit-time transforms are applied to the content now.
// ---------------------------------------------------------------------------

for (const fragment of validFragments) {
  fragment.resolvedFiles = [];
  for (const f of fragment.data.files) {
    const resolvedPath = join(REPO_ROOT, f.path);
    let content;
    try {
      content = readFileSync(resolvedPath, "utf8");
    } catch (err) {
      if (err.code === "ENOENT") {
        fail(`${fragment.file}: source file not found: ${f.path} (resolved to ${resolvedPath})`);
        continue;
      }
      throw err;
    }
    fragment.resolvedFiles.push({
      path: f.target,
      type: f.type ?? fragment.data.type,
      target: f.target,
      content: rewriteSourceImports(content),
    });
  }
}

// ---------------------------------------------------------------------------
// Bail out if anything failed validation
// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`[build-registry] ${errors.length} problem(s) found:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    `\n[build-registry] Fix the fragment(s) above and re-run. See registry/items/README.md for the fragment format.`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 5. Emit output
// ---------------------------------------------------------------------------

mkdirSync(OUTPUT_DIR, { recursive: true });

// Clean stale generated files so removed/renamed items don't linger.
for (const existing of readdirSync(OUTPUT_DIR)) {
  if (existing.endsWith(".json")) {
    unlinkSync(join(OUTPUT_DIR, existing));
  }
}

const indexItems = [];

for (const { data, resolvedFiles } of validFragments) {
  // Rewrite bare registryDependencies to absolute URLs under our registry.
  // Preserve absence — don't emit an empty array where the fragment had none.
  const registryDependencies = data.registryDependencies?.map(
    rewriteRegistryDependency
  );
  const registryDepsPatch = registryDependencies ? { registryDependencies } : {};

  const itemJson = {
    $schema: REGISTRY_ITEM_SCHEMA,
    ...data,
    ...registryDepsPatch,
    files: resolvedFiles,
  };

  const outPath = join(OUTPUT_DIR, `${data.name}.json`);
  const serialized = JSON.stringify(itemJson, null, 2) + "\n";
  writeFileSync(outPath, serialized, "utf8");

  // Index entries carry the same metadata but omit inlined file content.
  const indexFiles = resolvedFiles.map(({ path, type, target }) => ({
    path,
    type,
    target,
  }));

  indexItems.push({ ...data, ...registryDepsPatch, files: indexFiles });
}

const registryJson = {
  $schema: REGISTRY_SCHEMA,
  name: REGISTRY_NAME,
  homepage: REGISTRY_HOMEPAGE,
  items: indexItems,
};

const registryPath = join(OUTPUT_DIR, "registry.json");
writeFileSync(registryPath, JSON.stringify(registryJson, null, 2) + "\n", "utf8");

// No emitted-file re-read/parse self-check: every payload above is produced by
// JSON.stringify, which yields valid JSON by construction, so re-parsing it
// from disk would only ever guard against filesystem corruption — out of scope
// for this build step.

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log(`[build-registry] Built ${validFragments.length} registry item(s) -> ${OUTPUT_DIR}`);
for (const { data } of validFragments) {
  console.log(`  - ${data.name} (${data.type})`);
}
console.log(`[build-registry] Wrote registry index -> ${registryPath}`);
