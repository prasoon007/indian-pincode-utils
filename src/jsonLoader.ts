import fs from "fs";
import path from "path";

const cache = new Map<string, unknown>();

/**
 * Loads a JSON file relative to the `dist/<format>/` directory.
 * Works in both CJS and ESM builds. The ESM build receives a `__dirname`
 * shim injected by `scripts/fix-esm-imports.js`.
 *
 * `relPath` is relative to the package root (e.g. "data/meta/states.json").
 */
export function loadJson<T = unknown>(relPath: string): T {
  const cached = cache.get(relPath);
  if (cached !== undefined) return cached as T;

  // dist/<format>/jsonLoader.js  → ../  → dist/  → dist/data/...
  const abs = path.join(__dirname, "..", relPath);
  const data = JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  cache.set(relPath, data);
  return data;
}
