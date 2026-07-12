/**
 * Post-build step for the unbundled (`bundle: false`) tsup output: esbuild
 * transpiles file-per-file without rewriting import specifiers, so relative
 * imports come out extensionless (`from "../../lib/utils"`). Bundler-based
 * consumers resolve those fine, but strict Node ESM does not — append `.js`
 * so the published files are spec-compliant everywhere.
 *
 * Every relative specifier in this package points at a real module file
 * (never a directory), so a plain append is safe. The emitted `.d.ts` files
 * already carry `.js` extensions (rollup-plugin-dts adds them) and are left
 * untouched.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith(".js")) yield path;
  }
}

const RELATIVE_FROM = /(from\s+")(\.{1,2}\/[^"]+)(")/g;

let rewritten = 0;
for (const file of walk(DIST)) {
  const source = readFileSync(file, "utf8");
  const fixed = source.replace(RELATIVE_FROM, (match, pre, specifier, post) =>
    specifier.endsWith(".js") ? match : `${pre}${specifier}.js${post}`
  );
  if (fixed !== source) {
    writeFileSync(file, fixed);
    rewritten += 1;
  }
}

console.log(`fix-esm-extensions: rewrote relative specifiers in ${rewritten} file(s)`);
